"""
Script de migration: Fournisseur → Organisation

Ce script migre les données existantes de la table 'fournisseurs'
vers la nouvelle table 'organisations'.

Étapes:
1. Créer les nouvelles tables (organisations, mandats_distribution, produits, etc.)
2. Migrer les données de fournisseurs vers organisations
3. Créer un mandat 'proposé' par défaut pour chaque fournisseur existant
4. Migrer les contacts, interactions et KPIs

Usage:
    python scripts/migrate_fournisseur_to_organisation.py [--dry-run]

Options:
    --dry-run: Afficher les migrations sans les exécuter
"""

import sys
import os
import argparse
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

# Ajouter le répertoire parent au path pour importer les modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import engine, SessionLocal
from models import Base, Fournisseur, Organisation, MandatDistribution, OrganisationContact
from models.organisation import OrganisationCategory, MandatStatus


# Mapping des types de fournisseurs vers les catégories d'organisations
TYPE_FOURNISSEUR_TO_CATEGORY = {
    'asset_manager': OrganisationCategory.WHOLESALE,
    'prestataire': OrganisationCategory.AUTRES,
    'distributeur': OrganisationCategory.WHOLESALE,
    'assurance': OrganisationCategory.INSTITUTION,
    'autre': OrganisationCategory.AUTRES,
}


def create_tables(dry_run=False):
    """Créer les nouvelles tables"""
    print("\n=== Création des nouvelles tables ===")
    if dry_run:
        print("[DRY RUN] Les tables suivantes seraient créées:")
        print("  - organisations")
        print("  - organisation_contacts")
        print("  - mandats_distribution")
        print("  - produits")
        print("  - mandat_produits")
        print("  - interactions (nouvelle version)")
        return

    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables créées avec succès")
    except Exception as e:
        print(f"❌ Erreur lors de la création des tables: {e}")
        raise


def migrate_fournisseurs(db: Session, dry_run=False):
    """Migrer les fournisseurs vers organisations"""
    print("\n=== Migration des fournisseurs vers organisations ===")

    fournisseurs = db.query(Fournisseur).all()
    print(f"📊 {len(fournisseurs)} fournisseurs trouvés")

    migration_count = 0
    for fournisseur in fournisseurs:
        # Déterminer la catégorie en fonction du type_fournisseur
        category = TYPE_FOURNISSEUR_TO_CATEGORY.get(
            fournisseur.type_fournisseur,
            OrganisationCategory.AUTRES
        )

        if dry_run:
            print(f"\n[DRY RUN] Migration de: {fournisseur.name}")
            print(f"  Type: {fournisseur.type_fournisseur} → Catégorie: {category}")
            print(f"  Langue: {fournisseur.language or 'FR'}")
            print(f"  Email: {fournisseur.email}")
            continue

        # Vérifier si l'organisation existe déjà (en cas de re-run)
        existing = db.query(Organisation).filter(
            Organisation.name == fournisseur.name
        ).first()

        if existing:
            print(f"⚠️  Organisation déjà existante: {fournisseur.name} (ID: {existing.id})")
            continue

        try:
            # Créer l'organisation
            organisation = Organisation(
                name=fournisseur.name,
                category=category,
                website=fournisseur.website,
                country_code=fournisseur.country_code,
                language=fournisseur.language or 'FR',
                notes=fournisseur.notes,
                is_active=fournisseur.is_active,
                created_at=fournisseur.created_at,
                updated_at=fournisseur.updated_at,
            )
            db.add(organisation)
            db.flush()  # Obtenir l'ID sans commit

            # Créer un mandat par défaut
            # Le statut dépend du stage du fournisseur
            if fournisseur.stage == 'client':
                mandat_status = MandatStatus.ACTIF
            elif fournisseur.stage == 'en_negociation':
                mandat_status = MandatStatus.PROPOSE
            else:
                mandat_status = MandatStatus.PROPOSE

            mandat = MandatDistribution(
                organisation_id=organisation.id,
                status=mandat_status,
                notes=f"Mandat créé automatiquement lors de la migration depuis Fournisseur (stage: {fournisseur.stage})",
                created_at=fournisseur.created_at,
                updated_at=fournisseur.updated_at,
            )
            db.add(mandat)

            migration_count += 1
            print(f"✅ Migré: {fournisseur.name} → Organisation ID {organisation.id} (Mandat: {mandat_status})")

        except Exception as e:
            print(f"❌ Erreur lors de la migration de {fournisseur.name}: {e}")
            db.rollback()
            raise

    if not dry_run:
        db.commit()
        print(f"\n✅ {migration_count} fournisseurs migrés avec succès")


def migrate_contacts(db: Session, dry_run=False):
    """Migrer les contacts de fournisseurs vers organisation_contacts"""
    print("\n=== Migration des contacts ===")

    if dry_run:
        print("[DRY RUN] Les contacts FournisseurContact seraient migrés vers OrganisationContact")
        return

    # Cette migration nécessite de mapper les anciens fournisseur_id vers les nouveaux organisation_id
    # Pour simplifier, on va créer un mapping basé sur le nom
    fournisseurs = db.query(Fournisseur).all()
    organisations = db.query(Organisation).all()

    # Créer un mapping nom → organisation_id
    org_mapping = {org.name: org.id for org in organisations}

    migration_count = 0
    for fournisseur in fournisseurs:
        if fournisseur.name not in org_mapping:
            print(f"⚠️  Organisation non trouvée pour: {fournisseur.name}")
            continue

        organisation_id = org_mapping[fournisseur.name]

        # Migrer les contacts
        for contact in fournisseur.contacts:
            # Vérifier si le contact existe déjà
            existing = db.query(OrganisationContact).filter(
                OrganisationContact.organisation_id == organisation_id,
                OrganisationContact.name == contact.name,
                OrganisationContact.email == contact.email,
            ).first()

            if existing:
                continue

            try:
                org_contact = OrganisationContact(
                    organisation_id=organisation_id,
                    name=contact.name,
                    email=contact.email,
                    phone=contact.phone,
                    title=contact.title,
                    notes=contact.notes,
                    created_at=contact.created_at,
                    updated_at=contact.updated_at,
                )
                db.add(org_contact)
                migration_count += 1

            except Exception as e:
                print(f"❌ Erreur lors de la migration du contact {contact.name}: {e}")
                db.rollback()
                raise

    if not dry_run:
        db.commit()
        print(f"✅ {migration_count} contacts migrés avec succès")


def generate_report(db: Session):
    """Générer un rapport de migration"""
    print("\n=== Rapport de migration ===")

    fournisseurs_count = db.query(Fournisseur).count()
    organisations_count = db.query(Organisation).count()
    mandats_count = db.query(MandatDistribution).count()

    print(f"📊 Fournisseurs (ancienne table): {fournisseurs_count}")
    print(f"📊 Organisations (nouvelle table): {organisations_count}")
    print(f"📊 Mandats créés: {mandats_count}")

    # Statistiques par catégorie
    print("\n📊 Organisations par catégorie:")
    categories = db.execute(text(
        "SELECT category, COUNT(*) as count FROM organisations GROUP BY category"
    )).fetchall()
    for category, count in categories:
        print(f"  - {category}: {count}")

    # Statistiques par statut de mandat
    print("\n📊 Mandats par statut:")
    statuses = db.execute(text(
        "SELECT status, COUNT(*) as count FROM mandats_distribution GROUP BY status"
    )).fetchall()
    for status, count in statuses:
        print(f"  - {status}: {count}")


def main():
    parser = argparse.ArgumentParser(
        description="Migrer les données de Fournisseur vers Organisation"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help="Afficher les migrations sans les exécuter"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("MIGRATION: Fournisseur → Organisation")
    print("=" * 60)

    if args.dry_run:
        print("\n⚠️  MODE DRY-RUN: Aucune modification ne sera effectuée\n")
    else:
        print("\n⚠️  MODE PRODUCTION: Les modifications seront effectuées\n")
        response = input("Êtes-vous sûr de vouloir continuer? (oui/non): ")
        if response.lower() not in ['oui', 'yes', 'y']:
            print("❌ Migration annulée")
            return

    try:
        # Créer les nouvelles tables
        create_tables(dry_run=args.dry_run)

        # Créer une session
        db = SessionLocal()

        try:
            # Migrer les fournisseurs
            migrate_fournisseurs(db, dry_run=args.dry_run)

            # Migrer les contacts
            migrate_contacts(db, dry_run=args.dry_run)

            if not args.dry_run:
                # Générer le rapport
                generate_report(db)

            print("\n" + "=" * 60)
            print("✅ MIGRATION TERMINÉE AVEC SUCCÈS")
            print("=" * 60)

        finally:
            db.close()

    except Exception as e:
        print(f"\n❌ ERREUR: {e}")
        print("\nLa migration a échoué. Veuillez vérifier les logs et réessayer.")
        sys.exit(1)


if __name__ == "__main__":
    main()
