"""Add autofill_decision_logs table for traceability

Revision ID: 20251028_add_autofill_decision_log
Revises: 20251028_add_known_companies
Create Date: 2025-10-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251028_add_autofill_decision_log'
down_revision = '20251028_add_known_companies'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create autofill_decision_logs table
    op.create_table(
        'autofill_decision_logs',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('input_id', sa.String(255), nullable=False, index=True, unique=True),
        sa.Column('input_hash', sa.String(64), nullable=False, index=True),
        sa.Column('decision', sa.String(50), nullable=False),
        sa.Column('person_id', sa.Integer(), sa.ForeignKey('people.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('organisation_id', sa.Integer(), sa.ForeignKey('organisations.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('interaction_id', sa.Integer(), sa.ForeignKey('organisation_interactions.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('scores_json', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('applied_by_user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('was_deduped', sa.Integer(), server_default='0', nullable=False),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # Create indexes for common queries
    op.create_index('idx_autofill_decision_person', 'autofill_decision_logs', ['person_id'])
    op.create_index('idx_autofill_decision_org', 'autofill_decision_logs', ['organisation_id'])
    op.create_index('idx_autofill_decision_interaction', 'autofill_decision_logs', ['interaction_id'])
    op.create_index('idx_autofill_decision_created', 'autofill_decision_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index('idx_autofill_decision_created', table_name='autofill_decision_logs')
    op.drop_index('idx_autofill_decision_interaction', table_name='autofill_decision_logs')
    op.drop_index('idx_autofill_decision_org', table_name='autofill_decision_logs')
    op.drop_index('idx_autofill_decision_person', table_name='autofill_decision_logs')
    op.drop_table('autofill_decision_logs')
