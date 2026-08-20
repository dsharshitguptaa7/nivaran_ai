import uuid
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.database import get_db
from app.models.document_request import DocumentRequest
from app.models.grievance import Grievance
from app.models.user import User, UserRole
from app.schemas.document_request import (
    CreateDocumentRequestsPayload,
    DocumentRequestResponse,
    DocumentRequestReviewPayload,
)
from app.services.document_request_service import (
    build_document_request_response,
    create_document_requests,
    fulfill_document_request,
    review_document_request,
)

router = APIRouter(
    prefix="/grievances/{grievance_id}/document-requests",
    tags=["Document Requests"],
)


def find_grievance_by_id(db: Session, grievance_id: str) -> Grievance:
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
    return grievance


# ============================================================
# CREATE DOCUMENT REQUEST(S) (Authority)
# ============================================================

@router.post("", response_model=List[DocumentRequestResponse], status_code=status.HTTP_201_CREATED)
def request_additional_documents(
    grievance_id: str,
    payload: CreateDocumentRequestsPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authority requests 1 or more additional supporting documents from the applicant."""
    grievance = find_grievance_by_id(db, grievance_id)
    created_records = create_document_requests(
        db=db,
        grievance=grievance,
        authority=current_user,
        payload=payload,
    )
    return [build_document_request_response(r) for r in created_records]


# ============================================================
# LIST DOCUMENT REQUESTS
# ============================================================

@router.get("", response_model=List[DocumentRequestResponse])
def get_document_requests(
    grievance_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all document requests for a specific grievance."""
    grievance = find_grievance_by_id(db, grievance_id)

    # Applicants can only view their own grievance document requests
    if current_user.role == UserRole.APPLICANT and grievance.applicant_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Not your grievance.",
        )

    doc_requests = db.scalars(
        select(DocumentRequest)
        .where(DocumentRequest.grievance_id == grievance.id)
        .order_by(DocumentRequest.created_at.desc())
    ).all()

    return [build_document_request_response(dr) for dr in doc_requests]


# ============================================================
# UPLOAD REQUESTED DOCUMENT (Applicant)
# ============================================================

@router.post("/{request_id}/upload", response_model=DocumentRequestResponse)
async def upload_requested_document(
    grievance_id: str,
    request_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Applicant uploads a document to fulfill a specific document request."""
    grievance = find_grievance_by_id(db, grievance_id)
    updated_req = await fulfill_document_request(
        db=db,
        grievance=grievance,
        request_id=request_id,
        file=file,
        applicant=current_user,
    )
    return build_document_request_response(updated_req)


# ============================================================
# REVIEW REQUESTED DOCUMENT (Authority)
# ============================================================

@router.post("/{request_id}/review", response_model=DocumentRequestResponse)
def review_requested_document(
    grievance_id: str,
    request_id: uuid.UUID,
    payload: DocumentRequestReviewPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Authority approves or rejects/requests re-upload of an uploaded document."""
    grievance = find_grievance_by_id(db, grievance_id)
    updated_req = review_document_request(
        db=db,
        grievance=grievance,
        request_id=request_id,
        authority=current_user,
        payload=payload,
    )
    return build_document_request_response(updated_req)
