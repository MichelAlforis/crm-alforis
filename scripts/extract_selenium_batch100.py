#!/usr/bin/env python3
"""
Extraction Selenium - 100 par 100 avec checkpoint
CODE VALIDÉ sur test 2 SDG ✅
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
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_SELENIUM_FINAL.csv"

# Config
SAVE_EVERY = 10
WAIT_PAGE_LOAD = 6  # seconds (increased for JavaScript pages)
WAIT_BETWEEN_REQUESTS = 3  # seconds


def load_checkpoint():
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE, 'r') as f:
            return json.load(f)
    return {'last_index': 0, 'contacts': []}


def save_checkpoint(index, contacts):
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump({'last_index': index, 'contacts': contacts}, f, indent=2)
    print(f"      💾 Checkpoint sauvegardé: {len(contacts)} contacts")


def extract_siren(soc: Dict) -> Optional[str]:
    notes = soc.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None


def scrape_infogreffe(driver, siren, name):
    """Scrape dirigeants - CODE VALIDÉ ✅"""
    slug = re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-').replace("'", '-'))
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    try:
        driver.get(url)
        time.sleep(WAIT_PAGE_LOAD)

        # Handle cookie banner
        try:
            cookie_buttons = driver.find_elements(By.XPATH,
                "//*[contains(text(), 'Continuer sans accepter') or contains(text(), 'Refuser') or contains(text(), 'Tout refuser')]")
            if cookie_buttons:
                cookie_buttons[0].click()
                time.sleep(1)
        except:
            pass

        # Get page text
        text = driver.find_element(By.TAG_NAME, "body").text

        # Check if blocked or still loading
        if "blocked" in text.lower() or "cloudflare" in text.lower():
            return []

        if "chargement en cours" in text.lower():
            # Retry with more wait
            time.sleep(3)
            text = driver.find_element(By.TAG_NAME, "body").text

        # Extract dirigeants line-by-line
        found = []
        lines = text.split('\n')

        for i, line in enumerate(lines):
            line_clean = line.strip()

            # Match exact function titles
            if line_clean in ['Président', 'Président(e)', 'Directeur général',
                              'Directeur général délégué', 'Gérant', 'Gérant(e)',
                              'Co-Gérant', 'Directrice générale']:

                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()

                    # Skip if next line is not a name (too short, contains numbers, etc.)
                    if len(next_line) < 4 or any(c.isdigit() for c in next_line):
                        continue

                    # Skip companies/audit firms (containing certain keywords)
                    if any(kw in next_line.upper() for kw in ['AUDIT', 'CONSEIL', 'SAS', 'SARL', 'SA', 'CONSULTING']):
                        continue

                    parts = next_line.split()
                    if len(parts) >= 2:
                        # Detect name format
                        if parts[0].isupper() and len(parts[0]) > 2:
                            # LASTNAME Firstname format
                            found.append({
                                'fonction': line_clean,
                                'prenom': ' '.join(parts[1:]),
                                'nom': parts[0]
                            })
                        else:
                            # Firstname LASTNAME format
                            found.append({
                                'fonction': line_clean,
                                'prenom': parts[0],
                                'nom': ' '.join(parts[1:])
                            })

        return found[:5]  # Max 5 per company

    except Exception as e:
        return []


def main():
    print("="*70)
    print("🚀 EXTRACTION DIRIGEANTS - SELENIUM BATCH 100")
    print("="*70)
    print(f"\n⚙️  Configuration:")
    print(f"   • Sauvegarde tous les {SAVE_EVERY} SDG")
    print(f"   • Temps chargement page: {WAIT_PAGE_LOAD}s")
    print(f"   • Délai entre requêtes: {WAIT_BETWEEN_REQUESTS}s\n")

    # Load checkpoint
    checkpoint = load_checkpoint()
    start_idx = checkpoint['last_index']
    all_contacts = checkpoint['contacts']

    if start_idx > 0:
        print(f"📍 REPRISE au SDG #{start_idx + 1}")
        print(f"   {len(all_contacts)} contacts déjà extraits\n")

    # Load SDG
    with open(DATA_FILE, 'r') as f:
        societies = list(csv.DictReader(f))

    sdg_list = []
    for soc in societies:
        siren = extract_siren(soc)
        if siren:
            aum = float(soc.get('aum') or 0)
            sdg_list.append({'soc': soc, 'siren': siren, 'aum': aum})

    # Sort by AUM descending (most important first)
    sdg_list.sort(key=lambda x: x['aum'], reverse=True)

    total = len(sdg_list)
    print(f"📊 {total} SDG avec SIREN\n")

    # Start browser
    print("🌐 Ouverture Chrome (fenêtre visible - NE PAS FERMER!)...")
    options = uc.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1280,900')

    driver = uc.Chrome(options=options, use_subprocess=True)

    # First visit to accept cookies manually
    print("\n📋 Visite initiale Infogreffe pour configuration cookies...")
    driver.get("https://www.infogreffe.fr/")
    time.sleep(2)

    print("\n" + "="*70)
    print("⚠️  ACTION REQUISE DANS LA FENÊTRE CHROME:")
    print("   1. Cliquez sur 'Continuer sans accepter' ou 'Tout refuser'")
    print("   2. Revenez ici et appuyez sur ENTRÉE pour continuer")
    print("="*70)
    print("\n⏳ Attente 15 secondes pour cliquer sur les cookies..."); time.sleep(15)
    print("\n✅ Configuration terminée - Démarrage extraction...\n")

    try:
        success = 0
        current_batch_start = (start_idx // SAVE_EVERY) * SAVE_EVERY

        for idx in range(start_idx, total):
            item = sdg_list[idx]
            soc = item['soc']
            siren = item['siren']
            name = soc['name']
            aum = item['aum']

            aum_str = f"{aum:.1f} Md€" if aum > 0 else "N/A"
            print(f"[{idx + 1:3d}/{total}] {name[:42]:42} (AUM: {aum_str:7})...", end=" ", flush=True)

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

            # Checkpoint every SAVE_EVERY
            if (idx + 1) % SAVE_EVERY == 0:
                save_checkpoint(idx + 1, all_contacts)
                batch_num = (idx + 1) // SAVE_EVERY
                print(f"\n{'='*70}")
                print(f"✅ BATCH {batch_num} TERMINÉ ({idx + 1}/{total} SDG)")
                print(f"   • {len(all_contacts)} contacts total")
                print(f"   • {success} sociétés enrichies dans ce batch")
                print(f"{'='*70}\n")
                success = 0  # Reset for next batch

            time.sleep(WAIT_BETWEEN_REQUESTS)

    except KeyboardInterrupt:
        print("\n\n⏸️  INTERRUPTION MANUELLE")
        print("   Sauvegarde checkpoint...")
        save_checkpoint(idx, all_contacts)
        print(f"   ✅ Checkpoint sauvegardé - Vous pouvez reprendre plus tard")

    finally:
        print("\n🔒 Fermeture navigateur...")
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

        if start_idx < total - 1:
            processed = total - start_idx
            rate = success * 100 // processed if processed > 0 else 0
            print(f"📊 Taux succès: {success}/{processed} ({rate}%)")

    # Clean checkpoint if complete
    if idx >= total - 1 and CHECKPOINT_FILE.exists():
        CHECKPOINT_FILE.unlink()
        print("\n🧹 Checkpoint nettoyé (extraction complète)")


if __name__ == "__main__":
    main()
