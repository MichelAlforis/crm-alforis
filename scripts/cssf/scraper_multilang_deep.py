#!/usr/bin/env python3
"""
Deep Multi-Language Scraper - Luxembourg CSSF
Scrape ALL useful pages in English, French, Luxembourgish
Extract: Addresses, Executives, Emails, Phones
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
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_FINAL.csv"
OUTPUT_ORG_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_ENRICHED.csv"
OUTPUT_CONTACT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_ENRICHED.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "multilang_deep_cache.json"

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
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8,de;q=0.7',
}

# Multi-language page keywords (priority order)
PAGE_KEYWORDS = {
    'contact': [
        'contact-us', 'contact', 'contactez', 'contacts', 'kontakt',
        'get-in-touch', 'reach-us', 'nous-contacter'
    ],
    'team': [
        'team', 'our-team', 'leadership', 'management', 'executive',
        'leadership-team', 'management-team', 'board', 'directors',
        'équipe', 'équipe-dirigeante', 'direction', 'dirigeants',
        'nos-équipes', 'about-us', 'à-propos', 'about', 'who-we-are'
    ],
    'legal': [
        'legal', 'legal-notice', 'mentions-legales', 'mentions-légales',
        'imprint', 'impressum', 'privacy-policy', 'privacy', 'terms',
        'sitemap', 'investor-relations'
    ]
}

def find_pages(base_url, soup):
    """Find all useful pages (contact, team, legal)"""
    found_urls = {}
    links = soup.find_all('a', href=True)

    for link in links:
        href = link.get('href', '').lower()
        text = link.get_text().lower()

        # Check each category
        for category, keywords in PAGE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in href or keyword in text:
                    full_url = urljoin(base_url, link['href'])

                    # Store first match per category
                    if category not in found_urls:
                        found_urls[category] = full_url
                    break

    return found_urls

def extract_luxembourg_address(text):
    """Extract Luxembourg address - improved patterns"""
    patterns = [
        # Full: "123 Avenue Name L-1234 City"
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|Allée|Chemin|Street|Road)[^,\n]{5,60}[,\s]+L-?\d{4}\s+[A-Z]\w+)',

        # Reverse: "L-1234 City, 123 Avenue Name"
        r'(L-?\d{4}\s+\w+[,\s]+\d+[^,\n]{10,60})',

        # Simple: "Avenue Name, L-1234 City"
        r'([A-Z][^,\n]{10,50}[,\s]+L-?\d{4}\s+[A-Z]\w+)',

        # Just street + code: "123 rue something L-1234"
        r'(\d+[,\s]+[^,\n]{5,40}\s+L-?\d{4})',
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            address = match.group(1).strip()
            # Clean up
            address = re.sub(r'\s+', ' ', address)
            # Must contain L- code
            if 'L-' in address.upper():
                return address

    return None

def extract_executive_name(text):
    """Extract CEO, Managing Director, Chairman names - improved"""
    title_patterns = [
        # "CEO: John Smith" or "CEO - John Smith"
        r'(?:CEO|Chief Executive Officer|Managing Director|Chairman|President|Directeur Général|MD|Director)[\s:–-]+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)',

        # "John Smith, CEO" or "John Smith - CEO"
        r'([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)[,\s–-]+(?:CEO|Chief Executive|Managing Director|Chairman|President|Directeur)',

        # "Mr. John Smith" or "Ms. Jane Doe"
        r'(?:Mr\.|Ms\.|Dr\.)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)',
    ]

    for pattern in title_patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            full_name = match.group(1).strip()
            parts = full_name.split()

            # Validate: 2-3 parts, all capitalized, no common words
            if len(parts) >= 2 and all(p[0].isupper() for p in parts):
                # Filter out common false positives
                invalid_words = ['Contact', 'Team', 'Our', 'Meet', 'Chief', 'Managing', 'Director']
                if not any(word in parts for word in invalid_words):
                    return {
                        'first_name': parts[0],
                        'last_name': ' '.join(parts[1:])
                    }

    return None

def extract_email(text):
    """Extract email addresses"""
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text, re.IGNORECASE)

    # Filter generic/invalid
    invalid = ['example.com', 'domain.com', 'email.com', 'yourcompany.com']
    valid_emails = [e for e in emails if not any(inv in e.lower() for inv in invalid)]

    return valid_emails[0] if valid_emails else None

def extract_phone(text):
    """Extract Luxembourg phone numbers"""
    patterns = [
        r'\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}',  # +352 12 34 56
        r'\(\+352\)[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}',  # (+352) 12 34 56
        r'Tel[\.\:]?\s*\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0).strip()

    return None

def scrape_website_deep(url, company_name):
    """Deep scrape: homepage + contact + team + legal pages"""

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
        'additional_email': '',
        'additional_phone': '',
    }

    try:
        # Fetch homepage
        response = requests.get(url, headers=HEADERS, timeout=8, allow_redirects=True)

        if response.status_code >= 400:
            cache[url] = result
            save_cache()
            return result

        result['website_valid'] = True

        # Parse homepage
        soup = BeautifulSoup(response.text, 'html.parser')
        homepage_text = soup.get_text(separator=' ')

        # Extract from homepage first
        address = extract_luxembourg_address(homepage_text)
        if address:
            result['address'] = address

        name = extract_executive_name(homepage_text)
        if name:
            result['representative_first_name'] = name['first_name']
            result['representative_last_name'] = name['last_name']

        email = extract_email(homepage_text)
        if email:
            result['additional_email'] = email

        phone = extract_phone(homepage_text)
        if phone:
            result['additional_phone'] = phone

        # Find dedicated pages
        pages = find_pages(url, soup)

        print(f"    🔍 Pages: {', '.join(pages.keys())}")

        # Check each page type (priority: contact > team > legal)
        for page_type in ['contact', 'team', 'legal']:
            if page_type not in pages:
                continue

            try:
                page_url = pages[page_type]
                page_response = requests.get(page_url, headers=HEADERS, timeout=8)

                if page_response.status_code < 400:
                    page_soup = BeautifulSoup(page_response.text, 'html.parser')
                    page_text = page_soup.get_text(separator=' ')

                    # Extract missing data
                    if not result['address']:
                        address = extract_luxembourg_address(page_text)
                        if address:
                            result['address'] = address
                            print(f"    📍 Address from {page_type}")

                    if not result['representative_first_name']:
                        name = extract_executive_name(page_text)
                        if name:
                            result['representative_first_name'] = name['first_name']
                            result['representative_last_name'] = name['last_name']
                            print(f"    👤 Executive from {page_type}")

                    if not result['additional_email']:
                        email = extract_email(page_text)
                        if email:
                            result['additional_email'] = email

                    if not result['additional_phone']:
                        phone = extract_phone(page_text)
                        if phone:
                            result['additional_phone'] = phone

                    # Stop if we found everything
                    if (result['address'] and result['representative_first_name'] and
                        result['additional_email'] and result['additional_phone']):
                        break

            except:
                continue

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

print("🌍 DEEP MULTI-LANGUAGE SCRAPER - LUXEMBOURG CSSF")
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
    'executives_found': 0,
    'emails_found': 0,
    'phones_found': 0,
}

organisations = []
contacts = []

for i, company in enumerate(companies, 1):
    name = company['name']
    website = company.get('website', '')
    email = company.get('email', '')
    phone = company.get('phone', '')
    existing_address = company.get('address', '')

    print(f"[{i}/266] {name[:50]}")

    # Skip if no website
    if not website:
        print(f"    ⊘ No website")
        organisations.append(company)
        continue

    # Scrape website deeply
    result = scrape_website_deep(website, name)

    # Update stats
    if result['website_valid']:
        stats['websites_valid'] += 1
        status = '✓'
    else:
        stats['websites_invalid'] += 1
        status = '✗'

    # Use existing address if scraper didn't find better
    final_address = result['address'] or existing_address

    if result['address']:
        stats['addresses_found'] += 1
        print(f"    {status} Address: {result['address'][:60]}")
    elif existing_address:
        print(f"    {status} Address (existing): {existing_address[:60]}")
    else:
        print(f"    {status} No address")

    if result['representative_first_name']:
        stats['executives_found'] += 1
        print(f"    ✓ Executive: {result['representative_first_name']} {result['representative_last_name']}")

    if result['additional_email']:
        stats['emails_found'] += 1
        print(f"    ✉️  Email: {result['additional_email']}")

    if result['additional_phone']:
        stats['phones_found'] += 1
        print(f"    ☎️  Phone: {result['additional_phone']}")

    # Add organization (merge with existing data)
    organisations.append({
        'name': name,
        'email': result['additional_email'] or email,
        'phone': result['additional_phone'] or phone,
        'address': final_address,
        'city': company.get('city', 'Luxembourg'),
        'country': company.get('country', 'Luxembourg'),
        'website': website if result['website_valid'] else '',
    })

    # Add contact if executive found
    if result['representative_first_name']:
        contacts.append({
            'first_name': result['representative_first_name'],
            'last_name': result['representative_last_name'],
            'personal_email': '',
            'email': result['additional_email'] or email,
            'personal_phone': '',
            'phone': result['additional_phone'] or phone,
            'country_code': '+352',
            'language': 'en',
            'organisation': name,
        })

    # Rate limiting - 0.1s (fast!)
    time.sleep(0.1)

    # Save progress every 30 companies
    if i % 30 == 0:
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
print("✅ DEEP SCRAPING COMPLETE")
print("=" * 70)
print()
print(f"✓ Websites valid:        {stats['websites_valid']}")
print(f"✗ Websites invalid:      {stats['websites_invalid']}")
print(f"✓ Addresses found:       {stats['addresses_found']}")
print(f"✓ Executives found:      {stats['executives_found']}")
print(f"✓ Additional emails:     {stats['emails_found']}")
print(f"✓ Additional phones:     {stats['phones_found']}")
print()
print(f"💾 Organisations: {OUTPUT_ORG_CSV}")
print(f"💾 Contacts:      {OUTPUT_CONTACT_CSV}")
print()
