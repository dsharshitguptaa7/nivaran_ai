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
    pass


def downgrade() -> None:
    pass