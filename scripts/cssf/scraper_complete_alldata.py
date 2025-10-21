#!/usr/bin/env python3
"""
Complete All-Data Scraper - Luxembourg CSSF
Extract EVERYTHING missing: addresses, emails, phones, contacts
Fast: requests + BeautifulSoup + aggressive extraction
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
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_COMPLETE.csv"
OUTPUT_ORG_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_FINAL_COMPLETE.csv"
OUTPUT_CONTACT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_FINAL_COMPLETE.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "complete_alldata_cache.json"

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
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
}

PAGE_PATHS = [
    '/', '/contact', '/contact-us', '/legal', '/imprint', '/about',
    '/team', '/leadership', '/mentions-legales', '/privacy'
]

def extract_luxembourg_address(text):
    """Extract Luxembourg address"""
    patterns = [
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|rue|avenue|boulevard)[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)',
        r'(L-?\d{4}\s+[A-Za-z]+[,\s]+\d+[^,\n]{10,70})',
        r'([A-Za-z0-9][^,\n]{10,60}[,\s]+L-?\d{4}\s+[A-Za-z]+)',
        r'(\d+[,\s]+[^,\n]{8,50}\s+L-?\d{4})',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I | re.M):
            addr = re.sub(r'\s+', ' ', match.group(1).strip())
            if 'L-' in addr.upper() and 10 < len(addr) < 120:
                return addr
    return None

def extract_email(text):
    """Extract email"""
    emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
    invalid = ['example.com', 'domain.com', 'email.com']
    valid = [e for e in emails if not any(inv in e.lower() for inv in invalid)]
    return valid[0] if valid else None

def extract_phone(text):
    """Extract Luxembourg phone"""
    patterns = [
        r'\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}',
        r'\(\+352\)[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}',
        r'Tel[\.\:]?\s*\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.I)
        if match:
            return match.group(0).strip()
    return None

def extract_executive(text):
    """Extract executive name"""
    patterns = [
        r'(?:CEO|Managing Director|Chairman|President)[\s:–-]+([A-Z][a-z]+\s+[A-Z][a-z]+)',
        r'([A-Z][a-z]+\s+[A-Z][a-z]+)[,\s–-]+(?:CEO|Managing Director|Chairman)',
    ]

    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I):
            name = match.group(1).strip()
            parts = name.split()
            if len(parts) >= 2 and all(p[0].isupper() for p in parts):
                invalid = ['Contact', 'Team', 'Our', 'Meet', 'Chief', 'Managing']
                if not any(w in parts for w in invalid):
                    return {'first': parts[0], 'last': ' '.join(parts[1:])}
    return None

def scrape_all_data(url, company_name):
    """Scrape all missing data"""

    cache_key = url
    if cache_key in cache:
        return cache[cache_key]

    result = {
        'address': '',
        'email': '',
        'phone': '',
        'exec_first': '',
        'exec_last': ''
    }

    try:
        all_text = ""

        # Scrape multiple pages
        for path in PAGE_PATHS[:5]:  # Max 5 pages
            try:
                page_url = urljoin(url, path)
                response = requests.get(page_url, headers=HEADERS, timeout=4)

                if response.status_code < 400:
                    soup = BeautifulSoup(response.text, 'html.parser')
                    all_text += " " + soup.get_text(separator=' ')

                    # Stop early if we found everything
                    if all([result['address'], result['email'], result['phone'], result['exec_first']]):
                        break

                    time.sleep(0.1)  # Mini delay between pages
            except:
                continue

        # Extract all data from combined text
        if not result['address']:
            result['address'] = extract_luxembourg_address(all_text) or ''

        if not result['email']:
            result['email'] = extract_email(all_text) or ''

        if not result['phone']:
            result['phone'] = extract_phone(all_text) or ''

        if not result['exec_first']:
            exec_data = extract_executive(all_text)
            if exec_data:
                result['exec_first'] = exec_data['first']
                result['exec_last'] = exec_data['last']

        cache[cache_key] = result
        save_cache()
        return result

    except:
        cache[cache_key] = result
        save_cache()
        return result

print("🚀 COMPLETE ALL-DATA SCRAPER - Luxembourg CSSF")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

print(f"📊 {len(companies)} companies to enrich")
print(f"💾 Cache: {len(cache)} websites checked")
print()

stats = {
    'addresses': 0,
    'emails': 0,
    'phones': 0,
    'contacts': 0
}

organisations = []
contacts = []

for i, company in enumerate(companies, 1):
    name = company['name']
    website = company.get('website', '')
    existing_email = company.get('email', '')
    existing_phone = company.get('phone', '')
    existing_address = company.get('address', '')

    print(f"[{i}/266] {name[:40]:40} ", end='')

    if not website:
        print("⊘ No website")
        organisations.append(company)
        continue

    # Scrape
    result = scrape_all_data(website, name)

    # Update if better data found
    final_address = result['address'] or existing_address
    final_email = result['email'] or existing_email
    final_phone = result['phone'] or existing_phone

    # Count improvements
    if result['address'] and not existing_address:
        stats['addresses'] += 1
    if result['email'] and not existing_email:
        stats['emails'] += 1
    if result['phone'] and not existing_phone:
        stats['phones'] += 1
    if result['exec_first']:
        stats['contacts'] += 1

    # Print what was found
    found = []
    if result['address']: found.append('📍')
    if result['email']: found.append('✉️')
    if result['phone']: found.append('☎️')
    if result['exec_first']: found.append('👤')

    if found:
        print(' '.join(found))
    else:
        print('⊘')

    # Save org
    organisations.append({
        'name': name,
        'email': final_email,
        'phone': final_phone,
        'address': final_address,
        'city': company.get('city', 'Luxembourg'),
        'country': company.get('country', 'Luxembourg'),
        'website': website
    })

    # Save contact
    if result['exec_first']:
        contacts.append({
            'first_name': result['exec_first'],
            'last_name': result['exec_last'],
            'personal_email': '',
            'email': final_email,
            'personal_phone': '',
            'phone': final_phone,
            'country_code': '+352',
            'language': 'en',
            'organisation': name
        })

    time.sleep(0.2)

    # Save every 30
    if i % 30 == 0:
        with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['name', 'email', 'phone', 'address', 'city', 'country', 'website'])
            writer.writeheader()
            writer.writerows(organisations)

        if contacts:
            with open(OUTPUT_CONTACT_CSV, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=['first_name', 'last_name', 'personal_email', 'email', 'personal_phone', 'phone', 'country_code', 'language', 'organisation'])
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
        writer = csv.DictWriter(f, fieldnames=['first_name', 'last_name', 'personal_email', 'email', 'personal_phone', 'phone', 'country_code', 'language', 'organisation'])
        writer.writeheader()
        writer.writerows(contacts)

print()
print("=" * 70)
print("✅ COMPLETE ALL-DATA SCRAPING DONE")
print("=" * 70)
print()

total_addr = len([c for c in organisations if c.get('address')])
total_email = len([c for c in organisations if c.get('email')])
total_phone = len([c for c in organisations if c.get('phone')])

print(f"📊 NEW DATA FOUND:")
print(f"   Addresses: +{stats['addresses']}")
print(f"   Emails:    +{stats['emails']}")
print(f"   Phones:    +{stats['phones']}")
print(f"   Contacts:  +{stats['contacts']}")
print()
print(f"🎯 TOTAL FINAL:")
print(f"   Addresses: {total_addr}/266 ({(total_addr/266*100):.1f}%)")
print(f"   Emails:    {total_email}/266 ({(total_email/266*100):.1f}%)")
print(f"   Phones:    {total_phone}/266 ({(total_phone/266*100):.1f}%)")
print(f"   Contacts:  {len(contacts)}")
print()
print(f"💾 {OUTPUT_ORG_CSV}")
print(f"💾 {OUTPUT_CONTACT_CSV}")
print()
