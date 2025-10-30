"""Add O365 OAuth fields to users (manual migration)

Revision ID: 20251029_1800
Revises: 20251029_1216
Create Date: 2025-10-29 18:00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20251029_1800'
down_revision = '20251029_1216'
branch_labels = None
depends_on = None


def upgrade():
    """
    Ajoute les champs pour la 2ème App OAuth (O365 - EWS/IMAP)
    """
    # Ajouter les colonnes O365 OAuth
    op.add_column('users', sa.Column('o365_connected', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('encrypted_o365_access_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('encrypted_o365_refresh_token', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('o365_token_expires_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('users', sa.Column('o365_consent_given', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('o365_consent_date', sa.DateTime(timezone=True), nullable=True))


def downgrade():
    """
    Supprime les champs O365 OAuth
    """
    op.drop_column('users', 'o365_consent_date')
    op.drop_column('users', 'o365_consent_given')
    op.drop_column('users', 'o365_token_expires_at')
    op.drop_column('users', 'encrypted_o365_refresh_token')
    op.drop_column('users', 'encrypted_o365_access_token')
    op.drop_column('users', 'o365_connected')
