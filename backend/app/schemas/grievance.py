from enum import Enum
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    GrievancePriority,
    GrievanceStatus,
)


class GrievanceCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=5,
        max_length=255,
    )

    description: str = Field(
        ...,
        min_length=20,
    )


# ============================================================
# CATEGORY RESPONSE
# ============================================================

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# AI PROCESSING SUMMARY
# ============================================================

class AIProcessingSummary(BaseModel):
    id: UUID

    model_name: str
    model_version: str

    predicted_category_id: UUID | None = None

    confidence_score: float | None = None
    processing_time_ms: int | None = None

    status: str
    error_message: str | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

# ============================================================
# AI REVIEW
# ============================================================

class AIReviewDecision(str, Enum):
    CONFIRMED = "CONFIRMED"
    OVERRIDDEN = "OVERRIDDEN"


class AIReviewRequest(BaseModel):
    category_id: UUID
    decision: AIReviewDecision


class GrievanceRoutingResponse(BaseModel):
    can_forward: bool = False
    can_resolve: bool = False
    can_close: bool = False
    can_escalate: bool = False
    routing_type: str | None = None
    next_authority_id: UUID | None = None
    next_authority_role: str | None = None
    next_authority_name: str | None = None


# ============================================================
# DOCUMENT RESPONSE
# ============================================================

class DocumentResponse(BaseModel):
    id: UUID
    grievance_id: UUID
    uploaded_by: UUID
    uploader_name: str | None = None
    file_name: str
    file_path: str
    mime_type: str
    file_size: int
    document_type: str | None = "ATTACHMENT"
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# RESOLVE / CLOSE / REOPEN SCHEMAS
# ============================================================

class GrievanceResolveRequest(BaseModel):
    resolution_notes: str = Field(
        ...,
        min_length=3,
        description="Detailed explanation of how the grievance was resolved",
    )


class GrievanceCloseRequest(BaseModel):
    closure_remarks: str | None = Field(
        default=None,
        description="Remarks or notes by Manager confirming closure",
    )


class GrievanceReopenRequest(BaseModel):
    reason: str = Field(
        ...,
        min_length=3,
        description="Reason for reopening the grievance or returning for rework",
    )


# ============================================================
# APPLICANT SUMMARY RESPONSE
# ============================================================

class ApplicantSummaryResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    phd_registration_number: str | None = None
    subject_name: str | None = None
    department: str | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


# ============================================================
# GRIEVANCE RESPONSE
# ============================================================

class GrievanceResponse(BaseModel):
    id: UUID
    grievance_id: str
    applicant_id: UUID
    applicant: ApplicantSummaryResponse | None = None

    title: str
    description: str

    # Original / AI category
    category_id: UUID | None = None
    category: CategoryResponse | None = None
    subject_name: str | None = None

    # Manager final category decision
    final_category_id: UUID | None = None
    final_category: CategoryResponse | None = None
    category_reviewed: bool = False
    category_overridden: bool = False

    status: GrievanceStatus
    priority: GrievancePriority

    ai_confidence: float | None = None
    ai_processing: AIProcessingSummary | None = None

    routing: GrievanceRoutingResponse | None = None

    resolution_notes: str | None = None
    resolved_by_id: UUID | None = None
    resolved_by_name: str | None = None

    closure_remarks: str | None = None
    closed_by_id: UUID | None = None
    closed_by_name: str | None = None

    documents: list[DocumentResponse] = []
    document_requests: list["DocumentRequestResponse"] = []

    submitted_at: datetime
    resolved_at: datetime | None = None
    closed_at: datetime | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# Late import to prevent circular dependency
from app.schemas.document_request import DocumentRequestResponse  # noqa: E402
GrievanceResponse.model_rebuild()

