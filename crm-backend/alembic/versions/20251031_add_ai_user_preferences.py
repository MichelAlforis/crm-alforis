"""add_ai_user_preferences

Revision ID: ai_user_pref_001
Revises: add_email_threads
Create Date: 2025-10-31 11:30:00

Phase 3 - AI Memory & Learning System
Table pour stocker les préférences utilisateur apprises depuis Context Menu
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'ai_user_pref_001'
down_revision = 'add_email_threads'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create ai_user_preferences table"""
    op.create_table(
        'ai_user_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),

        # Context
        sa.Column('field_name', sa.String(length=100), nullable=False),
        sa.Column('context_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=True),

        # Suggestion
        sa.Column('suggested_value', sa.Text(), nullable=True),
        sa.Column('suggestion_source', sa.String(length=50), nullable=True),
        sa.Column('suggestion_confidence', sa.Float(), nullable=True),
        sa.Column('suggestion_rank', sa.Integer(), nullable=True),

        # User choice
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('final_value', sa.Text(), nullable=True),

        # Metadata
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(), nullable=False),

        # Primary key
        sa.PrimaryKeyConstraint('id'),

        # Foreign keys
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
    )

    # Indexes
    op.create_index('idx_ai_pref_user_field', 'ai_user_preferences', ['user_id', 'field_name', 'action'], unique=False)
    op.create_index('idx_ai_pref_team_field', 'ai_user_preferences', ['team_id', 'field_name', 'action'], unique=False)
    op.create_index('idx_ai_pref_expires', 'ai_user_preferences', ['expires_at'], unique=False)
    op.create_index('idx_ai_pref_created', 'ai_user_preferences', ['created_at', 'action'], unique=False)
    op.create_index('idx_ai_pref_user_recent', 'ai_user_preferences', ['user_id', 'created_at'], unique=False)

    # Simple indexes
    op.create_index(op.f('ix_ai_user_preferences_user_id'), 'ai_user_preferences', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_user_preferences_team_id'), 'ai_user_preferences', ['team_id'], unique=False)
    op.create_index(op.f('ix_ai_user_preferences_field_name'), 'ai_user_preferences', ['field_name'], unique=False)
    op.create_index(op.f('ix_ai_user_preferences_action'), 'ai_user_preferences', ['action'], unique=False)


def downgrade() -> None:
    """Drop ai_user_preferences table"""
    op.drop_index(op.f('ix_ai_user_preferences_action'), table_name='ai_user_preferences')
    op.drop_index(op.f('ix_ai_user_preferences_field_name'), table_name='ai_user_preferences')
    op.drop_index(op.f('ix_ai_user_preferences_team_id'), table_name='ai_user_preferences')
    op.drop_index(op.f('ix_ai_user_preferences_user_id'), table_name='ai_user_preferences')
    op.drop_index('idx_ai_pref_user_recent', table_name='ai_user_preferences')
    op.drop_index('idx_ai_pref_created', table_name='ai_user_preferences')
    op.drop_index('idx_ai_pref_expires', table_name='ai_user_preferences')
    op.drop_index('idx_ai_pref_team_field', table_name='ai_user_preferences')
    op.drop_index('idx_ai_pref_user_field', table_name='ai_user_preferences')
    op.drop_table('ai_user_preferences')
