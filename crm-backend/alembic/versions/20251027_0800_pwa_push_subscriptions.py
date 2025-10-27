"""Add push_subscriptions table for PWA notifications

Revision ID: pwa_push_001
Revises: 4c47046cc0a6
Create Date: 2025-10-27 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from datetime import datetime, UTC

# revision identifiers, used by Alembic.
revision: str = 'pwa_push_001'
down_revision: Union[str, None] = '4c47046cc0a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add push_subscriptions table for Web Push notifications (PWA)
    """
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sa.Text(), nullable=False),
        sa.Column('p256dh_key', sa.String(255), nullable=False),
        sa.Column('auth_key', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('last_used', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_push_subscriptions_id', 'push_subscriptions', ['id'])
    op.create_index('ix_push_subscriptions_user_id', 'push_subscriptions', ['user_id'])
    op.create_index('ix_push_subscriptions_endpoint', 'push_subscriptions', ['endpoint'], unique=False)


def downgrade() -> None:
    """
    Remove push_subscriptions table
    """
    op.drop_index('ix_push_subscriptions_endpoint', table_name='push_subscriptions')
    op.drop_index('ix_push_subscriptions_user_id', table_name='push_subscriptions')
    op.drop_index('ix_push_subscriptions_id', table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
