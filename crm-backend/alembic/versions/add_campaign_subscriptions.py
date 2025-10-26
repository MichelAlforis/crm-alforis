"""Add campaign subscriptions table

Revision ID: add_campaign_subscriptions
Revises: add_mailing_lists
Create Date: 2025-01-23

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "add_campaign_subscriptions"
down_revision = "add_mailing_lists"
branch_labels = None
depends_on = None


def upgrade():
    # Campaign Subscriptions
    op.create_table(
        'campaign_subscriptions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('person_id', sa.Integer(), nullable=True),
        sa.Column('organisation_id', sa.Integer(), nullable=True),
        sa.Column('subscribed_by', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true"),
        sa.Column('unsubscribed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()"), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['email_campaigns.id'], ondelete='CASCADE"),
        sa.ForeignKeyConstraint(['person_id'], ['people.id'], ondelete='CASCADE"),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE"),
        sa.ForeignKeyConstraint(['subscribed_by'], ['users.id'], ondelete='SET NULL"),
        sa.PrimaryKeyConstraint("id")
    )

    # Indexes
    op.create_index('idx_campaign_subscriptions_campaign", "campaign_subscriptions', ['campaign_id'])
    op.create_index('idx_campaign_subscriptions_person", "campaign_subscriptions', ['person_id'])
    op.create_index('idx_campaign_subscriptions_organisation", "campaign_subscriptions', ['organisation_id'])
    op.create_index(
        'idx_campaign_subscriptions_unique',
        'campaign_subscriptions',
        ['campaign_id", "person_id", "organisation_id'],
        unique=True
    )


def downgrade():
    op.drop_index('idx_campaign_subscriptions_unique', table_name='campaign_subscriptions")
    op.drop_index('idx_campaign_subscriptions_organisation', table_name='campaign_subscriptions")
    op.drop_index('idx_campaign_subscriptions_person', table_name='campaign_subscriptions")
    op.drop_index('idx_campaign_subscriptions_campaign', table_name='campaign_subscriptions")
    op.drop_table('campaign_subscriptions")
