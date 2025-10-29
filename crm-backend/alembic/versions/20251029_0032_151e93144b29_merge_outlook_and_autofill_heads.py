"""merge_outlook_and_autofill_heads

Revision ID: 151e93144b29
Revises: autofill_decision_v1, 20251029_2328
Create Date: 2025-10-29 00:32:46.512492+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '151e93144b29'
down_revision: Union[str, None] = ('autofill_decision_v1', '20251029_2328')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
