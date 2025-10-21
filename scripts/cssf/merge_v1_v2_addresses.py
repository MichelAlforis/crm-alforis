#!/usr/bin/env python3
"""
Merge V1 + V2 addresses - Keep the BEST address for each company
Priority: V2 > V1 (V2 has better extraction)
"""

import csv
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_FINAL.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_FINAL.csv"

# Load V1 cache
v1_cache = {}
try:
    with open(BASE_DIR / 'data/cssf/legal_contacts_cache.json', 'r') as f:
        v1_cache = json.load(f)
except:
    print("⚠️  V1 cache not found")

# Load V2 cache
v2_cache = {}
try:
    with open(BASE_DIR / 'data/cssf/legal_contacts_cache_v2.json', 'r') as f:
        v2_cache = json.load(f)
except:
    print("⚠️  V2 cache not found")

print("🔄 MERGING V1 + V2 ADDRESSES")
print("=" * 70)
print()
print(f"V1 cache: {len(v1_cache)} websites")
print(f"V2 cache: {len(v2_cache)} websites")
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

stats = {
    'v2_address': 0,
    'v1_address': 0,
    'no_address': 0,
    'v2_better': 0,
}

organisations = []

for company in companies:
    name = company['name']
    website = company.get('website', '')
    email = company.get('email', '')
    phone = company.get('phone', '')

    address = ''
    city = 'Luxembourg'
    country = 'Luxembourg'

    # Priority: V2 > V1
    if website:
        v2_data = v2_cache.get(website, {})
        v1_data = v1_cache.get(website, {})

        v2_address = v2_data.get('address', '')
        v1_address = v1_data.get('address', '')

        # Use V2 if available
        if v2_address:
            address = v2_address
            stats['v2_address'] += 1

            # Check if V2 is better than V1
            if v1_address and len(v2_address) > len(v1_address):
                stats['v2_better'] += 1

        # Fallback to V1 if V2 empty
        elif v1_address:
            address = v1_address
            stats['v1_address'] += 1

    if not address:
        stats['no_address'] += 1

    organisations.append({
        'name': name,
        'email': email,
        'phone': phone,
        'address': address,
        'city': city,
        'country': country,
        'website': website,
    })

# Save merged results
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['name', 'email', 'phone', 'address', 'city', 'country', 'website'])
    writer.writeheader()
    writer.writerows(organisations)

print("=" * 70)
print("📊 MERGE RESULTS")
print("=" * 70)
print()
print(f"✓ Addresses from V2:     {stats['v2_address']}")
print(f"✓ Addresses from V1:     {stats['v1_address']}")
print(f"  (V2 better than V1):   {stats['v2_better']}")
print(f"⊘ No address:            {stats['no_address']}")
print()
total_addresses = stats['v2_address'] + stats['v1_address']
print(f"🎯 TOTAL ADDRESSES: {total_addresses}/266 ({(total_addresses/266*100):.1f}%)")
print()
print(f"💾 {OUTPUT_CSV}")
print()
