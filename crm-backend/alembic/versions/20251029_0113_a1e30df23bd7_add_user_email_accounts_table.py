"""add_user_email_accounts_table

Revision ID: a1e30df23bd7
Revises: 151e93144b29
Create Date: 2025-10-29 01:13:39.229495+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1e30df23bd7'
down_revision: Union[str, None] = '151e93144b29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Créer la table user_email_accounts pour supporter multi-comptes
    op.create_table(
        'user_email_accounts',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('provider', sa.String(50), nullable=False),  # 'outlook', 'gmail', etc.
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('is_primary', sa.Boolean(), default=False, nullable=False),
        sa.Column('is_active', sa.Boolean(), default=True, nullable=False),

        # OAuth tokens (chiffrés)
        sa.Column('encrypted_access_token', sa.Text(), nullable=True),
        sa.Column('encrypted_refresh_token', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),

        # RGPD
        sa.Column('consent_given', sa.Boolean(), default=False, nullable=False),
        sa.Column('consent_date', sa.DateTime(timezone=True), nullable=True),

        # Métadonnées Microsoft
        sa.Column('microsoft_user_id', sa.String(255), nullable=True),
        sa.Column('user_principal_name', sa.String(255), nullable=True),
        sa.Column('job_title', sa.String(255), nullable=True),
        sa.Column('office_location', sa.String(255), nullable=True),

        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), onupdate=sa.text('now()'), nullable=False),

        # Contraintes
        sa.UniqueConstraint('user_id', 'email', 'provider', name='uq_user_email_provider'),
    )

    # Index pour recherche rapide
    op.create_index('ix_user_email_accounts_user_id', 'user_email_accounts', ['user_id'])
    op.create_index('ix_user_email_accounts_provider', 'user_email_accounts', ['provider'])


def downgrade() -> None:
    op.drop_index('ix_user_email_accounts_provider')
    op.drop_index('ix_user_email_accounts_user_id')
    op.drop_table('user_email_accounts')
