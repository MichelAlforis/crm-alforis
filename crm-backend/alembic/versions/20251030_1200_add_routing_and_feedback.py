"""Add routing_rule and ai_feedback tables for Acte IV.2

Revision ID: add_routing_feedback_001
Revises: add_mistral_key_001
Create Date: 2025-10-30 12:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_routing_feedback_001'
down_revision = '20251030_1130'  # Latest head
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ============================================================
    # 1. Create routing_rules table
    # ============================================================
    op.create_table('routing_rules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False, comment='Rule name'),
        sa.Column('description', sa.String(length=500), nullable=True, comment='Optional description'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', comment='Enable/disable rule'),
        sa.Column('priority', sa.Integer(), nullable=False, server_default='0', comment='Higher priority rules execute first'),
        sa.Column('intent_trigger', sa.String(length=50), nullable=False, comment='Intent that triggers this rule'),
        sa.Column('min_confidence', sa.Integer(), nullable=False, server_default='70', comment='Minimum confidence (0-100) to trigger'),
        sa.Column('conditions', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Additional filters'),
        sa.Column('actions', postgresql.JSON(astext_type=sa.Text()), nullable=False, comment='List of actions to execute'),
        sa.Column('execution_count', sa.Integer(), nullable=False, server_default='0', comment='Number of times rule was triggered'),
        sa.Column('last_executed_at', sa.DateTime(timezone=True), nullable=True, comment='Last execution timestamp'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, onupdate=sa.text('now()')),
        sa.Column('created_by', sa.String(length=100), nullable=True),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_routing_rules_team_id', 'routing_rules', ['team_id'])
    op.create_index('ix_routing_rules_intent_trigger', 'routing_rules', ['intent_trigger'])
    op.create_index('ix_routing_rules_is_active', 'routing_rules', ['is_active'])

    # ============================================================
    # 2. Create ai_feedback table
    # ============================================================
    op.create_table('ai_feedback',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('prediction_type', sa.String(length=50), nullable=False, comment='Type: signature_parsing, intent_detection, etc.'),
        sa.Column('reference_id', sa.Integer(), nullable=True, comment='ID of AutofillSuggestion, AIMemory, etc.'),
        sa.Column('model_used', sa.String(length=50), nullable=True, comment='Model that made the prediction'),
        sa.Column('original_prediction', postgresql.JSON(astext_type=sa.Text()), nullable=False, comment='What AI predicted'),
        sa.Column('original_confidence', sa.Float(), nullable=True, comment='Original confidence score'),
        sa.Column('corrected_data', postgresql.JSON(astext_type=sa.Text()), nullable=False, comment='User corrected version'),
        sa.Column('feedback_type', sa.String(length=20), nullable=False, comment='Type: accepted, corrected, rejected'),
        sa.Column('user_notes', sa.Text(), nullable=True, comment='Optional feedback from user'),
        sa.Column('error_categories', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Categories of errors'),
        sa.Column('context', postgresql.JSON(astext_type=sa.Text()), nullable=True, comment='Additional context'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_feedback_team_id', 'ai_feedback', ['team_id'])
    op.create_index('ix_ai_feedback_user_id', 'ai_feedback', ['user_id'])
    op.create_index('ix_ai_feedback_prediction_type', 'ai_feedback', ['prediction_type'])
    op.create_index('ix_ai_feedback_feedback_type', 'ai_feedback', ['feedback_type'])

    # ============================================================
    # 3. Create ai_accuracy_metrics table
    # ============================================================
    op.create_table('ai_accuracy_metrics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('prediction_type', sa.String(length=50), nullable=False),
        sa.Column('model_name', sa.String(length=50), nullable=False),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False, comment='Date of metrics (daily aggregation)'),
        sa.Column('total_predictions', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('accepted_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('corrected_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('rejected_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('accuracy_rate', sa.Float(), nullable=True, comment='% accepted / total'),
        sa.Column('correction_rate', sa.Float(), nullable=True, comment='% corrected / total'),
        sa.Column('rejection_rate', sa.Float(), nullable=True, comment='% rejected / total'),
        sa.Column('avg_confidence_accepted', sa.Float(), nullable=True),
        sa.Column('avg_confidence_corrected', sa.Float(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True, onupdate=sa.text('now()')),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_ai_accuracy_metrics_team_id', 'ai_accuracy_metrics', ['team_id'])
    op.create_index('ix_ai_accuracy_metrics_prediction_type', 'ai_accuracy_metrics', ['prediction_type'])
    op.create_index('ix_ai_accuracy_metrics_model_name', 'ai_accuracy_metrics', ['model_name'])
    op.create_index('ix_ai_accuracy_metrics_date', 'ai_accuracy_metrics', ['date'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('ai_accuracy_metrics')
    op.drop_table('ai_feedback')
    op.drop_table('routing_rules')
