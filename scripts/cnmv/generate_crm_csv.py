#!/usr/bin/env python3
"""
Génère le CSV final pour import CRM avec les colonnes exactes requises
"""

import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent
INPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
OUTPUT_CSV = BASE_DIR / "output/cnmv_import_crm.csv"

def generate_crm_csv():
    """Generate CRM import CSV with exact columns"""

    print("📊 GÉNÉRATION CSV POUR IMPORT CRM")
    print("=" * 70)
    print()

    # Read enriched data
    with open(INPUT_CSV, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        companies = list(reader)

    print(f"📥 Lecture: {len(companies)} sociétés")
    print()

    # Prepare CRM rows with exact columns
    crm_rows = []

    for company in companies:
        # Build full address
        address_parts = []
        if company.get('address'):
            address_parts.append(company['address'])
        if company.get('postal_code'):
            address_parts.append(company['postal_code'])
        if company.get('city'):
            address_parts.append(company['city'])

        full_address = ', '.join(address_parts) if address_parts else company.get('address', '')

        row = {
            'name': company.get('name', ''),
            'email': company.get('email', ''),
            'phone': company.get('phone', ''),
            'website': company.get('website', ''),
            'address': full_address,
            'city': company.get('city', ''),
            'country': company.get('country_code', 'ES')  # ISO code
        }

        crm_rows.append(row)

    # Write CRM CSV
    fieldnames = ['name', 'email', 'phone', 'website', 'address', 'city', 'country']

    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(crm_rows)

    print(f"✅ CSV CRM généré: {OUTPUT_CSV}")
    print()

    # Stats
    with_email = sum(1 for r in crm_rows if r.get('email'))
    with_phone = sum(1 for r in crm_rows if r.get('phone'))
    with_website = sum(1 for r in crm_rows if r.get('website'))
    with_address = sum(1 for r in crm_rows if r.get('address'))

    print("=" * 70)
    print("📊 STATISTIQUES IMPORT CRM")
    print("=" * 70)
    print()
    print(f"Total organisations: {len(crm_rows)}")
    print()
    print(f"✅ Avec email:   {with_email:>3}/{len(crm_rows)} ({with_email/len(crm_rows)*100:.1f}%)")
    print(f"✅ Avec phone:   {with_phone:>3}/{len(crm_rows)} ({with_phone/len(crm_rows)*100:.1f}%)")
    print(f"✅ Avec website: {with_website:>3}/{len(crm_rows)} ({with_website/len(crm_rows)*100:.1f}%)")
    print(f"✅ Avec address: {with_address:>3}/{len(crm_rows)} ({with_address/len(crm_rows)*100:.1f}%)")
    print()

    # Sample data
    print("=" * 70)
    print("📋 APERÇU (5 premières lignes)")
    print("=" * 70)
    print()

    for i, row in enumerate(crm_rows[:5], 1):
        print(f"{i}. {row['name'][:50]}")
        if row.get('email'):
            print(f"   📧 {row['email']}")
        if row.get('phone'):
            print(f"   📞 {row['phone']}")
        if row.get('website'):
            print(f"   🌐 {row['website']}")
        print(f"   📍 {row['city']}, {row['country']}")
        print()

    print("=" * 70)
    print()
    print(f"✅ Fichier prêt pour import: {OUTPUT_CSV.name}")
    print(f"📊 Format: {len(crm_rows)} lignes + header")
    print()

if __name__ == '__main__':
    generate_crm_csv()
