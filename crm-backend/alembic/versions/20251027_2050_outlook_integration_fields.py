"""Add Outlook integration fields to User model

Revision ID: outlook_integration_v1
Revises: c9eb505dd41a
Create Date: 2025-10-27 20:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'outlook_integration_v1'
down_revision: Union[str, None] = 'c9eb505dd41a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add Outlook OAuth integration fields to users table"""
    # Add Outlook integration columns
    op.add_column('users', sa.Column('outlook_connected', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('encrypted_outlook_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('encrypted_outlook_refresh_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('outlook_token_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Remove Outlook OAuth integration fields from users table"""
    op.drop_column('users', 'outlook_token_expires_at')
    op.drop_column('users', 'encrypted_outlook_refresh_token')
    op.drop_column('users', 'encrypted_outlook_access_token')
    op.drop_column('users', 'outlook_connected')
