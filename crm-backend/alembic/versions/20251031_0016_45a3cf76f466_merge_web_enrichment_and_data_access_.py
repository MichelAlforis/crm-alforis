"""merge web_enrichment and data_access_logs

Revision ID: 45a3cf76f466
Revises: web_enrichment_001, add_data_access_logs
Create Date: 2025-10-31 00:16:58.014449+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45a3cf76f466'
down_revision: Union[str, None] = ('web_enrichment_001', 'add_data_access_logs')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
