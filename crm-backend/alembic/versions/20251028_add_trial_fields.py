"""add trial management fields to users table

Revision ID: 20251028_add_trial
Revises: 20251028_add_2fa
Create Date: 2025-10-28 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251028_add_trial'
down_revision: Union[str, None] = '20251028_add_2fa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add trial management fields to users table
    op.add_column('users', sa.Column('trial_started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('trial_extended_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('trial_converted_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('subscription_status', sa.String(length=20), nullable=False, server_default='trial'))

    # Create indexes for efficient queries
    op.create_index(op.f('ix_users_trial_started_at'), 'users', ['trial_started_at'], unique=False)
    op.create_index(op.f('ix_users_trial_ends_at'), 'users', ['trial_ends_at'], unique=False)
    op.create_index(op.f('ix_users_subscription_status'), 'users', ['subscription_status'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index(op.f('ix_users_subscription_status'), table_name='users')
    op.drop_index(op.f('ix_users_trial_ends_at'), table_name='users')
    op.drop_index(op.f('ix_users_trial_started_at'), table_name='users')

    # Drop columns
    op.drop_column('users', 'subscription_status')
    op.drop_column('users', 'trial_converted_at')
    op.drop_column('users', 'trial_extended_at')
    op.drop_column('users', 'trial_ends_at')
    op.drop_column('users', 'trial_started_at')
