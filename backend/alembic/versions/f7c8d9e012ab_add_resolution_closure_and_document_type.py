"""add resolution closure and document type

Revision ID: f7c8d9e012ab
Revises: 39e8a1e284dd
Create Date: 2026-08-20 14:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'f7c8d9e012ab'
down_revision: Union[str, Sequence[str], None] = '39e8a1e284dd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add resolution and closure columns to grievances
    op.add_column('grievances', sa.Column('resolution_notes', sa.Text(), nullable=True))
    op.add_column('grievances', sa.Column('resolved_by_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('grievances', sa.Column('closure_remarks', sa.Text(), nullable=True))
    op.add_column('grievances', sa.Column('closed_by_id', postgresql.UUID(as_uuid=True), nullable=True))

    op.create_foreign_key(
        'fk_grievances_resolved_by_users',
        'grievances',
        'users',
        ['resolved_by_id'],
        ['id']
    )
    op.create_foreign_key(
        'fk_grievances_closed_by_users',
        'grievances',
        'users',
        ['closed_by_id'],
        ['id']
    )

    op.create_index(op.f('ix_grievances_resolved_by_id'), 'grievances', ['resolved_by_id'], unique=False)
    op.create_index(op.f('ix_grievances_closed_by_id'), 'grievances', ['closed_by_id'], unique=False)

    # 2. Add document_type column to documents
    op.add_column('documents', sa.Column('document_type', sa.String(length=50), nullable=True, server_default='ATTACHMENT'))


def downgrade() -> None:
    op.drop_column('documents', 'document_type')

    op.drop_index(op.f('ix_grievances_closed_by_id'), table_name='grievances')
    op.drop_index(op.f('ix_grievances_resolved_by_id'), table_name='grievances')

    op.drop_constraint('fk_grievances_closed_by_users', 'grievances', type_='foreignkey')
    op.drop_constraint('fk_grievances_resolved_by_users', 'grievances', type_='foreignkey')

    op.drop_column('grievances', 'closed_by_id')
    op.drop_column('grievances', 'closure_remarks')
    op.drop_column('grievances', 'resolved_by_id')
    op.drop_column('grievances', 'resolution_notes')
