#!/usr/bin/env python3
"""
Enrich Spanish SGIIC companies with data from Google Search
Similar to Luxembourg enrichment
"""

import json
import csv
import time
import re
from pathlib import Path

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_FILE = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_ENRICHED = OUTPUT_DIR / "cnmv_all_sgiic_google_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_all_organisations_enriched.csv"

def clean_company_name_for_search(name):
    """Clean company name for Google search"""
    # Remove legal forms
    name = re.sub(r'\b(SGIIC|S\.G\.I\.I\.C\.|S\.A\.|SA|S\.L\.|SL|SOCIEDAD UNIPERSONAL|S\.A\.U\.|SAU)\b', '', name, flags=re.IGNORECASE)
    # Clean
    name = re.sub(r'[,\.]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def extract_email_from_text(text):
    """Extract email from text"""
    if not text:
        return None
    # Pattern email
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text)
    if emails:
        # Prefer contact@, info@, or general emails
        for email in emails:
            if any(prefix in email.lower() for prefix in ['contact', 'info', 'general', 'admin']):
                return email
        return emails[0]
    return None

def extract_phone_from_text(text):
    """Extract Spanish phone from text"""
    if not text:
        return None
    # Spanish phone patterns
    patterns = [
        r'\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',  # +34 xxx xxx xxx
        r'\(?\+34\)?[\s\-]?\d{9}',  # +34 xxxxxxxxx
        r'\b9\d{8}\b',  # 9xxxxxxxx (Spanish landline/mobile)
        r'\b[89]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b'  # 8xx xxx xxx or 9xx xxx xxx
    ]

    for pattern in patterns:
        phones = re.findall(pattern, text)
        if phones:
            # Clean phone
            phone = re.sub(r'[\s\-\(\)]', '', phones[0])
            if not phone.startswith('+'):
                phone = '+34' + phone if phone.startswith('9') or phone.startswith('8') else phone
            return phone
    return None

def search_company_google(company_name, city):
    """
    Simulate Google search results for a company
    In real implementation, this would use Google Custom Search API or web scraping
    """
    # For now, return template - you would implement actual Google search here
    search_query = f"{company_name} {city} España contact"

    # This is a placeholder - in real implementation:
    # 1. Use Google Custom Search API
    # 2. Or use requests + BeautifulSoup to scrape Google results
    # 3. Extract website, email, phone from snippets and pages

    return {
        'website': None,
        'email': None,
        'phone': None,
        'search_query': search_query
    }

def main():
    print('🇪🇸 Enriching Spanish SGIIC with Google Search Data')
    print('='*70)

    # Load companies
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)

    print(f'Loaded {len(companies)} companies to enrich')
    print()

    enriched = []
    stats = {
        'websites_found': 0,
        'emails_found': 0,
        'phones_found': 0
    }

    for i, company in enumerate(companies, 1):
        print(f'[{i}/{len(companies)}] {company["name"][:60]}...')

        enriched_company = company.copy()

        # Clean name for search
        search_name = clean_company_name_for_search(company['name'])
        city = company.get('city', 'Madrid')

        # Search on Google
        # NOTE: This is a template. Actual implementation would use:
        # - Google Custom Search API (requires API key)
        # - Or web scraping with requests + BeautifulSoup
        # For now, we'll use the websites we already generated and add placeholders

        # Keep existing website if good
        if not enriched_company.get('website') or enriched_company['website'] == '':
            # Would search Google here
            pass

        # Search email and phone would go here
        # For demonstration, keeping existing data

        if enriched_company.get('website'):
            stats['websites_found'] += 1

        enriched.append(enriched_company)

        # Rate limiting
        time.sleep(0.1)

    print()
    print('='*70)
    print('📊 ENRICHMENT RESULTS')
    print('='*70)
    print(f'Websites found: {stats["websites_found"]}/{len(companies)}')
    print(f'Emails found: {stats["emails_found"]}/{len(companies)}')
    print(f'Phones found: {stats["phones_found"]}/{len(companies)}')
    print()

    # Save enriched JSON
    with open(OUTPUT_ENRICHED, 'w', encoding='utf-8') as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f'✓ Saved: {OUTPUT_ENRICHED}')

    # Generate CSV
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'country', 'country_code', 'category', 'type', 'register_number',
            'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
        ])
        writer.writeheader()

        for company in enriched:
            notes_parts = []
            if company.get('tier'):
                notes_parts.append(company['tier'])
            if company.get('aum'):
                notes_parts.append(f"AUM: {company['aum']:.1f} Bn€ ({company.get('aum_date', '')})")
            if company.get('aum_source') and company['aum_source'] != 'No data':
                notes_parts.append(f"Source: {company['aum_source']}")
            if company.get('register_number'):
                notes_parts.append(f"Registro CNMV: {company['register_number']}")

            writer.writerow({
                'name': company['name'],
                'email': company.get('email', ''),
                'phone': company.get('phone', ''),
                'website': company.get('website', ''),
                'address': company.get('street', ''),
                'city': company.get('city', ''),
                'postal_code': company.get('postal_code', ''),
                'country': 'Espagne',
                'country_code': 'ES',
                'category': 'SGIIC',
                'type': 'fournisseur',
                'register_number': company.get('register_number', ''),
                'aum': company.get('aum', ''),
                'aum_date': company.get('aum_date', ''),
                'tier': company.get('tier', 'Tier 3'),
                'notes': '. '.join(notes_parts) if notes_parts else '',
                'pipeline_stage': 'prospect'
            })

    print(f'✓ Saved CSV: {OUTPUT_CSV}')
    print()
    print('='*70)
    print('⚠️  NOTE: Google Search enrichment requires:')
    print('   - Google Custom Search API key (recommended)')
    print('   - Or web scraping implementation')
    print('   - Manual verification recommended')
    print('='*70)

if __name__ == '__main__':
    main()
