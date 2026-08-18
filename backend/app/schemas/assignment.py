from uuid import UUID

from pydantic import BaseModel, Field


class AssignmentCreate(BaseModel):
    assigned_to: UUID

    remarks: str | None = Field(
        default=None,
        max_length=1000,
    )


class AssignmentResponse(BaseModel):
    id: UUID
    grievance_id: UUID
    assigned_to: UUID
    assigned_by: UUID

    remarks: str | None = None

    is_active: bool

    model_config = {
        "from_attributes": True
    }