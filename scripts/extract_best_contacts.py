#!/usr/bin/env python3
"""
Extraction des MEILLEURS contacts (validation manuelle ultime)
Seulement les noms qui SEMBLENT réels après analyse
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_VALID_STRICT.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_CONTACTS_BEST_QUALITY.csv"

# Contacts qui SEMBLENT réels (prénom + nom standard)
# Liste manuelle après analyse visuelle
PROBABLY_REAL = [
    'Guillaume Borie',
    'Michael Heldmann',
    'Andrew Balls',
    'Youssef Chahed',
    'Ulrich Kater',
    'Gautam Nadella',
    'Alex Veroude',
    'Ian Liddle',
    'Michael Bentlage',
    'Nir Bar Dea',
    'William Kadouch',
    'Henry McCance',
    'Martina King',
    'Heiko Bailer',
    'Felix Philipp',
    'Shemara Wikramanayake',
    'Marco Schulmerich',
    'Olivier Houix',
    'Mallovy Hicks'
]

print("🏆 EXTRACTION MEILLEURS CONTACTS")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    contacts = list(csv.DictReader(f))

print(f"📥 {len(contacts)} contacts dans VALID_STRICT")
print()

best_contacts = []

for contact in contacts:
    first = contact.get('first_name', '').strip()
    last = contact.get('last_name', '').strip()
    full_name = f"{first} {last}"
    org = contact.get('organisation', '')

    if full_name in PROBABLY_REAL:
        best_contacts.append(contact)
        print(f"✅ {first:15s} {last:20s} ({org[:35]})")

print()
print("=" * 70)
print(f"🏆 MEILLEURS CONTACTS: {len(best_contacts)}/266 organisations (7%)")
print("=" * 70)
print()
print("⚠️  CES CONTACTS NÉCESSITENT ENCORE VALIDATION LINKEDIN")
print()

# Sauvegarder
if best_contacts:
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=best_contacts[0].keys())
        writer.writeheader()
        writer.writerows(best_contacts)

    print(f"💾 {OUTPUT_CSV}")
else:
    print("❌ Aucun contact sélectionné")

print()
