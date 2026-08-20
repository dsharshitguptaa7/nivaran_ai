import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assignment import Assignment
from app.models.audit_log import AuditLog
from app.models.document_request import DocumentRequest, DocumentRequestStatus
from app.models.documents import Document
from app.models.enums import GrievanceStatus
from app.models.grievance import Grievance
from app.models.grievance_status_history import HistoryActorType
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.document_request import (
    AuthoritySummary,
    CreateDocumentRequestsPayload,
    DocumentRequestResponse,
    DocumentRequestReviewPayload,
    UploadedDocumentSummary,
)
from app.core.config import settings
from app.services.email_service import send_document_request_email
from app.services.grievance_workflow import change_grievance_status
from app.services.notification_service import create_notification

# Base storage directory
UPLOAD_DIR = settings.upload_dir

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB
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
    cleaned = Path(filename).name
    cleaned = re.sub(r"[^\w\s\.-]", "_", cleaned)
    return cleaned or "document"


def build_document_request_response(dr: DocumentRequest) -> DocumentRequestResponse:
    uploaded_doc_resp = None
    if dr.uploaded_document:
        uploaded_doc_resp = UploadedDocumentSummary(
            id=dr.uploaded_document.id,
            grievance_id=dr.uploaded_document.grievance_id,
            uploaded_by=dr.uploaded_document.uploaded_by,
            uploader_name=dr.uploaded_document.uploader.full_name if dr.uploaded_document.uploader else None,
            file_name=dr.uploaded_document.file_name,
            file_path=dr.uploaded_document.file_path,
            mime_type=dr.uploaded_document.mime_type,
            file_size=dr.uploaded_document.file_size,
            document_type=dr.uploaded_document.document_type or "REQUESTED_DOCUMENT",
            created_at=dr.uploaded_document.created_at,
        )

    requested_by_summary = None
    if dr.requested_by:
        requested_by_summary = AuthoritySummary(
            id=dr.requested_by.id,
            full_name=dr.requested_by.full_name,
            role=dr.requested_by.role.value if hasattr(dr.requested_by.role, "value") else str(dr.requested_by.role),
        )

    reviewed_by_summary = None
    if dr.reviewed_by:
        reviewed_by_summary = AuthoritySummary(
            id=dr.reviewed_by.id,
            full_name=dr.reviewed_by.full_name,
            role=dr.reviewed_by.role.value if hasattr(dr.reviewed_by.role, "value") else str(dr.reviewed_by.role),
        )

    return DocumentRequestResponse(
        id=dr.id,
        grievance_id=dr.grievance_id,
        request_group_id=dr.request_group_id,
        document_name=dr.document_name,
        description=dr.description,
        is_required=dr.is_required,
        status=dr.status,
        deadline=dr.deadline,
        previous_grievance_status=dr.previous_grievance_status,
        requested_at=dr.requested_at,
        responded_at=dr.responded_at,
        reviewed_at=dr.reviewed_at,
        review_remarks=dr.review_remarks,
        requested_by=requested_by_summary,
        reviewed_by=reviewed_by_summary,
        uploaded_document=uploaded_doc_resp,
    )


def are_all_required_documents_submitted(db: Session, grievance: Grievance) -> bool:
    """
    Check if all required document requests for this grievance are fulfilled (UPLOADED or APPROVED).
    """
    pending_required = db.scalars(
        select(DocumentRequest).where(
            DocumentRequest.grievance_id == grievance.id,
            DocumentRequest.is_required.is_(True),
            DocumentRequest.status.in_([
                DocumentRequestStatus.PENDING,
                DocumentRequestStatus.REJECTED,
            ]),
        )
    ).all()

    return len(pending_required) == 0


def create_document_requests(
    db: Session,
    grievance: Grievance,
    authority: User,
    payload: CreateDocumentRequestsPayload,
) -> List[DocumentRequest]:
    """
    Authority requests one or more additional documents from the applicant.
    Pauses grievance in AWAITING_INFORMATION while preserving current active assignment.
    """
    # 1. Validation
    if grievance.status in [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request documents for a {grievance.status.value} grievance.",
        )

    if authority.role == UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Applicants cannot request documents.",
        )

    # 2. Authority assignment check
    active_assignment = db.scalar(
        select(Assignment).where(
            Assignment.grievance_id == grievance.id,
            Assignment.is_active.is_(True),
        )
    )

    # Manager can act if in PENDING_REVIEW or if assigned
    is_authorized = False
    if active_assignment and active_assignment.assigned_to == authority.id:
        is_authorized = True
    elif authority.role == UserRole.MANAGER and grievance.status in [
        GrievanceStatus.PENDING_REVIEW,
        GrievanceStatus.ASSIGNED,
    ]:
        is_authorized = True
    elif authority.role == UserRole.DEAN:
        is_authorized = True

    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the active assigned authority for this grievance.",
        )

    # 3. Create document requests batch
    request_group_id = uuid.uuid4()
    previous_status_str = grievance.status.value
    now = datetime.now(timezone.utc)

    created_records = []
    doc_names = []

    for item in payload.documents:
        doc_req = DocumentRequest(
            grievance_id=grievance.id,
            requested_by_id=authority.id,
            request_group_id=request_group_id,
            document_name=item.document_name.strip(),
            description=item.description.strip() if item.description else None,
            is_required=item.is_required,
            status=DocumentRequestStatus.PENDING,
            deadline=payload.deadline,
            previous_grievance_status=previous_status_str,
            requested_at=now,
        )
        db.add(doc_req)
        created_records.append(doc_req)
        doc_names.append(item.document_name.strip())

    # 4. Transition grievance status to AWAITING_INFORMATION
    if grievance.status != GrievanceStatus.AWAITING_INFORMATION:
        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=GrievanceStatus.AWAITING_INFORMATION,
            changed_by=authority,
            reason=f"Additional document(s) requested by {authority.full_name}: {', '.join(doc_names)}",
            actor_type=HistoryActorType.USER,
        )
    else:
        grievance.last_action_at = now
        db.add(grievance)

    # 5. Audit Log
    audit_log = AuditLog(
        user_id=authority.id,
        grievance_id=grievance.id,
        action="DOCUMENT_REQUESTED",
        entity_type="GRIEVANCE",
        entity_id=grievance.id,
        description=(
            f"Additional document(s) requested by {authority.full_name} "
            f"({authority.role.value}): {', '.join(doc_names)}"
        ),
    )
    db.add(audit_log)

    # 6. In-App Notification to Applicant
    doc_list_text = ", ".join(doc_names)
    create_notification(
        db=db,
        user_id=grievance.applicant_id,
        grievance_id=grievance.id,
        notification_type=NotificationType.DOCUMENT_REQUESTED,
        title="Additional Document(s) Required",
        message=(
            f"Additional document(s) requested for grievance {grievance.grievance_id} by "
            f"{authority.full_name} ({authority.role.value}): {doc_list_text}. "
            "Please upload the requested document(s) to proceed."
        ),
    )

    # 7. Email Notification
    try:
        applicant_user = db.scalar(select(User).where(User.id == grievance.applicant_id))
        if applicant_user and applicant_user.email:
            first_req = payload.documents[0] if payload.documents else None
            instructions = first_req.description if first_req else ""
            deadline_str = payload.deadline.strftime("%d %b %Y, %I:%M %p") if payload.deadline else None

            send_document_request_email(
                applicant_email=applicant_user.email,
                applicant_name=applicant_user.full_name,
                grievance_id=grievance.grievance_id,
                grievance_title=grievance.title,
                requested_document=doc_list_text,
                instructions=instructions,
                deadline=deadline_str,
            )
    except Exception as email_err:
        print(f"[DOCUMENT_REQUEST_EMAIL_ERROR]: {email_err}")

    db.commit()

    for r in created_records:
        db.refresh(r)

    return created_records


async def fulfill_document_request(
    db: Session,
    grievance: Grievance,
    request_id: uuid.UUID,
    file: UploadFile,
    applicant: User,
) -> DocumentRequest:
    """
    Applicant uploads a document to fulfill a specific DocumentRequest.
    """
    # 1. Ownership & grievance validation
    if grievance.applicant_id != applicant.id and applicant.role == UserRole.APPLICANT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only upload documents for your own grievances.",
        )

    if grievance.status == GrievanceStatus.CLOSED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload documents to a CLOSED grievance.",
        )

    doc_req = db.scalar(
        select(DocumentRequest).where(
            DocumentRequest.id == request_id,
            DocumentRequest.grievance_id == grievance.id,
        )
    )

    if doc_req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document request not found.",
        )

    if doc_req.status not in [DocumentRequestStatus.PENDING, DocumentRequestStatus.REJECTED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Document request is already {doc_req.status.value}.",
        )

    # 2. File validation
    original_filename = file.filename or "uploaded_document"
    ext = Path(original_filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File extension '{ext}' is not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    contents = await file.read()
    file_size = len(contents)

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File size ({file_size / (1024*1024):.2f} MB) exceeds maximum allowed 20 MB.",
        )

    # 3. Save file to disk
    sanitized = sanitize_filename(original_filename)
    unique_filename = f"{uuid.uuid4().hex}_{sanitized}"
    target_path = UPLOAD_DIR / unique_filename

    with open(target_path, "wb") as f:
        f.write(contents)

    mime_type = file.content_type or "application/octet-stream"

    # 4. Create Document record
    document = Document(
        grievance_id=grievance.id,
        uploaded_by=applicant.id,
        file_name=sanitized,
        file_path=str(target_path),
        mime_type=mime_type,
        file_size=file_size,
        document_type="REQUESTED_DOCUMENT",
    )
    db.add(document)
    db.flush()

    # 5. Link Document to DocumentRequest
    now = datetime.now(timezone.utc)
    doc_req.uploaded_document_id = document.id
    doc_req.status = DocumentRequestStatus.UPLOADED
    doc_req.responded_at = now
    db.add(doc_req)

    grievance.last_action_at = now
    db.add(grievance)
    db.flush()

    # 6. Audit Log
    audit_log = AuditLog(
        user_id=applicant.id,
        grievance_id=grievance.id,
        action="DOCUMENT_UPLOADED",
        entity_type="DOCUMENT_REQUEST",
        entity_id=doc_req.id,
        description=f"Applicant {applicant.full_name} uploaded requested document '{doc_req.document_name}' ({sanitized})",
    )
    db.add(audit_log)

    # 7. Check if all required documents are now fulfilled
    all_fulfilled = are_all_required_documents_submitted(db, grievance)

    if all_fulfilled:
        # Restore grievance to previous state with the SAME authority
        previous_status_str = doc_req.previous_grievance_status or "ASSIGNED"
        try:
            restored_status = GrievanceStatus(previous_status_str)
        except ValueError:
            restored_status = GrievanceStatus.ASSIGNED

        if restored_status in [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED]:
            restored_status = GrievanceStatus.ASSIGNED

        change_grievance_status(
            db=db,
            grievance=grievance,
            new_status=restored_status,
            changed_by=applicant,
            reason="All requested documents submitted by applicant. Returned to assigned authority.",
            actor_type=HistoryActorType.USER,
        )

        # Notify requesting authority that all documents are received
        create_notification(
            db=db,
            user_id=doc_req.requested_by_id,
            grievance_id=grievance.id,
            notification_type=NotificationType.DOCUMENT_UPLOADED,
            title="All Requested Documents Received",
            message=(
                f"The applicant has submitted all required documents for grievance {grievance.grievance_id}. "
                f"It is ready for your review."
            ),
        )
    else:
        # Notify partial submission
        create_notification(
            db=db,
            user_id=doc_req.requested_by_id,
            grievance_id=grievance.id,
            notification_type=NotificationType.DOCUMENT_UPLOADED,
            title="Requested Document Uploaded",
            message=f"Applicant uploaded '{doc_req.document_name}' for grievance {grievance.grievance_id}.",
        )

    db.commit()
    db.refresh(doc_req)
    return doc_req


def review_document_request(
    db: Session,
    grievance: Grievance,
    request_id: uuid.UUID,
    authority: User,
    payload: DocumentRequestReviewPayload,
) -> DocumentRequest:
    """
    Authority reviews an uploaded document (Approve or Reject/Request Re-upload).
    """
    if grievance.status in [GrievanceStatus.RESOLVED, GrievanceStatus.CLOSED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review documents for a {grievance.status.value} grievance.",
        )

    doc_req = db.scalar(
        select(DocumentRequest).where(
            DocumentRequest.id == request_id,
            DocumentRequest.grievance_id == grievance.id,
        )
    )

    if doc_req is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document request not found.",
        )

    if doc_req.status != DocumentRequestStatus.UPLOADED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot review document in status {doc_req.status.value}. Must be UPLOADED.",
        )

    now = datetime.now(timezone.utc)
    doc_req.reviewed_at = now
    doc_req.reviewed_by_id = authority.id
    doc_req.review_remarks = payload.remarks

    action_upper = payload.action.upper()

    if action_upper == "APPROVE":
        doc_req.status = DocumentRequestStatus.APPROVED
        db.add(doc_req)

        # Audit Log
        db.add(AuditLog(
            user_id=authority.id,
            grievance_id=grievance.id,
            action="DOCUMENT_APPROVED",
            entity_type="DOCUMENT_REQUEST",
            entity_id=doc_req.id,
            description=f"Document '{doc_req.document_name}' approved by {authority.full_name}. Remarks: {payload.remarks or 'None'}",
        ))

        # Notification to applicant
        create_notification(
            db=db,
            user_id=grievance.applicant_id,
            grievance_id=grievance.id,
            notification_type=NotificationType.DOCUMENT_APPROVED,
            title="Document Approved",
            message=f"Your uploaded document '{doc_req.document_name}' for grievance {grievance.grievance_id} was approved.",
        )

    elif action_upper in ["REJECT", "REQUEST_REUPLOAD"]:
        doc_req.status = DocumentRequestStatus.REJECTED
        db.add(doc_req)

        # Return grievance to AWAITING_INFORMATION if not already
        if grievance.status != GrievanceStatus.AWAITING_INFORMATION:
            change_grievance_status(
                db=db,
                grievance=grievance,
                new_status=GrievanceStatus.AWAITING_INFORMATION,
                changed_by=authority,
                reason=f"Document '{doc_req.document_name}' rejected by {authority.full_name}: {payload.remarks or 'Re-upload requested'}",
                actor_type=HistoryActorType.USER,
            )

        grievance.last_action_at = now
        db.add(grievance)

        # Audit Log
        db.add(AuditLog(
            user_id=authority.id,
            grievance_id=grievance.id,
            action="DOCUMENT_REJECTED",
            entity_type="DOCUMENT_REQUEST",
            entity_id=doc_req.id,
            description=f"Document '{doc_req.document_name}' rejected by {authority.full_name}. Reason: {payload.remarks or 'Re-upload required'}",
        ))

        # Notification to applicant
        create_notification(
            db=db,
            user_id=grievance.applicant_id,
            grievance_id=grievance.id,
            notification_type=NotificationType.DOCUMENT_REJECTED,
            title="Document Re-upload Required",
            message=(
                f"The document '{doc_req.document_name}' for grievance {grievance.grievance_id} was rejected by {authority.full_name}. "
                f"Reason: {payload.remarks or 'Please re-upload a valid document.'}"
            ),
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid review action: '{payload.action}'. Must be APPROVE or REJECT / REQUEST_REUPLOAD.",
        )

    db.commit()
    db.refresh(doc_req)
    return doc_req
