"""Add encrypted_mistral_key to ai_configurations

Revision ID: add_mistral_key_001
Revises:
Create Date: 2025-10-30 08:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_mistral_key_001'
down_revision = '18ed873149a1'  # add_autofillsuggestion_and_aimemory
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add encrypted_mistral_key column to ai_configurations table"""
    op.add_column('ai_configurations',
        sa.Column('encrypted_mistral_key', sa.Text(), nullable=True,
                  comment='Clé Mistral AI chiffrée (EU - RGPD)')
    )


def downgrade() -> None:
    """Remove encrypted_mistral_key column from ai_configurations table"""
    op.drop_column('ai_configurations', 'encrypted_mistral_key')
