"""
Script de nettoyage des anciennes tables après migration réussie

⚠️  ATTENTION: Ce script supprime définitivement les anciennes tables!
Utilisez-le UNIQUEMENT après avoir:
1. Vérifié que la migration a réussi
2. Testé l'application avec les nouvelles tables
3. Fait un backup de sécurité

Usage:
    python migrations/cleanup_old_tables.py --dry-run  # Simulation
    python migrations/cleanup_old_tables.py --execute  # Suppression réelle
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from core.database import get_db


def cleanup_old_tables(db, dry_run: bool = True):
    """
    Supprime les anciennes tables devenues obsolètes
    """
    print("\n" + "="*80)
    print("🗑️  NETTOYAGE DES ANCIENNES TABLES")
    print("="*80)

    # Tables à supprimer
    tables_to_drop = [
        # Tables Investor
        "kpis",
        "interactions",
        "contacts",
        "investors",

        # Tables Fournisseur
        "fournisseur_kpis",
        "fournisseur_interactions",
        "fournisseur_contacts",
        "fournisseurs",

        # Table OrganisationContact (remplacée par PersonOrganizationLink)
        "organisation_contacts",
    ]

    # Enums à supprimer
    enums_to_drop = [
        "clienttype",
        "stagefournisseur",
        "typefournisseur",
    ]

    print(f"\n📊 Tables à supprimer: {len(tables_to_drop)}")
    for table in tables_to_drop:
        print(f"  - {table}")

    print(f"\n📊 Enums à supprimer: {len(enums_to_drop)}")
    for enum in enums_to_drop:
        print(f"  - {enum}")

    if dry_run:
        print("\n🔍 [DRY-RUN] Aucune suppression effectuée")
        return True

    # Demander confirmation
    print("\n" + "="*80)
    print("⚠️  ATTENTION: Cette action est IRREVERSIBLE!")
    print("="*80)
    response = input("\nTaper 'CONFIRMER' pour supprimer définitivement ces tables: ")

    if response != "CONFIRMER":
        print("❌ Annulé par l'utilisateur")
        return False

    try:
        # Supprimer les tables (en ordre inverse des dépendances)
        print("\n🗑️  Suppression des tables...")
        for table in tables_to_drop:
            try:
                db.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE;"))
                print(f"  ✅ Table {table} supprimée")
            except Exception as e:
                print(f"  ⚠️  {table}: {e}")

        # Supprimer les enums
        print("\n🗑️  Suppression des enums...")
        for enum in enums_to_drop:
            try:
                db.execute(text(f"DROP TYPE IF EXISTS {enum} CASCADE;"))
                print(f"  ✅ Enum {enum} supprimé")
            except Exception as e:
                print(f"  ⚠️  {enum}: {e}")

        db.commit()

        print("\n" + "="*80)
        print("✅ NETTOYAGE TERMINÉ AVEC SUCCÈS")
        print("="*80)
        print("\n📝 Anciennes tables supprimées:")
        print(f"   - {len(tables_to_drop)} tables")
        print(f"   - {len(enums_to_drop)} enums")
        print("\n💡 Vous pouvez maintenant supprimer les anciens fichiers modèles:")
        print("   rm crm-backend/models/investor.py")
        print("   rm crm-backend/models/fournisseur.py")
        print("   rm crm-backend/schemas/investor.py")
        print("   rm crm-backend/schemas/fournisseur.py")

        return True

    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        db.rollback()
        return False


def verify_migration_completed(db) -> bool:
    """
    Vérifie que la migration est bien terminée avant de nettoyer
    """
    print("\n" + "="*80)
    print("🔍 VÉRIFICATION PRÉ-NETTOYAGE")
    print("="*80)

    checks = []

    # Vérifier que Organisation a les nouvelles colonnes
    try:
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'organisations'
            AND column_name IN ('type', 'pipeline_stage', 'email', 'main_phone');
        """))
        cols = [row[0] for row in result]
        if len(cols) == 4:
            print("✅ Organisation a les nouvelles colonnes")
            checks.append(True)
        else:
            print(f"❌ Organisation manque des colonnes: {4 - len(cols)}")
            checks.append(False)
    except Exception as e:
        print(f"❌ Erreur vérification Organisation: {e}")
        checks.append(False)

    # Compter les organisations
    try:
        result = db.execute(text("SELECT COUNT(*) FROM organisations;"))
        org_count = result.scalar()
        print(f"✅ {org_count} organisations dans la base")
        checks.append(org_count > 0)
    except Exception as e:
        print(f"❌ Erreur comptage organisations: {e}")
        checks.append(False)

    # Compter les personnes
    try:
        result = db.execute(text("SELECT COUNT(*) FROM people;"))
        people_count = result.scalar()
        print(f"✅ {people_count} personnes dans la base")
        checks.append(people_count > 0)
    except Exception as e:
        print(f"❌ Erreur comptage personnes: {e}")
        checks.append(False)

    # Compter les liens Person ↔ Organisation
    try:
        result = db.execute(text("SELECT COUNT(*) FROM person_org_links;"))
        links_count = result.scalar()
        print(f"✅ {links_count} liens Person ↔ Organisation")
        checks.append(links_count > 0)
    except Exception as e:
        print(f"❌ Erreur comptage liens: {e}")
        checks.append(False)

    all_ok = all(checks)

    if all_ok:
        print("\n✅ Toutes les vérifications sont passées")
        print("✅ La migration semble complète, nettoyage possible")
    else:
        print("\n❌ Certaines vérifications ont échoué")
        print("⚠️  Ne supprimez PAS les anciennes tables avant d'avoir corrigé!")

    return all_ok


def main():
    parser = argparse.ArgumentParser(
        description="Nettoyage des anciennes tables après migration"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulation sans suppression'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Exécuter réellement le nettoyage'
    )
    parser.add_argument(
        '--skip-verification',
        action='store_true',
        help='Ignorer les vérifications de sécurité (NON RECOMMANDÉ)'
    )

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("❌ Vous devez spécifier --dry-run ou --execute")
        parser.print_help()
        sys.exit(1)

    dry_run = args.dry_run

    print("\n" + "="*80)
    print("🗑️  NETTOYAGE POST-MIGRATION")
    print("="*80)
    print(f"Mode: {'🔍 DRY-RUN' if dry_run else '⚡ EXÉCUTION RÉELLE'}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    db = next(get_db())

    try:
        # Vérifications de sécurité
        if not args.skip_verification:
            if not verify_migration_completed(db):
                print("\n❌ Vérifications échouées. Arrêt.")
                print("💡 Utilisez --skip-verification pour forcer (NON RECOMMANDÉ)")
                sys.exit(1)

        # Nettoyage
        success = cleanup_old_tables(db, dry_run)

        if not success:
            sys.exit(1)

    except Exception as e:
        print(f"\n❌ ERREUR FATALE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
