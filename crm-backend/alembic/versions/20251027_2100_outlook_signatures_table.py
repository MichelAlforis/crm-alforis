"""Add outlook_signatures table

Revision ID: outlook_signatures_v1
Revises: outlook_integration_v1
Create Date: 2025-10-27 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'outlook_signatures_v1'
down_revision: Union[str, None] = 'outlook_integration_v1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Table pour stocker les signatures Outlook extraites

    Permet de:
    - Tracer la provenance des suggestions
    - Éviter de re-parser les mêmes emails
    - Métriques sur la qualité des sources
    """
    op.create_table(
        'outlook_signatures',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('email_domain', sa.String(255), nullable=True),
        sa.Column('source_message_id', sa.String(255), nullable=True),
        sa.Column('raw_html', sa.Text(), nullable=True),
        sa.Column('parsed_email', sa.String(255), nullable=True),
        sa.Column('parsed_phone', sa.String(50), nullable=True),
        sa.Column('parsed_job_title', sa.String(255), nullable=True),
        sa.Column('parsed_company', sa.String(255), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )

    # Indexes pour performance
    op.create_index('ix_outlook_signatures_user_id', 'outlook_signatures', ['user_id'])
    op.create_index('ix_outlook_signatures_email_domain', 'outlook_signatures', ['email_domain'])
    op.create_index('ix_outlook_signatures_parsed_email', 'outlook_signatures', ['parsed_email'])
    op.create_index('ix_outlook_signatures_received_at', 'outlook_signatures', ['received_at'])


def downgrade() -> None:
    """Remove outlook_signatures table"""
    op.drop_index('ix_outlook_signatures_received_at', table_name='outlook_signatures')
    op.drop_index('ix_outlook_signatures_parsed_email', table_name='outlook_signatures')
    op.drop_index('ix_outlook_signatures_email_domain', table_name='outlook_signatures')
    op.drop_index('ix_outlook_signatures_user_id', table_name='outlook_signatures')
    op.drop_table('outlook_signatures')
