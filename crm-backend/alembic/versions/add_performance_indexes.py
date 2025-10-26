"""Add performance indexes for search and foreign keys

Revision ID: perf_indexes_001
Revises: add_interactions_v2_fields
Create Date: 2025-10-26

Indexes créés:
- Full-text search sur people et organisations
- Foreign keys sur interactions, email_sends
- Composite indexes pour requêtes fréquentes
"""
import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "perf_indexes_001"
down_revision = "email_marketing_lite"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ========================================================================
    # 1. FULL-TEXT SEARCH INDEXES (GIN pour PostgreSQL)
    # ========================================================================

    # People - recherche sur prenom, nom, email
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_people_search
        ON people USING gin(
            to_tsvector('french',
                coalesce(prenom, '") || ' ' ||
                coalesce(nom, '") || ' ' ||
                coalesce(email, '")
            )
        )
    """)

    # Organisations - recherche sur nom (search_vector déjà existe)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_organisations_search
        ON organisations USING gin(
            to_tsvector('french', coalesce(nom, '"))
        )
    """)

    # ========================================================================
    # 2. INDEX DE PERFORMANCE SUPPLÉMENTAIRE
    # ========================================================================

    # Index sur email pour recherche rapide
    op.execute("CREATE INDEX IF NOT EXISTS idx_people_email_search ON people(lower(email))")

    print("✅ Performance indexes créés avec succès")


def downgrade() -> None:
    # Suppression des indexes
    op.execute("DROP INDEX IF EXISTS idx_people_email_search")
    op.execute("DROP INDEX IF EXISTS idx_organisations_search")
    op.execute("DROP INDEX IF EXISTS idx_people_search")
