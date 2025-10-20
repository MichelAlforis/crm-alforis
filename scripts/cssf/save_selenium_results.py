#!/usr/bin/env python3
"""
Sauvegarde des résultats Selenium dans le CSV final
À lancer périodiquement pendant que le scraper tourne
"""

import csv
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv"
CACHE_FILE = BASE_DIR / "data/cssf/selenium_cache.json"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
BACKUP_DIR = BASE_DIR / "data/cssf/backups"

def save_results():
    """Merge cache results into CSV"""

    print("💾 SAUVEGARDE RÉSULTATS SELENIUM")
    print("=" * 70)
    print()

    # Load cache
    if not CACHE_FILE.exists():
        print("❌ Cache file not found")
        return

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)

    print(f"📊 Cache: {len(cache)} sociétés")
    print()

    # Load CSV
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        companies = list(reader)

    # Merge data
    stats = {
        'websites': 0,
        'emails': 0,
        'phones': 0,
        'updated': 0
    }

    for company in companies:
        name = company['name']

        if name in cache:
            data = cache[name]
            updated = False

            if data.get('website') and not company.get('website'):
                company['website'] = data['website']
                stats['websites'] += 1
                updated = True

            if data.get('email') and not company.get('email'):
                company['email'] = data['email']
                stats['emails'] += 1
                updated = True

            if data.get('phone') and not company.get('phone'):
                company['phone'] = data['phone']
                stats['phones'] += 1
                updated = True

            if updated:
                stats['updated'] += 1

    # Save output
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=companies[0].keys())
        writer.writeheader()
        writer.writerows(companies)

    print(f"✓ Saved: {OUTPUT_CSV}")
    print()

    # Create backup with timestamp
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = BACKUP_DIR / f"luxembourg_enriched_{timestamp}.csv"

    with open(backup_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=companies[0].keys())
        writer.writeheader()
        writer.writerows(companies)

    print(f"✓ Backup: {backup_file}")
    print()

    # Stats
    print("=" * 70)
    print("📊 STATISTIQUES")
    print("=" * 70)
    print()
    print(f"Sociétés scrapées:   {len(cache)} / 266")
    print(f"Sociétés mises à jour: {stats['updated']}")
    print()
    print(f"✓ Websites ajoutés:  {stats['websites']}")
    print(f"✓ Emails ajoutés:    {stats['emails']}")
    print(f"✓ Phones ajoutés:    {stats['phones']}")
    print()
    print("=" * 70)
    print()

if __name__ == '__main__':
    save_results()
