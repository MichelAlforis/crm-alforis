#!/usr/bin/env python3
"""
Script d'anonymisation GDPR pour CRM Alforis

Anonymise les données personnelles des contacts (people) et organisations
inactifs depuis plus de 18 mois, conformément au RGPD.

Usage:
    python scripts/gdpr_anonymize.py [--dry-run] [--inactive-months 18] [--batch-size 100]

Exemples:
    # Simulation (ne modifie pas la base)
    python scripts/gdpr_anonymize.py --dry-run

    # Anonymisation réelle avec période de 24 mois
    python scripts/gdpr_anonymize.py --inactive-months 24

    # Avec taille de batch personnalisée
    python scripts/gdpr_anonymize.py --batch-size 50

Notes:
    - Les données anonymisées ne peuvent PAS être restaurées
    - Un backup de la base est FORTEMENT recommandé avant exécution
    - Les logs détaillés sont conservés dans audit_logs
"""

import argparse
import hashlib
import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Tuple

# Setup path pour imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import and_, func, or_, select, update
from sqlalchemy.orm import Session

from core.database import engine, get_db
from models.audit_log import AuditLog
from models.organisation import Organisation
from models.person import Person

# Configuration logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/gdpr_anonymization.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class GDPRAnonymizer:
    """Classe pour gérer l'anonymisation GDPR des données personnelles"""

    def __init__(
        self,
        db: Session,
        inactive_months: int = 18,
        batch_size: int = 100,
        dry_run: bool = False
    ):
        self.db = db
        self.inactive_months = inactive_months
        self.batch_size = batch_size
        self.dry_run = dry_run
        self.stats = {
            'people_anonymized': 0,
            'organisations_anonymized': 0,
            'people_skipped': 0,
            'organisations_skipped': 0,
            'errors': 0
        }

    def _generate_anonymous_value(self, entity_type: str, field_name: str, entity_id: int) -> str:
        """
        Génère une valeur anonyme mais déterministe pour un champ donné.
        Utilise un hash pour garantir l'unicité et la traçabilité.
        """
        seed = f"{entity_type}:{field_name}:{entity_id}"
        hash_value = hashlib.sha256(seed.encode()).hexdigest()[:8]

        if field_name == 'email':
            return f"anonymized_{hash_value}@example.com"
        elif field_name in ('first_name', 'prenom'):
            return f"User_{hash_value}"
        elif field_name in ('last_name', 'nom', 'name'):
            return f"Anonymized_{hash_value}"
        elif field_name in ('phone', 'telephone', 'mobile'):
            return "00-00-00-00-00"
        elif field_name == 'address':
            return "Adresse anonymisée"
        elif field_name == 'notes':
            return "[Données anonymisées conformément au RGPD]"
        else:
            return f"[ANONYMIZED_{hash_value}]"

    def _get_inactive_cutoff_date(self) -> datetime:
        """Calcule la date limite d'inactivité"""
        return datetime.utcnow() - timedelta(days=self.inactive_months * 30)

    def _anonymize_person(self, person: Person) -> bool:
        """
        Anonymise une personne.

        Champs anonymisés:
        - first_name, last_name
        - email, personal_email
        - phone, personal_phone, mobile
        - linkedin_url
        - notes
        - job_title

        Champs préservés:
        - id (pour traçabilité)
        - created_at, updated_at
        - is_anonymized, anonymized_at
        - country_code, language (statistiques anonymes)
        """
        try:
            logger.info(f"Anonymizing person ID={person.id} (last activity: {person.last_activity_date})")

            # Vérifier si déjà anonymisé
            if person.is_anonymized:
                logger.warning(f"Person ID={person.id} already anonymized, skipping")
                self.stats['people_skipped'] += 1
                return False

            # Anonymiser les champs sensibles
            person.first_name = self._generate_anonymous_value('person', 'first_name', person.id)
            person.last_name = self._generate_anonymous_value('person', 'last_name', person.id)
            person.email = self._generate_anonymous_value('person', 'email', person.id)
            person.personal_email = None
            person.phone = self._generate_anonymous_value('person', 'phone', person.id)
            person.personal_phone = None
            person.mobile = None
            person.linkedin_url = None
            person.notes = self._generate_anonymous_value('person', 'notes', person.id)
            person.job_title = None
            person.role = None

            # Marquer comme anonymisé
            person.is_anonymized = True
            person.anonymized_at = datetime.utcnow()

            if not self.dry_run:
                self.db.flush()

                # Créer audit log
                audit = AuditLog(
                    entity_type='person',
                    entity_id=person.id,
                    action='anonymize',
                    field_name='gdpr_compliance',
                    old_value='active',
                    new_value='anonymized',
                    user_id=None,  # Automated process
                    ip_address='127.0.0.1',
                    user_agent='GDPR_Anonymization_Script',
                )
                self.db.add(audit)

            self.stats['people_anonymized'] += 1
            logger.info(f"✓ Person ID={person.id} anonymized successfully")
            return True

        except Exception as e:
            logger.error(f"✗ Error anonymizing person ID={person.id}: {str(e)}")
            self.stats['errors'] += 1
            return False

    def _anonymize_organisation(self, org: Organisation) -> bool:
        """
        Anonymise une organisation.

        Champs anonymisés:
        - name (partiel)
        - email
        - phone
        - address, city, postal_code
        - notes, description
        - website (optionnel)

        Champs préservés:
        - id, type, category (statistiques)
        - country, country_code, language
        - aum, strategies (données financières anonymes)
        - created_at, updated_at
        """
        try:
            logger.info(f"Anonymizing organisation ID={org.id} (last activity: {org.last_activity_date})")

            if org.is_anonymized:
                logger.warning(f"Organisation ID={org.id} already anonymized, skipping")
                self.stats['organisations_skipped'] += 1
                return False

            # Anonymiser les champs sensibles
            org.name = self._generate_anonymous_value('organisation', 'name', org.id)
            org.email = self._generate_anonymous_value('organisation', 'email', org.id)
            org.phone = self._generate_anonymous_value('organisation', 'phone', org.id)
            org.address = self._generate_anonymous_value('organisation', 'address', org.id)
            org.city = None
            org.postal_code = None
            org.website = None
            org.notes = self._generate_anonymous_value('organisation', 'notes', org.id)
            org.description = None

            # Marquer comme anonymisé
            org.is_anonymized = True
            org.anonymized_at = datetime.utcnow()

            if not self.dry_run:
                self.db.flush()

                # Créer audit log
                audit = AuditLog(
                    entity_type='organisation',
                    entity_id=org.id,
                    action='anonymize',
                    field_name='gdpr_compliance',
                    old_value='active',
                    new_value='anonymized',
                    user_id=None,
                    ip_address='127.0.0.1',
                    user_agent='GDPR_Anonymization_Script',
                )
                self.db.add(audit)

            self.stats['organisations_anonymized'] += 1
            logger.info(f"✓ Organisation ID={org.id} anonymized successfully")
            return True

        except Exception as e:
            logger.error(f"✗ Error anonymizing organisation ID={org.id}: {str(e)}")
            self.stats['errors'] += 1
            return False

    def find_inactive_people(self) -> List[Person]:
        """
        Trouve les personnes inactives à anonymiser.

        Critères:
        - last_activity_date > inactive_months
        - is_anonymized = False
        - is_active = False (optionnel, pour sécurité)
        """
        cutoff_date = self._get_inactive_cutoff_date()

        query = self.db.query(Person).filter(
            and_(
                Person.is_anonymized == False,
                or_(
                    Person.last_activity_date < cutoff_date,
                    Person.last_activity_date.is_(None)
                )
            )
        ).limit(self.batch_size)

        people = query.all()
        logger.info(f"Found {len(people)} inactive people to anonymize (cutoff: {cutoff_date})")
        return people

    def find_inactive_organisations(self) -> List[Organisation]:
        """
        Trouve les organisations inactives à anonymiser.

        Critères:
        - last_activity_date > inactive_months
        - is_anonymized = False
        - is_active = False
        - pipeline_stage = 'inactif' ou 'perdu'
        """
        cutoff_date = self._get_inactive_cutoff_date()

        query = self.db.query(Organisation).filter(
            and_(
                Organisation.is_anonymized == False,
                Organisation.is_active == False,
                or_(
                    Organisation.last_activity_date < cutoff_date,
                    Organisation.last_activity_date.is_(None)
                )
            )
        ).limit(self.batch_size)

        orgs = query.all()
        logger.info(f"Found {len(orgs)} inactive organisations to anonymize (cutoff: {cutoff_date})")
        return orgs

    def anonymize_people(self) -> int:
        """Anonymise les personnes inactives"""
        people = self.find_inactive_people()

        for person in people:
            self._anonymize_person(person)

        if not self.dry_run:
            self.db.commit()
            logger.info(f"Committed anonymization for {self.stats['people_anonymized']} people")

        return self.stats['people_anonymized']

    def anonymize_organisations(self) -> int:
        """Anonymise les organisations inactives"""
        orgs = self.find_inactive_organisations()

        for org in orgs:
            self._anonymize_organisation(org)

        if not self.dry_run:
            self.db.commit()
            logger.info(f"Committed anonymization for {self.stats['organisations_anonymized']} organisations")

        return self.stats['organisations_anonymized']

    def run(self) -> Dict[str, Any]:
        """Exécute le processus complet d'anonymisation"""
        logger.info("=" * 80)
        logger.info("GDPR ANONYMIZATION PROCESS - STARTING")
        logger.info(f"Mode: {'DRY-RUN (simulation)' if self.dry_run else 'PRODUCTION (real changes)'}")
        logger.info(f"Inactive period: {self.inactive_months} months")
        logger.info(f"Batch size: {self.batch_size}")
        logger.info(f"Cutoff date: {self._get_inactive_cutoff_date()}")
        logger.info("=" * 80)

        try:
            # Anonymiser les personnes
            logger.info("\n--- ANONYMIZING PEOPLE ---")
            self.anonymize_people()

            # Anonymiser les organisations
            logger.info("\n--- ANONYMIZING ORGANISATIONS ---")
            self.anonymize_organisations()

            # Résumé
            logger.info("\n" + "=" * 80)
            logger.info("GDPR ANONYMIZATION PROCESS - COMPLETED")
            logger.info("=" * 80)
            logger.info(f"People anonymized:        {self.stats['people_anonymized']}")
            logger.info(f"People skipped:           {self.stats['people_skipped']}")
            logger.info(f"Organisations anonymized: {self.stats['organisations_anonymized']}")
            logger.info(f"Organisations skipped:    {self.stats['organisations_skipped']}")
            logger.info(f"Errors:                   {self.stats['errors']}")
            logger.info("=" * 80)

            return self.stats

        except Exception as e:
            logger.error(f"FATAL ERROR during anonymization: {str(e)}")
            if not self.dry_run:
                self.db.rollback()
            raise


def main():
    parser = argparse.ArgumentParser(
        description='GDPR Anonymization Script for CRM Alforis',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Simulation mode (recommended first)
  python scripts/gdpr_anonymize.py --dry-run

  # Real anonymization with default settings (18 months)
  python scripts/gdpr_anonymize.py

  # Custom inactive period (24 months)
  python scripts/gdpr_anonymize.py --inactive-months 24

  # Smaller batch size for safety
  python scripts/gdpr_anonymize.py --batch-size 50
        """
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulation mode - no changes to database'
    )
    parser.add_argument(
        '--inactive-months',
        type=int,
        default=18,
        help='Number of months of inactivity before anonymization (default: 18)'
    )
    parser.add_argument(
        '--batch-size',
        type=int,
        default=100,
        help='Number of records to process per batch (default: 100)'
    )

    args = parser.parse_args()

    # Créer le dossier logs si nécessaire
    Path('logs').mkdir(exist_ok=True)

    # Confirmation pour mode production
    if not args.dry_run:
        print("\n" + "!" * 80)
        print("WARNING: You are about to PERMANENTLY ANONYMIZE data in PRODUCTION mode!")
        print("This action CANNOT be undone.")
        print("!" * 80)
        response = input("\nType 'YES' to confirm, anything else to cancel: ")
        if response != 'YES':
            print("Anonymization cancelled.")
            sys.exit(0)

    # Exécuter l'anonymisation
    db = next(get_db())
    try:
        anonymizer = GDPRAnonymizer(
            db=db,
            inactive_months=args.inactive_months,
            batch_size=args.batch_size,
            dry_run=args.dry_run
        )

        stats = anonymizer.run()

        # Code de sortie basé sur les erreurs
        sys.exit(1 if stats['errors'] > 0 else 0)

    except Exception as e:
        logger.error(f"Script failed: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == '__main__':
    main()
