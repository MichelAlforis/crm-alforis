#!/usr/bin/env python3
"""
Transform CNMV data to CRM format

Converts raw CNMV scraped data into format compatible with CRM import API.

Input files:
- cnmv_enriched_with_aum.json (enriched data with AUM) - PRIORITY
- OR cnmv_sgiic_raw.json + cnmv_entities_raw.json (fallback)
- cnmv_contacts_raw.json (contacts/people)

Output files:
- cnmv_organisations.csv (organisations for CRM import)
- cnmv_contacts.csv (contacts for CRM import)
"""

import json
import csv
import re
from pathlib import Path
from datetime import datetime

# File paths
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

INPUT_ENRICHED = OUTPUT_DIR / "cnmv_enriched.json"
INPUT_SGIIC = OUTPUT_DIR / "cnmv_sgiic.json"
INPUT_ENTITIES = OUTPUT_DIR / "cnmv_entities.json"
INPUT_CONTACTS = OUTPUT_DIR / "cnmv_contacts.json"

OUTPUT_ORGS = OUTPUT_DIR / "cnmv_organisations.csv"
OUTPUT_CONTACTS = OUTPUT_DIR / "cnmv_contacts.csv"


def clean_phone(phone):
    """Clean and format Spanish phone numbers"""
    if not phone:
        return ""

    # Remove all non-digit characters except +
    cleaned = re.sub(r'[^\d+]', '', phone)

    # Add +34 prefix if missing
    if not cleaned.startswith('+'):
        if cleaned.startswith('34'):
            cleaned = '+' + cleaned
        elif cleaned.startswith('0034'):
            cleaned = '+' + cleaned[2:]
        else:
            cleaned = '+34' + cleaned

    return cleaned


def clean_website(url):
    """Clean and format website URLs"""
    if not url:
        return ""

    # Remove whitespace
    url = url.strip()

    # Add https:// if missing protocol
    if not url.startswith(('http://', 'https://')):
        url = 'https://' + url

    # Remove trailing slash
    url = url.rstrip('/')

    return url


def parse_address(address_str):
    """Parse Spanish address into components"""
    if not address_str:
        return "", "", ""

    # Try to extract postal code (5 digits in Spain)
    postal_match = re.search(r'\b\d{5}\b', address_str)
    postal_code = postal_match.group(0) if postal_match else ""

    # Common Spanish cities
    cities = [
        'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza',
        'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao',
        'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón'
    ]

    city = ""
    for c in cities:
        if c.lower() in address_str.lower():
            city = c
            break

    # Remove city and postal code from address
    address = address_str
    if city:
        address = re.sub(city, '', address, flags=re.IGNORECASE)
    if postal_code:
        address = address.replace(postal_code, '')

    address = address.strip().strip(',').strip()

    return address, city, postal_code


def load_json_file(filepath):
    """Load JSON file, return empty list if not found"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File not found: {filepath}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON in {filepath}: {e}")
        return []


def transform_from_enriched(enriched_data):
    """Transform enriched data (with AUM) to CRM format"""
    all_orgs = []

    for company in enriched_data:
        name = company.get('name', '').strip()
        if not name or len(name) < 3:
            continue

        # Get original data if available
        orig = company.get('original_data', {})

        # Parse address if available
        address_str = orig.get('full_address') or orig.get('address') or ''
        address, city, postal_code = parse_address(address_str)

        # Build notes with AUM and Tier info
        notes_parts = []
        if company.get('tier'):
            notes_parts.append(f"{company['tier']}")
        if company.get('aum'):
            notes_parts.append(f"AUM: {company['aum']:.1f} Bn€ ({company.get('aum_date', '')})")
        if company.get('aum_source'):
            notes_parts.append(f"Source: {company['aum_source']}")
        if orig.get('register_number'):
            notes_parts.append(f"Registro CNMV: {orig['register_number']}")
        if orig.get('register_date'):
            notes_parts.append(f"Fecha: {orig['register_date']}")

        notes = '. '.join(notes_parts)

        org = {
            'name': name,
            'email': orig.get('email', ''),
            'phone': clean_phone(orig.get('phone', '')),
            'website': clean_website(orig.get('website', '')),
            'address': address,
            'city': city,
            'postal_code': postal_code,
            'country': 'Espagne',
            'country_code': 'ES',
            'category': company.get('category', 'SGIIC'),
            'type': 'fournisseur',
            'aum': company.get('aum', ''),
            'aum_date': company.get('aum_date', ''),
            'tier': company.get('tier', 'Tier 4'),
            'notes': notes,
            'pipeline_stage': 'prospect'
        }

        all_orgs.append(org)

    # Deduplicate by name
    unique_orgs = {}
    for org in all_orgs:
        key = org['name'].lower().strip()
        if key not in unique_orgs:
            unique_orgs[key] = org

    final_orgs = list(unique_orgs.values())

    print(f"  🔄 Processed: {len(all_orgs)} → {len(final_orgs)} unique organisations")

    # Write to CSV with AUM fields
    with open(OUTPUT_ORGS, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'name', 'email', 'phone', 'website',
            'address', 'city', 'postal_code',
            'country', 'country_code',
            'category', 'type',
            'aum', 'aum_date', 'tier',
            'notes', 'pipeline_stage'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_orgs)

    print(f"  ✅ Saved {len(final_orgs)} organisations to {OUTPUT_ORGS}")

    return final_orgs


def transform_organisations():
    """Transform SGIIC and entities data to CRM organisations format"""
    print("🏢 Transforming organisations...")

    # Try to load enriched data first
    enriched_data = load_json_file(INPUT_ENRICHED)

    if enriched_data:
        print(f"  ✅ Using enriched data with AUM: {len(enriched_data)} companies")
        return transform_from_enriched(enriched_data)

    # Fallback to raw data
    print("  ⚠️  No enriched data found. Using raw data without AUM.")

    # Load data
    sgiic_data = load_json_file(INPUT_SGIIC)
    entities_data = load_json_file(INPUT_ENTITIES)

    print(f"  📁 Loaded {len(sgiic_data)} SGIIC companies")
    print(f"  📁 Loaded {len(entities_data)} entities")

    all_orgs = []

    # Process SGIIC companies
    for company in sgiic_data:
        name = company.get('name', '').strip()
        if not name or len(name) < 3:
            continue

        # Parse address if available
        address_str = company.get('full_address') or company.get('address') or ''
        address, city, postal_code = parse_address(address_str)

        org = {
            'name': name,
            'email': company.get('email', ''),
            'phone': clean_phone(company.get('phone', '')),
            'website': clean_website(company.get('website', '')),
            'address': address,
            'city': city,
            'postal_code': postal_code,
            'country': 'Espagne',
            'country_code': 'ES',
            'category': 'SGIIC',  # Sociedades Gestoras de Instituciones de Inversión Colectiva
            'type': 'fournisseur',
            'notes': f"Registro CNMV: {company.get('register_number', '')}. Fecha: {company.get('register_date', '')}",
            'pipeline_stage': 'prospect'
        }

        all_orgs.append(org)

    # Process other entities
    for entity in entities_data:
        name = entity.get('name', '').strip()
        if not name or len(name) < 3:
            continue

        # Determine category
        entity_type = entity.get('type') or entity.get('category') or 'Entity'

        org = {
            'name': name,
            'email': '',
            'phone': '',
            'website': '',
            'address': '',
            'city': '',
            'postal_code': '',
            'country': 'Espagne',
            'country_code': 'ES',
            'category': entity_type,
            'type': 'fournisseur',
            'notes': f"CNMV Entity. Status: {entity.get('status', '')}. Registro: {entity.get('register_number', '')}",
            'pipeline_stage': 'prospect'
        }

        all_orgs.append(org)

    # Deduplicate by name
    unique_orgs = {}
    for org in all_orgs:
        key = org['name'].lower().strip()
        if key not in unique_orgs:
            unique_orgs[key] = org

    final_orgs = list(unique_orgs.values())

    print(f"  🔄 Deduplicated: {len(all_orgs)} → {len(final_orgs)} organisations")

    # Write to CSV
    with open(OUTPUT_ORGS, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'name', 'email', 'phone', 'website',
            'address', 'city', 'postal_code',
            'country', 'country_code',
            'category', 'type', 'notes', 'pipeline_stage'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_orgs)

    print(f"  ✅ Saved {len(final_orgs)} organisations to {OUTPUT_ORGS}")

    return final_orgs


def transform_contacts():
    """Transform contacts data to CRM people format"""
    print("\n👥 Transforming contacts...")

    # Load data
    contacts_data = load_json_file(INPUT_CONTACTS)

    print(f"  📁 Loaded {len(contacts_data)} contacts")

    if len(contacts_data) == 0:
        print("  ⚠️  No contacts to process")
        return []

    all_contacts = []

    for contact in contacts_data:
        email = contact.get('email', '').strip()
        if not email or '@' not in email:
            continue

        first_name = contact.get('first_name', '').strip()
        last_name = contact.get('last_name', '').strip()

        # If name is missing, try to extract from email
        if not first_name and not last_name:
            # Extract name part from email (before @)
            email_name = email.split('@')[0]
            parts = email_name.replace('.', ' ').replace('_', ' ').split()
            if len(parts) >= 2:
                first_name = parts[0].capitalize()
                last_name = ' '.join(parts[1:]).capitalize()
            elif len(parts) == 1:
                first_name = parts[0].capitalize()
                last_name = ''

        person = {
            'first_name': first_name,
            'last_name': last_name,
            'personal_email': email,  # Using as work_email key
            'phone': clean_phone(contact.get('phone', '')),
            'country_code': 'ES',
            'language': 'ES',
            'job_title': contact.get('job_title', ''),
            'company_name': contact.get('company_name', ''),
            'notes': f"Source: {contact.get('source', 'CNMV')}"
        }

        all_contacts.append(person)

    # Deduplicate by email
    unique_contacts = {}
    for contact in all_contacts:
        key = contact['personal_email'].lower().strip()
        if key not in unique_contacts:
            unique_contacts[key] = contact

    final_contacts = list(unique_contacts.values())

    print(f"  🔄 Deduplicated: {len(all_contacts)} → {len(final_contacts)} contacts")

    # Write to CSV
    with open(OUTPUT_CONTACTS, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'first_name', 'last_name', 'personal_email',
            'phone', 'country_code', 'language',
            'job_title', 'company_name', 'notes'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(final_contacts)

    print(f"  ✅ Saved {len(final_contacts)} contacts to {OUTPUT_CONTACTS}")

    return final_contacts


def generate_summary(orgs, contacts):
    """Generate import summary"""
    print("\n" + "="*60)
    print("📊 CNMV DATA TRANSFORMATION SUMMARY")
    print("="*60)

    print(f"\n🏢 Organisations: {len(orgs)}")

    # Count by category
    categories = {}
    for org in orgs:
        cat = org.get('category', 'Unknown')
        categories[cat] = categories.get(cat, 0) + 1

    print("  By category:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"    - {cat}: {count}")

    # Count by Tier if available
    tiers = {}
    for org in orgs:
        tier = org.get('tier', 'Unknown')
        if tier and tier != 'Unknown':
            tiers[tier] = tiers.get(tier, 0) + 1

    if tiers:
        print("\n  By Tier:")
        for tier in ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']:
            count = tiers.get(tier, 0)
            if count > 0:
                print(f"    - {tier}: {count}")

    # Count organisations with data
    with_email = sum(1 for o in orgs if o.get('email'))
    with_phone = sum(1 for o in orgs if o.get('phone'))
    with_website = sum(1 for o in orgs if o.get('website'))
    with_aum = sum(1 for o in orgs if o.get('aum'))

    print(f"\n  With email: {with_email}")
    print(f"  With phone: {with_phone}")
    print(f"  With website: {with_website}")
    if with_aum > 0:
        print(f"  With AUM: {with_aum}")

    print(f"\n👥 Contacts: {len(contacts)}")

    if contacts:
        with_full_name = sum(1 for c in contacts if c.get('first_name') and c.get('last_name'))
        with_job_title = sum(1 for c in contacts if c.get('job_title'))
        with_phone = sum(1 for c in contacts if c.get('phone'))

        print(f"  With full name: {with_full_name}")
        print(f"  With job title: {with_job_title}")
        print(f"  With phone: {with_phone}")

    print("\n" + "="*60)
    print("✅ Transformation completed successfully")
    print("="*60)

    print(f"\n📁 Output files:")
    print(f"  - {OUTPUT_ORGS}")
    print(f"  - {OUTPUT_CONTACTS}")

    print(f"\n📝 Next steps:")
    print(f"  1. Review the CSV files")
    print(f"  2. Run: ./scripts/cnmv/import_cnmv.sh")
    print(f"  3. Or import manually via CRM API")


def main():
    """Main transformation function"""
    print("🇪🇸 CNMV Data Transformation")
    print("="*60)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)

    # Transform data
    orgs = transform_organisations()
    contacts = transform_contacts()

    # Generate summary
    generate_summary(orgs, contacts)


if __name__ == '__main__':
    main()
