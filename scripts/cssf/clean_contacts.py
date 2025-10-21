#!/usr/bin/env python3
"""
Clean Contacts - Remove invalid names
Filter out aberrant contact names before CRM import
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_CLEAN.csv"

# Invalid keywords in names
INVALID_KEYWORDS = [
    'Chief', 'Team', 'Contact', 'CEO', 'Managing', 'Director',
    'Executive', 'Our', 'Meet', 'Perspective', 'Group', 'Partner',
    'FIS', 'For', 'Michael', 'Rasmussen'
]

print("🧹 CLEANING CONTACTS - LUXEMBOURG CSSF")
print("=" * 70)
print()

# Load contacts
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    contacts = list(reader)

print(f"📊 Total contacts: {len(contacts)}")
print()

valid_contacts = []
invalid_contacts = []

for contact in contacts:
    first = contact.get('first_name', '')
    last = contact.get('last_name', '')
    full_name = f"{first} {last}"

    # Check if name contains invalid keywords
    is_invalid = any(kw in first or kw in last for kw in INVALID_KEYWORDS)

    if is_invalid:
        invalid_contacts.append(contact)
        print(f"❌ REMOVED: {full_name:40} | {contact.get('organisation', '')[:40]}")
    else:
        valid_contacts.append(contact)
        print(f"✅ KEPT:    {full_name:40} | {contact.get('organisation', '')[:40]}")

# Save cleaned contacts
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    if valid_contacts:
        fieldnames = list(contacts[0].keys())
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(valid_contacts)

print()
print("=" * 70)
print("📊 CLEANING RESULTS")
print("=" * 70)
print()
print(f"✅ Valid contacts:   {len(valid_contacts)}")
print(f"❌ Invalid contacts: {len(invalid_contacts)}")
print()
print(f"💾 {OUTPUT_CSV}")
print()
