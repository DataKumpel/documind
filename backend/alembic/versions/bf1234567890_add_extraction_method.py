"""Add extraction_method to documents

Revision ID: bf1234567890
Revises: af9bc88ce744
Create Date: 2026-05-11 21:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bf1234567890'
down_revision: Union[str, Sequence[str], None] = 'af9bc88ce744'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('documents', sa.Column('extraction_method', sa.String(length=20), nullable=True))


def downgrade() -> None:
    op.drop_column('documents', 'extraction_method')
