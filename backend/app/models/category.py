import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class CategoryRoutingType(str, enum.Enum):
    GRIEVANCE_CLUSTER = "GRIEVANCE_CLUSTER"
    SUBJECT_ASSISTANT_DEAN = "SUBJECT_ASSISTANT_DEAN"
    FIXED_AUTHORITY = "FIXED_AUTHORITY"


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )

    name: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    # =========================================================
    # ROUTING CONFIGURATION
    # =========================================================

    routing_type: Mapped[CategoryRoutingType] = mapped_column(
        Enum(
            CategoryRoutingType,
            name="category_routing_type"
        ),
        nullable=False,
        default=CategoryRoutingType.GRIEVANCE_CLUSTER,
    )

    grievance_cluster_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("grievance_clusters.id"),
        nullable=True,
        index=True,
    )

    fixed_authority_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )

    # =========================================================
    # STATUS / TIMESTAMPS
    # =========================================================

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # =========================================================
    # RELATIONSHIPS
    # =========================================================

    grievance_cluster = relationship(
        "GrievanceCluster",
        foreign_keys=[grievance_cluster_id],
    )

    fixed_authority = relationship(
        "User",
        foreign_keys=[fixed_authority_id],
    )