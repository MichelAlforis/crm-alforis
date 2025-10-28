"""add 2FA fields to users table

Revision ID: 20251028_add_2fa
Revises: 20251028_0912
Create Date: 2025-10-28 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251028_add_2fa'
down_revision: Union[str, None] = '20251028_0912'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 2FA fields to users table
    op.add_column('users', sa.Column('totp_secret', sa.String(length=32), nullable=True))
    op.add_column('users', sa.Column('totp_enabled', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('totp_enabled_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('backup_codes', sa.Text(), nullable=True))

    # Create index on totp_enabled for faster queries
    op.create_index(op.f('ix_users_totp_enabled'), 'users', ['totp_enabled'], unique=False)


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_users_totp_enabled'), table_name='users')

    # Drop columns
    op.drop_column('users', 'backup_codes')
    op.drop_column('users', 'totp_enabled_at')
    op.drop_column('users', 'totp_enabled')
    op.drop_column('users', 'totp_secret')
