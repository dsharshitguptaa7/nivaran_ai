import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class NotificationType(str, enum.Enum):
    GRIEVANCE_SUBMITTED = "GRIEVANCE_SUBMITTED"
    GRIEVANCE_ASSIGNED = "GRIEVANCE_ASSIGNED"
    GRIEVANCE_FORWARDED = "GRIEVANCE_FORWARDED"
    GRIEVANCE_ESCALATED = "GRIEVANCE_ESCALATED"
    GRIEVANCE_STATUS_CHANGED = "GRIEVANCE_STATUS_CHANGED"
    GRIEVANCE_RESOLVED = "GRIEVANCE_RESOLVED"
    GRIEVANCE_CLOSED = "GRIEVANCE_CLOSED"
    GRIEVANCE_REOPENED = "GRIEVANCE_REOPENED"
    INFORMATION_REQUESTED = "INFORMATION_REQUESTED"
    DOCUMENT_REQUESTED = "DOCUMENT_REQUESTED"
    DOCUMENT_UPLOADED = "DOCUMENT_UPLOADED"
    DOCUMENT_APPROVED = "DOCUMENT_APPROVED"
    DOCUMENT_REJECTED = "DOCUMENT_REJECTED"
    REMINDER = "REMINDER"
    SYSTEM = "SYSTEM"


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    grievance_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("grievances.id"),
        nullable=True,
        index=True,
    )

    notification_type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType, name="notification_type"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    message: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    user = relationship(
        "User",
        foreign_keys=[user_id],
    )

    grievance = relationship(
        "Grievance",
        foreign_keys=[grievance_id],
    )