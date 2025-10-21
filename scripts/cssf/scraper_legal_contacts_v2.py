#!/usr/bin/env python3
"""
Legal Contacts Scraper V2 - ENGLISH VERSION
Extract contacts + addresses from English legal pages
Focus: "Legal Notice", "Imprint", "About Us", "Contact", "Leadership Team"
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
CACHE_FILE = BASE_DIR / "data" / "cssf" / "legal_contacts_cache_v2.json"

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
    'Accept-Language': 'en-US,en;q=0.9',
}

def find_legal_pages(base_url, soup):
    """Find legal/contact/about/team pages (ENGLISH focus)"""

    # Priority keywords (English first)
    keywords = {
        'legal': ['legal-notice', 'legal', 'imprint', 'impressum'],
        'contact': ['contact', 'contact-us', 'get-in-touch'],
        'about': ['about', 'about-us', 'who-we-are', 'our-firm'],
        'team': ['team', 'leadership', 'management', 'our-people', 'who-we-are']
    }

    found_urls = {}
    links = soup.find_all('a', href=True)

    for link in links:
        href = link.get('href', '').lower()
        text = link.get_text().lower()

        # Check each keyword category
        for category, kw_list in keywords.items():
            for keyword in kw_list:
                if keyword in href or keyword in text:
                    full_url = urljoin(base_url, link['href'])
                    if category not in found_urls:
                        found_urls[category] = full_url
                    break

    return found_urls

def extract_luxembourg_address(text):
    """Extract Luxembourg address with better patterns"""

    # Pattern 1: Full address with L-code
    patterns = [
        # "123 Avenue Name L-1234 Luxembourg"
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|Allée|Chemin|Street|Road)[^,\n]{5,60}[,\s]+L-?\d{4}\s+[A-Z][a-z]+)',

        # "L-1234 Luxembourg, 123 Avenue Name"
        r'(L-?\d{4}\s+\w+[,\s]+\d+[^,\n]{10,60})',

        # Simple "Avenue Name, L-1234 City"
        r'([A-Z][^,\n]{10,50}[,\s]+L-?\d{4}\s+[A-Z]\w+)',

        # "123, Avenue Name\nL-1234 Luxembourg"
        r'(\d+[,\s]+[A-Z][^,\n]{10,50}\s+L-?\d{4}\s+\w+)',
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            address = match.group(1).strip()
            # Clean up
            address = re.sub(r'\s+', ' ', address)
            # Must contain L- code
            if 'L-' in address or 'L-' in address.upper():
                return address

    return None

def extract_executive_name(text):
    """Extract CEO, Managing Director, Chairman names"""

    # Look for executive titles with names
    title_patterns = [
        # "CEO: John Smith" or "CEO - John Smith"
        r'(?:CEO|Chief Executive Officer|Managing Director|Chairman|President|Directeur Général|MD)[\s:–-]+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',

        # "John Smith, CEO" or "John Smith - CEO"
        r'([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s–-]+(?:CEO|Chief Executive|Managing Director|Chairman|President)',

        # "Our CEO, John Smith" or "Meet John Smith, CEO"
        r'(?:Our|Meet|by)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)[,\s]+(?:CEO|Chief|Managing|Chairman)',
    ]

    for pattern in title_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            full_name = match.group(1).strip()
            parts = full_name.split()

            # Validate: 2-3 parts, all capitalized
            if len(parts) >= 2 and all(p[0].isupper() for p in parts):
                return {
                    'first_name': parts[0],
                    'last_name': ' '.join(parts[1:])
                }

    return None

def scrape_website(url, company_name):
    """Scrape website for legal info, address, and executive contact"""

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
        response = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)

        if response.status_code >= 400:
            cache[url] = result
            save_cache()
            return result

        result['website_valid'] = True

        # Parse homepage
        soup = BeautifulSoup(response.text, 'html.parser')
        homepage_text = soup.get_text(separator=' ')

        # Find dedicated pages
        legal_pages = find_legal_pages(url, soup)

        # Priority: Team page > About page > Contact page > Legal page > Homepage
        pages_to_check = []

        if 'team' in legal_pages:
            pages_to_check.append(('Team', legal_pages['team']))
        if 'about' in legal_pages:
            pages_to_check.append(('About', legal_pages['about']))
        if 'contact' in legal_pages:
            pages_to_check.append(('Contact', legal_pages['contact']))
        if 'legal' in legal_pages:
            pages_to_check.append(('Legal', legal_pages['legal']))

        # Check homepage first
        address = extract_luxembourg_address(homepage_text)
        if address:
            result['address'] = address

        name = extract_executive_name(homepage_text)
        if name:
            result['representative_first_name'] = name['first_name']
            result['representative_last_name'] = name['last_name']

        # Check dedicated pages
        for page_type, page_url in pages_to_check:
            try:
                page_response = requests.get(page_url, headers=HEADERS, timeout=8)
                if page_response.status_code < 400:
                    page_soup = BeautifulSoup(page_response.text, 'html.parser')
                    page_text = page_soup.get_text(separator=' ')

                    # Extract address if not found yet
                    if not result['address']:
                        address = extract_luxembourg_address(page_text)
                        if address:
                            result['address'] = address
                            print(f"    📍 Address from {page_type} page")

                    # Extract executive if not found yet
                    if not result['representative_first_name']:
                        name = extract_executive_name(page_text)
                        if name:
                            result['representative_first_name'] = name['first_name']
                            result['representative_last_name'] = name['last_name']
                            print(f"    👤 Executive from {page_type} page")

                    # If we found both, stop checking pages
                    if result['address'] and result['representative_first_name']:
                        break

            except:
                continue  # Page failed, try next

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

print("🔍 LEGAL CONTACTS SCRAPER V2 - ENGLISH FOCUS")
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
        print(f"    {status} Address: {result['address'][:60]}")
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

    # Add contact (executive)
    if result['representative_first_name']:
        contacts.append({
            'first_name': result['representative_first_name'],
            'last_name': result['representative_last_name'],
            'personal_email': '',
            'email': result['representative_email'] or email,
            'personal_phone': '',
            'phone': result['representative_phone'] or phone,
            'country_code': '+352',
            'language': 'en',
            'organisation': name,
        })

    # Rate limiting - 0.15s (faster for 200+ sites)
    time.sleep(0.15)

    # Save progress every 25 companies
    if i % 25 == 0:
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
print("✅ SCRAPING COMPLETE - V2 ENGLISH")
print("=" * 70)
print()
print(f"✓ Websites valid:        {stats['websites_valid']}/205")
print(f"✗ Websites invalid:      {stats['websites_invalid']}/205")
print(f"✓ Addresses found:       {stats['addresses_found']}/266 ({(stats['addresses_found']/266*100):.1f}%)")
print(f"✓ Executives found:      {stats['representatives_found']}/266 ({(stats['representatives_found']/266*100):.1f}%)")
print()
print(f"💾 Organisations: {OUTPUT_ORG_CSV}")
print(f"💾 Contacts:      {OUTPUT_CONTACT_CSV}")
print()
