"""add system actor to grievance status history

Revision ID: 2c8310ecef47
Revises: 017373089afb
Create Date: 2026-08-16 01:26:00.303712

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2c8310ecef47'
down_revision: Union[str, Sequence[str], None] = '017373089afb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create the enum type and add the column with a temporary
    # default so existing rows receive USER.
    actor_type_enum = sa.Enum(
        "USER",
        "SYSTEM",
        name="history_actor_type",
    )

    actor_type_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "grievance_status_history",
        sa.Column(
            "actor_type",
            actor_type_enum,
            nullable=False,
            server_default="USER",
        ),
    )

    # Remove the database-level default after existing rows
    # have been populated.
    op.alter_column(
        "grievance_status_history",
        "actor_type",
        server_default=None,
    )

    # System-generated history entries may not have a user.
    op.alter_column(
        "grievance_status_history",
        "changed_by",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "grievance_status_history",
        "changed_by",
        existing_type=sa.UUID(),
        nullable=False,
    )

    op.drop_column(
        "grievance_status_history",
        "actor_type",
    )

    sa.Enum(
        "USER",
        "SYSTEM",
        name="history_actor_type",
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )
    # ### end Alembic commands ###
