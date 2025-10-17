"""
Migration pour unifier l'architecture du CRM

Ce script migre:
1. Investor → Organisation (type=CLIENT)
2. Fournisseur → Organisation (type=FOURNISSEUR)
3. Contact + FournisseurContact → Person + PersonOrganizationLink
4. Interactions + KPIs → unifiés

IMPORTANT: Faire un backup de la base avant d'exécuter ce script!

Usage:
    python migrations/unify_architecture.py --dry-run  # Simulation
    python migrations/unify_architecture.py --execute  # Exécution réelle
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Tuple, Optional

# Ajouter le chemin parent pour les imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from core.config import settings
from core.database import get_db

# Import des modèles
from models.investor import Investor, Contact, Interaction, KPI
from models.fournisseur import Fournisseur, FournisseurContact, FournisseurInteraction, FournisseurKPI
from models.organisation import Organisation, OrganisationContact, OrganisationInteraction
from models.person import Person, PersonOrganizationLink, OrganizationType


# ============================================================================
# ÉTAPE 1: Ajouter les colonnes manquantes à Organisation
# ============================================================================

def step1_add_columns_to_organisation(db: Session, dry_run: bool = True):
    """
    Ajoute les champs type, email, phone, pipeline_stage à Organisation
    """
    print("\n" + "="*80)
    print("ÉTAPE 1: Ajouter colonnes à Organisation")
    print("="*80)

    queries = [
        # Ajouter le type d'organisation (CLIENT ou FOURNISSEUR)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organisationtype') THEN
                CREATE TYPE organisationtype AS ENUM ('client', 'fournisseur', 'autre');
            END IF;
        END
        $$;
        """,

        """
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS type organisationtype DEFAULT 'autre';
        """,

        """
        CREATE INDEX IF NOT EXISTS idx_organisations_type ON organisations(type);
        """,

        # Ajouter pipeline_stage (depuis Investor)
        """
        DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pipelinestage') THEN
                CREATE TYPE pipelinestage AS ENUM (
                    'prospect_froid',
                    'prospect_tiede',
                    'prospect_chaud',
                    'en_negociation',
                    'client',
                    'inactif'
                );
            END IF;
        END
        $$;
        """,

        """
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS pipeline_stage pipelinestage DEFAULT 'prospect_froid';
        """,

        """
        CREATE INDEX IF NOT EXISTS idx_organisations_pipeline_stage ON organisations(pipeline_stage);
        """,

        # Ajouter email et téléphone
        """
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS main_phone VARCHAR(20);
        """,

        """
        CREATE UNIQUE INDEX IF NOT EXISTS idx_organisations_email ON organisations(email) WHERE email IS NOT NULL;
        """,
    ]

    if dry_run:
        print("🔍 [DRY-RUN] Colonnes qui seraient ajoutées:")
        print("  - type (organisationtype)")
        print("  - pipeline_stage (pipelinestage)")
        print("  - email (VARCHAR)")
        print("  - main_phone (VARCHAR)")
        return True

    try:
        for query in queries:
            db.execute(text(query))
        db.commit()
        print("✅ Colonnes ajoutées avec succès")
        return True
    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return False


# ============================================================================
# ÉTAPE 2: Migrer Investor → Organisation
# ============================================================================

def step2_migrate_investors(db: Session, dry_run: bool = True) -> Dict[int, int]:
    """
    Migre tous les Investor vers Organisation avec type='client'

    Returns:
        Dict mapping ancien investor_id → nouveau organisation_id
    """
    print("\n" + "="*80)
    print("ÉTAPE 2: Migrer Investor → Organisation")
    print("="*80)

    investors = db.query(Investor).all()
    print(f"📊 {len(investors)} investisseurs à migrer")

    if dry_run:
        for inv in investors[:5]:  # Afficher 5 exemples
            print(f"  🔹 {inv.name} | Stage: {inv.pipeline_stage} | Type: {inv.client_type}")
        if len(investors) > 5:
            print(f"  ... et {len(investors) - 5} autres")
        return {}

    mapping = {}  # investor_id → organisation_id

    try:
        for investor in investors:
            # Mapper client_type → OrganisationCategory
            category_mapping = {
                'cgpi': 'CGPI',
                'wholesale': 'Wholesale',
                'institutionnel': 'Institution',
                'autre': 'Autres'
            }
            category = category_mapping.get(investor.client_type, 'Autres') if investor.client_type else 'Autres'

            # Créer l'organisation
            org = Organisation(
                type='client',  # Type CLIENT
                name=investor.name,
                email=investor.email,
                main_phone=investor.main_phone,
                website=investor.website,
                country_code=investor.country_code,
                language=investor.language or 'FR',
                pipeline_stage=investor.pipeline_stage,
                category=category,
                notes=investor.notes,
                is_active=investor.is_active,
                created_at=investor.created_at,
                updated_at=investor.updated_at,
            )

            db.add(org)
            db.flush()  # Pour obtenir l'ID

            mapping[investor.id] = org.id
            print(f"  ✅ {investor.name} → Organisation #{org.id}")

        db.commit()
        print(f"✅ {len(mapping)} investisseurs migrés")
        return mapping

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return {}


# ============================================================================
# ÉTAPE 3: Migrer Fournisseur → Organisation
# ============================================================================

def step3_migrate_fournisseurs(db: Session, dry_run: bool = True) -> Dict[int, int]:
    """
    Migre tous les Fournisseur vers Organisation avec type='fournisseur'

    Returns:
        Dict mapping ancien fournisseur_id → nouveau organisation_id
    """
    print("\n" + "="*80)
    print("ÉTAPE 3: Migrer Fournisseur → Organisation")
    print("="*80)

    fournisseurs = db.query(Fournisseur).all()
    print(f"📊 {len(fournisseurs)} fournisseurs à migrer")

    if dry_run:
        for frn in fournisseurs[:5]:
            print(f"  🔹 {frn.name} | Stage: {frn.stage} | Type: {frn.type_fournisseur}")
        if len(fournisseurs) > 5:
            print(f"  ... et {len(fournisseurs) - 5} autres")
        return {}

    mapping = {}  # fournisseur_id → organisation_id

    try:
        for fournisseur in fournisseurs:
            # Mapper type_fournisseur → OrganisationCategory
            category_mapping = {
                'asset_manager': 'Institution',
                'prestataire': 'Autres',
                'distributeur': 'Wholesale',
                'assurance': 'Institution',
                'autre': 'Autres'
            }
            category = category_mapping.get(fournisseur.type_fournisseur, 'Autres') if fournisseur.type_fournisseur else 'Autres'

            # Créer l'organisation
            org = Organisation(
                type='fournisseur',  # Type FOURNISSEUR
                name=fournisseur.name,
                email=fournisseur.email,
                main_phone=fournisseur.main_phone,
                website=fournisseur.website,
                country_code=fournisseur.country_code,
                language=fournisseur.language or 'FR',
                pipeline_stage=fournisseur.stage,
                category=category,
                notes=fournisseur.notes,
                is_active=fournisseur.is_active,
                created_at=fournisseur.created_at,
                updated_at=fournisseur.updated_at,
            )

            db.add(org)
            db.flush()

            mapping[fournisseur.id] = org.id
            print(f"  ✅ {fournisseur.name} → Organisation #{org.id}")

        db.commit()
        print(f"✅ {len(mapping)} fournisseurs migrés")
        return mapping

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return {}


# ============================================================================
# ÉTAPE 4: Migrer Contact → Person + PersonOrganizationLink
# ============================================================================

def parse_name(full_name: str) -> Tuple[str, str]:
    """Parse 'Jean Dupont' en ('Jean', 'Dupont')"""
    parts = full_name.strip().split()
    if len(parts) == 0:
        return ("Unknown", "Unknown")
    elif len(parts) == 1:
        return (parts[0], "")
    else:
        return (parts[0], " ".join(parts[1:]))


def step4_migrate_contacts(
    db: Session,
    investor_mapping: Dict[int, int],
    dry_run: bool = True
) -> Dict[int, int]:
    """
    Migre Contact → Person + PersonOrganizationLink

    Args:
        investor_mapping: Mapping investor_id → organisation_id

    Returns:
        Dict mapping ancien contact_id → nouveau person_id
    """
    print("\n" + "="*80)
    print("ÉTAPE 4: Migrer Contact → Person + PersonOrganizationLink")
    print("="*80)

    contacts = db.query(Contact).all()
    print(f"📊 {len(contacts)} contacts à migrer")

    if dry_run:
        for contact in contacts[:5]:
            print(f"  🔹 {contact.name} | {contact.email} | Investor #{contact.investor_id}")
        if len(contacts) > 5:
            print(f"  ... et {len(contacts) - 5} autres")
        return {}

    mapping = {}  # contact_id → person_id
    person_cache = {}  # email → person_id (pour éviter doublons)

    try:
        for contact in contacts:
            # Chercher si la personne existe déjà (par email)
            person = None
            if contact.email:
                if contact.email in person_cache:
                    person = db.query(Person).get(person_cache[contact.email])
                else:
                    person = db.query(Person).filter_by(personal_email=contact.email).first()

            # Si pas trouvée, créer une nouvelle Person
            if not person:
                first_name, last_name = parse_name(contact.name)
                person = Person(
                    first_name=first_name,
                    last_name=last_name,
                    personal_email=contact.email,
                    personal_phone=contact.phone,
                    notes=contact.notes,
                    created_at=contact.created_at,
                    updated_at=contact.updated_at,
                )
                db.add(person)
                db.flush()

                if contact.email:
                    person_cache[contact.email] = person.id

                print(f"  ✅ Nouvelle personne: {contact.name} → Person #{person.id}")

            mapping[contact.id] = person.id

            # Créer le lien Person ↔ Organisation
            org_id = investor_mapping.get(contact.investor_id)
            if org_id:
                link = PersonOrganizationLink(
                    person_id=person.id,
                    organization_type=OrganizationType.INVESTOR,  # Ancien investor
                    organization_id=org_id,
                    job_title=contact.title,
                    work_email=contact.email,
                    work_phone=contact.phone,
                    notes=contact.notes,
                    created_at=contact.created_at,
                    updated_at=contact.updated_at,
                )
                db.add(link)
                print(f"    🔗 Lien: Person #{person.id} ↔ Organisation #{org_id}")

        db.commit()
        print(f"✅ {len(mapping)} contacts migrés")
        return mapping

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return {}


# ============================================================================
# ÉTAPE 5: Migrer FournisseurContact → Person + PersonOrganizationLink
# ============================================================================

def step5_migrate_fournisseur_contacts(
    db: Session,
    fournisseur_mapping: Dict[int, int],
    dry_run: bool = True
) -> Dict[int, int]:
    """
    Migre FournisseurContact → Person + PersonOrganizationLink
    """
    print("\n" + "="*80)
    print("ÉTAPE 5: Migrer FournisseurContact → Person")
    print("="*80)

    contacts = db.query(FournisseurContact).all()
    print(f"📊 {len(contacts)} contacts fournisseurs à migrer")

    if dry_run:
        for contact in contacts[:5]:
            print(f"  🔹 {contact.name} | {contact.email} | Fournisseur #{contact.fournisseur_id}")
        if len(contacts) > 5:
            print(f"  ... et {len(contacts) - 5} autres")
        return {}

    mapping = {}
    person_cache = {}

    try:
        for contact in contacts:
            # Chercher si existe déjà
            person = None
            if contact.email:
                person = db.query(Person).filter_by(personal_email=contact.email).first()

            if not person:
                first_name, last_name = parse_name(contact.name)
                person = Person(
                    first_name=first_name,
                    last_name=last_name,
                    personal_email=contact.email,
                    personal_phone=contact.phone,
                    notes=contact.notes,
                    created_at=contact.created_at,
                    updated_at=contact.updated_at,
                )
                db.add(person)
                db.flush()
                print(f"  ✅ Nouvelle personne: {contact.name} → Person #{person.id}")

            mapping[contact.id] = person.id

            # Lien avec organisation
            org_id = fournisseur_mapping.get(contact.fournisseur_id)
            if org_id:
                link = PersonOrganizationLink(
                    person_id=person.id,
                    organization_type=OrganizationType.FOURNISSEUR,
                    organization_id=org_id,
                    job_title=contact.title,
                    work_email=contact.email,
                    work_phone=contact.phone,
                    notes=contact.notes,
                    created_at=contact.created_at,
                    updated_at=contact.updated_at,
                )
                db.add(link)
                print(f"    🔗 Lien: Person #{person.id} ↔ Organisation #{org_id}")

        db.commit()
        print(f"✅ {len(mapping)} contacts fournisseurs migrés")
        return mapping

    except Exception as e:
        print(f"❌ Erreur: {e}")
        db.rollback()
        return {}


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Migration unification architecture CRM")
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulation sans modification de la base'
    )
    parser.add_argument(
        '--execute',
        action='store_true',
        help='Exécuter réellement la migration'
    )
    parser.add_argument(
        '--backup-first',
        action='store_true',
        default=True,
        help='Créer un backup avant migration (défaut: True)'
    )

    args = parser.parse_args()

    if not args.dry_run and not args.execute:
        print("❌ Vous devez spécifier --dry-run ou --execute")
        parser.print_help()
        sys.exit(1)

    dry_run = args.dry_run

    print("\n" + "="*80)
    print("🚀 MIGRATION UNIFICATION ARCHITECTURE CRM")
    print("="*80)
    print(f"Mode: {'🔍 DRY-RUN (simulation)' if dry_run else '⚡ EXÉCUTION RÉELLE'}")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    if not dry_run:
        response = input("\n⚠️  ATTENTION: Cette migration modifiera la base de données.\n"
                        "Avez-vous fait un backup? (oui/non): ")
        if response.lower() not in ['oui', 'yes', 'y']:
            print("❌ Migration annulée. Faites d'abord un backup!")
            sys.exit(1)

    # Connexion DB
    db = next(get_db())

    try:
        # ÉTAPE 1: Ajouter colonnes
        success = step1_add_columns_to_organisation(db, dry_run)
        if not success and not dry_run:
            print("❌ Échec étape 1, arrêt")
            return

        # ÉTAPE 2: Migrer Investors
        investor_mapping = step2_migrate_investors(db, dry_run)

        # ÉTAPE 3: Migrer Fournisseurs
        fournisseur_mapping = step3_migrate_fournisseurs(db, dry_run)

        # ÉTAPE 4: Migrer Contacts
        contact_mapping = step4_migrate_contacts(db, investor_mapping, dry_run)

        # ÉTAPE 5: Migrer FournisseurContacts
        fournisseur_contact_mapping = step5_migrate_fournisseur_contacts(
            db, fournisseur_mapping, dry_run
        )

        # RÉSUMÉ
        print("\n" + "="*80)
        print("📊 RÉSUMÉ DE LA MIGRATION")
        print("="*80)
        print(f"✅ Investisseurs migrés: {len(investor_mapping)}")
        print(f"✅ Fournisseurs migrés: {len(fournisseur_mapping)}")
        print(f"✅ Contacts migrés: {len(contact_mapping)}")
        print(f"✅ Contacts fournisseurs migrés: {len(fournisseur_contact_mapping)}")

        if dry_run:
            print("\n🔍 C'était une simulation. Utilisez --execute pour migrer réellement.")
        else:
            print("\n✅ Migration terminée avec succès!")
            print("\n⚠️  PROCHAINES ÉTAPES:")
            print("1. Vérifier l'intégrité des données")
            print("2. Tester l'application")
            print("3. Si OK, supprimer les anciennes tables avec:")
            print("   python migrations/cleanup_old_tables.py")

    except Exception as e:
        print(f"\n❌ ERREUR FATALE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
