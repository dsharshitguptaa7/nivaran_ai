import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.ai_processing import AIProcessingStatus


class AIProcessingResponse(BaseModel):
    id: uuid.UUID
    grievance_id: uuid.UUID

    model_name: str
    model_version: str

    predicted_category_id: uuid.UUID | None = None

    confidence_score: float | None = None
    processing_time_ms: int | None = None

    status: AIProcessingStatus
    error_message: str | None = None

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )