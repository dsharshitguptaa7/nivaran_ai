import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationType


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    grievance_id: uuid.UUID | None = None
    grievance_tracking_id: str | None = None
    grievance_title: str | None = None

    notification_type: NotificationType

    title: str
    message: str

    is_read: bool

    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(
        from_attributes=True
    )


class UnreadCountResponse(BaseModel):
    unread_count: int