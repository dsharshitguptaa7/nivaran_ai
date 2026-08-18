"""add last action timestamp to grievances

Revision ID: f9323db44339
Revises: 1e55505cd84e
Create Date: 2026-08-16 12:49:00.985493

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f9323db44339'
down_revision: Union[str, Sequence[str], None] = '1e55505cd84e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # 1. Add column temporarily nullable
    op.add_column(
        "grievances",
        sa.Column(
            "last_action_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )

    # 2. Existing grievances ke liye initial value
    op.execute(
        """
        UPDATE grievances
        SET last_action_at = updated_at
        WHERE last_action_at IS NULL
        """
    )

    # 3. Future queries ke liye index
    op.create_index(
        op.f("ix_grievances_last_action_at"),
        "grievances",
        ["last_action_at"],
        unique=False,
    )

    # 4. Ab NOT NULL enforce karo
    op.alter_column(
        "grievances",
        "last_action_at",
        existing_type=sa.DateTime(timezone=True),
        nullable=False,
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_index(
        op.f("ix_grievances_last_action_at"),
        table_name="grievances",
    )

    op.drop_column(
        "grievances",
        "last_action_at",
    )
    # ### end Alembic commands ###
