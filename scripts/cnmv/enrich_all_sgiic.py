#!/usr/bin/env python3
"""
Enrich ALL 117 SGIIC companies with AUM data and generate website URLs
"""

import json
import re
from pathlib import Path
from difflib import SequenceMatcher

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_ALL_SGIIC = OUTPUT_DIR / "cnmv_all_sgiic_raw.json"
INPUT_AUM = OUTPUT_DIR / "cnmv_aum_inverco_2024.json"
OUTPUT_ENRICHED = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_all_organisations.csv"

def normalize_name(name):
    """Normalize company name for matching"""
    if not name:
        return ""

    name = name.upper().strip()

    # Remove common suffixes
    suffixes = [
        'S.A.', 'SA', 'S.L.', 'SL', 'SGIIC', 'S.G.I.I.C.',
        'GESTION', 'GESTIÓN', 'ASSET MANAGEMENT', 'AM',
        'SOCIEDAD GESTORA', 'FONDOS', 'INVERSIONES',
        'SOCIEDAD UNIPERSONAL', 'S.A.U.', 'SAU'
    ]

    for suffix in suffixes:
        name = re.sub(r'\b' + re.escape(suffix) + r'\b', '', name)

    # Remove punctuation and extra spaces
    name = re.sub(r'[,\.\-_]', ' ', name)
    name = re.sub(r'\s+', ' ', name)

    return name.strip()

def fuzzy_match_name(name1, name2, threshold=0.75):
    """Fuzzy match two company names"""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)

    if not norm1 or not norm2:
        return 0.0

    return SequenceMatcher(None, norm1, norm2).ratio()

def classify_tier(aum):
    """Classify company by AUM into tiers

    Tier 1: >= 1 Md€
    Tier 2: >= 0.5 Md€ (500 M€)
    Tier 3: < 0.5 Md€ or unknown
    """
    if aum is None or aum == 0:
        return 'Tier 3'
    if aum >= 1.0:
        return 'Tier 1'
    elif aum >= 0.5:
        return 'Tier 2'
    else:
        return 'Tier 3'

def generate_website(company_name):
    """Generate likely website URL from company name"""
    # Extract key words from company name
    name = company_name.upper()

    # Known websites mapping
    known_websites = {
        'SANTANDER ASSET MANAGEMENT': 'https://www.santanderassetmanagement.com',
        'CAIXABANK ASSET MANAGEMENT': 'https://www.caixabankaム.es',
        'BBVA ASSET MANAGEMENT': 'https://www.bbvaassetmanagement.com',
        'BANKINTER': 'https://www.bankintergestiondeactivos.es',
        'KUTXABANK': 'https://www.kutxabankgestion.com',
        'MUTUACTIVOS': 'https://www.mutuactivos.com',
        'SABADELL': 'https://www.sabadellam.com',
        'MAPFRE': 'https://www.mapfream.com',
        'IBERCAJA': 'https://www.ibercajagestion.es',
        'BESTINVER': 'https://www.bestinver.es',
        'RENTA 4': 'https://www.r4.com',
        'ABANTE': 'https://www.abanteasesores.com',
        'AZVALOR': 'https://www.azvalor.com',
        'COBAS': 'https://www.cobasam.com',
        'TREA': 'https://www.trea-am.com',
        'MAGALLANES': 'https://www.magallanesvalue.com',
        'ANDBANK': 'https://www.andbank.es',
        'ALLIANZ': 'https://www.allianzpopularam.es',
        'FONDITEL': 'https://www.fonditel.es',
        'GVC GAESCO': 'https://www.gvcgaesco.es',
        'GESIURIS': 'https://www.gesiuris.com',
        'HOROS': 'https://www.horosam.com',
        'DUNAS': 'https://www.dunascapital.com',
        'METAVALOR': 'https://www.metavalor.es',
        'EDM': 'https://www.edmgestion.com',
        'ORIENTA': 'https://www.orientacapital.com',
        'AURIGA': 'https://www.aurigaglobal.com',
        'TRUE VALUE': 'https://www.truevaluesis.com',
        'ATTICA': 'https://www.atticafunds.com',
        'UNICORP': 'https://www.unicorppatrimonio.com',
        'AMUNDI': 'https://www.amundi.es',
        'BNP PARIBAS': 'https://www.bnpparibas-am.es',
        'MEDIOLANUM': 'https://www.mediolanum.es',
        'INVERSIS': 'https://www.inversis.com',
        'RENTA 4': 'https://www.r4.com',
        'LABORAL KUTXA': 'https://www.laboralkutxa.com',
        'UNICAJA': 'https://www.unicaja.es',
        'ABANCA': 'https://www.abanca.com',
        'CAJAMAR': 'https://www.cajamar.es'
    }

    # Try to match known website
    for key, website in known_websites.items():
        if key in name:
            return website

    # Generate generic website (may not exist)
    # Extract first significant word
    words = normalize_name(company_name).split()
    if words:
        domain = words[0].lower()
        if len(domain) > 3:
            return f'https://www.{domain}.com'

    return ''

def main():
    print('🇪🇸 Enriching ALL 117 SGIIC Companies')
    print('='*70)

    # Load all companies
    print('📁 Loading data...')
    with open(INPUT_ALL_SGIIC, 'r', encoding='utf-8') as f:
        all_companies = json.load(f)

    # Load AUM data
    with open(INPUT_AUM, 'r', encoding='utf-8') as f:
        aum_data = json.load(f)

    # Create AUM lookup dictionary
    aum_lookup = {}
    for aum_entry in aum_data:
        norm_name = normalize_name(aum_entry['name'])
        aum_lookup[norm_name] = aum_entry

    print(f'  ✓ Total SGIIC companies: {len(all_companies)}')
    print(f'  ✓ Companies with AUM data: {len(aum_data)}')

    # Enrich each company
    enriched_companies = []
    matched_count = 0

    for company in all_companies:
        enriched = company.copy()

        # Try to match with AUM data
        best_match = None
        best_score = 0.0

        for norm_aum_name, aum_entry in aum_lookup.items():
            score = fuzzy_match_name(company['name'], aum_entry['name'])
            if score > best_score:
                best_score = score
                best_match = aum_entry

        # Add AUM data if good match
        if best_match and best_score >= 0.75:
            enriched['aum'] = best_match['aum']
            enriched['aum_date'] = best_match['aum_date']
            enriched['aum_source'] = best_match['source']
            enriched['tier'] = best_match['tier']
            enriched['match_score'] = round(best_score, 2)
            matched_count += 1
        else:
            enriched['aum'] = None
            enriched['aum_date'] = None
            enriched['aum_source'] = 'No data'
            enriched['tier'] = 'Tier 3'
            enriched['match_score'] = 0.0

        # Generate website
        enriched['website'] = generate_website(company['name'])

        enriched_companies.append(enriched)

    print(f'\n💰 AUM Matching Results:')
    print(f'  ✓ Matched with AUM: {matched_count} companies')
    print(f'  ⚠ Without AUM: {len(all_companies) - matched_count} companies')

    # Sort by AUM (descending), then by name
    enriched_companies.sort(key=lambda x: (-(x['aum'] or 0), x['name']))

    # Save enriched data
    with open(OUTPUT_ENRICHED, 'w', encoding='utf-8') as f:
        json.dump(enriched_companies, f, ensure_ascii=False, indent=2)

    print(f'\n💾 Saved: {OUTPUT_ENRICHED}')

    # Generate CSV
    import csv

    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'country', 'country_code', 'category', 'type', 'register_number',
            'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
        ])
        writer.writeheader()

        for company in enriched_companies:
            # Build notes
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
                'email': '',
                'phone': '',
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

    print(f'💾 Saved CSV: {OUTPUT_CSV}')

    # Generate summary
    tier1_count = sum(1 for c in enriched_companies if c.get('tier') == 'Tier 1')
    tier2_count = sum(1 for c in enriched_companies if c.get('tier') == 'Tier 2')
    tier3_count = sum(1 for c in enriched_companies if c.get('tier') == 'Tier 3')
    total_aum = sum(c.get('aum', 0) or 0 for c in enriched_companies)

    print('\n' + '='*70)
    print('📊 TIER CLASSIFICATION SUMMARY')
    print('='*70)
    print(f'\nTier 1 (≥ 1 Md€):     {tier1_count} companies')
    print(f'Tier 2 (≥ 500 M€):    {tier2_count} companies')
    print(f'Tier 3 (< 500 M€):    {tier3_count} companies')
    print(f'\nTotal AUM: {total_aum:.1f} Bn€')
    print(f'\n✅ All {len(enriched_companies)} companies enriched and ready for CRM import!')
    print('='*70)

if __name__ == '__main__':
    main()
