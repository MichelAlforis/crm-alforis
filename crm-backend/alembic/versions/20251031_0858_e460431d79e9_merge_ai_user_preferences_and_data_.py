"""merge ai_user_preferences and data_access_logs branches

Revision ID: e460431d79e9
Revises: 45a3cf76f466, ai_user_pref_001
Create Date: 2025-10-31 08:58:28.021322+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e460431d79e9'
down_revision: Union[str, None] = ('45a3cf76f466', 'ai_user_pref_001')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
