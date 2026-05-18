"""Add schema versioning and soft-delete for document types

Revision ID: e3f9a12b4c87
Revises: 24c3e80c5171
Create Date: 2026-05-18 17:54:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3f9a12b4c87'
down_revision: Union[str, Sequence[str], None] = '24c3e80c5171'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Soft-delete flag for document types
    op.add_column(
        'document_types',
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    )
    # Schema version counter — incremented on every field change
    op.add_column(
        'document_types',
        sa.Column('schema_version', sa.Integer(), server_default='1', nullable=False),
    )
    # Track which schema version a document was last analyzed with
    op.add_column(
        'documents',
        sa.Column('analyzed_schema_version', sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('documents', 'analyzed_schema_version')
    op.drop_column('document_types', 'schema_version')
    op.drop_column('document_types', 'is_active')
