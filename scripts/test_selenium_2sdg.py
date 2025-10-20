#!/usr/bin/env python3
"""
TEST Selenium sur 2 SDG seulement
"""
import csv
import time
import re
from pathlib import Path
from typing import Dict, Optional

try:
    import undetected_chromedriver as uc
    from selenium.webdriver.common.by import By
except ImportError:
    print("❌ pip3 install undetected-chromedriver setuptools --break-system-packages")
    exit(1)

BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"


def extract_siren(soc: Dict) -> Optional[str]:
    notes = soc.get('notes', '')
    if 'SIRET:' in notes:
        siret = notes.split('SIRET:')[1].split('|')[0].strip()
        return siret[:9] if len(siret) >= 9 else None


def scrape_infogreffe(driver, siren, name):
    """Scrape dirigeants from Infogreffe"""
    slug = re.sub(r'[^a-z0-9-]', '', name.lower().replace(' ', '-').replace("'", '-'))
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    print(f"      URL: {url}")

    try:
        driver.get(url)
        print(f"      Chargement...", end=" ", flush=True)
        time.sleep(3)  # Wait for page
        print("✓")

        # Try to close cookie banner
        try:
            # Look for "Continuer sans accepter" or "Refuser"
            cookie_buttons = driver.find_elements(By.XPATH,
                "//*[contains(text(), 'Continuer sans accepter') or contains(text(), 'Refuser') or contains(text(), 'Tout refuser')]")
            if cookie_buttons:
                cookie_buttons[0].click()
                print(f"      Cookies refusés...", end=" ", flush=True)
                time.sleep(2)
                print("✓")
        except:
            pass  # No cookie banner or already accepted

        # Get page text
        text = driver.find_element(By.TAG_NAME, "body").text

        # Check if blocked
        if "blocked" in text.lower() or "cloudflare" in text.lower():
            print(f"      ⚠️  Bloqué par Cloudflare")
            return []

        # Debug: show first 500 chars
        print(f"      Contenu (500 chars): {text[:500]}")

        # Look for dirigeants patterns
        found = []

        # Pattern 1: "Président: NOM Prenom"
        pattern1 = r'(Président|Directeur général|Gérant)[e]?\s*:?\s*([A-ZÀ-Ü\s]+[A-Z][a-zà-ü]+)'
        matches = re.findall(pattern1, text, re.MULTILINE)
        print(f"      Pattern1 matches: {len(matches)}")

        for func, name_str in matches:
            parts = name_str.strip().split()
            if len(parts) >= 2:
                found.append({
                    'fonction': func,
                    'nom': parts[0],
                    'prenom': ' '.join(parts[1:])
                })

        # Pattern 2: Line-by-line search (most reliable for Infogreffe)
        lines = text.split('\n')
        for i, line in enumerate(lines):
            line_clean = line.strip()
            # Check if line is EXACTLY a function title
            if line_clean in ['Président', 'Président(e)', 'Directeur général', 'Directeur général délégué', 'Gérant', 'Gérant(e)']:
                print(f"      Trouvé fonction ligne {i}: {line_clean}")
                if i + 1 < len(lines):
                    next_line = lines[i + 1].strip()
                    print(f"      Nom ligne {i+1}: {next_line}")

                    # Parse name (format: "Prénom Nom" or "NOM Prénom")
                    if next_line and len(next_line) > 3:
                        parts = next_line.split()
                        if len(parts) >= 2:
                            # Try to detect if first word is all caps (LASTNAME)
                            if parts[0].isupper() and len(parts[0]) > 2:
                                # Format: "BARRIER Denis" → prenom=Denis, nom=BARRIER
                                found.append({
                                    'fonction': line_clean,
                                    'prenom': ' '.join(parts[1:]),
                                    'nom': parts[0]
                                })
                            else:
                                # Format: "Denis BARRIER" or "Denis Barrier"
                                found.append({
                                    'fonction': line_clean,
                                    'prenom': parts[0],
                                    'nom': ' '.join(parts[1:])
                                })

        print(f"      Dirigeants trouvés: {len(found)}")
        return found[:3]

    except Exception as e:
        print(f"      ❌ Erreur: {e}")
        return []


def main():
    print("="*70)
    print("🧪 TEST SELENIUM - 2 SDG")
    print("="*70)
    print()

    # Load SDG
    with open(DATA_FILE, 'r') as f:
        societies = list(csv.DictReader(f))

    # Get first 2 with SIREN
    test_list = []
    for soc in societies:
        siren = extract_siren(soc)
        if siren:
            test_list.append({'soc': soc, 'siren': siren})
        if len(test_list) == 2:
            break

    print(f"📋 SDG à tester:")
    for i, item in enumerate(test_list, 1):
        print(f"   {i}. {item['soc']['name']} (SIREN: {item['siren']})")
    print()

    # Start browser
    print("🌐 Ouverture Chrome (fenêtre visible pour contourner Cloudflare)...")
    options = uc.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1280,900')

    print("   Initialisation driver...", end=" ", flush=True)
    driver = uc.Chrome(options=options, use_subprocess=True)
    print("✓\n")

    results = []

    try:
        for idx, item in enumerate(test_list, 1):
            soc = item['soc']
            siren = item['siren']
            name = soc['name']

            print(f"[{idx}/2] {name}")
            print(f"      SIREN: {siren}")

            dirs = scrape_infogreffe(driver, siren, name)

            if dirs:
                print(f"      ✅ {len(dirs)} dirigeant(s) trouvé(s):")
                for d in dirs:
                    print(f"         • {d['prenom']} {d['nom']} - {d['fonction']}")
                    results.append({
                        'company': name,
                        'first_name': d['prenom'],
                        'last_name': d['nom'],
                        'job_title': d['fonction'],
                        'siren': siren
                    })
            else:
                print(f"      ❌ Aucun dirigeant trouvé")

            print()
            time.sleep(2)

    finally:
        print("🔒 Fermeture navigateur...")
        driver.quit()

    print("\n" + "="*70)
    print("📊 RÉSULTATS")
    print("="*70)
    print(f"\n✅ {len(results)} contacts extraits")

    if results:
        print("\n📋 Détails:")
        for r in results:
            print(f"   • {r['first_name']} {r['last_name']} ({r['job_title']}) - {r['company']}")
    else:
        print("\n❌ Aucun contact extrait")
        print("\n💡 Problèmes possibles:")
        print("   1. Cloudflare bloque toujours (même en non-headless)")
        print("   2. Structure HTML d'Infogreffe a changé")
        print("   3. Patterns regex ne matchent pas")
        print("\n📝 Recommandations:")
        print("   • Vérifier manuellement les URLs dans un navigateur")
        print("   • Utiliser l'API Pappers payante (25€/mois)")
        print("   • Enrichissement manuel avec le template CSV")


if __name__ == "__main__":
    main()
