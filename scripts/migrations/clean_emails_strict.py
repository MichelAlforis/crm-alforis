#!/usr/bin/env python3
"""
Nettoyage strict des emails avec regex
Applique: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}
"""
import csv
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "SDG_CONTACTS_EMAILS_VALIDATED.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_EMAILS_CLEANED.csv"

# Regex stricte pour email
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')

stats = {
    'total': 0,
    'with_email': 0,
    'valid_regex': 0,
    'invalid_regex': 0,
    'cleaned': 0
}

print("="*70)
print("🧹 NETTOYAGE STRICT DES EMAILS")
print("="*70)
print()
print("Regex appliquée: [a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
print()

# Load contacts
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    contacts = list(csv.DictReader(f))

print(f"📊 {len(contacts)} contacts chargés\n")
print("="*70)
print("VALIDATION REGEX")
print("="*70)
print()

# Process
for idx, contact in enumerate(contacts, 1):
    stats['total'] += 1

    email = contact.get('email', '').strip()

    if not email:
        continue

    stats['with_email'] += 1

    # Test regex
    if EMAIL_REGEX.match(email):
        stats['valid_regex'] += 1
        print(f"[{idx:3d}] ✅ {email}")
    else:
        stats['invalid_regex'] += 1
        print(f"[{idx:3d}] ❌ {email} → NETTOYÉ")
        contact['email'] = ''  # Clear invalid email
        contact['email_final_status'] = 'invalid_format'
        contact['validation_reason'] = 'Email ne correspond pas à la regex stricte'
        stats['cleaned'] += 1

# Save
print(f"\n💾 Sauvegarde...")

fieldnames = list(contacts[0].keys())

with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(contacts)

print(f"✅ {OUTPUT_FILE.name}\n")

# Stats
print("="*70)
print("📊 RÉSULTATS NETTOYAGE")
print("="*70)
print(f"\n📧 Total contacts: {stats['total']}")
print(f"📧 Avec email: {stats['with_email']}")
print(f"\n✅ Emails valides (regex): {stats['valid_regex']} ({stats['valid_regex']*100//stats['with_email'] if stats['with_email'] else 0}%)")
print(f"❌ Emails invalides (nettoyés): {stats['invalid_regex']} ({stats['invalid_regex']*100//stats['with_email'] if stats['with_email'] else 0}%)")
print(f"\n📁 Fichier final: {OUTPUT_FILE.name}")
