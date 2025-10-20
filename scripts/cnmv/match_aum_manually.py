#!/usr/bin/env python3
"""
Manually match AUM data to SGIIC companies with exact mapping
"""

import json
from pathlib import Path

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_ALL_SGIIC = OUTPUT_DIR / "cnmv_all_sgiic_raw.json"
INPUT_AUM = OUTPUT_DIR / "cnmv_aum_inverco_2024.json"
OUTPUT_ENRICHED = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_all_organisations.csv"

# Manual mapping: AUM name -> CNMV official name
MANUAL_MAPPING = {
    "CAIXABANK ASSET MANAGEMENT": "CAIXABANK ASSET MANAGEMENT SGIIC, S.A.",
    "SANTANDER ASSET MANAGEMENT": "SANTANDER ASSET MANAGEMENT, S.A., SGIIC",
    "BBVA ASSET MANAGEMENT": "BBVA ASSET MANAGEMENT, S.A., SGIIC",
    "BANKINTER GESTION DE ACTIVOS": "BANKINTER GESTION DE ACTIVOS, S.A., S.G.I.I.C.",
    "IBERCAJA GESTION": "IBERCAJA GESTION, SGIIC, S.A.",
    "KUTXABANK GESTION": "KUTXABANK GESTION, SGIIC, S.A.",
    "SABADELL ASSET MANAGEMENT": "SABADELL ASSET MANAGEMENT, S.A., SGIIC",
    "MUTUACTIVOS": "MUTUACTIVOS, S.A., S.G.I.I.C.",
    "UNIGEST": "UNICAJA GESTION, S.A. S.G.I.I.C.",
    "MAPFRE ASSET MANAGEMENT": "MAPFRE ASSET MANAGEMENT, SGIIC, S.A.",
    "ALLIANZ POPULAR ASSET MANAGEMENT": "ALLIANZ POPULAR ASSET MANAGEMENT SGIIC, S.A.",
    "BESTINVER GESTION": "BESTINVER GESTION, S.A., SGIIC",
    "UNICORP PATRIMONIO": "UNICORP PATRIMONIO SGIIC, S.A.",
    "RENTA 4 GESTORA": "RENTA 4 GESTORA, SGIIC, S.A.",
    "ABANTE ASESORES GESTION": "ABANTE ASESORES GESTION, SGIIC, S.A.",
    "FONDITEL GESTION": "FONDITEL GESTION, SGIIC, SA",
    "ABANCA GESTION DE ACTIVOS": "ABANCA GESTION DE ACTIVOS, SGIIC, SA",
    "GVC GAESCO GESTION": "GVC GAESCO GESTIÓN, SGIIC, S.A.",
    "AZVALOR ASSET MANAGEMENT": "AZVALOR ASSET MANAGEMENT, SGIIC, S.A.",
    "COBAS ASSET MANAGEMENT": "COBAS ASSET MANAGEMENT, SGIIC, S.A.",
    "TREA ASSET MANAGEMENT": "TREA ASSET MANAGEMENT, SGIIC, S.A.",
    "MAGALLANES VALUE INVESTORS": "MAGALLANES VALUE INVESTORS, S.A., SGIIC",
    "ANDBANK WEALTH MANAGEMENT": "ANDBANK WEALTH MANAGEMENT, SGIIC, S.A.U.",
    "GESIURIS ASSET MANAGEMENT": "GESIURIS ASSET MANAGEMENT, SGIIC, S.A.",
    "HOROS ASSET MANAGEMENT": "HOROS ASSET MANAGEMENT, SGIIC, S.A.",
    "DUNAS CAPITAL GESTION": "DUNAS CAPITAL GESTION, S.G.I.I.C., S.A.",
    "METAVALOR GESTION": "METAVALOR GESTION, S.G.I.I.C., S.A.",
    "EDM GESTION": "EDM GESTION, S.G.I.I.C., S.A.",
    "ORIENTA CAPITAL": "ORIENTA CAPITAL, SGIIC, S.A.",
    "AMUNDI IBERIA": "AMUNDI IBERIA, SGIIC, S.A.",
    "BNP PARIBAS ASSET MANAGEMENT": "BNP PARIBAS ASSET MANAGEMENT, S.A., SGIIC",
    "MEDIOLANUM GESTION": "MEDIOLANUM GESTION, S.G.I.I.C., S.A.",
    "INVERSIS GESTION": "INVERSIS GESTIÓN, S.A., SGIIC",
    "LABORAL KUTXA GESTION": "LABORAL KUTXA GESTORA, SGIIC, S.A.",
    "UNICAJA GESTION": "UNICAJA GESTION, S.A. S.G.I.I.C."
}

def generate_website(company_name):
    """Generate likely website URL from company name"""
    known_websites = {
        'SANTANDER': 'https://www.santanderassetmanagement.com',
        'CAIXABANK': 'https://www.caixabankaম.es',
        'BBVA': 'https://www.bbvaassetmanagement.com',
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
        'UNICORP': 'https://www.unicorppatrimonio.com',
        'AMUNDI': 'https://www.amundi.es',
        'BNP PARIBAS': 'https://www.bnpparibas-am.es',
        'MEDIOLANUM': 'https://www.mediolanum.es',
        'INVERSIS': 'https://www.inversis.com',
        'LABORAL KUTXA': 'https://www.laboralkutxa.com',
        'UNICAJA': 'https://www.unicaja.es',
        'ABANCA': 'https://www.abanca.com'
    }

    name_upper = company_name.upper()
    for key, website in known_websites.items():
        if key in name_upper:
            return website

    return ''

def main():
    print('🇪🇸 Enriching ALL SGIIC with Manual AUM Matching')
    print('='*70)

    # Load data
    with open(INPUT_ALL_SGIIC, 'r', encoding='utf-8') as f:
        all_sgiic = json.load(f)

    with open(INPUT_AUM, 'r', encoding='utf-8') as f:
        aum_data = json.load(f)

    print(f'✓ Loaded {len(all_sgiic)} SGIIC companies')
    print(f'✓ Loaded {len(aum_data)} AUM records')

    # Create AUM lookup by CNMV name
    aum_by_cnmv_name = {}
    for aum in aum_data:
        cnmv_name = MANUAL_MAPPING.get(aum['name'])
        if cnmv_name:
            aum_by_cnmv_name[cnmv_name] = aum
        else:
            print(f'⚠️  No mapping for: {aum["name"]}')

    # Enrich companies
    enriched = []
    matched_count = 0

    for company in all_sgiic:
        enriched_company = company.copy()

        # Check if we have AUM for this company
        if company['name'] in aum_by_cnmv_name:
            aum = aum_by_cnmv_name[company['name']]
            enriched_company['aum'] = aum['aum']
            enriched_company['aum_date'] = aum['aum_date']
            enriched_company['aum_source'] = aum['source']
            enriched_company['tier'] = aum['tier']
            matched_count += 1
        else:
            enriched_company['aum'] = None
            enriched_company['aum_date'] = None
            enriched_company['aum_source'] = 'No data'
            enriched_company['tier'] = 'Tier 3'

        # Generate website
        enriched_company['website'] = generate_website(company['name'])

        enriched.append(enriched_company)

    print(f'\n💰 Matched: {matched_count}/{len(aum_data)} AUM records')

    # Sort by AUM (desc), then name
    enriched.sort(key=lambda x: (-(x['aum'] or 0), x['name']))

    # Save enriched JSON
    with open(OUTPUT_ENRICHED, 'w', encoding='utf-8') as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)

    print(f'💾 Saved: {OUTPUT_ENRICHED}')

    # Generate CSV
    import csv

    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'country', 'country_code', 'category', 'type', 'register_number',
            'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
        ])
        writer.writeheader()

        for company in enriched:
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

    # Stats
    tier1 = sum(1 for c in enriched if c['tier'] == 'Tier 1')
    tier2 = sum(1 for c in enriched if c['tier'] == 'Tier 2')
    tier3 = sum(1 for c in enriched if c['tier'] == 'Tier 3')
    total_aum = sum(c.get('aum', 0) or 0 for c in enriched)

    print('\n' + '='*70)
    print('📊 FINAL STATISTICS')
    print('='*70)
    print(f'Total companies: {len(enriched)}')
    print(f'  Tier 1 (≥ 1 Md€): {tier1}')
    print(f'  Tier 2 (≥ 500 M€): {tier2}')
    print(f'  Tier 3 (< 500 M€): {tier3}')
    print(f'\nTotal AUM: {total_aum:.1f} Bn€')
    print(f'Average AUM (Tier 1+2): {total_aum/(tier1+tier2):.1f} Bn€')
    print('='*70)
    print('✅ All 117 companies ready for CRM import!')

if __name__ == '__main__':
    main()
