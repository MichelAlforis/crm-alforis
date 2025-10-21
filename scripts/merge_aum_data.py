#!/usr/bin/env python3
"""
Récupération et fusion des données AUM depuis les archives
"""
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
CURRENT_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
ARCHIVE_FILE = BASE_DIR / "data/csv_archives/SDG_677_FINAL_V2_AVEC_AUM.csv"
OUTPUT_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL_WITH_AUM.csv"

print("="*70)
print("💰 RÉCUPÉRATION DONNÉES AUM")
print("="*70)
print()

# Load archive with AUM
print(f"📂 Chargement archive: {ARCHIVE_FILE.name}")
aum_data = {}
with open(ARCHIVE_FILE, 'r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row.get('name', '').strip().upper()
        aum = row.get('aum', '').strip()
        aum_date = row.get('aum_date', '').strip()
        aum_source = row.get('aum_source', '').strip()
        tier = row.get('tier', '').strip()

        if aum:
            aum_data[name] = {
                'aum': aum,
                'aum_date': aum_date,
                'aum_source': aum_source,
                'tier': tier
            }

print(f"✅ {len(aum_data)} organisations avec AUM dans l'archive")

# Load current file
print(f"\n📂 Chargement fichier actuel: {CURRENT_FILE.name}")
with open(CURRENT_FILE, 'r', encoding='utf-8') as f:
    current_data = list(csv.DictReader(f))

print(f"✅ {len(current_data)} organisations actuelles")

# Merge AUM data
print(f"\n🔄 Fusion des données AUM...")
merged = 0
already_had = 0
not_found = 0

for org in current_data:
    name = org.get('name', '').strip().upper()

    # Check if already has AUM
    if org.get('aum', '').strip():
        already_had += 1
        continue

    # Try to find AUM in archive
    if name in aum_data:
        org['aum'] = aum_data[name]['aum']
        org['aum_date'] = aum_data[name]['aum_date']

        # Add tier and source to notes if not exists
        if 'tier' not in org:
            org['tier'] = aum_data[name]['tier']
        if 'aum_source' not in org:
            org['aum_source'] = aum_data[name]['aum_source']

        merged += 1
    else:
        not_found += 1

print(f"✅ {merged} AUM fusionnés")
print(f"ℹ️  {already_had} organisations avaient déjà un AUM")
print(f"❌ {not_found} organisations sans AUM trouvé")

# Save
print(f"\n💾 Sauvegarde: {OUTPUT_FILE.name}")

# Ensure all fieldnames
all_fields = set()
for org in current_data:
    all_fields.update(org.keys())

fieldnames = ['name', 'type', 'category', 'email', 'phone', 'website',
              'address', 'city', 'postal_code', 'country', 'country_code',
              'language', 'aum', 'aum_date', 'aum_source', 'tier',
              'pipeline_stage', 'notes', 'is_active']

# Add any extra fields
for field in all_fields:
    if field not in fieldnames:
        fieldnames.append(field)

with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(current_data)

print(f"✅ {len(current_data)} organisations sauvegardées")

# Stats
print("\n" + "="*70)
print("📊 RÉSULTATS")
print("="*70)

total_with_aum = sum(1 for o in current_data if o.get('aum', '').strip())
print(f"\n💰 Total avec AUM: {total_with_aum} ({total_with_aum*100//len(current_data)}%)")
print(f"❌ Sans AUM: {len(current_data)-total_with_aum} ({(len(current_data)-total_with_aum)*100//len(current_data)}%)")

# AUM distribution
aum_values = []
for o in current_data:
    aum_str = o.get('aum', '').strip()
    if aum_str:
        try:
            aum_values.append(float(aum_str))
        except:
            pass

if aum_values:
    aum_values.sort(reverse=True)
    print(f"\n📈 Top 5 AUM (Md€):")
    for i, aum in enumerate(aum_values[:5], 1):
        # Find org name
        org_name = next((o['name'] for o in current_data if o.get('aum', '').strip() and float(o.get('aum', '0')) == aum), 'N/A')
        print(f"   {i}. {org_name}: {aum:.1f} Md€")

print(f"\n📁 Fichier final: {OUTPUT_FILE.name}")
