#!/usr/bin/env python3
"""
Génère le CSV final des CONTACTS pour import CRM
Merge organisations + dirigeants trouvés
"""

import json
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent
DIRECTORS_FILE = BASE_DIR / "output/website_directors.json"
ORG_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
OUTPUT_CSV = BASE_DIR / "output/cnmv_contacts_tier23.csv"

def generate_contacts_csv():
    """Generate contacts CSV from directors data"""

    print("=" * 80)
    print("  GÉNÉRATION CSV CONTACTS - TIER 2 & 3")
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

                contact = {
                    'first_name': first_name,
                    'last_name': last_name,
                    'job_title': director.get('position', 'Director'),
                    'email': '',  # To be filled manually or via LinkedIn
                    'phone': '',  # To be filled manually or via LinkedIn
                    'organization_name': company_name,
                    'organization_website': company.get('website', ''),
                    'organization_city': company.get('city', ''),
                    'organization_country': 'ES',
                    'tier': tier,
                    'source': 'Website Scraping'
                }

                contacts.append(contact)
        else:
            # Create placeholder contact for manual enrichment
            contact = {
                'first_name': '',
                'last_name': '',
                'job_title': 'Director Comercial',
                'email': '',
                'phone': '',
                'organization_name': company_name,
                'organization_website': company.get('website', ''),
                'organization_city': company.get('city', ''),
                'organization_country': 'ES',
                'tier': tier,
                'source': 'À enrichir (LinkedIn/Manuel)'
            }

            contacts.append(contact)

    # Write CSV
    fieldnames = [
        'first_name', 'last_name', 'job_title', 'email', 'phone',
        'organization_name', 'organization_website', 'organization_city',
        'organization_country', 'tier', 'source'
    ]

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(contacts)

    # Stats
    print(f"✅ CSV généré: {OUTPUT_CSV}")
    print()

    with_names = sum(1 for c in contacts if c['first_name'])
    without_names = sum(1 for c in contacts if not c['first_name'])

    print("📊 STATISTIQUES:")
    print(f"   Total contacts:             {len(contacts)}")
    print(f"   Avec nom (website scraping): {with_names} ({with_names/len(contacts)*100:.1f}%)")
    print(f"   À enrichir (LinkedIn):       {without_names} ({without_names/len(contacts)*100:.1f}%)")
    print()

    # By tier
    tier2 = sum(1 for c in contacts if c['tier'] == 'Tier 2')
    tier3 = sum(1 for c in contacts if c['tier'] == 'Tier 3')

    print("🏆 PAR TIER:")
    print(f"   Tier 2: {tier2} contacts")
    print(f"   Tier 3: {tier3} contacts")
    print()

    # Sample
    print("=" * 80)
    print("📋 APERÇU (10 premiers contacts)")
    print("=" * 80)
    print()

    for i, contact in enumerate(contacts[:10], 1):
        if contact['first_name']:
            print(f"{i:>2}. {contact['first_name']} {contact['last_name']}")
            print(f"    {contact['job_title']}")
            print(f"    🏢 {contact['organization_name'][:50]}")
            print(f"    Tier: {contact['tier']}")
        else:
            print(f"{i:>2}. [À enrichir]")
            print(f"    🏢 {contact['organization_name'][:50]}")
            print(f"    Tier: {contact['tier']}")
        print()

    print("=" * 80)
    print()
    print(f"✅ Fichier prêt: {OUTPUT_CSV.name}")
    print()

if __name__ == '__main__':
    generate_contacts_csv()
