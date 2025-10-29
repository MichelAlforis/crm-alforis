"""Add AutofillSuggestion and AIMemory tables (Phase 2 - manual)

Revision ID: 18ed873149a1
Revises: ac2db27898c7
Create Date: 2025-10-29 23:04:00.000000+00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = '18ed873149a1'
down_revision: Union[str, None] = 'ac2db27898c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # AIMemory table
    op.create_table('ai_memory',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('model_used', sa.String(100), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('prompt_hash', sa.String(64), nullable=False),
        sa.Column('prompt_text', sa.Text(), nullable=False),
        sa.Column('response_json', postgresql.JSONB(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=True),
        sa.Column('processing_time_ms', sa.Integer(), nullable=True),
        sa.Column('tokens_used', sa.Integer(), nullable=True),
        sa.Column('cost_usd', sa.Float(), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('task_type', sa.String(50), nullable=False),
        sa.Column('source_email_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_email_id'], ['email_messages.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_memory_team_id', 'ai_memory', ['team_id'])
    op.create_index('ix_ai_memory_model_used', 'ai_memory', ['model_used'])
    op.create_index('ix_ai_memory_prompt_hash', 'ai_memory', ['prompt_hash'])
    op.create_index('ix_ai_memory_task_type', 'ai_memory', ['task_type'])
    op.create_index('ix_ai_memory_created_at', 'ai_memory', ['created_at'])
    op.create_index('ix_ai_memory_cache', 'ai_memory', ['team_id', 'prompt_hash'])
    op.create_index('ix_ai_memory_model_created', 'ai_memory', ['model_used', 'created_at'])
    op.create_index('ix_ai_memory_task_created', 'ai_memory', ['task_type', 'created_at'])

    # AutofillSuggestion table
    op.create_table('autofill_suggestions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('person_id', sa.Integer(), nullable=True),
        sa.Column('organisation_id', sa.Integer(), nullable=True),
        sa.Column('suggestion_type', sa.String(50), nullable=False),
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('current_value', sa.Text(), nullable=True),
        sa.Column('suggested_value', sa.Text(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('source_model', sa.String(100), nullable=False),
        sa.Column('reasoning', sa.Text(), nullable=True),
        sa.Column('email_id', sa.Integer(), nullable=True),
        sa.Column('interaction_id', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default=sa.text("'pending'")),
        sa.Column('reviewed_by', sa.Integer(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_applied', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('auto_applied_reason', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['person_id'], ['people.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organisation_id'], ['organisations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['email_id'], ['email_messages.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['interaction_id'], ['crm_interactions.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['reviewed_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_autofill_suggestions_team_id', 'autofill_suggestions', ['team_id'])
    op.create_index('ix_autofill_suggestions_person_id', 'autofill_suggestions', ['person_id'])
    op.create_index('ix_autofill_suggestions_organisation_id', 'autofill_suggestions', ['organisation_id'])
    op.create_index('ix_autofill_suggestions_suggestion_type', 'autofill_suggestions', ['suggestion_type'])
    op.create_index('ix_autofill_suggestions_status', 'autofill_suggestions', ['status'])
    op.create_index('ix_suggestions_team_status', 'autofill_suggestions', ['team_id', 'status'])
    op.create_index('ix_suggestions_team_created', 'autofill_suggestions', ['team_id', 'created_at'])
    op.create_index('ix_suggestions_person_status', 'autofill_suggestions', ['person_id', 'status'])

def downgrade() -> None:
    op.drop_table('autofill_suggestions')
    op.drop_table('ai_memory')
