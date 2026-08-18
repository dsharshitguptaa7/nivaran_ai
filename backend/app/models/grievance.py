import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Boolean,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

from app.models.enums import GrievanceStatus, GrievancePriority

class Grievance(Base):
    __tablename__ = "grievances"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    grievance_id: Mapped[str] = mapped_column(
        String(30),
        unique=True,
        nullable=False,
        index=True,
    )

    applicant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=True,
        index=True,
    )

    final_category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=True,
        index=True,
    )

    category_reviewed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    category_overridden: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    status: Mapped[GrievanceStatus] = mapped_column(
        Enum(GrievanceStatus, name="grievance_status"),
        nullable=False,
        default=GrievanceStatus.SUBMITTED,
        index=True,
    )

    priority: Mapped[GrievancePriority] = mapped_column(
        Enum(GrievancePriority, name="grievance_priority"),
        nullable=False,
        default=GrievancePriority.MEDIUM,
    )

    ai_confidence: Mapped[float | None] = mapped_column(
        Numeric(5, 4),
        nullable=True,
    )

    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    closed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    last_action_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True),
    default=lambda: datetime.now(timezone.utc),
    nullable=False,
    index=True,
    )

    last_reminder_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
    index=True,
    )

    applicant = relationship(
        "User",
        foreign_keys=[applicant_id],
    )

    category = relationship(
        "Category",
        foreign_keys=[category_id],
    )

    final_category = relationship(
        "Category",
        foreign_keys=[final_category_id],
    )