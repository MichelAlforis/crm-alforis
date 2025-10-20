#!/usr/bin/env python3
"""
CSSF Luxembourg - Import des sociétés de gestion dans le CRM

Ce script importe les sociétés de gestion luxembourgeoises depuis:
- Base de données CSSF (UCITS Management Companies - Chapter 15)
- AIFMs autorisés
- Enrichissement avec données AUM d'Inverco

Fonctionnalités:
1. Récupération des sociétés depuis CSSF
2. Enrichissement avec AUM Inverco
3. Import dans le CRM avec tier stratégique
4. Extraction et assignation des contacts commerciaux

Usage:
    python3 scripts/cssf/cssf_import.py --file data/cssf_companies.csv --tier 1 --dry-run
    python3 scripts/cssf/cssf_import.py --file data/cssf_companies.csv --tier 1 --import
"""

import requests
import pandas as pd
import sys
import argparse
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# Configuration
API_BASE = "http://localhost:8000/api"
CSSF_SEARCH_URL = "https://edesk.apps.cssf.lu/search-entities/api/entities"
INVERCO_DATA_PATH = Path("data/inverco_aum_latest.csv")

class CSSFImporter:
    """Gestion de l'import CSSF vers CRM"""

    def __init__(self, api_base: str = API_BASE):
        self.api_base = api_base
        self.session = requests.Session()
        self.stats = {
            'total': 0,
            'created': 0,
            'updated': 0,
            'enriched': 0,
            'contacts_found': 0,
            'errors': []
        }

    def load_inverco_data(self) -> pd.DataFrame:
        """Charge les données AUM d'Inverco"""
        if not INVERCO_DATA_PATH.exists():
            print(f"⚠️  Fichier Inverco non trouvé: {INVERCO_DATA_PATH}")
            return pd.DataFrame()

        df = pd.read_csv(INVERCO_DATA_PATH)
        print(f"✅ Données Inverco chargées: {len(df)} entrées")
        return df

    def normalize_company_name(self, name: str) -> str:
        """Normalise un nom de société pour matching"""
        if not name:
            return ""

        # Minuscules
        name = name.lower().strip()

        # Supprime les suffixes légaux courants
        suffixes = [
            r'\s+s\.a\.',
            r'\s+sa$',
            r'\s+s\.à\.r\.l\.',
            r'\s+sarl$',
            r'\s+ltd\.?$',
            r'\s+limited$',
            r'\s+llc$',
            r'\s+inc\.?$',
            r'\s+\(luxembourg\)$',
            r'\s+luxembourg$',
        ]

        for suffix in suffixes:
            name = re.sub(suffix, '', name)

        # Supprime ponctuation et espaces multiples
        name = re.sub(r'[.,\-_]', ' ', name)
        name = re.sub(r'\s+', ' ', name)

        return name.strip()

    def find_aum_for_company(self, company_name: str, inverco_df: pd.DataFrame) -> Optional[float]:
        """Trouve l'AUM d'une société dans les données Inverco"""
        if inverco_df.empty:
            return None

        normalized = self.normalize_company_name(company_name)

        # Recherche exacte
        for _, row in inverco_df.iterrows():
            inverco_name = self.normalize_company_name(str(row.get('Gestora', '')))
            if normalized == inverco_name:
                aum = row.get('Patrimonio', 0)
                return float(aum) if pd.notna(aum) else None

        # Recherche partielle
        for _, row in inverco_df.iterrows():
            inverco_name = self.normalize_company_name(str(row.get('Gestora', '')))
            if normalized in inverco_name or inverco_name in normalized:
                aum = row.get('Patrimonio', 0)
                return float(aum) if pd.notna(aum) else None

        return None

    def extract_sales_contact(self, company_data: Dict) -> Optional[Dict]:
        """
        Extrait le contact commercial principal depuis les métadonnées CSSF

        Recherche dans l'ordre de priorité:
        1. Sales Director / Director of Sales
        2. Business Development Director
        3. Managing Director / CEO
        """
        contacts = company_data.get('contacts', [])

        # Patterns de recherche par priorité
        sales_patterns = [
            r'sales\s+director',
            r'director\s+of\s+sales',
            r'head\s+of\s+sales',
            r'responsable\s+commercial',
        ]

        bd_patterns = [
            r'business\s+development',
            r'd[ée]veloppement\s+commercial',
        ]

        exec_patterns = [
            r'managing\s+director',
            r'chief\s+executive',
            r'ceo',
            r'directeur\s+g[ée]n[ée]ral',
        ]

        for contact in contacts:
            title = contact.get('title', '').lower()

            # Vérifier sales
            for pattern in sales_patterns:
                if re.search(pattern, title):
                    return self._format_contact(contact, 'Sales Director')

            # Vérifier BD
            for pattern in bd_patterns:
                if re.search(pattern, title):
                    return self._format_contact(contact, 'Business Development')

            # Vérifier executive
            for pattern in exec_patterns:
                if re.search(pattern, title):
                    return self._format_contact(contact, 'Executive')

        return None

    def _format_contact(self, contact: Dict, category: str) -> Dict:
        """Formate un contact pour l'API CRM"""
        return {
            'prenom': contact.get('first_name', ''),
            'nom': contact.get('last_name', ''),
            'email': contact.get('email', ''),
            'telephone': contact.get('phone', ''),
            'poste': contact.get('title', ''),
            'linkedin_url': contact.get('linkedin_url', ''),
            'note': f'Contact identifié depuis CSSF - {category}',
        }

    def import_company(self, company: Dict, tier: int, inverco_df: pd.DataFrame, dry_run: bool = False) -> bool:
        """Importe une société dans le CRM"""
        try:
            company_name = company.get('name', '').strip()
            if not company_name:
                return False

            # Prépare les données
            data = {
                'nom': company_name,
                'pays': 'Luxembourg',
                'ville': company.get('city', ''),
                'adresse': company.get('address', ''),
                'code_postal': company.get('postal_code', ''),
                'site_web': company.get('website', ''),
                'tier_strategique': tier,
                'source_donnees': 'CSSF Luxembourg',
                'numero_enregistrement': company.get('registration_number', ''),
            }

            # Enrichissement AUM
            aum = self.find_aum_for_company(company_name, inverco_df)
            if aum:
                data['aum'] = aum
                data['source_aum'] = 'Inverco'
                data['note'] = f"AUM Inverco: {aum:,.0f} M€"
                self.stats['enriched'] += 1

            # Métadonnées CSSF
            metadata = {
                'cssf_type': company.get('entity_type', 'UCITS Management Company'),
                'cssf_registration_date': company.get('registration_date', ''),
                'cssf_status': company.get('status', 'Active'),
            }
            data['metadata'] = json.dumps(metadata)

            if dry_run:
                print(f"  [DRY-RUN] Société: {company_name}")
                print(f"            Tier: {tier}, AUM: {aum or 'N/A'}")
                return True

            # Import dans CRM
            response = self.session.post(
                f"{self.api_base}/societes/",
                json=data
            )

            if response.status_code in [200, 201]:
                societe_id = response.json().get('id')
                print(f"  ✅ {company_name} → Tier {tier}" + (f" (AUM: {aum:,.0f} M€)" if aum else ""))
                self.stats['created'] += 1

                # Extraction et import du contact commercial
                contact = self.extract_sales_contact(company)
                if contact and societe_id:
                    contact['societe_id'] = societe_id
                    contact_resp = self.session.post(
                        f"{self.api_base}/contacts/",
                        json=contact
                    )
                    if contact_resp.status_code in [200, 201]:
                        print(f"     └─ Contact: {contact.get('prenom', '')} {contact.get('nom', '')} ({contact.get('poste', '')})")
                        self.stats['contacts_found'] += 1

                return True

            elif response.status_code == 409:
                print(f"  ⚠️  {company_name} existe déjà")
                self.stats['updated'] += 1
                return True

            else:
                error = f"{company_name}: HTTP {response.status_code}"
                self.stats['errors'].append(error)
                print(f"  ❌ {error}")
                return False

        except Exception as e:
            error = f"{company.get('name', 'Unknown')}: {str(e)}"
            self.stats['errors'].append(error)
            print(f"  ❌ {error}")
            return False

    def import_from_csv(self, csv_file: Path, tier: int, dry_run: bool = False):
        """Importe depuis un fichier CSV"""
        if not csv_file.exists():
            print(f"❌ Fichier non trouvé: {csv_file}")
            return

        df = pd.read_csv(csv_file)
        inverco_df = self.load_inverco_data()

        print(f"\n{'='*60}")
        print(f"IMPORT CSSF LUXEMBOURG → CRM")
        print(f"{'='*60}")
        print(f"Fichier: {csv_file}")
        print(f"Sociétés: {len(df)}")
        print(f"Tier: {tier}")
        print(f"Mode: {'DRY-RUN' if dry_run else 'IMPORT'}")
        print(f"{'='*60}\n")

        self.stats['total'] = len(df)

        for idx, row in df.iterrows():
            company = {
                'name': row.get('name', ''),
                'address': row.get('address', ''),
                'city': row.get('city', ''),
                'postal_code': row.get('postal_code', ''),
                'website': row.get('website', ''),
                'registration_number': row.get('registration_number', ''),
                'entity_type': row.get('entity_type', 'UCITS Management Company'),
                'status': row.get('status', 'Active'),
                'registration_date': row.get('registration_date', ''),
                'contacts': json.loads(row.get('contacts', '[]')) if pd.notna(row.get('contacts')) else []
            }

            self.import_company(company, tier, inverco_df, dry_run)

        self.print_summary()

    def print_summary(self):
        """Affiche le résumé de l'import"""
        print(f"\n{'='*60}")
        print("RÉSUMÉ DE L'IMPORT")
        print(f"{'='*60}")
        print(f"Total sociétés: {self.stats['total']}")
        print(f"✅ Créées: {self.stats['created']}")
        print(f"♻️  Mises à jour: {self.stats['updated']}")
        print(f"💰 Enrichies AUM: {self.stats['enriched']}")
        print(f"👤 Contacts trouvés: {self.stats['contacts_found']}")
        print(f"❌ Erreurs: {len(self.stats['errors'])}")

        if self.stats['errors']:
            print(f"\n{'-'*60}")
            print("ERREURS:")
            for error in self.stats['errors'][:10]:
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... et {len(self.stats['errors']) - 10} autres")

        print(f"{'='*60}\n")


def main():
    parser = argparse.ArgumentParser(
        description='Import CSSF Luxembourg vers CRM Alforis'
    )
    parser.add_argument(
        '--file',
        type=Path,
        required=True,
        help='Fichier CSV contenant les sociétés CSSF'
    )
    parser.add_argument(
        '--tier',
        type=int,
        required=True,
        choices=[1, 2, 3],
        help='Tier stratégique (1=prioritaire, 2=secondaire, 3=opportuniste)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Mode simulation (pas d\'import réel)'
    )
    parser.add_argument(
        '--import',
        action='store_true',
        dest='do_import',
        help='Lancer l\'import réel'
    )

    args = parser.parse_args()

    if not args.dry_run and not args.do_import:
        print("❌ Erreur: Spécifier --dry-run ou --import")
        sys.exit(1)

    importer = CSSFImporter()
    importer.import_from_csv(
        args.file,
        args.tier,
        dry_run=args.dry_run
    )


if __name__ == '__main__':
    main()
