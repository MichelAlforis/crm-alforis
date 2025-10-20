#!/usr/bin/env python3
"""
Consolidate Sales Contacts

Consolide tous les contacts commerciaux depuis différentes sources:
- LinkedIn
- Sites web
- Hunter.io
- Autres sources

Output: Fichier CSV prêt pour import CRM
"""

import json
import csv
import re
from pathlib import Path
from difflib import SequenceMatcher

# File paths
BASE_DIR = Path(__file__).parent.parent.parent

INPUT_FILES = {
    'linkedin': BASE_DIR / 'cnmv_sales_directors.json',
    'websites': BASE_DIR / 'cnmv_sales_teams_websites.json',
    'hunter': BASE_DIR / 'cnmv_contacts_enriched_hunter.json'
}

OUTPUT_CSV = BASE_DIR / 'cnmv_sales_contacts_final.csv'
OUTPUT_JSON = BASE_DIR / 'cnmv_sales_contacts_final.json'


def normalize_name(name):
    """Normalize name for matching"""
    if not name:
        return ""

    name = str(name).strip().upper()

    # Remove titles
    titles = ['DR.', 'MR.', 'MS.', 'MRS.', 'SR.', 'SRA.', 'SRTA.']
    for title in titles:
        name = name.replace(title, '')

    # Remove extra spaces
    name = ' '.join(name.split())

    return name


def normalize_email(email):
    """Normalize email"""
    if not email:
        return ""

    return str(email).strip().lower()


def fuzzy_match(str1, str2, threshold=0.85):
    """Fuzzy match two strings"""
    if not str1 or not str2:
        return 0.0

    ratio = SequenceMatcher(None, str1.upper(), str2.upper()).ratio()
    return ratio if ratio >= threshold else 0.0


def split_full_name(full_name):
    """Split full name into first and last name"""
    if not full_name:
        return '', ''

    parts = full_name.strip().split()

    if len(parts) == 0:
        return '', ''
    elif len(parts) == 1:
        return parts[0], ''
    else:
        return parts[0], ' '.join(parts[1:])


def load_json_file(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  File not found: {filepath}")
        return []
    except json.JSONDecodeError as e:
        print(f"❌ Error parsing JSON: {e}")
        return []


def consolidate_contacts():
    """Consolidate all sales contacts from different sources"""
    print("🔄 Consolidating Sales Contacts")
    print("="*70)

    all_contacts = []

    # Load contacts from all sources
    for source_name, filepath in INPUT_FILES.items():
        print(f"\n📁 Loading {source_name}...")

        contacts = load_json_file(filepath)

        if contacts:
            print(f"  ✓ Loaded {len(contacts)} contacts")

            # Add source metadata
            for contact in contacts:
                if 'source' not in contact:
                    contact['source'] = source_name

            all_contacts.extend(contacts)
        else:
            print(f"  ⚠️  No contacts found")

    print(f"\n📊 Total contacts loaded: {len(all_contacts)}")

    if len(all_contacts) == 0:
        print("\n❌ No contacts to consolidate")
        print("Run the scrapers first:")
        print("  - node scripts/cnmv/scraper_linkedin_sales_directors.js")
        print("  - node scripts/cnmv/scraper_websites_sales_teams.js")
        print("  - node scripts/cnmv/enrich_with_hunter.js")
        return []

    # Deduplicate contacts
    print("\n🔄 Deduplicating contacts...")

    unique_contacts = []
    seen_keys = {}  # key -> index in unique_contacts

    for contact in all_contacts:
        # Extract name and email
        name = contact.get('name') or f"{contact.get('first_name', '')} {contact.get('last_name', '')}".strip()
        email = contact.get('email') or contact.get('personal_email') or ''

        first_name = contact.get('first_name', '')
        last_name = contact.get('last_name', '')

        # If no first/last name, try to split full name
        if not first_name and not last_name and name:
            first_name, last_name = split_full_name(name)

        # Skip if no name
        if not name:
            continue

        # Normalize for matching
        name_norm = normalize_name(name)
        email_norm = normalize_email(email)

        # Create unique key
        # Priority: email > name
        unique_key = email_norm if email_norm else name_norm

        # Check if already exists
        if unique_key in seen_keys:
            # Merge with existing
            idx = seen_keys[unique_key]
            existing = unique_contacts[idx]

            # Keep the one with more information
            if email and not existing.get('email'):
                existing['email'] = email

            if not existing.get('first_name') and first_name:
                existing['first_name'] = first_name

            if not existing.get('last_name') and last_name:
                existing['last_name'] = last_name

            if not existing.get('job_title') and contact.get('job_title'):
                existing['job_title'] = contact.get('job_title')

            if not existing.get('job_title') and contact.get('title'):
                existing['job_title'] = contact.get('title')

            # Add source
            if 'sources' not in existing:
                existing['sources'] = [existing.get('source', 'unknown')]

            if contact.get('source') and contact['source'] not in existing['sources']:
                existing['sources'].append(contact['source'])

        else:
            # New contact
            consolidated = {
                'first_name': first_name,
                'last_name': last_name,
                'name': name,
                'email': email or contact.get('work_email', ''),
                'phone': contact.get('phone') or contact.get('work_phone', ''),
                'job_title': contact.get('job_title') or contact.get('title') or contact.get('position', ''),
                'company_name': contact.get('company_name', ''),
                'company_tier': contact.get('company_tier', ''),
                'company_aum': contact.get('company_aum', ''),
                'country_code': contact.get('country_code', 'ES'),
                'language': contact.get('language', 'ES'),
                'linkedin_url': contact.get('linkedin_url', ''),
                'source': contact.get('source', 'unknown'),
                'sources': [contact.get('source', 'unknown')],
                'email_verified': contact.get('email_verified', False),
                'email_confidence': contact.get('email_confidence', 0),
                'notes': ''
            }

            unique_contacts.append(consolidated)
            seen_keys[unique_key] = len(unique_contacts) - 1

    print(f"  ✓ Deduplicated: {len(all_contacts)} → {len(unique_contacts)} unique contacts")

    # Sort by company tier, then by company AUM
    def sort_key(contact):
        tier_priority = {'Tier 1': 1, 'Tier 2': 2, 'Tier 3': 3}
        tier = tier_priority.get(contact.get('company_tier', 'Tier 3'), 9)
        aum = contact.get('company_aum', 0)
        return (tier, -aum if aum else 0)

    unique_contacts.sort(key=sort_key)

    # Generate statistics
    print("\n" + "="*70)
    print("📊 CONSOLIDATION SUMMARY")
    print("="*70)

    print(f"\nTotal unique contacts: {len(unique_contacts)}")

    # By tier
    tier_stats = {}
    for contact in unique_contacts:
        tier = contact.get('company_tier', 'Unknown')
        tier_stats[tier] = tier_stats.get(tier, 0) + 1

    print("\nBy Tier:")
    for tier in ['Tier 1', 'Tier 2', 'Tier 3']:
        count = tier_stats.get(tier, 0)
        print(f"  {tier}: {count}")

    # Data quality
    with_email = sum(1 for c in unique_contacts if c.get('email'))
    with_phone = sum(1 for c in unique_contacts if c.get('phone'))
    with_linkedin = sum(1 for c in unique_contacts if c.get('linkedin_url'))
    email_verified = sum(1 for c in unique_contacts if c.get('email_verified'))

    print(f"\nData quality:")
    print(f"  With email: {with_email} ({(with_email/len(unique_contacts)*100):.1f}%)")
    print(f"  With phone: {with_phone} ({(with_phone/len(unique_contacts)*100):.1f}%)")
    print(f"  With LinkedIn: {with_linkedin} ({(with_linkedin/len(unique_contacts)*100):.1f}%)")
    print(f"  Email verified: {email_verified}")

    # By source
    print(f"\nBy source:")
    source_stats = {}
    for contact in unique_contacts:
        sources = contact.get('sources', [contact.get('source', 'unknown')])
        for source in sources:
            source_stats[source] = source_stats.get(source, 0) + 1

    for source, count in sorted(source_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"  {source}: {count}")

    # Save as JSON
    print(f"\n💾 Saving files...")

    # Clean sources list for JSON
    for contact in unique_contacts:
        if isinstance(contact.get('sources'), list):
            contact['sources'] = ', '.join(contact['sources'])

    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(unique_contacts, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Saved JSON: {OUTPUT_JSON}")

    # Save as CSV
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'first_name', 'last_name', 'email', 'phone',
            'job_title', 'company_name', 'company_tier', 'company_aum',
            'country_code', 'language',
            'linkedin_url', 'sources', 'email_verified', 'email_confidence',
            'notes'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(unique_contacts)

    print(f"  ✓ Saved CSV: {OUTPUT_CSV}")

    print("\n" + "="*70)
    print("✅ Consolidation completed successfully!")
    print("="*70)

    print(f"\n📝 Next steps:")
    print(f"  1. Review: {OUTPUT_CSV}")
    print(f"  2. Import to CRM via API:")
    print(f"     curl -X POST http://localhost:8000/api/v1/imports/people/bulk \\")
    print(f"       -H 'Content-Type: application/json' \\")
    print(f"       -d @{OUTPUT_JSON}")

    return unique_contacts


def main():
    """Main function"""
    contacts = consolidate_contacts()
    return 0 if contacts else 1


if __name__ == '__main__':
    exit(main())
