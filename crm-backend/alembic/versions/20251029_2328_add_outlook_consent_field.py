"""add_outlook_consent_field

Revision ID: 20251029_2328
Revises: 20251028_add_known_companies
Create Date: 2025-10-29 23:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251029_2328'
down_revision: Union[str, None] = '20251028_add_known_companies'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Ajoute le champ outlook_consent_given pour tracker le consentement RGPD explicite
    """
    op.add_column('users', sa.Column('outlook_consent_given', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('outlook_consent_date', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """
    Supprime les champs de consentement Outlook
    """
    op.drop_column('users', 'outlook_consent_date')
    op.drop_column('users', 'outlook_consent_given')
