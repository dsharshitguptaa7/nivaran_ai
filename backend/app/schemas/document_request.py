import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.document_request import DocumentRequestStatus


class DocumentRequestItemCreate(BaseModel):
    document_name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    is_required: bool = True


class CreateDocumentRequestsPayload(BaseModel):
    documents: List[DocumentRequestItemCreate] = Field(..., min_length=1)
    deadline: Optional[datetime] = None


class DocumentRequestReviewPayload(BaseModel):
    action: str = Field(..., description="APPROVE, REJECT, or REQUEST_REUPLOAD")
    remarks: Optional[str] = None


class AuthoritySummary(BaseModel):
    id: uuid.UUID
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class UploadedDocumentSummary(BaseModel):
    id: uuid.UUID
    grievance_id: uuid.UUID
    uploaded_by: uuid.UUID
    uploader_name: Optional[str] = None
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    document_type: Optional[str] = "REQUESTED_DOCUMENT"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentRequestResponse(BaseModel):
    id: uuid.UUID
    grievance_id: uuid.UUID
    request_group_id: uuid.UUID
    document_name: str
    description: Optional[str] = None
    is_required: bool = True
    status: DocumentRequestStatus
    deadline: Optional[datetime] = None
    previous_grievance_status: Optional[str] = None
    requested_at: datetime
    responded_at: Optional[datetime] = None
    reviewed_at: Optional[datetime] = None
    review_remarks: Optional[str] = None

    requested_by: Optional[AuthoritySummary] = None
    reviewed_by: Optional[AuthoritySummary] = None
    uploaded_document: Optional[UploadedDocumentSummary] = None

    model_config = ConfigDict(from_attributes=True)
