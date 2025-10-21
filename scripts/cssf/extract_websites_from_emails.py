#!/usr/bin/env python3
"""
Extract websites from email domains
260 emails → 260 potential websites
"""

import csv
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_WITH_WEBSITES.csv"

def company_name_to_website(name):
    """Convert company name to likely website"""
    # Clean company name
    clean = name.lower()
    clean = clean.replace(' asset management', '')
    clean = clean.replace(' investment management', '')
    clean = clean.replace(' capital management', '')
    clean = clean.replace(' fund management', '')
    clean = clean.replace(' investments', '')
    clean = clean.replace(' investment', '')
    clean = clean.replace(' investors', '')
    clean = clean.replace(' group', '')
    clean = clean.replace(' partners', '')
    clean = clean.replace(' capital', '')
    clean = clean.replace(' s.a.', '')
    clean = clean.replace(' ltd', '')
    clean = clean.replace(' limited', '')
    clean = clean.replace(' plc', '')
    clean = clean.replace(' ag', '')
    clean = clean.replace(' gmbh', '')
    clean = clean.replace('&', 'and')
    clean = re.sub(r'[^a-z0-9]', '', clean)  # Remove special chars

    return f"https://www.{clean}.com"

def email_to_website(email, company_name=''):
    """Convert email domain to website URL"""
    if not email or '@' not in email:
        # Fallback: use company name
        if company_name:
            return company_name_to_website(company_name)
        return ''

    # Extract domain
    domain = email.split('@')[1].lower()

    # Skip generic/invalid domains
    invalid = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
               'example.com', 'email.com', 'tamm.abudhabi', 'lei-luxembourg.lu',
               '2x.png', 'lux-email.jpmorgan.com']

    if any(inv in domain for inv in invalid):
        # Fallback: use company name
        if company_name:
            return company_name_to_website(company_name)
        return ''

    # Clean domain
    domain = domain.replace('lux.', '').replace('lu.', '')

    # Build website
    return f"https://www.{domain}"

print("🌐 EXTRACTING WEBSITES FROM EMAILS")
print("=" * 70)
print()

# Load
with open(INPUT_CSV, 'r') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

print(f"📊 {len(companies)} companies")
print()

stats = {'extracted': 0, 'already_had': 0, 'no_email': 0}

for i, company in enumerate(companies, 1):
    name = company['name']
    email = company.get('email', '')
    current_website = company.get('website', '')

    if current_website and current_website.startswith('http'):
        stats['already_had'] += 1
        continue

    if not email:
        stats['no_email'] += 1
        continue

    # Extract website from email (with company name fallback)
    website = email_to_website(email, name)

    if website:
        company['website'] = website
        stats['extracted'] += 1
        print(f"[{i}/266] ✓ {name[:40]:40} | {email[:30]:30} → {website}")

# Save
print("\n" + "=" * 70)
with open(OUTPUT_CSV, 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=companies[0].keys())
    writer.writeheader()
    writer.writerows(companies)

print(f"💾 {OUTPUT_CSV}\n")

print("=" * 70)
print("📊 RESULTS")
print("=" * 70)
print()
print(f"✓ Websites extracted from emails: {stats['extracted']}")
print(f"✓ Already had websites:          {stats['already_had']}")
print(f"⚠ No email (no website):         {stats['no_email']}")
print(f"\nTOTAL WEBSITES: {stats['extracted'] + stats['already_had']}/{len(companies)}")
print()
