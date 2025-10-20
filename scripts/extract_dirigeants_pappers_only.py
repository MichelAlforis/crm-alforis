#!/usr/bin/env python3
"""
Extract dirigeants using ONLY Pappers API (100 free requests)
Focus on SDG without AUM (most important to enrich)
"""
import csv
import time
import requests
from pathlib import Path
from typing import Dict, List, Optional

# Configuration
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_CONTACTS = BASE_DIR / "SDG_CONTACTS_PAPPERS_100.csv"
OUTPUT_MANUAL = BASE_DIR / "SDG_TEMPLATE_MANUAL_577.csv"

# Pappers API
PAPPERS_API_TOKEN = "66bd8bc5a936e6da8a96956d13654a32eafdbd286a7d469d"
PAPPERS_API_URL = "https://api.pappers.fr/v2/entreprise"
MAX_REQUESTS = 100


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


def get_dirigeants_from_pappers(siren: str, token: str, retries=3) -> tuple[List[Dict], str]:
    """Fetch dirigeants from Pappers API with retry logic"""
    for attempt in range(retries):
        try:
            params = {'api_token': token, 'siren': siren}
            response = requests.get(PAPPERS_API_URL, params=params, timeout=10)

            # Check rate limit
            if response.status_code == 429:
                return [], "RATE_LIMIT"

            # Check quota
            if response.status_code == 403:
                return [], "QUOTA_EXCEEDED"

            response.raise_for_status()
            data = response.json()

            # Check for error in response
            if 'erreur' in data:
                return [], f"API_ERROR: {data['erreur']}"

            dirigeants = []
            if 'representants' in data:
                for rep in data['representants']:
                    if rep.get('qualite'):  # Has function/title
                        dirigeants.append({
                            'prenom': rep.get('prenom', ''),
                            'nom': rep.get('nom', ''),
                            'fonction': rep.get('qualite', ''),
                            'date': rep.get('date_prise_de_poste', ''),
                        })

            return dirigeants, "SUCCESS"

        except requests.exceptions.RequestException as e:
            if attempt < retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
                continue
            return [], f"NETWORK_ERROR: {e}"
        except Exception as e:
            return [], f"ERROR: {e}"

    return [], "MAX_RETRIES"


def main():
    print("="*70)
    print("🚀 EXTRACTION DIRIGEANTS - PAPPERS API ONLY")
    print("="*70)
    print(f"\n📋 Stratégie:")
    print(f"   • {MAX_REQUESTS} requêtes Pappers API gratuites")
    print(f"   • Priorité: SDG sans AUM (plus difficiles à enrichir)")
    print(f"   • Template manuel pour les {677 - MAX_REQUESTS} restantes\n")

    # Load data
    societies = load_sdg_data()
    print(f"📊 {len(societies)} SDG chargées\n")

    # Prepare societies with SIREN
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

    print(f"✅ {len(societies_with_siren)} SDG avec SIREN\n")

    # Sort: SDG without AUM first (priority), then by AUM ascending
    societies_with_siren.sort(key=lambda x: (x['aum'] > 0, x['aum']))

    # Split
    pappers_list = societies_with_siren[:MAX_REQUESTS]
    manual_list = societies_with_siren[MAX_REQUESTS:]

    print(f"📋 Répartition:")
    print(f"   • Pappers API: {len(pappers_list)} SDG")
    print(f"   • Manuel: {len(manual_list)} SDG\n")

    # Process with Pappers
    print("="*70)
    print(f"EXTRACTION PAPPERS API ({len(pappers_list)} sociétés)")
    print("="*70 + "\n")

    all_contacts = []
    success_count = 0
    error_counts = {}

    for idx, item in enumerate(pappers_list, 1):
        soc = item['society']
        siren = item['siren']
        name = soc['name']
        aum = item['aum']

        aum_str = f"{aum:.1f} Md€" if aum > 0 else "N/A"
        print(f"[{idx:3d}/{len(pappers_list)}] {name[:42]:42} (AUM: {aum_str:8})...", end=" ", flush=True)

        dirigeants, status = get_dirigeants_from_pappers(siren, PAPPERS_API_TOKEN)

        if status == "SUCCESS":
            if dirigeants:
                print(f"✅ {len(dirigeants)}")
                success_count += 1

                for dir in dirigeants:
                    all_contacts.append({
                        'first_name': dir['prenom'],
                        'last_name': dir['nom'],
                        'personal_email': '',
                        'phone': soc.get('phone', ''),
                        'job_title': dir['fonction'],
                        'company': name,
                        'country_code': 'FR',
                        'language': 'FR',
                        'source': f"Pappers API - {dir['date']}"
                    })
            else:
                print("⚠️  Aucun")
        else:
            print(f"❌ {status}")
            error_counts[status] = error_counts.get(status, 0) + 1

            # Stop if quota exceeded
            if status == "QUOTA_EXCEEDED":
                print("\n⛔ QUOTA DÉPASSÉ - Arrêt de l'extraction Pappers")
                manual_list = pappers_list[idx:] + manual_list
                break

            # Stop if rate limit
            if status == "RATE_LIMIT":
                print("\n⏸️  RATE LIMIT - Pause 60 secondes...")
                time.sleep(60)

        time.sleep(1)  # Rate limiting

    # Save contacts
    if all_contacts:
        with open(OUTPUT_CONTACTS, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

        print(f"\n✅ {len(all_contacts)} contacts extraits")
        print(f"📁 {OUTPUT_CONTACTS.name}")
        print(f"📊 Taux de succès: {success_count}/{idx} sociétés ({success_count*100//idx}%)")

        if error_counts:
            print(f"\n⚠️  Erreurs rencontrées:")
            for error, count in error_counts.items():
                print(f"   • {error}: {count}")
    else:
        print("\n❌ Aucun contact extrait")

    # Generate manual template
    print(f"\n" + "="*70)
    print(f"TEMPLATE MANUEL ({len(manual_list)} sociétés)")
    print("="*70 + "\n")

    manual_rows = []
    for item in manual_list:
        soc = item['society']
        manual_rows.append({
            'company_name': soc['name'],
            'siren': item['siren'],
            'phone': soc.get('phone', ''),
            'website': soc.get('website', ''),
            'aum': soc.get('aum', ''),
            'dirigeant_prenom': '',
            'dirigeant_nom': '',
            'dirigeant_email': '',
            'dirigeant_fonction': '',
            'dirigeant_telephone': '',
            'source': ''
        })

    with open(OUTPUT_MANUAL, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'company_name', 'siren', 'phone', 'website', 'aum',
            'dirigeant_prenom', 'dirigeant_nom', 'dirigeant_email',
            'dirigeant_fonction', 'dirigeant_telephone', 'source'
        ])
        writer.writeheader()
        writer.writerows(manual_rows)

    print(f"✅ Template créé: {OUTPUT_MANUAL.name}")
    print(f"📝 {len(manual_rows)} SDG à enrichir manuellement\n")

    # Summary
    print("="*70)
    print("📊 RÉSUMÉ FINAL")
    print("="*70)
    print(f"\n✅ Automatique (Pappers API):")
    print(f"   • {len(all_contacts)} contacts dirigeants")
    print(f"   • {success_count} sociétés enrichies")
    print(f"\n📋 Manuel (Template CSV):")
    print(f"   • {len(manual_rows)} SDG restantes")
    print(f"\n📁 Fichiers générés:")
    print(f"   1. {OUTPUT_CONTACTS.name}")
    print(f"   2. {OUTPUT_MANUAL.name}")
    print(f"\n💡 Prochaines étapes:")
    print(f"   1. Compléter le template manuel si nécessaire")
    print(f"   2. Fusionner tous les contacts")
    print(f"   3. Importer dans le CRM")


if __name__ == "__main__":
    main()
