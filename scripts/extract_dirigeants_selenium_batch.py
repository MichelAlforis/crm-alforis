#!/usr/bin/env python3
"""
Extract dirigeants with Selenium - Batch mode (100 par 100)
Non-headless Chrome to bypass Cloudflare
"""
import csv
import time
import re
from pathlib import Path
from typing import Dict, List, Optional
import sys

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
except ImportError:
    print("❌ ERREUR: Selenium non installé")
    print("pip3 install undetected-chromedriver setuptools --break-system-packages")
    sys.exit(1)

# Configuration
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_DIR = BASE_DIR / "dirigeants_selenium_batches"
OUTPUT_FINAL = BASE_DIR / "SDG_CONTACTS_DIRIGEANTS_SELENIUM_FINAL.csv"

BATCH_SIZE = 100
DELAY_BETWEEN_REQUESTS = 3  # seconds
DELAY_BETWEEN_BATCHES = 30  # seconds


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


def setup_driver():
    """Setup non-headless Chrome (visible to bypass Cloudflare)"""
    options = uc.ChromeOptions()
    # NON-HEADLESS = visible browser window
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1280,900')
    options.add_argument('--disable-blink-features=AutomationControlled')

    driver = uc.Chrome(options=options, use_subprocess=True, version_main=None)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

    return driver


def get_dirigeants_from_infogreffe(driver, siren: str, company_name: str) -> List[Dict]:
    """Scrape dirigeants from Infogreffe"""
    slug = re.sub(r'[^a-z0-9-]', '', company_name.lower().replace(' ', '-').replace("'", '-'))
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    try:
        driver.get(url)
        time.sleep(4)  # Wait for page load + Cloudflare

        page_text = driver.find_element(By.TAG_NAME, "body").text

        # Check if blocked
        if "blocked" in page_text.lower() or "attention required" in page_text.lower():
            return []

        # Look for dirigeants section
        patterns = [
            # Pattern: "Nom Prénom" with capital letters
            r'([A-ZÀ-Ü]{2,})\s+([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)*)\s*(?:Président|Directeur|Gérant)',
            # Pattern: Function followed by name
            r'(?:Président|Directeur général|Gérant)[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+)\s+([A-ZÀ-Ü]{2,})',
            # Pattern: Standard French name format
            r'(?:Président|Directeur général|Gérant)[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
        ]

        found = []
        for pattern in patterns:
            matches = re.findall(pattern, page_text, re.MULTILINE)
            for match in matches:
                if isinstance(match, tuple):
                    if len(match) == 2:
                        # Check which is first name vs last name
                        if match[0].isupper() and len(match[0]) > 2:
                            # First is LASTNAME
                            found.append({
                                'prenom': match[1],
                                'nom': match[0],
                                'fonction': 'Dirigeant'
                            })
                        else:
                            # First is firstname
                            found.append({
                                'prenom': match[0],
                                'nom': match[1],
                                'fonction': 'Dirigeant'
                            })
                else:
                    # Single match - split by space
                    parts = match.strip().split()
                    if len(parts) >= 2:
                        found.append({
                            'prenom': parts[0],
                            'nom': ' '.join(parts[1:]),
                            'fonction': 'Dirigeant'
                        })

        # Remove duplicates
        unique = []
        seen = set()
        for d in found:
            key = f"{d['prenom']} {d['nom']}"
            if key not in seen and len(d['prenom']) > 1 and len(d['nom']) > 1:
                seen.add(key)
                unique.append(d)

        return unique[:5]  # Max 5 dirigeants per company

    except Exception as e:
        print(f"\n      Erreur: {e}")
        return []


def save_batch_results(batch_num: int, contacts: List[Dict]):
    """Save batch results to CSV"""
    OUTPUT_DIR.mkdir(exist_ok=True)
    filename = OUTPUT_DIR / f"batch_{batch_num:03d}_contacts.csv"

    with open(filename, 'w', encoding='utf-8', newline='') as f:
        if contacts:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(contacts)

    return filename


def merge_all_batches():
    """Merge all batch files into final CSV"""
    all_contacts = []

    for batch_file in sorted(OUTPUT_DIR.glob("batch_*_contacts.csv")):
        with open(batch_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            all_contacts.extend(list(reader))

    if all_contacts:
        with open(OUTPUT_FINAL, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

    return len(all_contacts)


def main():
    print("="*70)
    print("🚀 EXTRACTION DIRIGEANTS - SELENIUM BATCH MODE")
    print("="*70)
    print(f"\n⚙️  Configuration:")
    print(f"   • Taille batch: {BATCH_SIZE} sociétés")
    print(f"   • Délai entre requêtes: {DELAY_BETWEEN_REQUESTS}s")
    print(f"   • Délai entre batches: {DELAY_BETWEEN_BATCHES}s")
    print(f"   • Mode: NON-HEADLESS (fenêtre visible)\n")

    # Load data
    societies = load_sdg_data()
    print(f"📊 {len(societies)} SDG chargées")

    # Filter societies with SIREN
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

    # Sort by AUM descending (most important first)
    societies_with_siren.sort(key=lambda x: x['aum'], reverse=True)

    total = len(societies_with_siren)
    num_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

    print(f"✅ {total} SDG avec SIREN")
    print(f"📦 {num_batches} batches de {BATCH_SIZE}\n")

    # Check for existing batches
    OUTPUT_DIR.mkdir(exist_ok=True)
    existing_batches = len(list(OUTPUT_DIR.glob("batch_*_contacts.csv")))

    start_batch = 1
    if existing_batches > 0:
        print(f"⚠️  {existing_batches} batches déjà traités trouvés")
        response = input(f"Reprendre au batch {existing_batches + 1}? (o/n): ").lower()
        if response == 'o':
            start_batch = existing_batches + 1
        else:
            print("Suppression des anciens batches...")
            for f in OUTPUT_DIR.glob("batch_*_contacts.csv"):
                f.unlink()

    # Process batches
    global_stats = {'total_contacts': 0, 'total_companies': 0, 'success_companies': 0}

    for batch_num in range(start_batch, num_batches + 1):
        start_idx = (batch_num - 1) * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, total)
        batch_societies = societies_with_siren[start_idx:end_idx]

        print("="*70)
        print(f"BATCH {batch_num}/{num_batches} - Sociétés {start_idx + 1} à {end_idx}")
        print("="*70)
        print(f"\n🌐 Ouverture navigateur Chrome...\n")

        driver = setup_driver()
        batch_contacts = []
        batch_success = 0

        for idx, item in enumerate(batch_societies, 1):
            soc = item['society']
            siren = item['siren']
            name = soc['name']
            aum = item['aum']

            global_idx = start_idx + idx
            aum_str = f"{aum:.1f} Md€" if aum > 0 else "N/A"

            print(f"[{global_idx:3d}/{total}] {name[:40]:40} (AUM: {aum_str:8})...", end=" ", flush=True)

            dirigeants = get_dirigeants_from_infogreffe(driver, siren, name)

            if dirigeants:
                print(f"✅ {len(dirigeants)}")
                batch_success += 1

                for dir in dirigeants:
                    batch_contacts.append({
                        'first_name': dir['prenom'],
                        'last_name': dir['nom'],
                        'personal_email': '',
                        'phone': soc.get('phone', ''),
                        'job_title': dir['fonction'],
                        'company': name,
                        'country_code': 'FR',
                        'language': 'FR',
                        'source': f'Infogreffe - {siren}'
                    })
            else:
                print("❌")

            time.sleep(DELAY_BETWEEN_REQUESTS)

        driver.quit()
        print(f"\n✅ Navigateur fermé")

        # Save batch results
        batch_file = save_batch_results(batch_num, batch_contacts)
        print(f"💾 Batch sauvegardé: {batch_file.name}")
        print(f"📊 Résultats batch: {len(batch_contacts)} contacts ({batch_success}/{len(batch_societies)} sociétés)")

        global_stats['total_contacts'] += len(batch_contacts)
        global_stats['total_companies'] += len(batch_societies)
        global_stats['success_companies'] += batch_success

        # Pause between batches (except last)
        if batch_num < num_batches:
            print(f"\n⏸️  Pause {DELAY_BETWEEN_BATCHES}s avant batch suivant...\n")
            time.sleep(DELAY_BETWEEN_BATCHES)

    # Merge all batches
    print("\n" + "="*70)
    print("FUSION FINALE")
    print("="*70)

    total_merged = merge_all_batches()

    print(f"\n✅ {total_merged} contacts fusionnés")
    print(f"📁 {OUTPUT_FINAL.name}")

    # Final summary
    print("\n" + "="*70)
    print("📊 RÉSUMÉ FINAL")
    print("="*70)
    print(f"\n✅ Total:")
    print(f"   • {global_stats['total_contacts']} contacts dirigeants extraits")
    print(f"   • {global_stats['success_companies']}/{global_stats['total_companies']} sociétés enrichies")
    print(f"   • Taux succès: {global_stats['success_companies']*100//global_stats['total_companies']}%")
    print(f"\n📁 Fichiers:")
    print(f"   • Batches: {OUTPUT_DIR}/")
    print(f"   • Final: {OUTPUT_FINAL.name}")
    print(f"\n💡 Prochaine étape:")
    print(f"   Importer dans le CRM: python scripts/import_sdg_clients.py")


if __name__ == "__main__":
    main()
