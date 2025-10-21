#!/usr/bin/env python3
"""
Fast Address Scraper - requests + BeautifulSoup
Scrape missing addresses directly from company websites (NO Google, NO Selenium)
Ultra-rapide: 0.5s par site = ~2 minutes pour 227 sociétés
"""

import csv
import time
import json
import re
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_COMPLETE.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "fast_addresses_cache.json"

# Create cache directory
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

# Load cache
if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    """Save cache to disk"""
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

# HTTP headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
}

# Pages to check (priority order)
PAGE_PATHS = [
    '/contact', '/contact-us', '/contacts', '/kontakt',
    '/legal', '/legal-notice', '/imprint', '/impressum',
    '/mentions-legales', '/mentions-légales',
    '/about', '/about-us', '/à-propos',
    '/team', '/leadership', '/management',
    '/privacy', '/privacy-policy', '/terms',
]

def extract_luxembourg_address(text):
    """Extract Luxembourg address - all patterns"""
    patterns = [
        # Full: "123 Avenue Name L-1234 City"
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|Allée|Chemin|Street|Road|rue|avenue|boulevard)[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)',

        # Reverse: "L-1234 City, 123 Avenue Name"
        r'(L-?\d{4}\s+[A-Za-z]+[,\s]+\d+[^,\n]{10,70})',

        # Simple: "Something, L-1234 City"
        r'([A-Za-z0-9][^,\n]{10,60}[,\s]+L-?\d{4}\s+[A-Za-z]+)',

        # Just street + code
        r'(\d+[,\s]+[^,\n]{8,50}\s+L-?\d{4})',

        # Code at start: "L-1234 Something"
        r'(L-?\d{4}\s+[A-Za-z]+[^,\n]{0,60})',
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            address = match.group(1).strip()
            address = re.sub(r'\s+', ' ', address)

            # Must contain L- code
            if 'L-' in address.upper():
                # Clean up common artifacts
                address = re.sub(r'Tel[\.:]\s*.*', '', address)
                address = re.sub(r'Phone[\.:]\s*.*', '', address)
                address = re.sub(r'Email[\.:]\s*.*', '', address)
                address = address.strip()

                # Must be reasonable length
                if 10 < len(address) < 120:
                    return address

    return None

def scrape_website_fast(url, company_name):
    """Fast scrape: homepage + common pages"""

    cache_key = url
    if cache_key in cache:
        return cache[cache_key]

    result = {'address': ''}

    try:
        # Try homepage first
        response = requests.get(url, headers=HEADERS, timeout=5, allow_redirects=True)

        if response.status_code >= 400:
            cache[cache_key] = result
            save_cache()
            return result

        # Parse homepage
        soup = BeautifulSoup(response.text, 'html.parser')
        homepage_text = soup.get_text(separator=' ')

        # Try to extract from homepage
        address = extract_luxembourg_address(homepage_text)
        if address:
            result['address'] = address
            cache[cache_key] = result
            save_cache()
            return result

        # Try common pages (max 3)
        for page_path in PAGE_PATHS[:3]:
            try:
                page_url = urljoin(url, page_path)
                page_response = requests.get(page_url, headers=HEADERS, timeout=3)

                if page_response.status_code < 400:
                    page_soup = BeautifulSoup(page_response.text, 'html.parser')
                    page_text = page_soup.get_text(separator=' ')

                    address = extract_luxembourg_address(page_text)
                    if address:
                        result['address'] = address
                        cache[cache_key] = result
                        save_cache()
                        return result
            except:
                continue

        # Not found
        cache[cache_key] = result
        save_cache()
        return result

    except requests.exceptions.Timeout:
        cache[cache_key] = result
        save_cache()
        return result

    except Exception as e:
        cache[cache_key] = result
        save_cache()
        return result

print("⚡ FAST ADDRESS SCRAPER - requests + BeautifulSoup")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

# Filter companies without address
companies_without_address = [c for c in companies if not c.get('address') and c.get('website')]
companies_with_address = [c for c in companies if c.get('address')]
companies_no_website = [c for c in companies if not c.get('website')]

print(f"📊 Total companies: {len(companies)}")
print(f"✓ Already have address: {len(companies_with_address)}")
print(f"⚠️  Missing address + have website: {len(companies_without_address)}")
print(f"⊘ No website (can't scrape): {len(companies_no_website)}")
print(f"💾 Cache: {len(cache)} websites already checked")
print()

if len(companies_without_address) == 0:
    print("✅ All companies with websites already have addresses!")
    exit(0)

stats = {
    'found': 0,
    'not_found': 0,
}

for i, company in enumerate(companies_without_address, 1):
    name = company['name']
    website = company.get('website', '')

    print(f"[{i}/{len(companies_without_address)}] {name[:45]:45} ", end='')

    # Scrape website
    result = scrape_website_fast(website, name)

    if result['address']:
        company['address'] = result['address']
        stats['found'] += 1
        print(f"✓ {result['address'][:50]}")
    else:
        stats['not_found'] += 1
        print(f"⊘ Not found")

    # Fast rate limiting - 0.3s
    time.sleep(0.3)

    # Save progress every 20 companies
    if i % 20 == 0:
        all_companies = companies_with_address + companies_without_address + companies_no_website

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            fieldnames = list(companies[0].keys())
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_companies)

        print(f"\n💾 Progress saved ({i}/{len(companies_without_address)})\n")

# Final save
all_companies = companies_with_address + companies_without_address + companies_no_website

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    fieldnames = list(companies[0].keys())
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_companies)

print()
print("=" * 70)
print("✅ FAST SCRAPING COMPLETE")
print("=" * 70)
print()

total_addresses = len([c for c in all_companies if c.get('address')])

print(f"✓ New addresses found: {stats['found']}")
print(f"⊘ Not found:           {stats['not_found']}")
print()
print(f"🎯 TOTAL ADDRESSES: {total_addresses}/266 ({(total_addresses/266*100):.1f}%)")
print()
print(f"💾 {OUTPUT_CSV}")
print()
