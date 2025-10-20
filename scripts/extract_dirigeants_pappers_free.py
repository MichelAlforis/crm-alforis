#!/usr/bin/env python3
"""
Extract dirigeants for top 100 SDG using Pappers Free API (100 requests/month)
For the remaining 577 SDG, generate a template for manual enrichment
"""
import csv
import json
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_CONTACTS = BASE_DIR / "SDG_CONTACTS_PAPPERS_100.csv"
OUTPUT_TEMPLATE = BASE_DIR / "SDG_677_TEMPLATE_MANUAL_577.csv"

# Pappers API Free: 100 requests/month
# Get your free API token at: https://www.pappers.fr/api
PAPPERS_API_TOKEN = "YOUR_FREE_API_TOKEN_HERE"  # Replace with your token
PAPPERS_API_URL = "https://api.pappers.fr/v2/entreprise"


def load_sdg_data() -> List[Dict]:
    """Load SDG data from CSV"""
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def extract_siren(society: Dict) -> Optional[str]:
    """Extract SIREN from notes field"""
    notes = society.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None
    return None


def get_dirigeants_from_pappers(siren: str, token: str) -> List[Dict]:
    """Fetch dirigeants from Pappers API"""
    try:
        params = {
            'api_token': token,
            'siren': siren
        }
        response = requests.get(PAPPERS_API_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        dirigeants = []

        # Extract représentants légaux (dirigeants)
        if 'representants' in data:
            for rep in data['representants']:
                if rep.get('qualite'):  # Has a function/title
                    dirigeants.append({
                        'prenom': rep.get('prenom', ''),
                        'nom': rep.get('nom', ''),
                        'fonction': rep.get('qualite', ''),
                        'date_prise_de_poste': rep.get('date_prise_de_poste', ''),
                    })

        return dirigeants

    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching SIREN {siren}: {e}")
        return []
    except Exception as e:
        print(f"❌ Error parsing data for SIREN {siren}: {e}")
        return []


def main():
    print("🚀 Extraction dirigeants - Pappers Free API\n")

    # Check API token
    if PAPPERS_API_TOKEN == "YOUR_FREE_API_TOKEN_HERE":
        print("❌ ERREUR: Vous devez remplacer PAPPERS_API_TOKEN par votre clé API")
        print("📝 Créez un compte gratuit sur: https://www.pappers.fr/api")
        print("   → 100 requêtes/mois gratuites")
        return

    # Load SDG data
    societies = load_sdg_data()
    print(f"📊 {len(societies)} SDG chargées\n")

    # Sort by AUM (descending) and extract SIREN
    societies_with_siren = []
    for soc in societies:
        siren = extract_siren(soc)
        if siren:
            aum = float(soc.get('aum') or 0)
            societies_with_siren.append({
                'society': soc,
                'siren': siren,
                'aum': aum
            })

    societies_with_siren.sort(key=lambda x: x['aum'], reverse=True)

    print(f"✅ {len(societies_with_siren)} SDG avec SIREN identifié")
    print(f"🎯 Extraction des dirigeants pour les 100 plus importantes (API gratuite)\n")

    # Extract top 100
    top_100 = societies_with_siren[:100]
    remaining_577 = societies_with_siren[100:]

    # Process top 100 with Pappers API
    all_contacts = []
    success_count = 0

    for idx, item in enumerate(top_100, 1):
        society = item['society']
        siren = item['siren']
        name = society['name']

        print(f"[{idx}/100] {name} (SIREN: {siren})...", end=" ")

        dirigeants = get_dirigeants_from_pappers(siren, PAPPERS_API_TOKEN)

        if dirigeants:
            print(f"✅ {len(dirigeants)} dirigeant(s)")
            success_count += 1

            for dir in dirigeants:
                all_contacts.append({
                    'first_name': dir['prenom'],
                    'last_name': dir['nom'],
                    'personal_email': '',  # Not provided by Pappers
                    'phone': society.get('phone', ''),
                    'job_title': dir['fonction'],
                    'company': name,
                    'country_code': society.get('country_code', 'FR'),
                    'language': 'FR',
                    'source': f"Pappers API - {dir.get('date_prise_de_poste', '')}"
                })
        else:
            print("❌ Aucun dirigeant")

        # Rate limiting: 1 request per second (avoid API throttling)
        time.sleep(1.1)

    # Save contacts from top 100
    if all_contacts:
        with open(OUTPUT_CONTACTS, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

        print(f"\n✅ {len(all_contacts)} contacts extraits et sauvegardés: {OUTPUT_CONTACTS}")
        print(f"📊 Taux de succès: {success_count}/100 sociétés ({success_count}%)")

    # Generate template for remaining 577
    print(f"\n📋 Génération template manuel pour les 577 SDG restantes...")

    template_rows = []
    for item in remaining_577:
        society = item['society']
        template_rows.append({
            'company_name': society['name'],
            'siren': item['siren'],
            'phone': society.get('phone', ''),
            'website': society.get('website', ''),
            'aum': society.get('aum', ''),
            'dirigeant_prenom': '',
            'dirigeant_nom': '',
            'dirigeant_email': '',
            'dirigeant_fonction': '',
            'dirigeant_telephone': '',
            'source': ''
        })

    with open(OUTPUT_TEMPLATE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'company_name', 'siren', 'phone', 'website', 'aum',
            'dirigeant_prenom', 'dirigeant_nom', 'dirigeant_email',
            'dirigeant_fonction', 'dirigeant_telephone', 'source'
        ])
        writer.writeheader()
        writer.writerows(template_rows)

    print(f"✅ Template sauvegardé: {OUTPUT_TEMPLATE}")

    print("\n" + "="*60)
    print("✅ EXTRACTION TERMINÉE")
    print("="*60)
    print(f"\n📊 Résumé:")
    print(f"   • 100 SDG top → {len(all_contacts)} contacts extraits (API Pappers)")
    print(f"   • 577 SDG restantes → Template CSV pour enrichissement manuel")
    print(f"\n📁 Fichiers générés:")
    print(f"   1. {OUTPUT_CONTACTS.name} - Contacts dirigeants (top 100)")
    print(f"   2. {OUTPUT_TEMPLATE.name} - Template à remplir (577 restants)")
    print(f"\n💡 Prochaine étape:")
    print(f"   Fusionner les contacts et importer dans le CRM:")
    print(f"   python scripts/import_sdg_clients.py")


if __name__ == "__main__":
    main()
