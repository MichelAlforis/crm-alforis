#!/usr/bin/env python3
"""
Smart Sitemap Scraper - Luxembourg CSSF
1. Fetch sitemap.xml from each website
2. Find relevant pages (contact, legal, about, team)
3. Scrape those pages for addresses/contacts
Ultra-efficace: ciblage précis des bonnes pages!
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
OUTPUT_ORG_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_SITEMAP.csv"
OUTPUT_CONTACT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_SITEMAP.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "sitemap_cache.json"

CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': '*/*',
}

# Keywords to find in sitemap URLs
RELEVANT_KEYWORDS = [
    'contact', 'about', 'team', 'leadership', 'management', 'legal',
    'imprint', 'impressum', 'mentions', 'privacy', 'investor',
    'équipe', 'à-propos', 'dirigeants', 'kontakt'
]

def fetch_sitemap_urls(base_url):
    """Fetch sitemap.xml and extract relevant URLs"""

    sitemap_urls = [
        urljoin(base_url, '/sitemap.xml'),
        urljoin(base_url, '/sitemap_index.xml'),
        urljoin(base_url, '/sitemap-index.xml'),
        urljoin(base_url, '/robots.txt'),  # Check robots.txt for sitemap location
    ]

    found_urls = []

    # Try to fetch sitemap
    for sitemap_url in sitemap_urls:
        try:
            response = requests.get(sitemap_url, headers=HEADERS, timeout=5)

            if response.status_code == 200:
                # Parse XML or robots.txt
                if 'robots.txt' in sitemap_url:
                    # Extract sitemap URL from robots.txt
                    for line in response.text.split('\n'):
                        if line.lower().startswith('sitemap:'):
                            sitemap_location = line.split(':', 1)[1].strip()
                            # Recursive call to fetch actual sitemap
                            return fetch_sitemap_urls(sitemap_location)
                else:
                    # Parse XML sitemap
                    try:
                        root = ET.fromstring(response.content)

                        # Handle sitemap index (contains multiple sitemaps)
                        for sitemap in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}sitemap'):
                            loc = sitemap.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                            if loc is not None:
                                # Recursive: fetch sub-sitemap
                                sub_urls = fetch_sitemap_urls(loc.text)
                                found_urls.extend(sub_urls)

                        # Handle regular sitemap (contains URLs)
                        for url in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}url'):
                            loc = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')
                            if loc is not None:
                                url_text = loc.text.lower()

                                # Filter: keep only relevant pages
                                if any(kw in url_text for kw in RELEVANT_KEYWORDS):
                                    found_urls.append(loc.text)

                        # If we found URLs, stop trying other sitemap locations
                        if found_urls:
                            break

                    except ET.ParseError:
                        continue
        except:
            continue

    return found_urls

def extract_luxembourg_address(text):
    """Extract Luxembourg address"""
    patterns = [
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|rue|avenue)[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)',
        r'(L-?\d{4}\s+[A-Za-z]+[,\s]+\d+[^,\n]{10,70})',
        r'([A-Za-z0-9][^,\n]{10,60}[,\s]+L-?\d{4}\s+[A-Za-z]+)',
        r'(\d+[,\s]+[^,\n]{8,50}\s+L-?\d{4})',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I | re.M):
            addr = re.sub(r'\s+', ' ', match.group(1).strip())
            if 'L-' in addr.upper() and 10 < len(addr) < 120:
                # Clean
                addr = re.sub(r'Tel[\.:]\s*.*', '', addr)
                addr = re.sub(r'Phone[\.:]\s*.*', '', addr)
                return addr.strip()
    return None

def extract_email(text):
    """Extract email"""
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    invalid = ['example.com', 'domain.com', 'email.com']
    valid = [e for e in emails if not any(inv in e.lower() for inv in invalid)]
    return valid[0] if valid else None

def extract_phone(text):
    """Extract Luxembourg phone"""
    match = re.search(r'\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}', text, re.I)
    return match.group(0).strip() if match else None

def extract_executive(text):
    """Extract executive name"""
    patterns = [
        r'(?:CEO|Managing Director|Chairman|President|Directeur)[\s:–-]+([A-Z][a-z]+\s+[A-Z][a-z]+)',
        r'([A-Z][a-z]+\s+[A-Z][a-z]+)[,\s–-]+(?:CEO|Managing Director|Chairman)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I):
            name = match.group(1).strip()
            parts = name.split()
            if len(parts) >= 2 and all(p[0].isupper() for p in parts):
                invalid = ['Contact', 'Team', 'Our', 'Meet', 'Chief']
                if not any(w in parts for w in invalid):
                    return {'first': parts[0], 'last': ' '.join(parts[1:])}
    return None

def scrape_via_sitemap(base_url, company_name):
    """Scrape using sitemap.xml intelligence"""

    cache_key = base_url
    if cache_key in cache:
        return cache[cache_key]

    result = {
        'address': '',
        'email': '',
        'phone': '',
        'exec_first': '',
        'exec_last': '',
        'sitemap_found': False,
        'pages_scraped': 0
    }

    try:
        # Step 1: Fetch sitemap URLs
        print(f"      🗺️  Fetching sitemap...", end=' ')
        relevant_urls = fetch_sitemap_urls(base_url)

        if not relevant_urls:
            print(f"⊘ No sitemap")
            cache[cache_key] = result
            save_cache()
            return result

        result['sitemap_found'] = True
        print(f"✓ Found {len(relevant_urls)} relevant pages")

        # Step 2: Scrape relevant pages (max 10)
        all_text = ""
        for url in relevant_urls[:10]:
            try:
                print(f"      📄 {url.split('/')[-1][:30]:30} ", end='')
                response = requests.get(url, headers=HEADERS, timeout=4)

                if response.status_code < 400:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    page_text = soup.get_text(separator=' ')
                    all_text += " " + page_text
                    result['pages_scraped'] += 1

                    # Quick check if we found something
                    found_items = []
                    if extract_luxembourg_address(page_text): found_items.append('📍')
                    if extract_email(page_text): found_items.append('✉️')
                    if extract_phone(page_text): found_items.append('☎️')
                    if extract_executive(page_text): found_items.append('👤')

                    if found_items:
                        print(' '.join(found_items))
                    else:
                        print('⊘')

                    time.sleep(0.1)
                else:
                    print('✗')
            except:
                print('✗')
                continue

        # Step 3: Extract all data from combined text
        result['address'] = extract_luxembourg_address(all_text) or ''
        result['email'] = extract_email(all_text) or ''
        result['phone'] = extract_phone(all_text) or ''

        exec_data = extract_executive(all_text)
        if exec_data:
            result['exec_first'] = exec_data['first']
            result['exec_last'] = exec_data['last']

        cache[cache_key] = result
        save_cache()
        return result

    except Exception as e:
        cache[cache_key] = result
        save_cache()
        return result

print("🗺️  SMART SITEMAP SCRAPER - Luxembourg CSSF")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

# Filter: only companies with website but missing address
to_scrape = [c for c in companies if c.get('website') and not c.get('address')]
already_complete = [c for c in companies if c.get('address') or not c.get('website')]

# TEST MODE: Only scrape 1 company
print(f"⚠️  TEST MODE: Scraping ONLY 1 company!")
to_scrape = to_scrape[:1]

print(f"📊 Total: {len(companies)}")
print(f"✓ Already have address or no website: {len(already_complete)}")
print(f"⚠️  Need scraping: {len(to_scrape)}")
print(f"💾 Cache: {len(cache)} websites")
print()

if not to_scrape:
    print("✅ Nothing to scrape!")
    exit(0)

stats = {
    'addresses': 0,
    'emails': 0,
    'phones': 0,
    'contacts': 0,
    'sitemaps_found': 0
}

for i, company in enumerate(to_scrape, 1):
    name = company['name']
    website = company.get('website', '')

    print(f"\n[{i}/{len(to_scrape)}] {name[:50]}")

    result = scrape_via_sitemap(website, name)

    # Update stats
    if result['sitemap_found']:
        stats['sitemaps_found'] += 1
    if result['address']:
        stats['addresses'] += 1
        company['address'] = result['address']
    if result['email'] and not company.get('email'):
        stats['emails'] += 1
        company['email'] = result['email']
    if result['phone'] and not company.get('phone'):
        stats['phones'] += 1
        company['phone'] = result['phone']
    if result['exec_first']:
        stats['contacts'] += 1

    # Print summary
    print(f"      ✅ Result: ", end='')
    if result['address']: print(f"📍 {result['address'][:50]}")
    else: print("⊘ No address")

    time.sleep(0.5)

    # Save progress every 10
    if i % 10 == 0:
        all_companies = already_complete + to_scrape

        with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=list(companies[0].keys()))
            writer.writeheader()
            writer.writerows(all_companies)

        print(f"\n💾 Progress saved ({i}/{len(to_scrape)})\n")

# Final save
all_companies = already_complete + to_scrape

with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=list(companies[0].keys()))
    writer.writeheader()
    writer.writerows(all_companies)

print()
print("=" * 70)
print("✅ SITEMAP SCRAPING COMPLETE")
print("=" * 70)
print()

total_addr = len([c for c in all_companies if c.get('address')])

print(f"📊 RESULTS:")
print(f"   Sitemaps found:    {stats['sitemaps_found']}/{len(to_scrape)}")
print(f"   New addresses:     +{stats['addresses']}")
print(f"   New emails:        +{stats['emails']}")
print(f"   New phones:        +{stats['phones']}")
print(f"   New contacts:      +{stats['contacts']}")
print()
print(f"🎯 TOTAL ADDRESSES: {total_addr}/266 ({(total_addr/266*100):.1f}%)")
print()
print(f"💾 {OUTPUT_ORG_CSV}")
print()
