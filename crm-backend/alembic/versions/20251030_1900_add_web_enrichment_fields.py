"""Add web enrichment fields to autofill_suggestions

Revision ID: web_enrichment_001
Revises: add_routing_feedback_001
Create Date: 2025-10-30 19:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'web_enrichment_001'
down_revision = 'add_routing_feedback_001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add web enrichment tracking fields to autofill_suggestions"""

    # Add web_enriched flag
    op.add_column(
        'autofill_suggestions',
        sa.Column('web_enriched', sa.Boolean(), nullable=False, server_default='false')
    )

    # Add enrichment confidence score
    op.add_column(
        'autofill_suggestions',
        sa.Column('enrichment_confidence', sa.Float(), nullable=True)
    )

    # Add enrichment source (serpapi, brave, custom, etc.)
    op.add_column(
        'autofill_suggestions',
        sa.Column('enrichment_source', sa.String(50), nullable=True)
    )

    # Add enriched_at timestamp
    op.add_column(
        'autofill_suggestions',
        sa.Column('enriched_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Create index for filtering by web_enriched
    op.create_index(
        'ix_autofill_suggestions_web_enriched',
        'autofill_suggestions',
        ['web_enriched']
    )

    # Create index for filtering by enrichment_source
    op.create_index(
        'ix_autofill_suggestions_enrichment_source',
        'autofill_suggestions',
        ['enrichment_source']
    )


def downgrade() -> None:
    """Remove web enrichment fields"""

    # Drop indexes
    op.drop_index('ix_autofill_suggestions_enrichment_source', table_name='autofill_suggestions')
    op.drop_index('ix_autofill_suggestions_web_enriched', table_name='autofill_suggestions')

    # Drop columns
    op.drop_column('autofill_suggestions', 'enriched_at')
    op.drop_column('autofill_suggestions', 'enrichment_source')
    op.drop_column('autofill_suggestions', 'enrichment_confidence')
    op.drop_column('autofill_suggestions', 'web_enriched')
