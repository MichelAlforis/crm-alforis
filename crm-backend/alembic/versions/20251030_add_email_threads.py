"""Add email_threads table and email_thread_id to interactions

Revision ID: add_email_threads
Revises: (auto-detect latest)
Create Date: 2025-10-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_email_threads'
down_revision = None  # Will be auto-detected when running alembic upgrade
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create email_threads table and add email_thread_id to crm_interactions.
    """
    # Create email_threads table
    op.create_table(
        'email_threads',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('thread_id', sa.String(length=255), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('subject', sa.String(length=500), nullable=False),
        sa.Column('original_subject', sa.String(length=500), nullable=True),
        sa.Column('participants', sa.JSON(), nullable=False),
        sa.Column('first_interaction_id', sa.Integer(), nullable=True),
        sa.Column('last_interaction_id', sa.Integer(), nullable=True),
        sa.Column('email_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('first_email_at', sa.DateTime(), nullable=True),
        sa.Column('last_email_at', sa.DateTime(), nullable=True),

        # Primary Key
        sa.PrimaryKeyConstraint('id'),

        # Foreign Keys
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['first_interaction_id'], ['crm_interactions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['last_interaction_id'], ['crm_interactions.id'], ondelete='SET NULL'),
    )

    # Create indexes
    op.create_index('ix_email_threads_id', 'email_threads', ['id'])
    op.create_index('ix_email_threads_thread_id', 'email_threads', ['thread_id'], unique=True)
    op.create_index('ix_email_threads_team_id', 'email_threads', ['team_id'])
    op.create_index('ix_email_threads_subject', 'email_threads', ['subject'])
    op.create_index('ix_email_threads_first_interaction_id', 'email_threads', ['first_interaction_id'])
    op.create_index('ix_email_threads_last_interaction_id', 'email_threads', ['last_interaction_id'])
    op.create_index('ix_email_threads_first_email_at', 'email_threads', ['first_email_at'])
    op.create_index('ix_email_threads_last_email_at', 'email_threads', ['last_email_at'])

    # Composite indexes for performance
    op.create_index('ix_email_threads_team_subject', 'email_threads', ['team_id', 'subject'])
    op.create_index('ix_email_threads_team_updated', 'email_threads', ['team_id', sa.text('updated_at DESC')])
    op.create_index('ix_email_threads_team_last_email', 'email_threads', ['team_id', sa.text('last_email_at DESC')])

    # Add email_thread_id column to crm_interactions
    op.add_column(
        'crm_interactions',
        sa.Column('email_thread_id', sa.Integer(), nullable=True)
    )

    # Add FK constraint
    op.create_foreign_key(
        'fk_crm_interactions_email_thread_id',
        'crm_interactions',
        'email_threads',
        ['email_thread_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add index
    op.create_index('ix_crm_interactions_email_thread_id', 'crm_interactions', ['email_thread_id'])


def downgrade() -> None:
    """
    Reverse the migration.
    """
    # Remove email_thread_id from crm_interactions
    op.drop_index('ix_crm_interactions_email_thread_id', table_name='crm_interactions')
    op.drop_constraint('fk_crm_interactions_email_thread_id', 'crm_interactions', type_='foreignkey')
    op.drop_column('crm_interactions', 'email_thread_id')

    # Drop email_threads table (indexes will be dropped automatically)
    op.drop_index('ix_email_threads_team_last_email', table_name='email_threads')
    op.drop_index('ix_email_threads_team_updated', table_name='email_threads')
    op.drop_index('ix_email_threads_team_subject', table_name='email_threads')
    op.drop_index('ix_email_threads_last_email_at', table_name='email_threads')
    op.drop_index('ix_email_threads_first_email_at', table_name='email_threads')
    op.drop_index('ix_email_threads_last_interaction_id', table_name='email_threads')
    op.drop_index('ix_email_threads_first_interaction_id', table_name='email_threads')
    op.drop_index('ix_email_threads_subject', table_name='email_threads')
    op.drop_index('ix_email_threads_team_id', table_name='email_threads')
    op.drop_index('ix_email_threads_thread_id', table_name='email_threads')
    op.drop_index('ix_email_threads_id', table_name='email_threads')
    op.drop_table('email_threads')
