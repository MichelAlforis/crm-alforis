#!/usr/bin/env python3
"""
Script pour fusionner les meilleurs CSV SDG :
- SDG_677_CATEGORIZED.csv : catégories (Institution/Wholesale)
- SDG_677_FINAL_COMPLETE_WITH_AUM.csv : websites, AUM, notes
"""

import csv
import os

# Chemins
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_CATEGORIES = os.path.join(BASE_DIR, "SDG_677_CATEGORIZED.csv")
CSV_COMPLETE = os.path.join(BASE_DIR, "data/csv_archives/SDG_677_FINAL_COMPLETE_WITH_AUM.csv")
OUTPUT_CSV = os.path.join(BASE_DIR, "SDG_677_FINAL_MERGED.csv")

print(f"📂 Lecture des fichiers...")
print(f"   - Catégories : {CSV_CATEGORIES}")
print(f"   - Complet    : {CSV_COMPLETE}")

# Lire le CSV avec catégories
categories_map = {}
with open(CSV_CATEGORIES, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('name', '').strip().upper()
        category = row.get('category', '').strip()
        if name and category:
            categories_map[name] = category

print(f"✅ {len(categories_map)} catégories chargées")

# Lire le CSV complet et fusionner
merged_data = []
with open(CSV_COMPLETE, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        name = row.get('name', '').strip()
        name_upper = name.upper()

        # Ajouter la catégorie depuis l'autre CSV
        if name_upper in categories_map:
            row['category'] = categories_map[name_upper]

        merged_data.append(row)

print(f"✅ {len(merged_data)} organisations fusionnées")

# Écrire le CSV fusionné
fieldnames = [
    'name', 'email', 'phone', 'website', 'address', 'city',
    'country', 'country_code', 'category', 'type', 'notes',
    'aum', 'aum_date', 'tier', 'pipeline_stage', 'priority', 'aum_source'
]

with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(merged_data)

print(f"✅ Fichier fusionné créé : {OUTPUT_CSV}")
print()
print("📊 Statistiques :")

# Stats
count_with_category = sum(1 for row in merged_data if row.get('category'))
count_with_website = sum(1 for row in merged_data if row.get('website'))
count_with_phone = sum(1 for row in merged_data if row.get('phone'))
count_with_aum = sum(1 for row in merged_data if row.get('aum'))

print(f"   - Catégories : {count_with_category}/{len(merged_data)}")
print(f"   - Websites   : {count_with_website}/{len(merged_data)}")
print(f"   - Phones     : {count_with_phone}/{len(merged_data)}")
print(f"   - AUM        : {count_with_aum}/{len(merged_data)}")
print()
print("🚀 Prêt pour l'import !")
