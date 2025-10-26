"""
Script pour appliquer la migration AI Agent
Lance quand PostgreSQL est disponible
"""

import sys
from pathlib import Path

from sqlalchemy import create_engine, text

from core.config import settings


def apply_migration():
    """Applique la migration 001_add_ai_agent_tables.sql"""

    print("🔧 Application de la migration AI Agent...")

    # Lire le fichier SQL
    migration_file = Path(__file__).parent / "migrations" / "001_add_ai_agent_tables.sql"

    if not migration_file.exists():
        print(f"❌ Fichier de migration non trouvé: {migration_file}")
        sys.exit(1)

    with open(migration_file, 'r') as f:
        sql_content = f.read()

    # Connexion BDD
    try:
        engine = create_engine(settings.DATABASE_URL)

        with engine.begin() as conn:
            # Exécuter le SQL
            conn.execute(text(sql_content))
            print("✅ Migration appliquée avec succès!")

            # Vérifier les tables créées
            result = conn.execute(text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name LIKE 'ai_%'
                ORDER BY table_name
            """))

            tables = [row[0] for row in result]
            print(f"\n📊 Tables AI créées ({len(tables)}):")
            for table in tables:
                print(f"  ✓ {table}")

            # Vérifier la config par défaut
            result = conn.execute(text("SELECT COUNT(*) FROM ai_configurations"))
            config_count = result.scalar()
            print(f"\n⚙️  Configuration par défaut: {'✅ Créée' if config_count > 0 else '❌ Manquante'}")

    except Exception as e:
        print(f"❌ Erreur lors de la migration: {e}")
        sys.exit(1)

if __name__ == "__main__":
    apply_migration()
