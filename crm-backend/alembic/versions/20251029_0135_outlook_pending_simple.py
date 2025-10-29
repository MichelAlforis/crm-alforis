"""Add outlook_signatures_pending table (simplified)

Revision ID: 20251029_0135
Revises: a1e30df23bd7
Create Date: 2025-10-29 01:35:00.000000+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '20251029_0135'
down_revision: Union[str, None] = 'a1e30df23bd7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer table outlook_signatures_pending
    op.create_table(
        'outlook_signatures_pending',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('job_title', sa.String(length=255), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('source_message_id', sa.String(length=255), nullable=True),
        sa.Column('source_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending', comment='pending | approved | rejected'),
        sa.Column('rejection_reason', sa.String(length=255), nullable=True),
        sa.Column('is_likely_marketing', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('auto_detection_flags', sa.Text(), nullable=True, comment='JSON: raisons détection auto'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('validated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['validated_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_outlook_signatures_pending_email'), 'outlook_signatures_pending', ['email'], unique=False)
    op.create_index(op.f('ix_outlook_signatures_pending_status'), 'outlook_signatures_pending', ['status'], unique=False)
    op.create_index(op.f('ix_outlook_signatures_pending_user_id'), 'outlook_signatures_pending', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_outlook_signatures_pending_user_id'), table_name='outlook_signatures_pending')
    op.drop_index(op.f('ix_outlook_signatures_pending_status'), table_name='outlook_signatures_pending')
    op.drop_index(op.f('ix_outlook_signatures_pending_email'), table_name='outlook_signatures_pending')
    op.drop_table('outlook_signatures_pending')
