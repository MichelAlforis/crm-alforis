"""merge audit and gdpr branches

Revision ID: 4c47046cc0a6
Revises: audit_logs_001, gdpr_001
Create Date: 2025-10-27 07:22:17.757874+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c47046cc0a6'
down_revision: Union[str, None] = ('audit_logs_001', 'gdpr_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
