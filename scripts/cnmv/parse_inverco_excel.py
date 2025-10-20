#!/usr/bin/env python3
"""
Parse INVERCO Excel files to extract AUM data for Spanish asset managers

INVERCO (Asociación de Instituciones de Inversión Colectiva) publishes
monthly/quarterly Excel files with detailed AUM statistics for all SGIICs.

Download files from:
https://www.inverco.es/archivosdb/

Typical file structure:
- Sheet: "SGIICs" or "Gestoras" or "Patrimonio"
- Columns: Nombre/Name | Patrimonio/AUM | Date

Output:
- cnmv_aum_inverco.json - All AUM data from INVERCO
"""

import json
import sys
from pathlib import Path
import pandas as pd
from datetime import datetime

# File paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
OUTPUT_FILE = PROJECT_ROOT / "cnmv_aum_inverco.json"


def clean_company_name(name):
    """Clean and normalize company name"""
    if pd.isna(name) or not name:
        return None

    name = str(name).strip()

    # Remove common prefixes/suffixes
    prefixes_to_remove = [
        'SGIIC', 'S.G.I.I.C.', 'SGII', 'S.A.', 'SA', 'S.L.', 'SL'
    ]

    for prefix in prefixes_to_remove:
        name = name.replace(f', {prefix}', '')
        name = name.replace(f' {prefix}', '')

    return name.strip() if name else None


def parse_aum_value(value):
    """Parse AUM value to float (in billions €)"""
    if pd.isna(value):
        return None

    # If already a number
    if isinstance(value, (int, float)):
        return float(value)

    # If string, try to parse
    value_str = str(value).strip()

    # Remove common formatting
    value_str = value_str.replace(',', '').replace('.', '').replace('€', '').replace(' ', '')

    try:
        # Try to convert to float
        num = float(value_str)

        # INVERCO usually reports in millions €
        # Convert to billions
        if num > 1000:  # If > 1000, likely in millions
            return num / 1000.0
        else:
            return num

    except ValueError:
        return None


def detect_sheet_and_columns(excel_file):
    """Detect the correct sheet and column names in INVERCO Excel file"""
    print(f"📊 Analyzing Excel file structure: {excel_file}")

    try:
        # Read all sheet names
        xls = pd.ExcelFile(excel_file)
        sheet_names = xls.sheet_names

        print(f"  Sheets found: {sheet_names}")

        # Common sheet names for SGIIC data
        possible_sheets = [
            'SGIICs', 'Gestoras', 'SGIIC', 'Sociedades Gestoras',
            'Patrimonio', 'Assets', 'AUM', 'Datos'
        ]

        # Find the right sheet
        target_sheet = None
        for possible in possible_sheets:
            for actual in sheet_names:
                if possible.lower() in actual.lower():
                    target_sheet = actual
                    break
            if target_sheet:
                break

        # Default to first sheet if not found
        if not target_sheet:
            target_sheet = sheet_names[0]
            print(f"  ⚠️  No typical sheet found, using first sheet: {target_sheet}")
        else:
            print(f"  ✓ Using sheet: {target_sheet}")

        # Read the sheet
        df = pd.read_excel(excel_file, sheet_name=target_sheet)

        print(f"  Columns found: {list(df.columns)}")

        # Detect name column
        name_col = None
        for col in df.columns:
            col_lower = str(col).lower()
            if any(keyword in col_lower for keyword in ['nombre', 'name', 'gestora', 'sgiic', 'entidad']):
                name_col = col
                break

        # Detect AUM column
        aum_col = None
        for col in df.columns:
            col_lower = str(col).lower()
            if any(keyword in col_lower for keyword in ['patrimonio', 'aum', 'activos', 'assets', 'total']):
                aum_col = col
                break

        if not name_col or not aum_col:
            print(f"  ❌ Could not auto-detect columns")
            print(f"     Name column: {name_col}")
            print(f"     AUM column: {aum_col}")
            print(f"\n  Please specify columns manually using --name-col and --aum-col")
            return None, None, None

        print(f"  ✓ Name column: {name_col}")
        print(f"  ✓ AUM column: {aum_col}")

        return target_sheet, name_col, aum_col

    except Exception as e:
        print(f"  ❌ Error analyzing file: {e}")
        return None, None, None


def parse_inverco_excel(excel_file, sheet_name=None, name_col=None, aum_col=None, date_str=None):
    """Parse INVERCO Excel file and extract AUM data"""
    print(f"\n🇪🇸 Parsing INVERCO Excel file...")
    print(f"  File: {excel_file}")

    # Auto-detect sheet and columns if not provided
    if not sheet_name or not name_col or not aum_col:
        detected_sheet, detected_name, detected_aum = detect_sheet_and_columns(excel_file)

        sheet_name = sheet_name or detected_sheet
        name_col = name_col or detected_name
        aum_col = aum_col or detected_aum

        if not sheet_name or not name_col or not aum_col:
            print("❌ Failed to detect Excel structure")
            return []

    # Read the Excel file
    print(f"\n📖 Reading data...")
    try:
        df = pd.read_excel(excel_file, sheet_name=sheet_name)
    except Exception as e:
        print(f"❌ Error reading Excel: {e}")
        return []

    print(f"  ✓ Loaded {len(df)} rows")

    # Extract AUM data
    aum_data = []
    skipped = 0

    for idx, row in df.iterrows():
        name = clean_company_name(row.get(name_col))
        aum = parse_aum_value(row.get(aum_col))

        if not name or not aum or aum <= 0:
            skipped += 1
            continue

        aum_entry = {
            'name': name,
            'aum': round(aum, 2),  # Bn€
            'source': 'INVERCO',
            'date': date_str or datetime.now().strftime('%Y-%m-%d'),
            'row_index': idx
        }

        aum_data.append(aum_entry)

    print(f"  ✓ Extracted {len(aum_data)} companies with AUM")
    print(f"  ⚠️  Skipped {skipped} rows (missing name or AUM)")

    # Sort by AUM descending
    aum_data.sort(key=lambda x: x['aum'], reverse=True)

    return aum_data


def save_aum_data(aum_data, output_file):
    """Save AUM data to JSON file"""
    print(f"\n💾 Saving AUM data...")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(aum_data, f, indent=2, ensure_ascii=False)

    print(f"  ✓ Saved to: {output_file}")


def print_summary(aum_data):
    """Print summary statistics"""
    print("\n" + "="*70)
    print("📊 INVERCO AUM SUMMARY")
    print("="*70)

    total_companies = len(aum_data)
    total_aum = sum(item['aum'] for item in aum_data)

    print(f"\nTotal companies: {total_companies}")
    print(f"Total AUM: {total_aum:.2f} Bn€")

    if total_companies > 0:
        avg_aum = total_aum / total_companies
        print(f"Average AUM: {avg_aum:.2f} Bn€")

    # Tier classification
    tier1 = [item for item in aum_data if item['aum'] >= 1.0]
    tier2 = [item for item in aum_data if 0.5 <= item['aum'] < 1.0]
    tier3 = [item for item in aum_data if item['aum'] < 0.5]

    print(f"\nTier 1 (≥ 1 Bn€): {len(tier1)} companies")
    print(f"Tier 2 (≥ 500 M€): {len(tier2)} companies")
    print(f"Tier 3 (< 500 M€): {len(tier3)} companies")

    # Top 20
    print("\n🏆 Top 20 by AUM:")
    print("")
    for idx, item in enumerate(aum_data[:20], 1):
        tier = 'Tier 1' if item['aum'] >= 1.0 else 'Tier 2' if item['aum'] >= 0.5 else 'Tier 3'
        print(f"  {str(idx).rjust(2)}. {item['name'][:50].ljust(50)} {str(item['aum']).rjust(8)} Bn€  [{tier}]")

    print("\n" + "="*70)


def main():
    """Main parsing function"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Parse INVERCO Excel files to extract SGIIC AUM data',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-detect structure
  python3 parse_inverco_excel.py inverco_2024_12.xlsx

  # Specify sheet and columns
  python3 parse_inverco_excel.py inverco.xlsx --sheet "SGIICs" --name-col "Nombre" --aum-col "Patrimonio"

  # With date
  python3 parse_inverco_excel.py inverco.xlsx --date "2024-12-31"

Download files from:
  https://www.inverco.es/archivosdb/
        """
    )

    parser.add_argument('excel_file', help='Path to INVERCO Excel file')
    parser.add_argument('--sheet', help='Sheet name (auto-detected if not provided)')
    parser.add_argument('--name-col', help='Column name for company names')
    parser.add_argument('--aum-col', help='Column name for AUM values')
    parser.add_argument('--date', help='Reference date (YYYY-MM-DD)', default=None)
    parser.add_argument('--output', help='Output JSON file', default=str(OUTPUT_FILE))

    args = parser.parse_args()

    # Check if file exists
    excel_path = Path(args.excel_file)
    if not excel_path.exists():
        print(f"❌ Error: File not found: {args.excel_file}")
        return 1

    # Parse the Excel file
    aum_data = parse_inverco_excel(
        excel_file=args.excel_file,
        sheet_name=args.sheet,
        name_col=args.name_col,
        aum_col=args.aum_col,
        date_str=args.date
    )

    if not aum_data:
        print("\n❌ No AUM data extracted")
        return 1

    # Save data
    save_aum_data(aum_data, args.output)

    # Print summary
    print_summary(aum_data)

    print("\n✅ INVERCO parsing completed successfully!")
    print(f"\n📝 Next steps:")
    print(f"  1. Review: {args.output}")
    print(f"  2. Run enrichment: python3 scripts/cnmv/enrich_cnmv_with_aum.py")
    print(f"  3. Or run full import: ./scripts/cnmv/import_cnmv.sh")

    return 0


if __name__ == '__main__':
    sys.exit(main())
