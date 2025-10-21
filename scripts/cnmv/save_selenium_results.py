#!/usr/bin/env python3
"""
Sauvegarde des résultats Selenium dans le CSV final
À lancer périodiquement pendant que le scraper tourne
"""

import csv
import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
INPUT_JSON = BASE_DIR / "output/cnmv_all_sgiic_enriched.json"  # Use enriched JSON with AUM
CACHE_FILE = BASE_DIR / "output/selenium_cache.json"
OUTPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
BACKUP_DIR = BASE_DIR / "output/backups"

def save_results():
    """Merge cache results into CSV"""

    print("💾 SAUVEGARDE RÉSULTATS SELENIUM - ESPAÑA")
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

    # Load JSON
    with open(INPUT_JSON, 'r', encoding='utf-8') as f:
        companies = json.load(f)

    # Merge data
    stats = {
        'websites': 0,
        'emails': 0,
        'phones': 0,
        'updated': 0
    }

    for company in companies:
        name = company.get('name', '')

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

    # Convert to CSV format
    csv_rows = []
    for company in companies:
        # Format AUM (billions to euros)
        aum_value = company.get('aum', 0)
        if isinstance(aum_value, (int, float)) and aum_value > 0:
            # AUM is in billions, convert to actual euros
            aum_str = f"{int(aum_value * 1_000_000_000):,}"
        else:
            aum_str = ''

        # Clean invalid emails
        email = company.get('email', '')
        if email and ('.png' in email or '@' not in email or len(email) < 5):
            email = ''  # Remove invalid email

        row = {
            'name': company.get('name', ''),
            'email': email,
            'phone': company.get('phone', ''),
            'website': company.get('website', ''),
            'address': company.get('address', ''),
            'city': company.get('city', ''),
            'postal_code': company.get('postal_code', ''),
            'country': 'Spain',
            'country_code': 'ES',
            'category': 'Asset Manager',
            'type': 'SGIIC',
            'register_number': company.get('register_number', ''),
            'register_date': company.get('register_date', ''),
            'aum': aum_str,
            'aum_date': company.get('aum_date', 'December 2024'),
            'tier': company.get('tier', ''),
            'notes': '',
            'pipeline_stage': 'Lead'
        }
        csv_rows.append(row)

    # Write CSV
    fieldnames = [
        'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
        'country', 'country_code', 'category', 'type', 'register_number',
        'register_date', 'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
    ]

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"✓ Saved: {OUTPUT_CSV}")
    print()

    # Create backup with timestamp
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = BACKUP_DIR / f"cnmv_enriched_{timestamp}.csv"

    with open(backup_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(csv_rows)

    print(f"✓ Backup: {backup_file}")
    print()

    # Stats
    print("=" * 70)
    print("📊 STATISTIQUES")
    print("=" * 70)
    print()
    print(f"Sociétés scrapées:     {len(cache)} / 117")
    print(f"Sociétés mises à jour: {stats['updated']}")
    print()
    print(f"✓ Websites ajoutés:  {stats['websites']}")
    print(f"✓ Emails ajoutés:    {stats['emails']}")
    print(f"✓ Phones ajoutés:    {stats['phones']}")
    print()

    # Calculate enrichment rate
    total = len(companies)
    websites_count = sum(1 for c in companies if c.get('website'))
    emails_count = sum(1 for c in companies if c.get('email'))
    phones_count = sum(1 for c in companies if c.get('phone'))

    print(f"📊 TAUX D'ENRICHISSEMENT ACTUEL:")
    print(f"   Websites: {websites_count}/{total} ({websites_count/total*100:.1f}%)")
    print(f"   Emails:   {emails_count}/{total} ({emails_count/total*100:.1f}%)")
    print(f"   Phones:   {phones_count}/{total} ({phones_count/total*100:.1f}%)")
    print()
    print("=" * 70)
    print()

if __name__ == '__main__':
    save_results()
