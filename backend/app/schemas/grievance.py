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


class GrievanceResponse(BaseModel):
    id: UUID
    grievance_id: str
    applicant_id: UUID

    title: str
    description: str

    category_id: UUID | None
    cluster_id: UUID | None

    status: GrievanceStatus
    priority: GrievancePriority

    ai_confidence: float | None

    submitted_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)