"""create notifications table

Revision ID: 1e55505cd84e
Revises: 2c8310ecef47
Create Date: 2026-08-16 08:31:06.676516

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '1e55505cd84e'
down_revision: Union[str, Sequence[str], None] = '2c8310ecef47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    notification_type = postgresql.ENUM(
        "GRIEVANCE_SUBMITTED",
        "GRIEVANCE_ASSIGNED",
        "GRIEVANCE_ESCALATED",
        "GRIEVANCE_RESOLVED",
        "GRIEVANCE_CLOSED",
        "INFORMATION_REQUESTED",
        "SYSTEM",
        name="notification_type",
        create_type=False,
    )

    op.create_table(
        "notifications",

        sa.Column(
            "id",
            sa.UUID(),
            nullable=False,
        ),

        sa.Column(
            "user_id",
            sa.UUID(),
            nullable=False,
        ),

        sa.Column(
            "grievance_id",
            sa.UUID(),
            nullable=True,
        ),

        sa.Column(
            "notification_type",
            notification_type,
            nullable=False,
        ),

        sa.Column(
            "title",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "is_read",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
        ),

        sa.Column(
            "read_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),

        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
        ),

        sa.ForeignKeyConstraint(
            ["grievance_id"],
            ["grievances.id"],
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_notifications_user_id"),
        "notifications",
        ["user_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_notifications_grievance_id"),
        "notifications",
        ["grievance_id"],
        unique=False,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    op.drop_index(
        op.f("ix_notifications_grievance_id"),
        table_name="notifications",
    )

    op.drop_index(
        op.f("ix_notifications_user_id"),
        table_name="notifications",
    )

    op.drop_table("notifications")