"""Add external tracking and direction fields to Interaction

Revision ID: ac2db27898c7
Revises: 70f7d1565097
Create Date: 2025-10-29 22:43:46.671779+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac2db27898c7'
down_revision: Union[str, None] = '70f7d1565097'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add fields for email sync auto-creation (Phase 1.5)

    # 1. External source tracking (idempotence)
    op.add_column('crm_interactions', sa.Column('external_source', sa.String(50), nullable=True))
    op.add_column('crm_interactions', sa.Column('external_id', sa.String(500), nullable=True))
    op.create_index('ix_interactions_external_source', 'crm_interactions', ['external_source'])
    op.create_index('ix_interactions_external_id', 'crm_interactions', ['external_id'])
    op.create_index('ix_interactions_external_unique', 'crm_interactions', ['external_source', 'external_id'], unique=True)

    # 2. Direction (in/out/internal)
    op.add_column('crm_interactions', sa.Column('direction', sa.String(20), nullable=True))
    op.create_index('ix_interactions_direction', 'crm_interactions', ['direction'])

    # 3. Thread ID for email threading
    op.add_column('crm_interactions', sa.Column('thread_id', sa.String(255), nullable=True))
    op.create_index('ix_interactions_thread_id', 'crm_interactions', ['thread_id'])

    # 4. Actual interaction date (vs created_at = when synced)
    op.add_column('crm_interactions', sa.Column('interaction_date', sa.DateTime(timezone=True), nullable=True))
    op.create_index('ix_interactions_interaction_date', 'crm_interactions', ['interaction_date'])


def downgrade() -> None:
    op.drop_index('ix_interactions_interaction_date', table_name='crm_interactions')
    op.drop_column('crm_interactions', 'interaction_date')

    op.drop_index('ix_interactions_thread_id', table_name='crm_interactions')
    op.drop_column('crm_interactions', 'thread_id')

    op.drop_index('ix_interactions_direction', table_name='crm_interactions')
    op.drop_column('crm_interactions', 'direction')

    op.drop_index('ix_interactions_external_unique', table_name='crm_interactions')
    op.drop_index('ix_interactions_external_id', table_name='crm_interactions')
    op.drop_index('ix_interactions_external_source', table_name='crm_interactions')
    op.drop_column('crm_interactions', 'external_id')
    op.drop_column('crm_interactions', 'external_source')
