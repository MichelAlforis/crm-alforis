"""Add IMAP credentials to users

Revision ID: 20251029_1216
Revises: 20251029_0135
Create Date: 2025-10-29 12:16:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251029_1216'
down_revision: Union[str, None] = '20251029_0135'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Ajouter colonnes IMAP à la table users
    op.add_column('users', sa.Column('imap_connected', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('imap_host', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('imap_email', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('encrypted_imap_password', sa.Text(), nullable=True))
    op.add_column('users', sa.Column('imap_connected_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Supprimer colonnes IMAP
    op.drop_column('users', 'imap_connected_at')
    op.drop_column('users', 'encrypted_imap_password')
    op.drop_column('users', 'imap_email')
    op.drop_column('users', 'imap_host')
    op.drop_column('users', 'imap_connected')
