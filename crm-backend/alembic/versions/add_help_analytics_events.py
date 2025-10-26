"""Add help analytics events table

Revision ID: add_help_analytics_events
Revises: add_campaign_subscriptions
Create Date: 2025-10-24

"""
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_help_analytics_events"
down_revision = "add_campaign_subscriptions"
branch_labels = None
depends_on = None


def upgrade():
    # Help Analytics Events
    op.create_table(
        'help_analytics_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.String(length=50), nullable=False, comment='Type: faq_view, faq_search, guide_view, tooltip_hover, tooltip_learn_more_click, article_rating, support_contact'),
        sa.Column('target_id', sa.String(length=255), nullable=True, comment='Identifiant de l\'élément ciblé (FAQ, guide, tooltip, etc.)"),
        sa.Column('event_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Contexte additionnel: catégorie, recherche, rating, feedback, etc.'),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()'), comment='Date/heure de l\'événement"),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE"),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes
    op.create_index('ix_help_analytics_events_user_id", "help_analytics_events', ['user_id'])
    op.create_index('ix_help_analytics_events_event_type", "help_analytics_events', ['event_type'])
    op.create_index('ix_help_analytics_events_target_id", "help_analytics_events', ['target_id'])
    op.create_index('ix_help_analytics_events_timestamp", "help_analytics_events', ['timestamp'])


def downgrade():
    op.drop_index('ix_help_analytics_events_timestamp', table_name='help_analytics_events')
    op.drop_index('ix_help_analytics_events_target_id', table_name='help_analytics_events')
    op.drop_index('ix_help_analytics_events_event_type', table_name='help_analytics_events')
    op.drop_index('ix_help_analytics_events_user_id', table_name='help_analytics_events')
    op.drop_table('help_analytics_events')
