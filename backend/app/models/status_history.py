import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base
from app.models.grievance import GrievanceStatus


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
        Enum(GrievanceStatus, name="grievance_status", create_type=False),
        nullable=True,
    )

    new_status: Mapped[GrievanceStatus] = mapped_column(
        Enum(GrievanceStatus, name="grievance_status", create_type=False),
        nullable=False,
    )

    changed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
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

    grievance = relationship(
        "Grievance",
        foreign_keys=[grievance_id],
    )

    user = relationship(
        "User",
        foreign_keys=[changed_by],
    )