#!/usr/bin/env python3
"""
Extract dirigeants from Infogreffe using Selenium (headless Chrome)
Requires: pip3 install selenium
"""
import csv
import time
import re
from pathlib import Path
from typing import Dict, List, Optional

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.chrome.service import Service
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
except ImportError:
    print("❌ ERREUR: Selenium n'est pas installé")
    print("📦 Installation requise:")
    print("   pip3 install selenium --break-system-packages")
    print("\n⚠️  Note: Chrome/Chromium doit aussi être installé")
    exit(1)

# Configuration
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_DIRIGEANTS_SELENIUM.csv"

# Test mode: process only first N companies
TEST_MODE = True
TEST_LIMIT = 10


def setup_driver():
    """Configure headless Chrome driver"""
    options = Options()
    options.add_argument('--headless')  # Run in background
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print(f"❌ Erreur création driver Chrome: {e}")
        print("\n💡 Solutions:")
        print("   1. Installer Chrome: brew install --cask google-chrome")
        print("   2. Installer ChromeDriver: brew install chromedriver")
        return None


def extract_siren(society: Dict) -> Optional[str]:
    """Extract SIREN from notes field"""
    notes = society.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None
    return None


def get_dirigeants_from_infogreffe(driver, siren: str, company_name: str) -> List[Dict]:
    """Scrape dirigeants from Infogreffe using Selenium"""

    # Construct URL
    slug = company_name.lower().replace(' ', '-').replace("'", '-')
    slug = re.sub(r'[^a-z0-9-]', '', slug)  # Remove special chars
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    try:
        driver.get(url)

        # Wait for page to load (max 15 seconds)
        wait = WebDriverWait(driver, 15)

        # Wait for main content to appear
        try:
            wait.until(EC.presence_of_element_located((By.TAG_NAME, "h1")))
            time.sleep(2)  # Extra wait for dynamic content
        except TimeoutException:
            print("   ⏱️  Timeout - page non chargée")
            return []

        # Get page text
        page_text = driver.find_element(By.TAG_NAME, "body").text

        # Debug: save page source
        # with open(f"/tmp/infogreffe_{siren}_rendered.html", "w") as f:
        #     f.write(driver.page_source)

        # Extract dirigeants using patterns
        patterns = [
            r'Président[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Directeur\s+général[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Gérant[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Dirigeant[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
        ]

        found_dirigeants = []
        for pattern in patterns:
            matches = re.findall(pattern, page_text, re.IGNORECASE | re.MULTILINE)
            for match in matches:
                name_parts = match.strip().split()
                if len(name_parts) >= 2:
                    found_dirigeants.append({
                        'prenom': name_parts[0],
                        'nom': ' '.join(name_parts[1:]),
                        'fonction': 'Dirigeant',
                    })

        # Remove duplicates
        unique_dirigeants = []
        seen = set()
        for dir in found_dirigeants:
            key = f"{dir['prenom']} {dir['nom']}"
            if key not in seen:
                seen.add(key)
                unique_dirigeants.append(dir)

        return unique_dirigeants

    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return []


def main():
    print("🚀 Extraction dirigeants - Infogreffe avec Selenium\n")

    # Setup driver
    driver = setup_driver()
    if not driver:
        return

    # Load SDG data
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        societies = list(csv.DictReader(f))

    total = len(societies)
    print(f"📊 {total} SDG chargées")

    if TEST_MODE:
        societies = societies[:TEST_LIMIT]
        print(f"🧪 Mode TEST: traitement de {TEST_LIMIT} sociétés seulement\n")
    else:
        print()

    # Extract SIREN
    societies_with_siren = []
    for soc in societies:
        siren = extract_siren(soc)
        if siren:
            societies_with_siren.append({
                'society': soc,
                'siren': siren
            })

    print(f"✅ {len(societies_with_siren)} SDG avec SIREN\n")

    # Process each society
    all_contacts = []
    success_count = 0

    for idx, item in enumerate(societies_with_siren, 1):
        society = item['society']
        siren = item['siren']
        name = society['name']

        print(f"[{idx}/{len(societies_with_siren)}] {name[:50]}...", end=" ")

        dirigeants = get_dirigeants_from_infogreffe(driver, siren, name)

        if dirigeants:
            print(f"✅ {len(dirigeants)} dirigeant(s)")
            success_count += 1

            for dir in dirigeants:
                all_contacts.append({
                    'first_name': dir['prenom'],
                    'last_name': dir['nom'],
                    'personal_email': '',
                    'phone': society.get('phone', ''),
                    'job_title': dir['fonction'],
                    'company': name,
                    'country_code': 'FR',
                    'language': 'FR',
                    'source': f'Infogreffe - {siren}'
                })
        else:
            print("❌ Aucun")

        # Rate limiting
        time.sleep(1)

    # Cleanup
    driver.quit()

    # Save results
    if all_contacts:
        with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

        print(f"\n✅ {len(all_contacts)} contacts extraits")
        print(f"📁 Fichier: {OUTPUT_FILE}")
        print(f"📊 Taux de succès: {success_count}/{len(societies_with_siren)} ({success_count*100//len(societies_with_siren)}%)")
    else:
        print(f"\n❌ Aucun contact extrait")

    print("\n💡 Pour traiter les 677 SDG:")
    print("   1. Éditer le script: TEST_MODE = False")
    print("   2. Relancer: python3 scripts/extract_dirigeants_selenium.py")
    print("   ⏱️  Durée estimée: ~30 minutes (677 sociétés × 2-3 sec)")


if __name__ == "__main__":
    main()
