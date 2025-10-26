"""Add audit_logs table for change tracking

Revision ID: audit_logs_001
Revises: perf_indexes_001
Create Date: 2025-10-26

"""
import sqlalchemy as sa

from alembic import op

# revision identifiers
revision = "audit_logs_001"
down_revision = "perf_indexes_001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(length=50), nullable=False),
        sa.Column('entity_id', sa.Integer(), nullable=False),
        sa.Column('action', sa.String(length=20), nullable=False),
        sa.Column('field_name', sa.String(length=100), nullable=True),
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # Indexes
    op.create_index('idx_audit_entity', 'audit_logs', ['entity_type", "entity_id", "created_at'])
    op.create_index('idx_audit_user_date', 'audit_logs', ['user_id", "created_at'])
    op.create_index('idx_audit_action_date', 'audit_logs', ['action", "created_at'])
    op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'])
    op.create_index(op.f('ix_audit_logs_entity_type'), 'audit_logs', ['entity_type'])
    op.create_index(op.f('ix_audit_logs_entity_id'), 'audit_logs', ['entity_id'])
    op.create_index(op.f('ix_audit_logs_action'), 'audit_logs', ['action'])
    op.create_index(op.f('ix_audit_logs_user_id'), 'audit_logs', ['user_id'])
    op.create_index(op.f('ix_audit_logs_created_at'), 'audit_logs', ['created_at'])


def downgrade() -> None:
    op.drop_index(op.f('ix_audit_logs_created_at'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_user_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_action'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_id'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_entity_type'), table_name='audit_logs')
    op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
    op.drop_index('idx_audit_action_date', table_name='audit_logs')
    op.drop_index('idx_audit_user_date', table_name='audit_logs')
    op.drop_index('idx_audit_entity', table_name='audit_logs')
    op.drop_table('audit_logs')
