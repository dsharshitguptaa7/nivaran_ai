import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AIProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class AIProcessingRecord(Base):
    __tablename__ = "ai_processing_records"

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

    model_name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    model_version: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    predicted_category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("categories.id"),
        nullable=True,
        index=True,
    )

    confidence_score: Mapped[float | None] = mapped_column(
        Numeric(5, 4),
        nullable=True,
    )

    processing_time_ms: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    status: Mapped[AIProcessingStatus] = mapped_column(
        Enum(
            AIProcessingStatus,
            name="ai_processing_status",
            create_type=False,
        ),
        nullable=False,
        default=AIProcessingStatus.PENDING,
    )

    error_message: Mapped[str | None] = mapped_column(
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

    predicted_category = relationship(
        "Category",
        foreign_keys=[predicted_category_id],
    )