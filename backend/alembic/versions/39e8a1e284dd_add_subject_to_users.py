"""add subject to users

Revision ID: 39e8a1e284dd
Revises: a1dc695e5059
Create Date: 2026-08-18 11:51:38.003345

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '39e8a1e284dd'
down_revision: Union[str, Sequence[str], None] = 'a1dc695e5059'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.add_column(
        "users",
        sa.Column(
            "subject_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    op.create_index(
        op.f("ix_users_subject_id"),
        "users",
        ["subject_id"],
        unique=False,
    )

    op.create_foreign_key(
        "users_subject_id_fkey",
        "users",
        "subjects",
        ["subject_id"],
        ["id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "users_subject_id_fkey",
        "users",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_users_subject_id"),
        table_name="users",
    )

    op.drop_column(
        "users",
        "subject_id",
    )
    # ### end Alembic commands ###
