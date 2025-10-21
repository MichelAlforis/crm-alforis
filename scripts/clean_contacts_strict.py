#!/usr/bin/env python3
"""
Nettoyage STRICT des contacts Luxembourg
Filtre tous les noms suspects (titres, marketing, fragments HTML)
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_CRM_CONTACTS.csv"
OUTPUT_VALID = BASE_DIR / "LUXEMBOURG_CONTACTS_VALID_STRICT.csv"
OUTPUT_INVALID = BASE_DIR / "LUXEMBOURG_CONTACTS_INVALID_STRICT.csv"

# Mots interdits dans first_name ou last_name
INVALID_KEYWORDS = [
    # Titres/fonctions
    'Chief', 'Officer', 'CEO', 'Director', 'Manager', 'Executive', 'Vice',
    'President', 'Partner', 'Team', 'Leadership', 'Senior', 'Principal',
    'Associate', 'Managing', 'Head', 'Group', 'Function',

    # Marketing/texte site
    'Our', 'Meet', 'Discover', 'Contact', 'Information', 'Values', 'What',
    'For', 'Perspective', 'Context', 'Asia', 'Pacific', 'Sales', 'Business',
    'School', 'Growth', 'Expertise', 'Sustainable', 'Investing', 'Monsieur',
    'Madame', 'First', 'Brammer', 'ET', 'FOUNDER',

    # Noms d'entreprise
    'AllianceBernstein', 'Nvidia', 'Gabriele', 'Alberici', 'Many',

    # Fragments
    'We', 'As', 'Direct', 'Connect', 'Firm', 'DISCOVER'
]

print("🧹 NETTOYAGE STRICT DES CONTACTS")
print("=" * 70)
print()

with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    contacts = list(csv.DictReader(f))

print(f"📥 {len(contacts)} contacts au total")
print()

valid_contacts = []
invalid_contacts = []

for contact in contacts:
    first = contact.get('first_name', '').strip()
    last = contact.get('last_name', '').strip()
    org = contact.get('organisation', '')

    # Vérifier si nom/prénom vide
    if not first or not last:
        invalid_contacts.append(contact)
        continue

    # Vérifier mots-clés invalides (case-insensitive)
    first_lower = first.lower()
    last_lower = last.lower()

    is_invalid = False
    for keyword in INVALID_KEYWORDS:
        if keyword.lower() in first_lower or keyword.lower() in last_lower:
            is_invalid = True
            break

    # Vérifier longueur (noms trop courts = suspects)
    if len(first) <= 2 or len(last) <= 2:
        is_invalid = True

    # Vérifier majuscules (ALL CAPS = suspect)
    if first.isupper() and len(first) > 3:
        is_invalid = True

    if is_invalid:
        invalid_contacts.append(contact)
        print(f"❌ {first} {last:20s} ({org[:30]})")
    else:
        valid_contacts.append(contact)
        print(f"✅ {first} {last:20s} ({org[:30]})")

print()
print("=" * 70)
print(f"✅ CONTACTS VALIDES:   {len(valid_contacts)}")
print(f"❌ CONTACTS INVALIDES: {len(invalid_contacts)}")
print("=" * 70)
print()

# Sauvegarder contacts valides
with open(OUTPUT_VALID, 'w', newline='', encoding='utf-8') as f:
    if valid_contacts:
        writer = csv.DictWriter(f, fieldnames=valid_contacts[0].keys())
        writer.writeheader()
        writer.writerows(valid_contacts)

# Sauvegarder contacts invalides (pour audit)
with open(OUTPUT_INVALID, 'w', newline='', encoding='utf-8') as f:
    if invalid_contacts:
        writer = csv.DictWriter(f, fieldnames=invalid_contacts[0].keys())
        writer.writeheader()
        writer.writerows(invalid_contacts)

print(f"💾 Valides:   {OUTPUT_VALID}")
print(f"💾 Invalides: {OUTPUT_INVALID}")
print()
