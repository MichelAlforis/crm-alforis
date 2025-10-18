"""
Migration Alembic - Ajout Full-Text Search PostgreSQL

Cette migration ajoute:
- Colonne search_vector (tsvector) sur organisations
- Trigger pour maintenir search_vector à jour
- Index GIN pour recherche rapide

Usage:
    # Générer la migration
    alembic revision --autogenerate -m "Add full-text search"

    # Appliquer
    alembic upgrade head

    # Ou exécuter directement ce script
    python migrations/add_fulltext_search.py
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# Revision identifiers
revision = 'add_fulltext_search'
down_revision = None  # Mettre l'ID de la dernière migration
branch_labels = None
depends_on = None


def upgrade():
    """
    Ajoute Full-Text Search sur la table organisations
    """

    # 1. Ajouter colonne search_vector
    op.execute("""
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS search_vector tsvector;
    """)

    # 2. Créer fonction de mise à jour
    op.execute("""
        CREATE OR REPLACE FUNCTION organisations_search_trigger() RETURNS trigger AS $$
        BEGIN
          NEW.search_vector :=
            setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
            setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B') ||
            setweight(to_tsvector('french', COALESCE(NEW.description, '')), 'C') ||
            setweight(to_tsvector('french', COALESCE(NEW.notes, '')), 'D') ||
            setweight(to_tsvector('french', COALESCE(NEW.city, '')), 'D') ||
            setweight(to_tsvector('french', COALESCE(NEW.address, '')), 'D');

          RETURN NEW;
        END
        $$ LANGUAGE plpgsql;
    """)

    # 3. Créer trigger
    op.execute("""
        DROP TRIGGER IF EXISTS tsvector_update ON organisations;

        CREATE TRIGGER tsvector_update
        BEFORE INSERT OR UPDATE ON organisations
        FOR EACH ROW EXECUTE FUNCTION organisations_search_trigger();
    """)

    # 4. Remplir search_vector pour données existantes
    op.execute("""
        UPDATE organisations
        SET search_vector =
          setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
          setweight(to_tsvector('french', COALESCE(email, '')), 'B') ||
          setweight(to_tsvector('french', COALESCE(description, '')), 'C') ||
          setweight(to_tsvector('french', COALESCE(notes, '')), 'D') ||
          setweight(to_tsvector('french', COALESCE(city, '')), 'D') ||
          setweight(to_tsvector('french', COALESCE(address, '')), 'D');
    """)

    # 5. Créer index GIN pour recherche rapide
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_organisations_search
        ON organisations
        USING GIN(search_vector);
    """)

    print("✅ Full-Text Search ajouté sur organisations")


def downgrade():
    """
    Supprime Full-Text Search
    """

    # Supprimer index
    op.execute("""
        DROP INDEX IF EXISTS idx_organisations_search;
    """)

    # Supprimer trigger
    op.execute("""
        DROP TRIGGER IF EXISTS tsvector_update ON organisations;
    """)

    # Supprimer fonction
    op.execute("""
        DROP FUNCTION IF EXISTS organisations_search_trigger();
    """)

    # Supprimer colonne
    op.execute("""
        ALTER TABLE organisations
        DROP COLUMN IF EXISTS search_vector;
    """)

    print("❌ Full-Text Search supprimé de organisations")


if __name__ == '__main__':
    """
    Exécution directe (hors Alembic)
    """
    from core.database import engine
    from sqlalchemy import create_engine

    print("🔧 Application de la migration Full-Text Search...")

    with engine.connect() as connection:
        # Upgrade
        connection.execute(text("""
            ALTER TABLE organisations
            ADD COLUMN IF NOT EXISTS search_vector tsvector;
        """))

        connection.execute(text("""
            CREATE OR REPLACE FUNCTION organisations_search_trigger() RETURNS trigger AS $$
            BEGIN
              NEW.search_vector :=
                setweight(to_tsvector('french', COALESCE(NEW.name, '')), 'A') ||
                setweight(to_tsvector('french', COALESCE(NEW.email, '')), 'B') ||
                setweight(to_tsvector('french', COALESCE(NEW.description, '')), 'C') ||
                setweight(to_tsvector('french', COALESCE(NEW.notes, '')), 'D') ||
                setweight(to_tsvector('french', COALESCE(NEW.city, '')), 'D') ||
                setweight(to_tsvector('french', COALESCE(NEW.address, '')), 'D');

              RETURN NEW;
            END
            $$ LANGUAGE plpgsql;
        """))

        connection.execute(text("""
            DROP TRIGGER IF EXISTS tsvector_update ON organisations;

            CREATE TRIGGER tsvector_update
            BEFORE INSERT OR UPDATE ON organisations
            FOR EACH ROW EXECUTE FUNCTION organisations_search_trigger();
        """))

        connection.execute(text("""
            UPDATE organisations
            SET search_vector =
              setweight(to_tsvector('french', COALESCE(name, '')), 'A') ||
              setweight(to_tsvector('french', COALESCE(email, '')), 'B') ||
              setweight(to_tsvector('french', COALESCE(description, '')), 'C') ||
              setweight(to_tsvector('french', COALESCE(notes, '')), 'D') ||
              setweight(to_tsvector('french', COALESCE(city, '')), 'D') ||
              setweight(to_tsvector('french', COALESCE(address, '')), 'D');
        """))

        connection.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_organisations_search
            ON organisations
            USING GIN(search_vector);
        """))

        connection.commit()

    print("✅ Migration terminée!")
