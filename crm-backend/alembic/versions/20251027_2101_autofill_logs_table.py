"""Add autofill_logs table

Revision ID: autofill_logs_v1
Revises: outlook_signatures_v1
Create Date: 2025-10-27 21:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'autofill_logs_v1'
down_revision: Union[str, None] = 'outlook_signatures_v1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Table de logs pour l'autofill

    Permet de:
    - Tracer toutes les suggestions faites
    - Calculer le taux d'acceptation par source
    - Métriques business (apply_rate, avg_confidence)
    - Démo commerciale avec chiffres réels
    """
    op.create_table(
        'autofill_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=False),  # person, organisation
        sa.Column('entity_id', sa.Integer(), nullable=True),  # NULL si entité pas encore créée
        sa.Column('field', sa.String(100), nullable=False),  # email, phone, country...
        sa.Column('old_value', sa.Text(), nullable=True),
        sa.Column('new_value', sa.Text(), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),  # 0-1
        sa.Column('source', sa.String(50), nullable=False),  # rules|db_pattern|outlook|llm
        sa.Column('applied', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('evidence_hash', sa.String(64), nullable=True),  # SHA-256 du snippet
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Indexes pour analytics
    op.create_index('ix_autofill_logs_user_id', 'autofill_logs', ['user_id'])
    op.create_index('ix_autofill_logs_entity', 'autofill_logs', ['entity_type', 'entity_id'])
    op.create_index('ix_autofill_logs_field', 'autofill_logs', ['field'])
    op.create_index('ix_autofill_logs_source', 'autofill_logs', ['source'])
    op.create_index('ix_autofill_logs_applied', 'autofill_logs', ['applied'])
    op.create_index('ix_autofill_logs_created_at', 'autofill_logs', ['created_at'])

    # Index composite pour métriques
    op.create_index(
        'ix_autofill_logs_source_applied',
        'autofill_logs',
        ['source', 'applied'],
    )


def downgrade() -> None:
    """Remove autofill_logs table"""
    op.drop_index('ix_autofill_logs_source_applied', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_created_at', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_applied', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_source', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_field', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_entity', table_name='autofill_logs')
    op.drop_index('ix_autofill_logs_user_id', table_name='autofill_logs')
    op.drop_table('autofill_logs')
