#!/usr/bin/env python3
"""
Format contacts for CRM import
Match required fields:
- first name* (Prénom)
- last name* (Nom)
- personal email (Email personnel)
- email (Email professionnel)
- personal phone (Tél. personnel)
- phone (Tél. professionnel)
- country code (Code pays)
- language (Langue fr/en)
- organisation (Nom de l'org. associée)
"""
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "SDG_CONTACTS_SELENIUM_FINAL.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_CRM_IMPORT.csv"

print("🔄 Formatage contacts pour import CRM\n")

# Load contacts
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    contacts = list(csv.DictReader(f))

print(f"📊 {len(contacts)} contacts chargés")

# Transform to CRM format
crm_contacts = []

for contact in contacts:
    # Clean phone (remove spaces, keep + for international)
    phone = contact.get('phone', '').strip()
    if phone:
        phone = phone.replace(' ', '')

    # Map language code
    lang = contact.get('language', 'FR').upper()
    if lang == 'FR':
        lang = 'fr'
    else:
        lang = 'en'

    crm_contact = {
        'first name': contact.get('first_name', '').strip(),
        'last name': contact.get('last_name', '').strip(),
        'personal email': contact.get('personal_email', '').strip(),
        'email': '',  # Email professionnel vide (pas dans les données)
        'personal phone': '',  # Tél. personnel vide
        'phone': phone,  # Tél. professionnel
        'country code': contact.get('country_code', 'FR').upper(),
        'language': lang,
        'organisation': contact.get('company', '').strip()
    }

    # Skip if no first name or last name
    if not crm_contact['first name'] or not crm_contact['last name']:
        continue

    # Skip if last name is too generic (likely parsing error)
    if crm_contact['last name'].lower() in ['du directoire', 'du comité stratégique', 'du conseil']:
        continue

    crm_contacts.append(crm_contact)

# Save
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'first name',
        'last name',
        'personal email',
        'email',
        'personal phone',
        'phone',
        'country code',
        'language',
        'organisation'
    ])
    writer.writeheader()
    writer.writerows(crm_contacts)

print(f"✅ {len(crm_contacts)} contacts formatés")
print(f"❌ {len(contacts) - len(crm_contacts)} contacts filtrés (erreurs parsing)")
print(f"📁 {OUTPUT_FILE.name}")

print("\n📋 Colonnes générées:")
print("   • first name* - Prénom")
print("   • last name* - Nom")
print("   • personal email - Email personnel (vide)")
print("   • email - Email professionnel (vide)")
print("   • personal phone - Tél. personnel (vide)")
print("   • phone - Tél. professionnel")
print("   • country code - Code pays (FR)")
print("   • language - Langue (fr/en)")
print("   • organisation - Nom de l'org. associée")

print("\n💡 Prêt pour import dans le CRM!")
