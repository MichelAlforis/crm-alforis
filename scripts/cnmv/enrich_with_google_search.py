#!/usr/bin/env python3
"""
Enrich Spanish SGIIC companies with Google Search
This script outputs search queries that should be run with WebSearch tool
"""

import json
import re
from pathlib import Path

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_FILE = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_QUERIES = OUTPUT_DIR / "google_search_queries.txt"

def clean_company_name_for_search(name):
    """Clean company name for Google search"""
    name = re.sub(r'\b(SGIIC|S\.G\.I\.I\.C\.|S\.A\.|SA|S\.L\.|SL|SOCIEDAD UNIPERSONAL|S\.A\.U\.|SAU)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[,\.]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def main():
    print('🔍 Generating Google Search Queries for Spanish SGIIC')
    print('='*70)

    # Load companies
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)

    # Focus on Tier 1 and Tier 2 first (priority)
    tier1_2 = [c for c in companies if c.get('tier') in ['Tier 1', 'Tier 2']]
    tier3 = [c for c in companies if c.get('tier') == 'Tier 3']

    print(f'Total companies: {len(companies)}')
    print(f'Tier 1+2 (priority): {len(tier1_2)}')
    print(f'Tier 3: {len(tier3)}')
    print()

    # Generate search queries
    queries = []

    print('📝 Generating search queries for Tier 1+2...')
    for company in tier1_2[:21]:  # Top 21 (Tier 1+2)
        clean_name = clean_company_name_for_search(company['name'])
        city = company.get('city', 'España')

        # Query 1: Website + contact
        query1 = f'"{clean_name}" {city} sitio web oficial contacto'
        queries.append({
            'company': company['name'],
            'tier': company.get('tier'),
            'query': query1,
            'purpose': 'website_contact'
        })

        # Query 2: Email
        query2 = f'"{clean_name}" email contacto'
        queries.append({
            'company': company['name'],
            'tier': company.get('tier'),
            'query': query2,
            'purpose': 'email'
        })

        # Query 3: Phone
        query3 = f'"{clean_name}" teléfono'
        queries.append({
            'company': company['name'],
            'tier': company.get('tier'),
            'query': query3,
            'purpose': 'phone'
        })

    # Save queries to file
    with open(OUTPUT_QUERIES, 'w', encoding='utf-8') as f:
        f.write('# Google Search Queries for Spanish SGIIC Enrichment\n')
        f.write('# Generated for Tier 1+2 companies (21 companies x 3 queries = 63 queries)\n\n')

        for i, q in enumerate(queries, 1):
            f.write(f'## Query {i}/{len(queries)}\n')
            f.write(f'Company: {q["company"]}\n')
            f.write(f'Tier: {q["tier"]}\n')
            f.write(f'Purpose: {q["purpose"]}\n')
            f.write(f'Query: {q["query"]}\n\n')

    print(f'✓ Generated {len(queries)} search queries')
    print(f'✓ Saved to: {OUTPUT_QUERIES}')
    print()
    print('='*70)
    print('📋 Next Steps:')
    print('='*70)
    print('1. Run these queries with WebSearch tool')
    print('2. Extract: website, email, phone from results')
    print('3. Update cnmv_all_sgiic_enriched.json with data')
    print('4. Regenerate CSV')
    print()
    print(f'Starting with top {len(tier1_2)} Tier 1+2 companies')
    print('='*70)

if __name__ == '__main__':
    main()
