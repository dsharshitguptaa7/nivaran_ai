import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.user import UserRole


class EscalationRole(str, enum.Enum):
    MANAGER = "MANAGER"
    ASSISTANT_DEAN = "ASSISTANT_DEAN"
    ASSOCIATE_DEAN = "ASSOCIATE_DEAN"
    DEAN = "DEAN"


class Escalation(Base):
    __tablename__ = "escalations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    grievance_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("grievances.id"),
        nullable=False,
        index=True,
    )

    from_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    from_role: Mapped[EscalationRole] = mapped_column(
        Enum(EscalationRole, name="escalation_role"),
        nullable=False,
    )

    to_role: Mapped[EscalationRole] = mapped_column(
        Enum(EscalationRole, name="escalation_role"),
        nullable=False,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    remarks: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    escalated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    grievance = relationship(
        "Grievance",
        foreign_keys=[grievance_id],
    )

    from_user = relationship(
        "User",
        foreign_keys=[from_user_id],
    )