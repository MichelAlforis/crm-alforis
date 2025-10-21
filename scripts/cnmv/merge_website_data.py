#!/usr/bin/env python3
"""
Merge website enrichment data into CRM CSV files
"""

import json
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent

# Input files
WEBSITE_DATA = BASE_DIR / "output/website_enrichment.json"
WEBSITE_DIRECTORS = BASE_DIR / "output/website_directors.json"  # From previous scraping
ORG_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"

# Output files
OUTPUT_ORG_CSV = BASE_DIR / "output/cnmv_import_crm_final.csv"
OUTPUT_CONTACTS_CSV = BASE_DIR / "output/cnmv_contacts_import_crm_final.csv"

def merge_data():
    """Merge all website data into final CSV files"""

    print("=" * 80)
    print("  FUSION DES DONNÉES WEBSITES → CSV CRM")
    print("=" * 80)
    print()

    # Load website enrichment
    with open(WEBSITE_DATA, 'r', encoding='utf-8') as f:
        website_enrich = json.load(f)

    # Load previous directors
    try:
        with open(WEBSITE_DIRECTORS, 'r', encoding='utf-8') as f:
            website_directors_data = json.load(f)
    except:
        website_directors_data = []

    # Create lookups
    phones_by_company = {}
    directors_by_company = {}

    # From new scraping
    for item in website_enrich:
        company_name = item['company_name']
        phones_by_company[company_name] = item.get('phones', [])
        directors_by_company[company_name] = item.get('directors', [])

    # Merge with previous directors
    for item in website_directors_data:
        company_name = item['company_name']
        prev_directors = item.get('directors', [])

        # Add to existing
        if company_name in directors_by_company:
            existing_names = [d['name'] for d in directors_by_company[company_name]]
            for d in prev_directors:
                if d['name'] not in existing_names:
                    directors_by_company[company_name].append(d)
        else:
            directors_by_company[company_name] = prev_directors

    # Load organizations
    with open(ORG_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        orgs = list(reader)

    print(f"📥 Chargement:")
    print(f"   {len(orgs)} organisations")
    print(f"   {len(phones_by_company)} sociétés avec nouveaux téléphones")
    print(f"   {len(directors_by_company)} sociétés avec dirigeants")
    print()

    # ========================================
    # 1. UPDATE ORGANISATIONS WITH PHONES
    # ========================================

    orgs_updated = 0
    phones_added = 0

    for org in orgs:
        name = org['name']

        # Add phone if missing
        if not org.get('phone') and name in phones_by_company:
            phones = phones_by_company[name]
            if phones:
                org['phone'] = phones[0]  # Take first phone
                orgs_updated += 1
                phones_added += 1

    # Save organisations (filter to CRM columns only)
    fieldnames_org = ['name', 'email', 'phone', 'website', 'address', 'city', 'country']

    orgs_crm = []
    for org in orgs:
        # Build address
        address_parts = []
        if org.get('address'):
            address_parts.append(org['address'])
        if org.get('postal_code'):
            address_parts.append(org['postal_code'])
        if org.get('city'):
            address_parts.append(org['city'])

        full_address = ', '.join(address_parts) if address_parts else org.get('address', '')

        org_crm = {
            'name': org.get('name', ''),
            'email': org.get('email', ''),
            'phone': org.get('phone', ''),
            'website': org.get('website', ''),
            'address': full_address,
            'city': org.get('city', ''),
            'country': org.get('country_code', 'ES')
        }
        orgs_crm.append(org_crm)

    with open(OUTPUT_ORG_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_org)
        writer.writeheader()
        writer.writerows(orgs_crm)

    print(f"✅ ORGANISATIONS mises à jour:")
    print(f"   {orgs_updated} organisations")
    print(f"   {phones_added} téléphones ajoutés")
    print(f"   Fichier: {OUTPUT_ORG_CSV.name}")
    print()

    # ========================================
    # 2. CREATE CONTACTS FROM ALL DIRECTORS
    # ========================================

    contacts = []

    for org in orgs:
        name = org['name']
        tier = org.get('tier', '')

        # Only Tier 2 and 3
        if tier not in ['Tier 2', 'Tier 3']:
            continue

        directors = directors_by_company.get(name, [])

        if directors:
            # Create contact for each director
            for director in directors:
                full_name = director['name'].strip()
                name_parts = full_name.split()

                if len(name_parts) >= 2:
                    first_name = name_parts[0]
                    last_name = ' '.join(name_parts[1:])
                else:
                    first_name = full_name
                    last_name = ''

                contact = {
                    'first name': first_name,
                    'last name': last_name,
                    'personal email': '',
                    'email': '',  # Professional email
                    'personal phone': '',
                    'phone': '',  # Professional phone
                    'country code': 'ES',
                    'language': 'es',
                    'organisation': name
                }

                contacts.append(contact)
        else:
            # Create placeholder for manual enrichment
            contact = {
                'first name': '',
                'last name': '',
                'personal email': '',
                'email': '',
                'personal phone': '',
                'phone': '',
                'country code': 'ES',
                'language': 'es',
                'organisation': name
            }

            contacts.append(contact)

    # Save contacts
    fieldnames_contacts = [
        'first name', 'last name', 'personal email', 'email',
        'personal phone', 'phone', 'country code', 'language', 'organisation'
    ]

    with open(OUTPUT_CONTACTS_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames_contacts)
        writer.writeheader()
        writer.writerows(contacts)

    with_names = sum(1 for c in contacts if c['first name'])
    without_names = sum(1 for c in contacts if not c['first name'])

    print(f"✅ CONTACTS créés:")
    print(f"   {len(contacts)} contacts total")
    print(f"   {with_names} avec noms ({with_names/len(contacts)*100:.1f}%)")
    print(f"   {without_names} à enrichir ({without_names/len(contacts)*100:.1f}%)")
    print(f"   Fichier: {OUTPUT_CONTACTS_CSV.name}")
    print()

    # ========================================
    # FINAL STATS
    # ========================================

    print("=" * 80)
    print("📊 ÉTAT FINAL DES DONNÉES")
    print("=" * 80)
    print()

    # Organisations
    with_email = sum(1 for o in orgs_crm if o.get('email'))
    with_phone = sum(1 for o in orgs_crm if o.get('phone'))
    with_website = sum(1 for o in orgs_crm if o.get('website'))

    print(f"1️⃣  ORGANISATIONS ({len(orgs)} sociétés):")
    print(f"   Emails:   {with_email}/{len(orgs)} ({with_email/len(orgs)*100:.1f}%)")
    print(f"   Phones:   {with_phone}/{len(orgs)} ({with_phone/len(orgs)*100:.1f}%) [↑ +{phones_added}]")
    print(f"   Websites: {with_website}/{len(orgs)} ({with_website/len(orgs)*100:.1f}%)")
    print()

    # Contacts
    print(f"2️⃣  CONTACTS ({len(contacts)} contacts Tier 2 & 3):")
    print(f"   Avec noms:   {with_names} ({with_names/len(contacts)*100:.1f}%)")
    print(f"   À enrichir:  {without_names} ({without_names/len(contacts)*100:.1f}%)")
    print()

    print("=" * 80)
    print("✅ FICHIERS CRM FINAUX PRÊTS:")
    print("=" * 80)
    print()
    print(f"📁 {OUTPUT_ORG_CSV.name}")
    print(f"   → {len(orgs)} organisations")
    print()
    print(f"📁 {OUTPUT_CONTACTS_CSV.name}")
    print(f"   → {len(contacts)} contacts")
    print()
    print("=" * 80)

if __name__ == '__main__':
    merge_data()
