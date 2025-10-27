"""add_pg_trgm_fuzzy_search

Revision ID: c9eb505dd41a
Revises: pwa_push_001
Create Date: 2025-10-27 12:25:27.299602+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9eb505dd41a'
down_revision: Union[str, None] = 'pwa_push_001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Active pg_trgm et crée les indexes de similarité"""
    # Activer l'extension pg_trgm
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # Index trigrammes pour organisations
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_organisations_nom_trgm "
        "ON organisations USING gin(nom gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_organisations_email_trgm "
        "ON organisations USING gin(email gin_trgm_ops)"
    )

    # Index trigrammes pour people
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_people_prenom_trgm "
        "ON people USING gin(prenom gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_people_nom_trgm "
        "ON people USING gin(nom gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_people_email_trgm "
        "ON people USING gin(personal_email gin_trgm_ops)"
    )

    # Index trigrammes pour mandats
    op.execute(
        "CREATE INDEX IF NOT EXISTS idx_mandats_number_trgm "
        "ON mandats USING gin(number gin_trgm_ops)"
    )
    # Note: type est un ENUM, on ne peut pas créer d'index trigramme dessus

    print("✅ Extension pg_trgm activée et indexes créés")


def downgrade() -> None:
    """Supprime les indexes"""
    op.execute("DROP INDEX IF EXISTS idx_mandats_number_trgm")
    op.execute("DROP INDEX IF EXISTS idx_people_email_trgm")
    op.execute("DROP INDEX IF EXISTS idx_people_nom_trgm")
    op.execute("DROP INDEX IF EXISTS idx_people_prenom_trgm")
    op.execute("DROP INDEX IF EXISTS idx_organisations_email_trgm")
    op.execute("DROP INDEX IF EXISTS idx_organisations_nom_trgm")
    print("✅ Indexes de similarité supprimés")
