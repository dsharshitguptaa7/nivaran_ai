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



# ============================================================
# GRIEVANCE RESPONSE
# ============================================================

class GrievanceResponse(BaseModel):
    id: UUID
    grievance_id: str
    applicant_id: UUID

    title: str
    description: str

    # Original / AI category
    category_id: UUID | None = None
    category: CategoryResponse | None = None

    # Manager final category decision
    final_category_id: UUID | None = None
    final_category: CategoryResponse | None = None
    category_reviewed: bool = False
    category_overridden: bool = False

    status: GrievanceStatus
    priority: GrievancePriority

    ai_confidence: float | None = None
    ai_processing: AIProcessingSummary | None = None

    submitted_at: datetime
    resolved_at: datetime | None = None
    closed_at: datetime | None = None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )

