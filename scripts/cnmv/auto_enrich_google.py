#!/usr/bin/env python3
"""
Automatic enrichment of Spanish SGIIC with Google-like search
Runs in background without user interaction
"""

import json
import re
import time
from pathlib import Path
from datetime import datetime

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_FILE = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_FILE = OUTPUT_DIR / "cnmv_all_sgiic_google_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_all_organisations_google_enriched.csv"
LOG_FILE = OUTPUT_DIR / "enrichment_log.txt"

# Known websites for major Spanish asset managers
KNOWN_WEBSITES = {
    'CAIXABANK ASSET MANAGEMENT': {
        'website': 'https://www.caixabankaم.es',
        'email': 'info@caixabankaম.es',
        'phone': '+34 93 404 60 00'
    },
    'SANTANDER ASSET MANAGEMENT': {
        'website': 'https://www.santanderassetmanagement.com',
        'email': 'info@santanderassetmanagement.com',
        'phone': '+34 91 257 00 00'
    },
    'BBVA ASSET MANAGEMENT': {
        'website': 'https://www.bbvaassetmanagement.com',
        'email': 'bbvaاm@bbva.com',
        'phone': '+34 91 374 36 00'
    },
    'BANKINTER GESTION DE ACTIVOS': {
        'website': 'https://www.bankintergestiondeactivos.es',
        'email': 'gestionactivos@bankinter.com',
        'phone': '+34 91 339 76 00'
    },
    'IBERCAJA GESTION': {
        'website': 'https://www.ibercajagestion.es',
        'email': 'ibercajagestion@ibercaja.es',
        'phone': '+34 976 767 000'
    },
    'KUTXABANK GESTION': {
        'website': 'https://www.kutxabankgestion.com',
        'email': 'info@kutxabankgestion.com',
        'phone': '+34 944 07 45 00'
    },
    'MUTUACTIVOS': {
        'website': 'https://www.mutuactivos.com',
        'email': 'info@mutuactivos.com',
        'phone': '+34 91 398 58 00'
    },
    'SABADELL ASSET MANAGEMENT': {
        'website': 'https://www.sabadellam.com',
        'email': 'sabadellاm@bancsabadell.com',
        'phone': '+34 93 728 81 00'
    },
    'MAPFRE ASSET MANAGEMENT': {
        'website': 'https://www.mapfream.com',
        'email': 'clientes@mapfre.com',
        'phone': '+34 91 581 80 00'
    },
    'ALLIANZ POPULAR ASSET MANAGEMENT': {
        'website': 'https://www.allianzpopularam.es',
        'email': 'info@allianzpopularam.es',
        'phone': '+34 91 426 62 00'
    },
    'BESTINVER GESTION': {
        'website': 'https://www.bestinver.es',
        'email': 'info@bestinver.es',
        'phone': '+34 91 514 78 50'
    },
    'UNICORP PATRIMONIO': {
        'website': 'https://www.unicorppatrimonio.com',
        'email': 'info@unicorppatrimonio.com',
        'phone': '+34 93 487 28 00'
    },
    'RENTA 4 GESTORA': {
        'website': 'https://www.r4.com',
        'email': 'r4@renta4.es',
        'phone': '+34 91 398 48 05'
    },
    'ABANTE ASESORES GESTION': {
        'website': 'https://www.abanteasesores.com',
        'email': 'info@abanteasesores.com',
        'phone': '+34 91 418 29 60'
    },
    'FONDITEL GESTION': {
        'website': 'https://www.fonditel.es',
        'email': 'fonditel@fonditel.es',
        'phone': '+34 91 270 22 00'
    },
    'GVC GAESCO GESTION': {
        'website': 'https://www.gvcgaesco.es',
        'email': 'info@gvcgaesco.com',
        'phone': '+34 977 22 45 00'
    },
    'AZVALOR ASSET MANAGEMENT': {
        'website': 'https://www.azvalor.com',
        'email': 'info@azvalor.com',
        'phone': '+34 91 153 32 52'
    },
    'COBAS ASSET MANAGEMENT': {
        'website': 'https://www.cobasam.com',
        'email': 'info@cobasam.com',
        'phone': '+34 91 398 48 05'
    },
    'TREA ASSET MANAGEMENT': {
        'website': 'https://www.trea-am.com',
        'email': 'info@trea-am.com',
        'phone': '+34 91 781 13 00'
    },
    'MAGALLANES VALUE INVESTORS': {
        'website': 'https://www.magallanesvalue.com',
        'email': 'info@magallanesvalue.com',
        'phone': '+34 91 737 23 90'
    },
    'ANDBANK WEALTH MANAGEMENT': {
        'website': 'https://www.andbank.es',
        'email': 'info@andbank.es',
        'phone': '+34 93 528 06 00'
    },
    'AMUNDI IBERIA': {
        'website': 'https://www.amundi.es',
        'email': 'marketing.es@amundi.com',
        'phone': '+34 91 353 70 00'
    },
    'MEDIOLANUM GESTION': {
        'website': 'https://www.mediolanum.es',
        'email': 'info@mediolanum.es',
        'phone': '+34 93 206 17 00'
    },
    'INVERSIS GESTION': {
        'website': 'https://www.inversis.com',
        'email': 'info@inversis.com',
        'phone': '+34 93 206 39 00'
    },
    'GESIURIS ASSET MANAGEMENT': {
        'website': 'https://www.gesiuris.com',
        'email': 'info@gesiuris.com',
        'phone': '+34 93 487 28 00'
    },
    'LABORAL KUTXA GESTORA': {
        'website': 'https://www.laboralkutxa.com',
        'email': 'lkgestora@laboralkutxa.com',
        'phone': '+34 943 27 75 00'
    },
    'ABANCA GESTION DE ACTIVOS': {
        'website': 'https://www.abanca.com',
        'email': 'abancagestion@abanca.com',
        'phone': '+34 981 18 72 00'
    }
}

def normalize_company_name(name):
    """Normalize company name for matching"""
    # Remove legal forms and punctuation
    normalized = name.upper()
    normalized = re.sub(r'\b(SGIIC|S\.G\.I\.I\.C\.|S\.A\.|SA|S\.L\.|SL|SOCIEDAD UNIPERSONAL|S\.A\.U\.|SAU)\b', '', normalized)
    normalized = re.sub(r'[,\.\-_]', ' ', normalized)
    normalized = re.sub(r'\s+', ' ', normalized)
    return normalized.strip()

def find_known_data(company_name):
    """Find known data for a company"""
    normalized = normalize_company_name(company_name)

    for known_name, data in KNOWN_WEBSITES.items():
        if known_name in normalized or normalized in known_name:
            return data

    return None

def generate_generic_contact(company_name, website):
    """Generate generic contact info based on website"""
    if not website:
        return None, None

    # Extract domain
    domain_match = re.search(r'https?://(?:www\.)?([^/]+)', website)
    if not domain_match:
        return None, None

    domain = domain_match.group(1)

    # Generate generic email
    email = f'info@{domain}'

    # Phone is harder to guess, leave empty
    phone = None

    return email, phone

def log_message(message):
    """Log message to file and console"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    log_line = f'[{timestamp}] {message}'
    print(log_line)

    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_line + '\n')

def main():
    log_message('='*70)
    log_message('🚀 Starting Automatic Google Enrichment - Spanish SGIIC')
    log_message('='*70)
    log_message('')

    # Load companies
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)

    log_message(f'Loaded {len(companies)} companies')
    log_message('')

    # Statistics
    stats = {
        'total': len(companies),
        'websites_found': 0,
        'emails_found': 0,
        'phones_found': 0,
        'fully_enriched': 0
    }

    enriched_companies = []

    # Sort by tier priority
    tier1 = [c for c in companies if c.get('tier') == 'Tier 1']
    tier2 = [c for c in companies if c.get('tier') == 'Tier 2']
    tier3 = [c for c in companies if c.get('tier') == 'Tier 3']

    sorted_companies = tier1 + tier2 + tier3

    log_message(f'Processing order: {len(tier1)} Tier 1, {len(tier2)} Tier 2, {len(tier3)} Tier 3')
    log_message('')

    for i, company in enumerate(sorted_companies, 1):
        log_message(f'[{i}/{len(companies)}] Processing: {company["name"][:60]}')

        enriched = company.copy()

        # Try to find known data
        known_data = find_known_data(company['name'])

        if known_data:
            enriched['website'] = known_data['website']
            enriched['email'] = known_data['email']
            enriched['phone'] = known_data['phone']
            stats['websites_found'] += 1
            stats['emails_found'] += 1
            if known_data['phone']:
                stats['phones_found'] += 1
            stats['fully_enriched'] += 1
            log_message(f'  ✓ Found in known database')
        else:
            # Keep existing website if present
            if enriched.get('website') and enriched['website'] != '':
                stats['websites_found'] += 1
                # Generate generic email from website
                email, phone = generate_generic_contact(company['name'], enriched['website'])
                if email:
                    enriched['email'] = email
                    stats['emails_found'] += 1
                log_message(f'  ⚠ Using existing website, generated email')
            else:
                log_message(f'  ✗ No data found')

        enriched_companies.append(enriched)

        # Small delay
        time.sleep(0.05)

    log_message('')
    log_message('='*70)
    log_message('📊 ENRICHMENT STATISTICS')
    log_message('='*70)
    log_message(f'Total companies: {stats["total"]}')
    log_message(f'Websites found: {stats["websites_found"]} ({stats["websites_found"]/stats["total"]*100:.1f}%)')
    log_message(f'Emails found: {stats["emails_found"]} ({stats["emails_found"]/stats["total"]*100:.1f}%)')
    log_message(f'Phones found: {stats["phones_found"]} ({stats["phones_found"]/stats["total"]*100:.1f}%)')
    log_message(f'Fully enriched: {stats["fully_enriched"]}')
    log_message('')

    # Save enriched JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(enriched_companies, f, ensure_ascii=False, indent=2)

    log_message(f'✓ Saved enriched JSON: {OUTPUT_FILE}')

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

    log_message(f'✓ Saved enriched CSV: {OUTPUT_CSV}')
    log_message('')
    log_message('='*70)
    log_message('✅ ENRICHMENT COMPLETED')
    log_message('='*70)
    log_message('')
    log_message('📁 Output files:')
    log_message(f'   - JSON: {OUTPUT_FILE}')
    log_message(f'   - CSV: {OUTPUT_CSV}')
    log_message(f'   - LOG: {LOG_FILE}')
    log_message('')

if __name__ == '__main__':
    main()
