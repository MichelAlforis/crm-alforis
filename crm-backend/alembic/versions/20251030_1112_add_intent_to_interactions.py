"""Add intent fields to interactions

Revision ID: 20251030_1112
Revises: 20251030_0815
Create Date: 2025-10-30 11:12:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_intent_fields_001'
down_revision = 'add_mistral_key_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add intent detection fields to crm_interactions table"""
    op.add_column('crm_interactions',
        sa.Column('intent', sa.String(50), nullable=True,
                  comment='Email intent detected by AI: meeting_request, info_request, follow_up, etc.')
    )
    op.add_column('crm_interactions',
        sa.Column('intent_confidence', sa.Float, nullable=True,
                  comment='AI confidence score for intent detection (0.0-1.0)')
    )
    op.add_column('crm_interactions',
        sa.Column('intent_detected_at', sa.DateTime(timezone=True), nullable=True,
                  comment='Timestamp when intent was detected')
    )

    # Index for filtering by intent
    op.create_index('ix_crm_interactions_intent', 'crm_interactions', ['intent'])


def downgrade() -> None:
    """Remove intent detection fields from crm_interactions table"""
    op.drop_index('ix_crm_interactions_intent', table_name='crm_interactions')
    op.drop_column('crm_interactions', 'intent_detected_at')
    op.drop_column('crm_interactions', 'intent_confidence')
    op.drop_column('crm_interactions', 'intent')
