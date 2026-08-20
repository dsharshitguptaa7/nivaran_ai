import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import require_permission
from app.core.config import settings
from app.core.permissions import Permission
from app.db.database import get_db
from app.models.audit_log import AuditLog
from app.models.documents import Document
from app.models.grievance import Grievance
from app.models.user import User, UserRole
from app.schemas.grievance import DocumentResponse

router = APIRouter(
    tags=["Documents"],
)

# Base directory for storing uploaded files
UPLOAD_DIR = settings.upload_dir

# 20 MB limit
MAX_FILE_SIZE = 20 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".doc",
    ".docx",
    ".txt",
    ".csv",
    ".xlsx",
    ".xls",
}


def sanitize_filename(filename: str) -> str:
    """Sanitize the original filename to prevent directory traversal."""
    cleaned = Path(filename).name
    cleaned = re.sub(r"[^\w\s\.-]", "_", cleaned)
    return cleaned or "document"


def build_document_response(doc: Document, uploader_name: str | None = None) -> DocumentResponse:
    return DocumentResponse(
        id=doc.id,
        grievance_id=doc.grievance_id,
        uploaded_by=doc.uploaded_by,
        uploader_name=uploader_name or (doc.uploader.full_name if doc.uploader else None),
        file_name=doc.file_name,
        file_path=doc.file_path,
        mime_type=doc.mime_type,
        file_size=doc.file_size,
        document_type=doc.document_type or "ATTACHMENT",
        created_at=doc.created_at,
    )


# ============================================================
# UPLOAD DOCUMENT
# ============================================================

@router.post(
    "/grievances/{grievance_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    grievance_id: str,
    file: UploadFile = File(...),
    document_type: str = Form("ATTACHMENT"),
    current_user: User = Depends(require_permission(Permission.UPLOAD_DOCUMENT)),
    db: Session = Depends(get_db),
):
    # 1. Look up grievance by human-readable ID or UUID
    grievance = db.scalar(
        select(Grievance).where(
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    # 2. Check access for applicant
    if current_user.role == UserRole.APPLICANT and grievance.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this grievance",
        )

    # 3. Validate file extension
    original_name = file.filename or "attachment"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not supported. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 4. Read contents and check size
    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_size / (1024*1024):.1f}MB) exceeds maximum limit of 20MB",
        )

    # 5. Save to disk
    sanitized = sanitize_filename(original_name)
    doc_id = uuid.uuid4()
    unique_file_name = f"{doc_id}_{sanitized}"

    grievance_folder = UPLOAD_DIR / str(grievance.id)
    grievance_folder.mkdir(parents=True, exist_ok=True)

    target_path = grievance_folder / unique_file_name

    with open(target_path, "wb") as f:
        f.write(contents)

    mime_type = file.content_type or "application/octet-stream"

    # 6. Create Document record
    document = Document(
        id=doc_id,
        grievance_id=grievance.id,
        uploaded_by=current_user.id,
        file_name=sanitized,
        file_path=str(target_path),
        mime_type=mime_type,
        file_size=file_size,
        document_type=document_type or "ATTACHMENT",
        created_at=datetime.now(timezone.utc),
    )

    db.add(document)

    # 7. Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance.id,
        action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT",
        entity_id=document.id,
        description=f"Uploaded document '{sanitized}' ({document_type}) by {current_user.full_name} ({current_user.role.value}).",
    )
    db.add(audit_log)

    db.commit()
    db.refresh(document)

    return build_document_response(document, uploader_name=current_user.full_name)


# ============================================================
# LIST DOCUMENTS FOR GRIEVANCE
# ============================================================

@router.get(
    "/grievances/{grievance_id}/documents",
    response_model=List[DocumentResponse],
)
def get_grievance_documents(
    grievance_id: str,
    current_user: User = Depends(require_permission(Permission.VIEW_DOCUMENT)),
    db: Session = Depends(get_db),
):
    grievance = db.scalar(
        select(Grievance).where(
            (Grievance.grievance_id == grievance_id)
            | (Grievance.id == (uuid.UUID(grievance_id) if len(grievance_id) == 36 else None))
        )
    )

    if grievance is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Grievance not found",
        )

    if current_user.role == UserRole.APPLICANT and grievance.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this grievance",
        )

    documents = db.scalars(
        select(Document)
        .where(Document.grievance_id == grievance.id)
        .order_by(Document.created_at.asc())
    ).all()

    return [build_document_response(d) for d in documents]


# ============================================================
# DOWNLOAD / VIEW DOCUMENT
# ============================================================

@router.get(
    "/documents/{document_id}/download",
)
def download_document(
    document_id: str,
    current_user: User = Depends(require_permission(Permission.DOWNLOAD_DOCUMENT)),
    db: Session = Depends(get_db),
):
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format",
        )

    document = db.scalar(
        select(Document).where(Document.id == doc_uuid)
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Check grievance access for applicant
    grievance = db.scalar(
        select(Grievance).where(Grievance.id == document.grievance_id)
    )

    if current_user.role == UserRole.APPLICANT and (
        grievance is None or grievance.applicant_id != current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to download this document",
        )

    if not os.path.exists(document.file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on storage server",
        )

    return FileResponse(
        path=document.file_path,
        filename=document.file_name,
        media_type=document.mime_type,
    )


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete(
    "/documents/{document_id}",
    status_code=status.HTTP_200_OK,
)
def delete_document(
    document_id: str,
    current_user: User = Depends(require_permission(Permission.UPLOAD_DOCUMENT)),
    db: Session = Depends(get_db),
):
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid document ID format",
        )

    document = db.scalar(
        select(Document).where(Document.id == doc_uuid)
    )

    if document is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Only uploader or Manager can delete
    if current_user.role != UserRole.MANAGER and document.uploaded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to delete this document",
        )

    # Remove file from disk
    if os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except OSError:
            pass

    grievance_id = document.grievance_id
    file_name = document.file_name

    db.delete(document)

    # Audit log
    audit_log = AuditLog(
        user_id=current_user.id,
        grievance_id=grievance_id,
        action="DOCUMENT_DELETED",
        entity_type="DOCUMENT",
        entity_id=doc_uuid,
        description=f"Deleted document '{file_name}' by {current_user.full_name} ({current_user.role.value}).",
    )
    db.add(audit_log)

    db.commit()

    return {"message": "Document deleted successfully", "status": "success"}
