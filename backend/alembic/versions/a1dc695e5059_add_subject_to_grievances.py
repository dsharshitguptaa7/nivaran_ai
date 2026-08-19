"""add subject to grievances

Revision ID: a1dc695e5059
Revises: 7a24957b46fd
Create Date: 2026-08-18 11:43:12.868025

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1dc695e5059'
down_revision: Union[str, Sequence[str], None] = '7a24957b46fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "grievances",
        sa.Column(
            "subject_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_grievances_subject_id"),
        "grievances",
        ["subject_id"],
        unique=False,
    )

    op.create_foreign_key(
        "grievances_subject_id_fkey",
        "grievances",
        "subjects",
        ["subject_id"],
        ["id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "grievances_subject_id_fkey",
        "grievances",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_grievances_subject_id"),
        table_name="grievances",
    )

    op.drop_column(
        "grievances",
        "subject_id",
    )
    # ### end Alembic commands ###
