#!/usr/bin/env python3
"""
Hybrid extraction: Pappers API (100 free) + Selenium + Manual template
Strategy:
1. Pappers API (100 free): SDG without AUM or small ones (< 0.5 Md€)
2. Selenium non-headless: Medium/Large SDG (>= 0.5 Md€) - better Cloudflare bypass
3. Manual template: Remaining SDG
"""
import csv
import json
import time
import requests
import re
from pathlib import Path
from typing import Dict, List, Optional

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    print("⚠️  Selenium non disponible - installation recommandée:")
    print("   pip3 install undetected-chromedriver setuptools --break-system-packages")

# Configuration
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_PAPPERS = BASE_DIR / "SDG_CONTACTS_PAPPERS.csv"
OUTPUT_SELENIUM = BASE_DIR / "SDG_CONTACTS_SELENIUM.csv"
OUTPUT_MANUAL = BASE_DIR / "SDG_TEMPLATE_MANUAL.csv"
OUTPUT_FINAL = BASE_DIR / "SDG_CONTACTS_DIRIGEANTS_FINAL.csv"

# Pappers API (free: 100 requests/month)
PAPPERS_API_TOKEN = "66bd8bc5a936e6da8a96956d13654a32eafdbd286a7d469d"
PAPPERS_API_URL = "https://api.pappers.fr/v2/entreprise"

# Strategy thresholds
PAPPERS_AUM_THRESHOLD = 0.5  # Use Pappers for SDG < 0.5 Md€ or without AUM
PAPPERS_MAX_REQUESTS = 100


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
        params = {'api_token': token, 'siren': siren}
        response = requests.get(PAPPERS_API_URL, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()
        dirigeants = []

        if 'representants' in data:
            for rep in data['representants']:
                if rep.get('qualite'):
                    dirigeants.append({
                        'prenom': rep.get('prenom', ''),
                        'nom': rep.get('nom', ''),
                        'fonction': rep.get('qualite', ''),
                        'date': rep.get('date_prise_de_poste', ''),
                    })

        return dirigeants

    except Exception as e:
        return []


def setup_selenium_driver():
    """Setup non-headless Chrome (visible window to bypass Cloudflare)"""
    if not SELENIUM_AVAILABLE:
        return None

    try:
        options = uc.ChromeOptions()
        # NON-HEADLESS MODE (visible browser to bypass Cloudflare)
        # options.add_argument('--headless=new')  # DISABLED
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--window-size=1280,800')
        options.add_argument('--start-maximized')

        driver = uc.Chrome(options=options, use_subprocess=True)
        return driver
    except Exception as e:
        print(f"❌ Erreur création driver: {e}")
        return None


def get_dirigeants_from_infogreffe(driver, siren: str, company_name: str) -> List[Dict]:
    """Scrape dirigeants from Infogreffe using Selenium"""
    slug = re.sub(r'[^a-z0-9-]', '', company_name.lower().replace(' ', '-').replace("'", '-'))
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    try:
        driver.get(url)
        time.sleep(5)  # Wait for Cloudflare + page load

        page_text = driver.find_element(By.TAG_NAME, "body").text

        # Check if blocked
        if "blocked" in page_text.lower() or "cloudflare" in page_text.lower():
            return []

        # Extract dirigeants
        patterns = [
            r'Président[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Directeur\s+général[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Gérant[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
        ]

        found = []
        for pattern in patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE)
            for match in matches:
                parts = match.strip().split()
                if len(parts) >= 2:
                    found.append({
                        'prenom': parts[0],
                        'nom': ' '.join(parts[1:]),
                        'fonction': 'Dirigeant',
                        'date': ''
                    })

        # Remove duplicates
        unique = []
        seen = set()
        for d in found:
            key = f"{d['prenom']} {d['nom']}"
            if key not in seen:
                seen.add(key)
                unique.append(d)

        return unique

    except Exception as e:
        return []


def main():
    print("="*70)
    print("🚀 EXTRACTION HYBRIDE DIRIGEANTS - 677 SDG")
    print("="*70)
    print("\n📋 Stratégie:")
    print("   1. Pappers API (100 gratuit) → Petites SDG (< 0.5 Md€ ou sans AUM)")
    print("   2. Selenium visible → Moyennes/Grandes SDG (>= 0.5 Md€)")
    print("   3. Template manuel → SDG restantes\n")

    # Load data
    societies = load_sdg_data()
    print(f"📊 {len(societies)} SDG chargées\n")

    # Categorize societies
    pappers_list = []
    selenium_list = []

    for soc in societies:
        siren = extract_siren(soc)
        if not siren:
            continue

        aum = float(soc.get('aum') or 0)

        if aum == 0 or aum < PAPPERS_AUM_THRESHOLD:
            pappers_list.append({'society': soc, 'siren': siren, 'aum': aum})
        else:
            selenium_list.append({'society': soc, 'siren': siren, 'aum': aum})

    # Sort by AUM (ascending for Pappers, descending for Selenium)
    pappers_list.sort(key=lambda x: x['aum'])
    selenium_list.sort(key=lambda x: x['aum'], reverse=True)

    # Limit Pappers to 100
    if len(pappers_list) > PAPPERS_MAX_REQUESTS:
        manual_from_pappers = pappers_list[PAPPERS_MAX_REQUESTS:]
        pappers_list = pappers_list[:PAPPERS_MAX_REQUESTS]
    else:
        manual_from_pappers = []

    print(f"✅ Répartition:")
    print(f"   • Pappers API: {len(pappers_list)} SDG (petites structures)")
    print(f"   • Selenium: {len(selenium_list)} SDG (moyennes/grandes)")
    print(f"   • Manuel: {len(manual_from_pappers)} SDG (reste)\n")

    # ========== PHASE 1: PAPPERS API ==========
    print("="*70)
    print("PHASE 1: PAPPERS API (100 requêtes gratuites)")
    print("="*70)

    pappers_contacts = []
    pappers_success = 0

    for idx, item in enumerate(pappers_list, 1):
        soc = item['society']
        siren = item['siren']
        name = soc['name']
        aum = item['aum']

        print(f"[{idx}/{len(pappers_list)}] {name[:45]:45} (AUM: {aum:.1f} Md€)...", end=" ")

        dirigeants = get_dirigeants_from_pappers(siren, PAPPERS_API_TOKEN)

        if dirigeants:
            print(f"✅ {len(dirigeants)}")
            pappers_success += 1

            for dir in dirigeants:
                pappers_contacts.append({
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
            print("❌")

        time.sleep(0.5)  # Rate limiting

    # Save Pappers results
    if pappers_contacts:
        with open(OUTPUT_PAPPERS, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(pappers_contacts)

    print(f"\n✅ Phase 1 terminée: {len(pappers_contacts)} contacts ({pappers_success}/{len(pappers_list)} sociétés)")
    print(f"📁 {OUTPUT_PAPPERS.name}\n")

    # ========== PHASE 2: SELENIUM ==========
    print("="*70)
    print("PHASE 2: SELENIUM NON-HEADLESS (fenêtre visible)")
    print("="*70)

    if not SELENIUM_AVAILABLE:
        print("❌ Selenium non disponible - phase ignorée\n")
        selenium_contacts = []
    else:
        print("⚠️  Une fenêtre Chrome va s'ouvrir (nécessaire pour contourner Cloudflare)")
        print("   Ne fermez pas la fenêtre manuellement!\n")
        print("🚀 Démarrage automatique de Selenium dans 3 secondes...\n")
        time.sleep(3)

        driver = setup_selenium_driver()
        if not driver:
            print("❌ Impossible de créer le driver\n")
            selenium_contacts = []
        else:
            selenium_contacts = []
            selenium_success = 0

            for idx, item in enumerate(selenium_list, 1):
                soc = item['society']
                siren = item['siren']
                name = soc['name']
                aum = item['aum']

                print(f"[{idx}/{len(selenium_list)}] {name[:45]:45} (AUM: {aum:.1f} Md€)...", end=" ")

                dirigeants = get_dirigeants_from_infogreffe(driver, siren, name)

                if dirigeants:
                    print(f"✅ {len(dirigeants)}")
                    selenium_success += 1

                    for dir in dirigeants:
                        selenium_contacts.append({
                            'first_name': dir['prenom'],
                            'last_name': dir['nom'],
                            'personal_email': '',
                            'phone': soc.get('phone', ''),
                            'job_title': dir['fonction'],
                            'company': name,
                            'country_code': 'FR',
                            'language': 'FR',
                            'source': f"Infogreffe - {siren}"
                        })
                else:
                    print("❌")

                time.sleep(2)  # Rate limiting

            driver.quit()
            print("\n✅ Navigateur fermé")

            # Save Selenium results
            if selenium_contacts:
                with open(OUTPUT_SELENIUM, 'w', encoding='utf-8', newline='') as f:
                    writer = csv.DictWriter(f, fieldnames=[
                        'first_name', 'last_name', 'personal_email', 'phone',
                        'job_title', 'company', 'country_code', 'language', 'source'
                    ])
                    writer.writeheader()
                    writer.writerows(selenium_contacts)

            print(f"✅ Phase 2 terminée: {len(selenium_contacts)} contacts ({selenium_success}/{len(selenium_list)} sociétés)")
            print(f"📁 {OUTPUT_SELENIUM.name}\n")

    # ========== PHASE 3: MANUAL TEMPLATE ==========
    print("="*70)
    print("PHASE 3: TEMPLATE MANUEL")
    print("="*70)

    # Combine all manual societies
    all_manual = manual_from_pappers + selenium_list  # selenium_list if Selenium failed/skipped

    manual_rows = []
    for item in all_manual:
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

    print(f"✅ {len(manual_rows)} SDG à enrichir manuellement")
    print(f"📁 {OUTPUT_MANUAL.name}\n")

    # ========== MERGE FINAL ==========
    print("="*70)
    print("FUSION FINALE")
    print("="*70)

    all_contacts = pappers_contacts + selenium_contacts

    if all_contacts:
        with open(OUTPUT_FINAL, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

    print(f"\n✅ {len(all_contacts)} contacts dirigeants extraits")
    print(f"📁 {OUTPUT_FINAL.name}")

    print("\n" + "="*70)
    print("📊 RÉSUMÉ FINAL")
    print("="*70)
    print(f"   • Pappers API: {len(pappers_contacts)} contacts")
    print(f"   • Selenium: {len(selenium_contacts)} contacts")
    print(f"   • TOTAL automatique: {len(all_contacts)} contacts")
    print(f"   • Manuel à compléter: {len(manual_rows)} SDG")
    print(f"\n💡 Prochaine étape:")
    print(f"   1. Compléter {OUTPUT_MANUAL.name}")
    print(f"   2. Importer: python scripts/import_sdg_clients.py")


if __name__ == "__main__":
    main()
