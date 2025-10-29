"""Add EmailMessage and EmailAttachment tables for Email Sync Engine (Phase 1)

Revision ID: 70f7d1565097
Revises: 5c6b060270f1
Create Date: 2025-10-29 22:10:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '70f7d1565097'
down_revision: Union[str, None] = '5c6b060270f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # =========================================================================
    # PHASE 1: Email Sync Engine
    # =========================================================================

    # CREATE TABLE: email_messages
    op.create_table(
        'email_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('external_message_id', sa.String(length=500), nullable=False),
        sa.Column('thread_id', sa.String(length=255), nullable=True),
        sa.Column('in_reply_to', sa.String(length=500), nullable=True),
        sa.Column('subject', sa.Text(), nullable=True),
        sa.Column('sender_email', sa.String(length=255), nullable=False),
        sa.Column('sender_name', sa.String(length=255), nullable=True),
        sa.Column('recipients_to', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('recipients_cc', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('recipients_bcc', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('body_text', sa.Text(), nullable=True),
        sa.Column('body_html', sa.Text(), nullable=True),
        sa.Column('snippet', sa.String(length=500), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('labels', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('content_hash', sa.String(length=64), nullable=False),
        sa.Column('linked_person_id', sa.Integer(), nullable=True),
        sa.Column('linked_organisation_id', sa.Integer(), nullable=True),
        sa.Column('linked_interaction_id', sa.Integer(), nullable=True),
        sa.Column('is_compliance_relevant', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('compliance_tags', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['account_id'], ['user_email_accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['linked_interaction_id'], ['crm_interactions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['linked_organisation_id'], ['organisations.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['linked_person_id'], ['people.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # CREATE INDEXES: email_messages
    op.create_index('ix_email_messages_team_id', 'email_messages', ['team_id'])
    op.create_index('ix_email_messages_account_id', 'email_messages', ['account_id'])
    op.create_index('ix_email_messages_external_message_id', 'email_messages', ['external_message_id'])
    op.create_index('ix_email_messages_thread_id', 'email_messages', ['thread_id'])
    op.create_index('ix_email_messages_sender_email', 'email_messages', ['sender_email'])
    op.create_index('ix_email_messages_content_hash', 'email_messages', ['content_hash'])
    op.create_index('ix_email_messages_sent_at', 'email_messages', ['sent_at'])
    op.create_index('ix_email_messages_received_at', 'email_messages', ['received_at'])
    op.create_index('ix_email_messages_linked_person_id', 'email_messages', ['linked_person_id'])
    op.create_index('ix_email_messages_linked_organisation_id', 'email_messages', ['linked_organisation_id'])
    op.create_index('ix_email_messages_linked_interaction_id', 'email_messages', ['linked_interaction_id'])
    op.create_index('ix_email_messages_is_compliance_relevant', 'email_messages', ['is_compliance_relevant'])

    # Composite indexes for performance
    op.create_index('ix_email_messages_team_sent_at', 'email_messages', ['team_id', 'sent_at'])
    op.create_index('ix_email_messages_team_sender', 'email_messages', ['team_id', 'sender_email'])
    op.create_index('ix_email_messages_unique_hash', 'email_messages', ['team_id', 'account_id', 'content_hash'], unique=True)

    # CREATE TABLE: email_attachments
    op.create_table(
        'email_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('email_message_id', sa.Integer(), nullable=False),
        sa.Column('filename', sa.String(length=500), nullable=False),
        sa.Column('content_type', sa.String(length=200), nullable=True),
        sa.Column('size_bytes', sa.BigInteger(), nullable=False),
        sa.Column('content_hash_sha256', sa.String(length=64), nullable=True),
        sa.Column('is_inline', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('content_id', sa.String(length=255), nullable=True),
        sa.Column('storage_path', sa.String(length=1000), nullable=True),
        sa.Column('is_stored', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_compliance_document', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('compliance_category', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['email_message_id'], ['email_messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # CREATE INDEXES: email_attachments
    op.create_index('ix_email_attachments_team_id', 'email_attachments', ['team_id'])
    op.create_index('ix_email_attachments_email_message_id', 'email_attachments', ['email_message_id'])
    op.create_index('ix_email_attachments_content_hash_sha256', 'email_attachments', ['content_hash_sha256'])
    op.create_index('ix_email_attachments_team_hash', 'email_attachments', ['team_id', 'content_hash_sha256'])
    op.create_index('ix_email_attachments_compliance', 'email_attachments', ['team_id', 'is_compliance_document'])


def downgrade() -> None:
    # Drop tables in reverse order (FK dependencies)
    op.drop_index('ix_email_attachments_compliance', table_name='email_attachments')
    op.drop_index('ix_email_attachments_team_hash', table_name='email_attachments')
    op.drop_index('ix_email_attachments_content_hash_sha256', table_name='email_attachments')
    op.drop_index('ix_email_attachments_email_message_id', table_name='email_attachments')
    op.drop_index('ix_email_attachments_team_id', table_name='email_attachments')
    op.drop_table('email_attachments')

    op.drop_index('ix_email_messages_unique_hash', table_name='email_messages')
    op.drop_index('ix_email_messages_team_sender', table_name='email_messages')
    op.drop_index('ix_email_messages_team_sent_at', table_name='email_messages')
    op.drop_index('ix_email_messages_is_compliance_relevant', table_name='email_messages')
    op.drop_index('ix_email_messages_linked_interaction_id', table_name='email_messages')
    op.drop_index('ix_email_messages_linked_organisation_id', table_name='email_messages')
    op.drop_index('ix_email_messages_linked_person_id', table_name='email_messages')
    op.drop_index('ix_email_messages_received_at', table_name='email_messages')
    op.drop_index('ix_email_messages_sent_at', table_name='email_messages')
    op.drop_index('ix_email_messages_content_hash', table_name='email_messages')
    op.drop_index('ix_email_messages_sender_email', table_name='email_messages')
    op.drop_index('ix_email_messages_thread_id', table_name='email_messages')
    op.drop_index('ix_email_messages_external_message_id', table_name='email_messages')
    op.drop_index('ix_email_messages_account_id', table_name='email_messages')
    op.drop_index('ix_email_messages_team_id', table_name='email_messages')
    op.drop_table('email_messages')
