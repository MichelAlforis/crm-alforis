#!/usr/bin/env python3
"""
Luxembourg Sitemap Scraper - SMART
Exploite les sitemaps Luxembourg-spécifiques (/lu/fr, /lu/en, /lu/de)
Pour extraire adresses + contacts + emails + phones
"""

import csv
import time
import json
import re
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_COMPLETE.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_SITEMAP_ENRICHED.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "luxembourg_sitemap_cache.json"

CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

HEADERS = {'User-Agent': 'alforis-bot/1.0'}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
PHONE_RE = re.compile(r'\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}')
ADDR_RE = re.compile(r'(\d+[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)', re.I)

def get_luxembourg_sitemaps(base_url):
    """Cherche sitemaps Luxembourg (/lu/fr, /lu/en, /lu/de) dans robots.txt"""
    luxembourg_sitemaps = []

    try:
        robots_url = urljoin(base_url, '/robots.txt')
        r = requests.get(robots_url, headers=HEADERS, timeout=5)

        if r.status_code == 200:
            for line in r.text.split('\n'):
                if line.lower().startswith('sitemap:'):
                    sitemap_url = line.split(':', 1)[1].strip()

                    # Filtrer seulement sitemaps Luxembourg
                    if '/lu/' in sitemap_url.lower():
                        luxembourg_sitemaps.append(sitemap_url)

    except:
        pass

    return luxembourg_sitemaps

def get_urls_from_sitemap(sitemap_url):
    """Parse sitemap XML et extrait URLs contact/legal/about"""
    urls = []

    try:
        r = requests.get(sitemap_url, headers=HEADERS, timeout=8)

        if r.status_code == 200:
            root = ET.fromstring(r.content)

            for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                url = url_elem.text

                # Filtrer URLs pertinentes
                if any(kw in url.lower() for kw in ['contact', 'legal', 'about', 'team', 'mentions', 'imprint']):
                    urls.append(url)

    except:
        pass

    return urls

def extract_contacts_from_page(url):
    """Extraire emails, phones, adresse d'une page"""
    emails = set()
    phones = set()
    address = None

    try:
        r = requests.get(url, headers=HEADERS, timeout=8)

        if r.status_code < 400:
            soup = BeautifulSoup(r.text, 'lxml')

            # Emails
            for a in soup.select('a[href^="mailto:"]'):
                email = a.get('href').split(':', 1)[1].split('?')[0]
                emails.add(email.lower().strip())

            # Regex fallback emails
            for match in EMAIL_RE.findall(r.text):
                if not any(bad in match.lower() for bad in ['example.com', 'domain.com']):
                    emails.add(match.lower())

            # Phones
            for a in soup.select('a[href^="tel:"]'):
                tel = a.get('href').split(':', 1)[1]
                phones.add(tel.strip())

            # Regex fallback phones
            for match in PHONE_RE.findall(r.text):
                phones.add(match.strip())

            # Adresse Luxembourg
            addr_match = ADDR_RE.search(r.text)
            if addr_match:
                address = re.sub(r'\s+', ' ', addr_match.group(1).strip())

    except:
        pass

    return emails, phones, address

def scrape_via_luxembourg_sitemap(base_url, company_name):
    """Pipeline complet via sitemaps Luxembourg"""

    cache_key = base_url
    if cache_key in cache:
        return cache[cache_key]

    result = {
        'emails': [],
        'phones': [],
        'address': '',
        'luxembourg_sitemaps_found': 0,
        'pages_scraped': 0
    }

    try:
        # Étape 1: Trouver sitemaps Luxembourg
        lu_sitemaps = get_luxembourg_sitemaps(base_url)
        result['luxembourg_sitemaps_found'] = len(lu_sitemaps)

        if not lu_sitemaps:
            print(f"      ⊘ Pas de sitemap Luxembourg")
            cache[cache_key] = result
            save_cache()
            return result

        print(f"      ✅ {len(lu_sitemaps)} sitemap(s) Luxembourg trouvé(s)")

        # Étape 2: Parser chaque sitemap Luxembourg
        all_urls = []
        for sitemap_url in lu_sitemaps[:3]:  # Max 3 sitemaps
            urls = get_urls_from_sitemap(sitemap_url)
            all_urls.extend(urls)

        all_urls = list(set(all_urls))[:8]  # Max 8 URLs

        if not all_urls:
            print(f"      ⊘ Pas d'URLs contact/legal dans sitemaps")
            cache[cache_key] = result
            save_cache()
            return result

        print(f"      📄 {len(all_urls)} page(s) pertinente(s) trouvée(s)")

        # Étape 3: Scraper chaque page
        all_emails = set()
        all_phones = set()
        best_address = None

        for url in all_urls:
            emails, phones, address = extract_contacts_from_page(url)

            all_emails.update(emails)
            all_phones.update(phones)

            if address and not best_address:
                best_address = address

            result['pages_scraped'] += 1
            time.sleep(0.3)

        # Résultats
        result['emails'] = list(all_emails)[:5]
        result['phones'] = list(all_phones)[:3]
        result['address'] = best_address or ''

        cache[cache_key] = result
        save_cache()

    except Exception as e:
        cache[cache_key] = result
        save_cache()

    return result

print("🗺️  LUXEMBOURG SITEMAP SCRAPER")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    companies = list(csv.DictReader(f))

# TEST: 10 premières sociétés sans adresse
to_scrape = [c for c in companies if c.get('website') and not c.get('address')][:10]

print(f"⚠️  TEST MODE: {len(to_scrape)} sociétés")
print()

stats = {
    'addresses': 0,
    'emails': 0,
    'phones': 0,
    'sitemaps_found': 0
}

for i, company in enumerate(to_scrape, 1):
    name = company['name']
    website = company['website']

    print(f"[{i}/{len(to_scrape)}] {name[:45]}")
    print(f"    🌐 {website}")

    result = scrape_via_luxembourg_sitemap(website, name)

    if result['luxembourg_sitemaps_found'] > 0:
        stats['sitemaps_found'] += 1

    if result['address']:
        stats['addresses'] += 1
        company['sitemap_address'] = result['address']
        print(f"    📍 {result['address'][:60]}")

    if result['emails']:
        stats['emails'] += 1
        company['sitemap_emails'] = '; '.join(result['emails'])
        print(f"    ✉️  {', '.join(result['emails'][:2])}")

    if result['phones']:
        stats['phones'] += 1
        company['sitemap_phones'] = '; '.join(result['phones'])
        print(f"    ☎️  {', '.join(result['phones'][:2])}")

    print()
    time.sleep(0.5)

# Save
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    fieldnames = list(companies[0].keys()) + ['sitemap_address', 'sitemap_emails', 'sitemap_phones']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(to_scrape)

print("=" * 70)
print("✅ TEST TERMINÉ")
print("=" * 70)
print()
print(f"📊 RÉSULTATS:")
print(f"   Sitemaps LU trouvés:  {stats['sitemaps_found']}/{len(to_scrape)}")
print(f"   Adresses trouvées:    {stats['addresses']}/{len(to_scrape)}")
print(f"   Emails trouvés:       {stats['emails']}/{len(to_scrape)}")
print(f"   Phones trouvés:       {stats['phones']}/{len(to_scrape)}")
print()
print(f"💾 {OUTPUT_CSV}")
print()
