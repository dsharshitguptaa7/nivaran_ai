"""add category routing configuration

Revision ID: 7a24957b46fd
Revises: c343a0b7f7ff
Create Date: 2026-08-18 08:01:41.856544

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a24957b46fd'
down_revision: Union[str, Sequence[str], None] = 'c343a0b7f7ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # =========================================================
    # 1. Create PostgreSQL ENUM type
    # =========================================================

    category_routing_type = sa.Enum(
        "GRIEVANCE_CLUSTER",
        "SUBJECT_ASSISTANT_DEAN",
        "FIXED_AUTHORITY",
        name="category_routing_type",
    )

    category_routing_type.create(
        op.get_bind(),
        checkfirst=True,
    )

    # =========================================================
    # 2. Add routing columns
    # =========================================================

    op.add_column(
        "categories",
        sa.Column(
            "routing_type",
            category_routing_type,
            nullable=True,
        ),
    )

    op.add_column(
        "categories",
        sa.Column(
            "grievance_cluster_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    op.add_column(
        "categories",
        sa.Column(
            "fixed_authority_id",
            sa.UUID(),
            nullable=True,
        ),
    )

    # =========================================================
    # 3. Indexes
    # =========================================================

    op.create_index(
        op.f("ix_categories_fixed_authority_id"),
        "categories",
        ["fixed_authority_id"],
        unique=False,
    )

    op.create_index(
        op.f("ix_categories_grievance_cluster_id"),
        "categories",
        ["grievance_cluster_id"],
        unique=False,
    )

    # =========================================================
    # 4. Foreign Keys
    # =========================================================

    op.create_foreign_key(
        "categories_fixed_authority_id_fkey",
        "categories",
        "users",
        ["fixed_authority_id"],
        ["id"],
    )

    op.create_foreign_key(
        "categories_grievance_cluster_id_fkey",
        "categories",
        "grievance_clusters",
        ["grievance_cluster_id"],
        ["id"],
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_constraint(
        "categories_grievance_cluster_id_fkey",
        "categories",
        type_="foreignkey",
    )

    op.drop_constraint(
        "categories_fixed_authority_id_fkey",
        "categories",
        type_="foreignkey",
    )

    op.drop_index(
        op.f("ix_categories_grievance_cluster_id"),
        table_name="categories",
    )

    op.drop_index(
        op.f("ix_categories_fixed_authority_id"),
        table_name="categories",
    )

    op.drop_column(
        "categories",
        "fixed_authority_id",
    )

    op.drop_column(
        "categories",
        "grievance_cluster_id",
    )

    op.drop_column(
        "categories",
        "routing_type",
    )

    # Remove PostgreSQL ENUM
    sa.Enum(
        "GRIEVANCE_CLUSTER",
        "SUBJECT_ASSISTANT_DEAN",
        "FIXED_AUTHORITY",
        name="category_routing_type",
    ).drop(
        op.get_bind(),
        checkfirst=True,
    )