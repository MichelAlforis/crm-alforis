#!/usr/bin/env python3
"""
Enrich CNMV data with AUM and Tier classification

Reads:
- cnmv_sgiic_raw.json (SGIIC companies)
- cnmv_entities_raw.json (other entities)
- cnmv_aum_raw.json (AUM data)

Outputs:
- cnmv_enriched_with_aum.json (enriched data with AUM and Tier)
- cnmv_enriched_with_aum.csv (CSV for CRM import)

Tier classification (similar to French SDG):
- Tier 1: > 50 Bn€
- Tier 2: 10-50 Bn€
- Tier 3: 1-10 Bn€
- Tier 4: < 1 Bn€ or unknown
"""

import json
import csv
import re
from pathlib import Path
from difflib import SequenceMatcher

# File paths
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

INPUT_SGIIC = OUTPUT_DIR / "cnmv_sgiic.json"
INPUT_ENTITIES = OUTPUT_DIR / "cnmv_entities.json"
INPUT_AUM = OUTPUT_DIR / "cnmv_aum.json"
INPUT_AUM_INVERCO = OUTPUT_DIR / "cnmv_aum_inverco.json"  # From INVERCO Excel parser

OUTPUT_JSON = OUTPUT_DIR / "cnmv_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_enriched.csv"


def normalize_name(name):
    """Normalize company name for matching"""
    if not name:
        return ""

    name = name.upper().strip()

    # Remove common suffixes
    suffixes = [
        'S.A.', 'SA', 'S.L.', 'SL', 'SGIIC', 'S.G.I.I.C.',
        'GESTION', 'GESTIÓN', 'ASSET MANAGEMENT', 'AM',
        'SOCIEDAD GESTORA', 'FONDOS', 'INVERSIONES'
    ]

    for suffix in suffixes:
        name = re.sub(r'\b' + suffix + r'\b', '', name, flags=re.IGNORECASE)

    # Remove special characters
    name = re.sub(r'[^\w\s]', ' ', name)

    # Remove extra spaces
    name = ' '.join(name.split())

    return name


def fuzzy_match(name1, name2, threshold=0.75):
    """Fuzzy match two company names"""
    norm1 = normalize_name(name1)
    norm2 = normalize_name(name2)

    # Exact match
    if norm1 == norm2:
        return 1.0

    # Check if one contains the other
    if norm1 in norm2 or norm2 in norm1:
        return 0.9

    # Use sequence matcher
    ratio = SequenceMatcher(None, norm1, norm2).ratio()

    return ratio if ratio >= threshold else 0.0


def find_aum_for_company(company_name, aum_data):
    """Find AUM data for a company using fuzzy matching"""
    best_match = None
    best_score = 0.0

    for aum_entry in aum_data:
        score = fuzzy_match(company_name, aum_entry['name'])

        if score > best_score:
            best_score = score
            best_match = aum_entry

    if best_score >= 0.75:
        return best_match, best_score
    else:
        return None, 0.0


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


def enrich_companies():
    """Enrich companies with AUM data"""
    print("🇪🇸 CNMV Data Enrichment with AUM")
    print("="*70)

    # Load data
    print("\n📁 Loading data files...")
    sgiic_data = load_json_file(INPUT_SGIIC)
    entities_data = load_json_file(INPUT_ENTITIES)

    # Try to load INVERCO data first (more complete), fallback to scraper data
    aum_data = load_json_file(INPUT_AUM_INVERCO)
    if len(aum_data) > 0:
        print(f"  ✓ Using INVERCO AUM data: {len(aum_data)} records")
    else:
        print(f"  ⚠️  No INVERCO data found, trying scraper data...")
        aum_data = load_json_file(INPUT_AUM)
        if len(aum_data) > 0:
            print(f"  ✓ Using scraper AUM data: {len(aum_data)} records")
        else:
            print(f"  ⚠️  No scraper data found either")

    print(f"  ✓ SGIIC companies: {len(sgiic_data)}")
    print(f"  ✓ Entities: {len(entities_data)}")
    print(f"  ✓ Total AUM records: {len(aum_data)}")

    if len(aum_data) == 0:
        print("\n❌ No AUM data found.")
        print("Please run one of:")
        print("  - ./scripts/cnmv/download_inverco_data.sh (recommended)")
        print("  - node scripts/cnmv/scraper_cnmv_aum.js")
        return []

    # Combine all companies
    all_companies = []

    # Process SGIIC
    for company in sgiic_data:
        if company.get('name'):
            all_companies.append({
                'name': company['name'],
                'type': 'SGIIC',
                'original_data': company
            })

    # Process entities
    for entity in entities_data:
        if entity.get('name'):
            all_companies.append({
                'name': entity['name'],
                'type': entity.get('type') or entity.get('category') or 'Entity',
                'original_data': entity
            })

    # Deduplicate
    unique_companies = {}
    for company in all_companies:
        key = normalize_name(company['name'])
        if key not in unique_companies:
            unique_companies[key] = company

    companies = list(unique_companies.values())

    print(f"\n🏢 Total unique companies to enrich: {len(companies)}")

    # Enrich with AUM
    print("\n💰 Matching companies with AUM data...")

    enriched_companies = []
    match_stats = {
        'perfect_match': 0,
        'good_match': 0,
        'weak_match': 0,
        'no_match': 0
    }

    for company in companies:
        aum_entry, score = find_aum_for_company(company['name'], aum_data)

        enriched = {
            'name': company['name'],
            'category': company['type'],
            'country': 'Espagne',
            'country_code': 'ES',
            'aum': None,
            'aum_date': None,
            'aum_source': None,
            'tier': 'Tier 4',
            'match_score': score,
            'original_data': company['original_data']
        }

        if aum_entry:
            enriched['aum'] = aum_entry['aum']
            enriched['aum_date'] = aum_entry.get('date', '2024-12-31')
            enriched['aum_source'] = aum_entry.get('source', 'Unknown')
            enriched['tier'] = classify_tier(enriched['aum'])

            if score >= 0.95:
                match_stats['perfect_match'] += 1
            elif score >= 0.85:
                match_stats['good_match'] += 1
            else:
                match_stats['weak_match'] += 1
        else:
            match_stats['no_match'] += 1

        enriched_companies.append(enriched)

    # Sort by AUM (descending), then by name
    enriched_companies.sort(key=lambda x: (
        -(x['aum'] if x['aum'] else 0),
        x['name']
    ))

    print(f"  ✓ Perfect matches (≥95%): {match_stats['perfect_match']}")
    print(f"  ✓ Good matches (≥85%): {match_stats['good_match']}")
    print(f"  ⚠ Weak matches (≥75%): {match_stats['weak_match']}")
    print(f"  ✗ No match: {match_stats['no_match']}")

    # Save enriched data
    print("\n💾 Saving enriched data...")

    # Save JSON
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(enriched_companies, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Saved JSON: {OUTPUT_JSON}")

    # Save CSV
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        fieldnames = [
            'name', 'category', 'country', 'country_code',
            'aum', 'aum_date', 'aum_source', 'tier',
            'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'type', 'pipeline_stage', 'notes'
        ]

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for company in enriched_companies:
            orig = company['original_data']

            row = {
                'name': company['name'],
                'category': company['category'],
                'country': 'Espagne',
                'country_code': 'ES',
                'aum': company['aum'] if company['aum'] else '',
                'aum_date': company['aum_date'] if company['aum_date'] else '',
                'aum_source': company['aum_source'] if company['aum_source'] else '',
                'tier': company['tier'],
                'email': orig.get('email', ''),
                'phone': orig.get('phone', ''),
                'website': orig.get('website', ''),
                'address': orig.get('address', ''),
                'city': orig.get('city', ''),
                'postal_code': orig.get('postal_code', ''),
                'type': 'fournisseur',
                'pipeline_stage': 'prospect',
                'notes': f"{company['tier']}. {orig.get('notes', '')}"
            }

            writer.writerow(row)

    print(f"  ✓ Saved CSV: {OUTPUT_CSV}")

    # Generate tier statistics
    print("\n" + "="*70)
    print("📊 TIER CLASSIFICATION SUMMARY")
    print("="*70)
    print("\nCritères de classification:")
    print("  Tier 1: >= 1 Md€")
    print("  Tier 2: >= 500 M€ (0.5 Md€)")
    print("  Tier 3: < 500 M€ ou inconnu")

    tier_stats = {}
    for company in enriched_companies:
        tier = company['tier']
        tier_stats[tier] = tier_stats.get(tier, 0) + 1

    for tier in ['Tier 1', 'Tier 2', 'Tier 3']:
        count = tier_stats.get(tier, 0)
        print(f"\n{tier}: {count} companies")

        # Show companies in each tier
        tier_companies = [c for c in enriched_companies if c['tier'] == tier]

        # Show all Tier 1 and Tier 2, limit Tier 3
        limit = 999 if tier in ['Tier 1', 'Tier 2'] else 20
        for company in tier_companies[:limit]:
            aum_str = f"{company['aum']:.1f} Bn€" if company['aum'] else "N/A"
            print(f"  - {company['name']}: {aum_str}")

        if len(tier_companies) > limit:
            print(f"  ... et {len(tier_companies) - limit} autres")

    # Show top 20 by AUM
    print("\n" + "="*70)
    print("🏆 TOP 20 SPANISH ASSET MANAGERS BY AUM")
    print("="*70)
    print("")

    top_20 = [c for c in enriched_companies if c['aum']][:20]

    for idx, company in enumerate(top_20, 1):
        aum_str = f"{company['aum']:.1f}".rjust(6)
        tier_str = company['tier'].ljust(7)
        name_str = company['name'][:45].ljust(45)

        print(f"  {str(idx).rjust(2)}. {name_str} {aum_str} Bn€  [{tier_str}]")

    total_aum = sum(c['aum'] for c in enriched_companies if c['aum'])
    print(f"\n  Total AUM (Top {len([c for c in enriched_companies if c['aum']])}): {total_aum:.1f} Bn€")

    print("\n" + "="*70)
    print("✅ Enrichment completed successfully!")
    print("="*70)

    print(f"\n📝 Next steps:")
    print(f"  1. Review: {OUTPUT_CSV}")
    print(f"  2. Import to CRM: ./scripts/cnmv/import_cnmv.sh --import-only")
    print(f"  3. Or transform again: python3 scripts/cnmv/transform_cnmv_to_crm.py")

    return enriched_companies


def main():
    """Main enrichment function"""
    companies = enrich_companies()

    if len(companies) == 0:
        print("\n⚠️  No companies enriched. Check input files.")
        return 1

    return 0


if __name__ == '__main__':
    exit(main())
