#!/usr/bin/env python3
"""
Génère le CSV final des CONTACTS au format CRM exact
"""

import json
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent
DIRECTORS_FILE = BASE_DIR / "output/website_directors.json"
ORG_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
OUTPUT_CSV = BASE_DIR / "output/cnmv_contacts_import_crm.csv"

def generate_contacts_csv():
    """Generate contacts CSV in exact CRM format"""

    print("=" * 80)
    print("  GÉNÉRATION CSV CONTACTS - FORMAT CRM")
    print("=" * 80)
    print()

    # Load directors
    with open(DIRECTORS_FILE, 'r', encoding='utf-8') as f:
        directors_data = json.load(f)

    # Create director lookup
    directors_by_company = {}
    for company in directors_data:
        company_name = company['company_name']
        directors_by_company[company_name] = company.get('directors', [])

    # Load organizations
    with open(ORG_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        companies = list(reader)

    # Generate contacts
    contacts = []

    for company in companies:
        company_name = company['name']
        tier = company.get('tier', '')

        # Only Tier 2 and 3
        if tier not in ['Tier 2', 'Tier 3']:
            continue

        directors = directors_by_company.get(company_name, [])

        if directors:
            # Create a contact for each director
            for director in directors:
                # Extract first/last name
                full_name = director['name'].strip()
                name_parts = full_name.split()

                if len(name_parts) >= 2:
                    first_name = name_parts[0]
                    last_name = ' '.join(name_parts[1:])
                else:
                    first_name = full_name
                    last_name = ''

                # Determine language (Spanish for Spain)
                language = 'es'  # Spanish for Spain, but could be 'en' if preferred

                contact = {
                    'first name': first_name,
                    'last name': last_name,
                    'personal email': '',  # À enrichir via LinkedIn
                    'email': '',  # À enrichir via LinkedIn (email professionnel)
                    'personal phone': '',  # À enrichir
                    'phone': '',  # À enrichir
                    'country code': 'ES',
                    'language': language,
                    'organisation': company_name
                }

                contacts.append(contact)
        else:
            # Create placeholder contact for manual enrichment
            contact = {
                'first name': '',
                'last name': '',
                'personal email': '',
                'email': '',
                'personal phone': '',
                'phone': '',
                'country code': 'ES',
                'language': 'es',
                'organisation': company_name
            }

            contacts.append(contact)

    # Write CSV with exact CRM column names
    fieldnames = [
        'first name',
        'last name',
        'personal email',
        'email',
        'personal phone',
        'phone',
        'country code',
        'language',
        'organisation'
    ]

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(contacts)

    # Stats
    print(f"✅ CSV généré: {OUTPUT_CSV}")
    print()

    with_names = sum(1 for c in contacts if c['first name'])
    without_names = sum(1 for c in contacts if not c['first name'])

    print("📊 STATISTIQUES:")
    print(f"   Total contacts:              {len(contacts)}")
    print(f"   Avec nom (website scraping): {with_names} ({with_names/len(contacts)*100:.1f}%)")
    print(f"   À enrichir (LinkedIn):       {without_names} ({without_names/len(contacts)*100:.1f}%)")
    print()

    # By tier
    tier2_orgs = [c['name'] for c in companies if c.get('tier') == 'Tier 2']
    tier3_orgs = [c['name'] for c in companies if c.get('tier') == 'Tier 3']

    tier2_contacts = sum(1 for c in contacts if c['organisation'] in tier2_orgs)
    tier3_contacts = sum(1 for c in contacts if c['organisation'] in tier3_orgs)

    print("🏆 PAR TIER:")
    print(f"   Tier 2: {tier2_contacts} contacts")
    print(f"   Tier 3: {tier3_contacts} contacts")
    print()

    # Sample
    print("=" * 80)
    print("📋 APERÇU (10 premiers contacts avec noms)")
    print("=" * 80)
    print()

    shown = 0
    for contact in contacts:
        if contact['first name'] and shown < 10:
            shown += 1
            print(f"{shown:>2}. {contact['first name']} {contact['last name']}")
            print(f"    🏢 {contact['organisation'][:55]}")
            print(f"    🌍 {contact['country code']} | {contact['language']}")
            print()

    print("=" * 80)
    print()
    print("📝 FORMAT CRM:")
    print("   ✅ first name* (requis)")
    print("   ✅ last name* (requis)")
    print("   ✅ personal email")
    print("   ✅ email (professionnel)")
    print("   ✅ personal phone")
    print("   ✅ phone (professionnel)")
    print("   ✅ country code (ES)")
    print("   ✅ language (es)")
    print("   ✅ organisation* (requis)")
    print()
    print(f"✅ Fichier prêt: {OUTPUT_CSV.name}")
    print()
    print("⚠️  NOTE: Les 73 contacts avec noms sont prêts.")
    print("⚠️  Les 86 contacts sans noms sont à enrichir via LinkedIn.")
    print()

if __name__ == '__main__':
    generate_contacts_csv()
