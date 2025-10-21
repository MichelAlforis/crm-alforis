#!/usr/bin/env python3
"""
Industrial Contact Scraper - Luxembourg CSSF
Pipeline complet: sitemap → robots.txt → crawl → parse → normalize
Inspiré des best practices industrielles
"""

import csv
import time
import json
import re
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import xml.etree.ElementTree as ET

try:
    import phonenumbers
    HAS_PHONENUMBERS = True
except ImportError:
    HAS_PHONENUMBERS = False
    print("⚠️  phonenumbers not installed. Install: pip3 install phonenumbers")

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_COMPLETE.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_INDUSTRIAL_SCRAPE.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "industrial_cache.json"

CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

HEADERS = {'User-Agent': 'alforis-bot/1.0 (+https://alforis.fr)'}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
PHONE_RE = re.compile(r'(\+?\d[\d\-\s().]{6,}\d)')

# Priority URLs to check
CONTACT_PATHS = [
    '/', '/contact', '/contact-us', '/contacts', '/kontakt',
    '/about', '/about-us', '/team', '/leadership', '/management',
    '/legal', '/imprint', '/impressum', '/mentions-legales', '/privacy'
]

def normalize_phone(raw, country='LU'):
    """Normalize phone with phonenumbers library"""
    if not HAS_PHONENUMBERS:
        return raw

    try:
        parsed = phonenumbers.parse(raw, country)
        if phonenumbers.is_possible_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except:
        pass
    return None

def get_sitemap_urls(base_url):
    """Get URLs from sitemap.xml or robots.txt"""
    urls = []

    # Try robots.txt first
    try:
        robots_url = urljoin(base_url, '/robots.txt')
        r = requests.get(robots_url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            for line in r.text.split('\n'):
                if line.lower().startswith('sitemap:'):
                    sitemap_url = line.split(':', 1)[1].strip()
                    # Fetch this sitemap
                    try:
                        sm_r = requests.get(sitemap_url, headers=HEADERS, timeout=5)
                        if sm_r.status_code == 200:
                            root = ET.fromstring(sm_r.content)
                            for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                                url_text = url_elem.text
                                # Filter relevant pages
                                if any(kw in url_text.lower() for kw in ['contact', 'about', 'team', 'legal']):
                                    urls.append(url_text)
                    except:
                        pass
    except:
        pass

    # Try direct sitemap.xml
    try:
        sitemap_url = urljoin(base_url, '/sitemap.xml')
        r = requests.get(sitemap_url, headers=HEADERS, timeout=5)
        if r.status_code == 200:
            root = ET.fromstring(r.content)
            for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                url_text = url_elem.text
                if any(kw in url_text.lower() for kw in ['contact', 'about', 'team', 'legal']):
                    urls.append(url_text)
    except:
        pass

    return list(set(urls))

def extract_json_ld_contacts(soup):
    """Extract from schema.org JSON-LD"""
    emails = set()
    phones = set()

    for script in soup.find_all('script', type='application/ld+json'):
        try:
            data = json.loads(script.string)

            def scan(obj):
                if isinstance(obj, dict):
                    for k, v in obj.items():
                        if k.lower() == 'email' and isinstance(v, str):
                            emails.add(v.lower().strip())
                        elif k.lower() == 'telephone' and isinstance(v, str):
                            p = normalize_phone(v)
                            if p: phones.add(p)
                        else:
                            scan(v)
                elif isinstance(obj, list):
                    for item in obj:
                        scan(item)

            scan(data)
        except:
            pass

    return emails, phones

def extract_contacts_from_page(url):
    """Extract all contacts from one page"""
    emails = set()
    phones = set()
    address = None

    try:
        r = requests.get(url, headers=HEADERS, timeout=8)
        if r.status_code >= 400:
            return emails, phones, address

        soup = BeautifulSoup(r.text, 'lxml')

        # 1. mailto links
        for a in soup.select('a[href^="mailto:"]'):
            email = a.get('href').split(':', 1)[1].split('?')[0]
            emails.add(email.lower().strip())

        # 2. tel links
        for a in soup.select('a[href^="tel:"]'):
            tel = a.get('href').split(':', 1)[1]
            p = normalize_phone(tel)
            if p: phones.add(p)

        # 3. JSON-LD
        ld_emails, ld_phones = extract_json_ld_contacts(soup)
        emails.update(ld_emails)
        phones.update(ld_phones)

        # 4. Fallback: grep text
        for match in EMAIL_RE.findall(r.text):
            # Filter obvious garbage
            if not any(bad in match.lower() for bad in ['example.com', 'domain.com']):
                emails.add(match.lower())

        for match in PHONE_RE.findall(r.text):
            p = normalize_phone(match)
            if p: phones.add(p)

        # 5. Extract Luxembourg address
        addr_pattern = r'(\d+[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)'
        addr_match = re.search(addr_pattern, r.text, re.I)
        if addr_match:
            address = re.sub(r'\s+', ' ', addr_match.group(1).strip())

    except:
        pass

    return emails, phones, address

def industrial_scrape(base_url, company_name):
    """Industrial-grade scraping pipeline"""

    cache_key = base_url
    if cache_key in cache:
        return cache[cache_key]

    result = {
        'emails': [],
        'phones': [],
        'address': '',
        'sources': []
    }

    all_emails = set()
    all_phones = set()
    best_address = None

    try:
        # Step 1: Get sitemap URLs
        sitemap_urls = get_sitemap_urls(base_url)

        # Step 2: Build URL list (sitemap + fallback paths)
        urls_to_check = sitemap_urls if sitemap_urls else []
        urls_to_check.extend([urljoin(base_url, path) for path in CONTACT_PATHS])
        urls_to_check = list(set(urls_to_check))[:8]  # Max 8 pages

        print(f"      🔍 Checking {len(urls_to_check)} pages...")

        # Step 3: Scrape each URL
        for url in urls_to_check:
            emails, phones, address = extract_contacts_from_page(url)

            all_emails.update(emails)
            all_phones.update(phones)

            if address and not best_address:
                best_address = address

            time.sleep(0.2)  # Rate limit

        # Step 4: Format results
        result['emails'] = list(all_emails)[:5]  # Max 5 emails
        result['phones'] = list(all_phones)[:3]  # Max 3 phones
        result['address'] = best_address or ''
        result['sources'] = [urlparse(u).path for u in urls_to_check]

        cache[cache_key] = result
        save_cache()

    except Exception as e:
        cache[cache_key] = result
        save_cache()

    return result

print("🏭 INDUSTRIAL CONTACT SCRAPER - Luxembourg CSSF")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

# TEST MODE: Only 5 companies
companies_to_scrape = [c for c in companies if c.get('website') and not c.get('address')][:5]

print(f"⚠️  TEST MODE: Scraping {len(companies_to_scrape)} companies")
print()

for i, company in enumerate(companies_to_scrape, 1):
    name = company['name']
    website = company['website']

    print(f"\n[{i}/{len(companies_to_scrape)}] {name[:50]}")
    print(f"    🌐 {website}")

    result = industrial_scrape(website, name)

    if result['emails']:
        print(f"    ✉️  Emails: {', '.join(result['emails'][:3])}")
    if result['phones']:
        print(f"    ☎️  Phones: {', '.join(result['phones'][:2])}")
    if result['address']:
        print(f"    📍 Address: {result['address'][:60]}")

    company['industrial_emails'] = '; '.join(result['emails'])
    company['industrial_phones'] = '; '.join(result['phones'])
    company['industrial_address'] = result['address']

# Save results
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    fieldnames = list(companies[0].keys()) + ['industrial_emails', 'industrial_phones', 'industrial_address']
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(companies_to_scrape)

print()
print("=" * 70)
print("✅ INDUSTRIAL SCRAPING COMPLETE")
print(f"💾 {OUTPUT_CSV}")
print("=" * 70)
