"""Add CGU acceptance fields to users table

Revision ID: 20251028_0912
Revises: 20251028_add_known_companies
Create Date: 2025-10-28 09:12:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251028_0912'
down_revision: Union[str, None] = '20251028_add_known_companies'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add CGU acceptance tracking fields to users table."""
    # Add cgu_accepted column
    op.add_column('users', sa.Column('cgu_accepted', sa.Boolean(), nullable=False, server_default='false'))
    op.create_index(op.f('ix_users_cgu_accepted'), 'users', ['cgu_accepted'], unique=False)

    # Add cgu_accepted_at column
    op.add_column('users', sa.Column('cgu_accepted_at', sa.DateTime(timezone=True), nullable=True))

    # Add cgu_version column
    op.add_column('users', sa.Column('cgu_version', sa.String(length=20), nullable=True))

    # Add cgu_acceptance_ip column
    op.add_column('users', sa.Column('cgu_acceptance_ip', sa.String(length=45), nullable=True))


def downgrade() -> None:
    """Remove CGU acceptance tracking fields from users table."""
    op.drop_column('users', 'cgu_acceptance_ip')
    op.drop_column('users', 'cgu_version')
    op.drop_column('users', 'cgu_accepted_at')
    op.drop_index(op.f('ix_users_cgu_accepted'), table_name='users')
    op.drop_column('users', 'cgu_accepted')
