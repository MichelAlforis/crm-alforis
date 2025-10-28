#!/usr/bin/env python3
"""
Fusion complète des données AUM depuis toutes les sources
"""
import csv
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
CURRENT_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
ARCHIVE_V2 = BASE_DIR / "data/csv_archives/SDG_677_FINAL_V2_AVEC_AUM.csv"
OUTPUT_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL_WITH_AUM.csv"

print("="*70)
print("💰 FUSION COMPLÈTE DONNÉES AUM")
print("="*70)
print()

# Load V2 archive (most complete for AUM)
print(f"📂 Chargement archive V2: {ARCHIVE_V2.name}")
archive_data = {}
with open(ARCHIVE_V2, 'r', encoding='utf-8') as f:
    for row in csv.DictReader(f):
        name = row.get('name', '').strip()
        archive_data[name.upper()] = row

print(f"✅ {len(archive_data)} organisations dans archive V2")

# Load current file
print(f"\n📂 Chargement fichier actuel: {CURRENT_FILE.name}")
with open(CURRENT_FILE, 'r', encoding='utf-8') as f:
    current_data = list(csv.DictReader(f))

print(f"✅ {len(current_data)} organisations actuelles")

# Merge data
print(f"\n🔄 Fusion des données...")
updated = 0
not_found = 0

for org in current_data:
    name = org.get('name', '').strip()
    name_upper = name.upper()

    # Try to find in archive
    if name_upper in archive_data:
        archive_org = archive_data[name_upper]

        # Update AUM if better in archive
        archive_aum = archive_org.get('aum', '').strip()
        current_aum = org.get('aum', '').strip()

        if archive_aum and not current_aum:
            org['aum'] = archive_aum
            org['aum_date'] = archive_org.get('aum_date', '').strip()
            updated += 1

        # Update other fields if empty
        if not org.get('website', '').strip() and archive_org.get('website', '').strip():
            org['website'] = archive_org.get('website', '').strip()

        if not org.get('phone', '').strip() and archive_org.get('phone', '').strip():
            org['phone'] = archive_org.get('phone', '').strip()

        if not org.get('email', '').strip() and archive_org.get('email', '').strip():
            org['email'] = archive_org.get('email', '').strip()

        # Add tier if exists in archive
        tier = archive_org.get('tier', '').strip()
        if tier and 'tier' not in org:
            org['tier'] = tier

print(f"✅ {updated} organisations mises à jour avec AUM")

# Ensure fieldnames
fieldnames = ['name', 'type', 'category', 'email', 'phone', 'website',
              'address', 'city', 'postal_code', 'country', 'country_code',
              'language', 'aum', 'aum_date', 'tier', 'pipeline_stage',
              'notes', 'is_active']

# Save
print(f"\n💾 Sauvegarde: {OUTPUT_FILE.name}")
with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
    writer.writeheader()
    writer.writerows(current_data)

print(f"✅ {len(current_data)} organisations sauvegardées")

# Final stats
print("\n" + "="*70)
print("📊 STATISTIQUES FINALES")
print("="*70)

total_with_aum = sum(1 for o in current_data if o.get('aum', '').strip())
with_website = sum(1 for o in current_data if o.get('website', '').strip())
with_email = sum(1 for o in current_data if o.get('email', '').strip())
with_phone = sum(1 for o in current_data if o.get('phone', '').strip())

print(f"\n💰 Avec AUM: {total_with_aum} ({total_with_aum*100//len(current_data)}%)")
print(f"🌐 Avec site web: {with_website} ({with_website*100//len(current_data)}%)")
print(f"📧 Avec email: {with_email} ({with_email*100//len(current_data)}%)")
print(f"📞 Avec téléphone: {with_phone} ({with_phone*100//len(current_data)}%)")

# AUM distribution by tier
tier_counts = {}
for o in current_data:
    tier = o.get('tier', 'No Tier').strip() or 'No Tier'
    tier_counts[tier] = tier_counts.get(tier, 0) + 1

if tier_counts:
    print(f"\n🎯 Distribution par Tier:")
    for tier in sorted(tier_counts.keys()):
        count = tier_counts[tier]
        print(f"   {tier}: {count} ({count*100//len(current_data)}%)")

# Top AUM
aum_list = []
for o in current_data:
    aum_str = o.get('aum', '').strip()
    if aum_str:
        try:
            aum_list.append((o['name'], float(aum_str)))
        except:
            pass

if aum_list:
    aum_list.sort(key=lambda x: x[1], reverse=True)
    print(f"\n📈 Top 10 AUM (Md€):")
    for i, (name, aum) in enumerate(aum_list[:10], 1):
        print(f"   {i:2d}. {name[:40]:40s} {aum:8.1f} Md€")

print(f"\n📁 Fichier final: {OUTPUT_FILE.name}")
print("\n" + "="*70)
