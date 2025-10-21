#!/usr/bin/env python3
"""
Legal Contacts Scraper - Extract contacts + addresses from legal pages
Scrapes "mentions légales", "legal notice", "imprint", "contact" pages
"""

import csv
import time
import json
import re
import requests
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_FINAL.csv"
OUTPUT_ORG_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS.csv"
OUTPUT_CONTACT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "legal_contacts_cache.json"

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
}

def find_legal_page_url(base_url, soup):
    """Find legal notice / mentions légales page"""
    legal_keywords = [
        'mentions-legales', 'legal-notice', 'imprint', 'impressum',
        'legal', 'mentions', 'about-us', 'contact', 'company'
    ]

    links = soup.find_all('a', href=True)

    for link in links:
        href = link.get('href', '').lower()
        text = link.get_text().lower()

        # Check if link text or href contains legal keywords
        for keyword in legal_keywords:
            if keyword in href or keyword in text:
                full_url = urljoin(base_url, link['href'])
                return full_url

    return None

def extract_address_from_text(text):
    """Extract address from text"""
    # Common Luxembourg address patterns
    patterns = [
        r'(\d+[a-z]?,?\s+(?:rue|avenue|boulevard|place|route|allée|chemin)[^,\n]+,?\s+L-?\d{4}\s+\w+)',
        r'(L-?\d{4}\s+\w+[^,\n]*)',
        r'(\d+[^,\n]*Luxembourg[^,\n]*)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return None

def extract_name_from_text(text):
    """Extract representative name (CEO, Managing Director, etc.)"""
    # Patterns for titles
    title_patterns = [
        r'(?:CEO|Managing Director|Directeur Général|Président|President|Chairman|Director)[\s:]+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',
        r'([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s]+(?:CEO|Managing Director|Directeur)',
    ]

    for pattern in title_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            full_name = match.group(1).strip()
            parts = full_name.split()

            if len(parts) >= 2:
                return {
                    'first_name': parts[0],
                    'last_name': ' '.join(parts[1:])
                }

    return None

def scrape_website(url, company_name):
    """Scrape website for legal info, address, and contact"""

    # Check cache
    if url in cache:
        print(f"    💾 Cache")
        return cache[url]

    result = {
        'website_valid': False,
        'address': '',
        'city': 'Luxembourg',
        'country': 'Luxembourg',
        'representative_first_name': '',
        'representative_last_name': '',
        'representative_email': '',
        'representative_phone': '',
    }

    try:
        # Quick validation + fetch homepage
        response = requests.get(url, headers=HEADERS, timeout=5, allow_redirects=True)

        if response.status_code >= 400:
            cache[url] = result
            save_cache()
            return result

        result['website_valid'] = True

        # Parse homepage
        soup = BeautifulSoup(response.text, 'html.parser')
        homepage_text = soup.get_text()

        # Try to find address on homepage first
        address = extract_address_from_text(homepage_text)
        if address:
            result['address'] = address

        # Try to find representative on homepage
        name = extract_name_from_text(homepage_text)
        if name:
            result['representative_first_name'] = name['first_name']
            result['representative_last_name'] = name['last_name']

        # Try to find legal page for more info
        legal_url = find_legal_page_url(url, soup)

        if legal_url:
            try:
                legal_response = requests.get(legal_url, headers=HEADERS, timeout=5)
                if legal_response.status_code < 400:
                    legal_soup = BeautifulSoup(legal_response.text, 'html.parser')
                    legal_text = legal_soup.get_text()

                    # Extract address from legal page if not found on homepage
                    if not result['address']:
                        address = extract_address_from_text(legal_text)
                        if address:
                            result['address'] = address

                    # Extract representative from legal page if not found
                    if not result['representative_first_name']:
                        name = extract_name_from_text(legal_text)
                        if name:
                            result['representative_first_name'] = name['first_name']
                            result['representative_last_name'] = name['last_name']

            except:
                pass  # Legal page failed, keep homepage data

        cache[url] = result
        save_cache()
        return result

    except requests.exceptions.Timeout:
        result['website_valid'] = False
        cache[url] = result
        save_cache()
        return result

    except Exception as e:
        result['website_valid'] = False
        cache[url] = result
        save_cache()
        return result

print("🔍 LEGAL CONTACTS SCRAPER - LUXEMBOURG CSSF")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

print(f"📊 {len(companies)} companies to enrich")
print(f"💾 Cache: {len(cache)} websites already scraped")
print()

stats = {
    'websites_valid': 0,
    'websites_invalid': 0,
    'addresses_found': 0,
    'representatives_found': 0,
}

organisations = []
contacts = []

for i, company in enumerate(companies, 1):
    name = company['name']
    website = company.get('website', '')
    email = company.get('email', '')
    phone = company.get('phone', '')

    print(f"[{i}/266] {name[:50]}")

    # Skip if no website
    if not website:
        print(f"    ⊘ No website")

        # Add org without address
        organisations.append({
            'name': name,
            'email': email,
            'phone': phone,
            'address': '',
            'city': 'Luxembourg',
            'country': 'Luxembourg',
            'website': '',
        })
        continue

    # Scrape website
    result = scrape_website(website, name)

    # Update stats
    if result['website_valid']:
        stats['websites_valid'] += 1
        status = '✓'
    else:
        stats['websites_invalid'] += 1
        status = '✗'

    if result['address']:
        stats['addresses_found'] += 1
        print(f"    {status} Address: {result['address'][:50]}")
    else:
        print(f"    {status} No address")

    if result['representative_first_name']:
        stats['representatives_found'] += 1
        print(f"    ✓ Contact: {result['representative_first_name']} {result['representative_last_name']}")

    # Add organization
    organisations.append({
        'name': name,
        'email': email,
        'phone': phone,
        'address': result['address'],
        'city': result['city'],
        'country': result['country'],
        'website': website if result['website_valid'] else '',
    })

    # Add contact (representative)
    if result['representative_first_name']:
        contacts.append({
            'first_name': result['representative_first_name'],
            'last_name': result['representative_last_name'],
            'personal_email': '',
            'email': result['representative_email'] or email,  # Use org email if no personal
            'personal_phone': '',
            'phone': result['representative_phone'] or phone,  # Use org phone if no personal
            'country_code': '+352',  # Luxembourg
            'language': 'en',
            'organisation': name,
        })

    # Rate limiting - REDUCED to 0.2s (5 requests/second)
    time.sleep(0.2)

    # Save progress every 20 companies
    if i % 20 == 0:
        with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'email', 'phone', 'address', 'city', 'country', 'website'])
            writer.writeheader()
            writer.writerows(organisations)

        if contacts:
            with open(OUTPUT_CONTACT_CSV, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['first_name', 'last_name', 'personal_email', 'email',
                                                       'personal_phone', 'phone', 'country_code', 'language', 'organisation'])
                writer.writeheader()
                writer.writerows(contacts)

        print(f"\n💾 Progress saved ({i}/266)\n")

# Final save
with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['name', 'email', 'phone', 'address', 'city', 'country', 'website'])
    writer.writeheader()
    writer.writerows(organisations)

if contacts:
    with open(OUTPUT_CONTACT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['first_name', 'last_name', 'personal_email', 'email',
                                               'personal_phone', 'phone', 'country_code', 'language', 'organisation'])
        writer.writeheader()
        writer.writerows(contacts)

print()
print("=" * 70)
print("✅ SCRAPING COMPLETE")
print("=" * 70)
print()
print(f"✓ Websites valid:        {stats['websites_valid']}/205")
print(f"✗ Websites invalid:      {stats['websites_invalid']}/205")
print(f"✓ Addresses found:       {stats['addresses_found']}/266")
print(f"✓ Representatives found: {stats['representatives_found']}/266")
print()
print(f"💾 Organisations: {OUTPUT_ORG_CSV}")
print(f"💾 Contacts:      {OUTPUT_CONTACT_CSV}")
print()
