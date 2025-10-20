#!/usr/bin/env python3
"""
Simple Selenium extraction - ONE browser session, checkpoint system
"""
import csv
import time
import re
from pathlib import Path
from typing import Dict, List, Optional
import json

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
except ImportError:
    print("❌ pip3 install undetected-chromedriver setuptools --break-system-packages")
    exit(1)

# Files
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
CHECKPOINT_FILE = BASE_DIR / "selenium_checkpoint.json"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_SELENIUM.csv"

# Config
BATCH_SIZE = 100  # Save every 100
START_INDEX = 0   # Resume from index


def load_checkpoint():
    """Load checkpoint to resume"""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {'last_index': 0, 'contacts': []}


def save_checkpoint(index, contacts):
    """Save checkpoint"""
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump({'last_index': index, 'contacts': contacts}, f)


def extract_siren(soc: Dict) -> Optional[str]:
    notes = soc.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None


def scrape_infogreffe(driver, siren, name):
    """Scrape ONE company"""
    slug = re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-').replace("'", '-'))
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    try:
        driver.get(url)
        time.sleep(3)

        text = driver.find_element(By.TAG_NAME, "body").text

        if "blocked" in text.lower():
            return []

        # Simple extraction
        found = []
        lines = text.split('\n')

        for i, line in enumerate(lines):
            # Look for "Président", "Directeur général", etc.
            if any(kw in line for kw in ['Président', 'Directeur général', 'Gérant']):
                # Next line might have the name
                if i + 1 < len(lines):
                    name_line = lines[i + 1].strip()
                    parts = name_line.split()
                    if len(parts) >= 2:
                        found.append({
                            'prenom': parts[0],
                            'nom': ' '.join(parts[1:]),
                            'fonction': 'Dirigeant'
                        })

        return found[:3]  # Max 3

    except:
        return []


def main():
    print("🚀 Extraction Selenium simple\n")

    # Load checkpoint
    checkpoint = load_checkpoint()
    start_idx = checkpoint['last_index']
    all_contacts = checkpoint['contacts']

    if start_idx > 0:
        print(f"📍 Reprise au SDG #{start_idx + 1}")
        print(f"   {len(all_contacts)} contacts déjà extraits\n")

    # Load SDG
    with open(DATA_FILE, 'r') as f:
        societies = list(csv.DictReader(f))

    sdg_list = []
    for soc in societies:
        siren = extract_siren(soc)
        if siren:
            sdg_list.append({'soc': soc, 'siren': siren})

    total = len(sdg_list)
    print(f"📊 {total} SDG avec SIREN\n")

    # Start browser
    print("🌐 Ouverture Chrome (ne pas fermer!)...\n")
    options = uc.ChromeOptions()
    options.add_argument('--no-sandbox')
    driver = uc.Chrome(options=options, use_subprocess=True)

    try:
        success = 0

        for idx in range(start_idx, total):
            item = sdg_list[idx]
            soc = item['soc']
            siren = item['siren']
            name = soc['name']

            print(f"[{idx + 1:3d}/{total}] {name[:45]:45}...", end=" ", flush=True)

            dirs = scrape_infogreffe(driver, siren, name)

            if dirs:
                print(f"✅ {len(dirs)}")
                success += 1

                for d in dirs:
                    all_contacts.append({
                        'first_name': d['prenom'],
                        'last_name': d['nom'],
                        'personal_email': '',
                        'phone': soc.get('phone', ''),
                        'job_title': d['fonction'],
                        'company': name,
                        'country_code': 'FR',
                        'language': 'FR',
                        'source': f'Infogreffe-{siren}'
                    })
            else:
                print("❌")

            # Checkpoint every 100
            if (idx + 1) % BATCH_SIZE == 0:
                save_checkpoint(idx + 1, all_contacts)
                print(f"\n💾 Checkpoint: {len(all_contacts)} contacts sauvegardés\n")

            time.sleep(2)

    except KeyboardInterrupt:
        print("\n\n⏸️  Interruption - Sauvegarde checkpoint...")
        save_checkpoint(idx, all_contacts)

    finally:
        driver.quit()

    # Save final
    if all_contacts:
        with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=[
                'first_name', 'last_name', 'personal_email', 'phone',
                'job_title', 'company', 'country_code', 'language', 'source'
            ])
            writer.writeheader()
            writer.writerows(all_contacts)

    print(f"\n✅ {len(all_contacts)} contacts extraits")
    print(f"📁 {OUTPUT_FILE.name}")
    print(f"📊 {success}/{total - start_idx} sociétés ({success*100//(total - start_idx)}%)")

    # Clean checkpoint
    if CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()


if __name__ == "__main__":
    main()
