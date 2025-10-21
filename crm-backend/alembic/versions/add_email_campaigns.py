"""Add email campaigns tables

Revision ID: add_email_campaigns
Revises:
Create Date: 2025-01-21

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_email_campaigns'
down_revision = None  # Remplacer par la dernière révision
branch_labels = None
depends_on = None


def upgrade():
    # Email Templates
    op.create_table(
        'email_templates',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('variables', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_templates_id'), 'email_templates', ['id'], unique=False)

    # Email Campaigns
    op.create_table(
        'email_campaigns',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('recipient_filters', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('total_recipients', sa.Integer(), default=0),
        sa.Column('emails_sent', sa.Integer(), default=0),
        sa.Column('emails_failed', sa.Integer(), default=0),
        sa.Column('emails_opened', sa.Integer(), default=0),
        sa.Column('emails_clicked', sa.Integer(), default=0),
        sa.Column('batch_size', sa.Integer(), default=600),
        sa.Column('delay_between_batches', sa.Integer(), default=60),
        sa.Column('status', sa.String(length=50), default='draft'),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['template_id'], ['email_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_campaigns_id'), 'email_campaigns', ['id'], unique=False)
    op.create_index(op.f('ix_email_campaigns_status'), 'email_campaigns', ['status'], unique=False)

    # Campaign Emails
    op.create_table(
        'campaign_emails',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('campaign_id', sa.Integer(), nullable=False),
        sa.Column('recipient_type', sa.String(length=50), nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('recipient_email', sa.String(length=255), nullable=False),
        sa.Column('recipient_name', sa.String(length=200), nullable=True),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('body_html', sa.Text(), nullable=False),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('personalization_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status', sa.String(length=50), default='pending'),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('opened_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('clicked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('batch_number', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['campaign_id'], ['email_campaigns.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_campaign_emails_id'), 'campaign_emails', ['id'], unique=False)
    op.create_index(op.f('ix_campaign_emails_campaign_id'), 'campaign_emails', ['campaign_id'], unique=False)
    op.create_index(op.f('ix_campaign_emails_status'), 'campaign_emails', ['status'], unique=False)
    op.create_index(op.f('ix_campaign_emails_batch_number'), 'campaign_emails', ['batch_number'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_campaign_emails_batch_number'), table_name='campaign_emails')
    op.drop_index(op.f('ix_campaign_emails_status'), table_name='campaign_emails')
    op.drop_index(op.f('ix_campaign_emails_campaign_id'), table_name='campaign_emails')
    op.drop_index(op.f('ix_campaign_emails_id'), table_name='campaign_emails')
    op.drop_table('campaign_emails')

    op.drop_index(op.f('ix_email_campaigns_status'), table_name='email_campaigns')
    op.drop_index(op.f('ix_email_campaigns_id'), table_name='email_campaigns')
    op.drop_table('email_campaigns')

    op.drop_index(op.f('ix_email_templates_id'), table_name='email_templates')
    op.drop_table('email_templates')
