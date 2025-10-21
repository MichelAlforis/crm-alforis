#!/usr/bin/env python3
"""
Extraction simple des téléphones avec BeautifulSoup
Recherche tous les +34 dans le HTML
"""

import csv
import json
import requests
from bs4 import BeautifulSoup
import re
import time
from pathlib import Path

BASE_DIR = Path(__file__).parent
INPUT_CSV = BASE_DIR / "output/cnmv_import_crm_final.csv"
OUTPUT_JSON = BASE_DIR / "output/phones_simple.json"

def extract_phones_from_url(url):
    """Extract all +34 phone numbers from a URL"""
    phones = []

    try:
        # Clean URL
        if not url.startswith('http'):
            url = 'https://' + url

        response = requests.get(url, timeout=10, headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })

        if response.status_code != 200:
            return phones

        # Get all text from page
        soup = BeautifulSoup(response.content, 'html.parser')
        text = soup.get_text()

        # Simple regex: find all +34 followed by numbers
        # Patterns:
        # +34 XXX XXX XXX
        # +34 XXXXXXXXX
        # +34-XXX-XXX-XXX
        phone_pattern = r'\+34[\s\-]?[\d\s\-]{9,15}'

        matches = re.findall(phone_pattern, text)

        for match in matches:
            # Clean phone
            phone = match.strip()
            # Remove extra spaces
            phone = re.sub(r'\s+', ' ', phone)
            # Remove if too short or too long
            digits = re.sub(r'[^\d]', '', phone)
            if len(digits) >= 11 and len(digits) <= 13:  # +34 + 9 digits
                phones.append(phone)

        # Remove duplicates
        phones = list(set(phones))

    except Exception as e:
        pass

    return phones

def extract_all():
    """Extract phones from all organizations with websites"""

    print("=" * 80)
    print("  EXTRACTION SIMPLE TÉLÉPHONES (+34)")
    print("=" * 80)
    print()

    # Load organizations
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        orgs = list(reader)

    # Filter with websites and without phones
    orgs_to_scrape = [o for o in orgs if o.get('website') and not o.get('phone')]

    print(f"🎯 Sociétés à scraper: {len(orgs_to_scrape)}")
    print(f"   (avec website mais sans téléphone)")
    print()

    results = []

    for i, org in enumerate(orgs_to_scrape, 1):
        name = org['name']
        website = org['website']

        print(f"[{i}/{len(orgs_to_scrape)}] {name[:50]}")
        print(f"   🌐 {website}")

        phones = extract_phones_from_url(website)

        if phones:
            print(f"   ✅ {len(phones)} téléphone(s): {phones[0]}")
        else:
            print(f"   ⚠️  Aucun téléphone")

        result = {
            'company_name': name,
            'website': website,
            'phones': phones
        }

        results.append(result)

        # Save progress every 10
        if i % 10 == 0:
            with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)

        time.sleep(2)  # Rate limiting

    # Save final
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    # Stats
    print("\n" + "=" * 80)
    print("📊 RÉSULTATS")
    print("=" * 80)
    print()

    with_phones = sum(1 for r in results if r['phones'])
    total_phones = sum(len(r['phones']) for r in results)

    print(f"Sociétés scrapées:        {len(results)}")
    print(f"Sociétés avec téléphones: {with_phones} ({with_phones/len(results)*100:.1f}%)")
    print(f"Total téléphones trouvés: {total_phones}")
    print()
    print(f"✅ Saved: {OUTPUT_JSON}")
    print()
    print("=" * 80)

if __name__ == '__main__':
    extract_all()
