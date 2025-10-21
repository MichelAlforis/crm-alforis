#!/usr/bin/env python3
"""
Affiche la progression du scraping SDG France (une seule fois)
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
CACHE_FILE = BASE_DIR / 'data' / 'sdg_france' / 'selenium_cache.json'
TOTAL = 677

def main():
    if not CACHE_FILE.exists():
        print("❌ Pas de cache trouvé")
        return

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)

    scraped = len(cache)
    with_email = sum(1 for d in cache.values() if d.get('email'))
    with_phone = sum(1 for d in cache.values() if d.get('phone'))
    with_website = sum(1 for d in cache.values() if d.get('website'))

    print(f"\n📊 PROGRESSION: {scraped}/{TOTAL} ({scraped/TOTAL*100:.1f}%)")
    print(f"   📧 Emails: {with_email} ({with_email/scraped*100:.1f}%)" if scraped > 0 else "")
    print(f"   📞 Phones: {with_phone} ({with_phone/scraped*100:.1f}%)" if scraped > 0 else "")
    print(f"   🌐 Sites: {with_website} ({with_website/scraped*100:.1f}%)" if scraped > 0 else "")
    print(f"   ⏱️  Restant: ~{(TOTAL-scraped)*4//60}min\n")

if __name__ == '__main__':
    main()
