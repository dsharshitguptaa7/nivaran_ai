import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base

from app.models.enums import GrievanceStatus

class HistoryActorType(str, enum.Enum):
    USER = "USER"
    SYSTEM = "SYSTEM"


class GrievanceStatusHistory(Base):
    __tablename__ = "grievance_status_history"

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

    previous_status: Mapped[GrievanceStatus | None] = mapped_column(
        Enum(
            GrievanceStatus,
            name="grievance_status",
            create_type=False,
        ),
        nullable=True,
    )

    new_status: Mapped[GrievanceStatus] = mapped_column(
        Enum(
            GrievanceStatus,
            name="grievance_status",
            create_type=False,
        ),
        nullable=False,
    )

    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    actor_type: Mapped[HistoryActorType] = mapped_column(
    Enum(
        HistoryActorType,
        name="history_actor_type",
    ),
    nullable=False,
    default=HistoryActorType.USER,
    )

    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )