#!/usr/bin/env python3
"""
Filter Valid Websites - Keep only websites from valid email domains
Remove websites generated from company names
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_WITH_WEBSITES.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_FINAL.csv"

# Invalid email domains (websites generated from company names, not emails)
INVALID_DOMAINS = [
    'gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com',
    'example.com', 'email.com', 'tamm.abudhabi', 'lei-luxembourg.lu',
    '2x.png', 'lux-email.jpmorgan.com', 'empty-light'
]

def is_website_from_email(email, website):
    """Check if website was extracted from a valid email domain"""
    if not email or not website or '@' not in email:
        return False

    domain = email.split('@')[1].lower()

    # Check if email domain is invalid
    for invalid in INVALID_DOMAINS:
        if invalid in domain:
            return False

    return True

print("🔍 FILTERING VALID WEBSITES (from emails only)")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

stats = {
    'kept': 0,
    'removed': 0,
    'no_website': 0
}

results = []

for company in companies:
    name = company['name']
    email = company.get('email', '')
    website = company.get('website', '')

    if not website:
        stats['no_website'] += 1
        company['website'] = ''
        results.append(company)
        print(f"⊘ {name[:60]:60} | NO WEBSITE")
        continue

    if is_website_from_email(email, website):
        stats['kept'] += 1
        results.append(company)
        print(f"✓ {name[:60]:60} | {website[:40]}")
    else:
        stats['removed'] += 1
        company['website'] = ''  # Remove generated website
        results.append(company)
        print(f"✗ {name[:60]:60} | {website[:40]} (removed)")

# Save filtered results
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=companies[0].keys())
    writer.writeheader()
    writer.writerows(results)

print()
print("=" * 70)
print("📊 FILTERING RESULTS")
print("=" * 70)
print()
print(f"✓ Websites kept (from valid emails):  {stats['kept']}")
print(f"✗ Websites removed (from names):       {stats['removed']}")
print(f"⊘ No website:                          {stats['no_website']}")
print()
print(f"TOTAL: {stats['kept']}/{len(companies)} websites ({(stats['kept']/len(companies)*100):.1f}%)")
print()
print(f"💾 {OUTPUT_CSV}")
print()
