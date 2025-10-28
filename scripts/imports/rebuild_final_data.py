#!/usr/bin/env python3
"""
Reconstruction des fichiers finaux depuis sources + caches
"""

import pandas as pd
import json

print("="*70)
print("  RECONSTRUCTION DES DONNÉES FINALES")
print("="*70)

# ============================================================
# LUXEMBOURG
# ============================================================
print("\n🇱🇺 LUXEMBOURG...")

# Charger base
lux = pd.read_csv('LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv', encoding='utf-8-sig')

# Charger cache selenium
with open('data/cssf/selenium_cache.json', 'r') as f:
    lux_cache = json.load(f)

# Merger
for idx, row in lux.iterrows():
    name = row['name']
    if name in lux_cache:
        data = lux_cache[name]
        if data.get('email'):
            lux.at[idx, 'email'] = data['email']
        if data.get('phone'):
            lux.at[idx, 'phone'] = data['phone']
        if data.get('address'):
            lux.at[idx, 'address'] = data['address']

lux.to_csv('LUXEMBOURG_COMPLETE.csv', index=False, encoding='utf-8-sig')
print(f"   ✅ {len(lux)} sociétés")
print(f"   ✉️  Emails: {lux['email'].notna().sum()}/{len(lux)}")
print(f"   📞 Phones: {lux['phone'].notna().sum()}/{len(lux)}")
print(f"   📍 Adresses: {lux['address'].notna().sum()}/{len(lux)}")

# ============================================================
# FRANCE (SDG)
# ============================================================
print("\n🇫🇷 FRANCE (SDG)...")

# Charger base
sdg = pd.read_csv('SDG_677_IMPORT_FINAL.csv', encoding='utf-8-sig')

# Ajouter postal_code si manquant
if 'postal_code' not in sdg.columns:
    sdg['postal_code'] = ''

# 1. Charger selenium cache (PAR NOM)
with open('data/sdg_france/selenium_cache.json', 'r') as f:
    selenium_cache = json.load(f)

print(f"   📦 {len(selenium_cache)} sociétés dans selenium cache")

for idx, row in sdg.iterrows():
    name = row['name']
    if name in selenium_cache:
        data = selenium_cache[name]
        if data.get('email') and (pd.isna(row.get('email')) or not row.get('email')):
            sdg.at[idx, 'email'] = data['email']
        if data.get('phone') and (pd.isna(row.get('phone')) or not row.get('phone')):
            sdg.at[idx, 'phone'] = data['phone']

# 2. Charger website caches (PAR WEBSITE)
website_caches = [
    'data/sdg_france/fast_enrichment_cache.json',
    'data/sdg_france/mentions_legales_cache.json'
]
for cache_file in website_caches:
    try:
        with open(cache_file, 'r') as f:
            cache = json.load(f)
            print(f"   📦 {len(cache)} sites dans {cache_file.split('/')[-1]}")

            for idx, row in sdg.iterrows():
                website = row.get('website')
                if pd.notna(website) and website in cache:
                    data = cache[website]
                    if data.get('email') and (pd.isna(sdg.at[idx, 'email']) or not sdg.at[idx, 'email']):
                        sdg.at[idx, 'email'] = data['email']
                    if data.get('phone') and (pd.isna(sdg.at[idx, 'phone']) or not sdg.at[idx, 'phone']):
                        sdg.at[idx, 'phone'] = data['phone']
                    if data.get('address') and (pd.isna(sdg.at[idx, 'address']) or not sdg.at[idx, 'address']):
                        sdg.at[idx, 'address'] = data['address']
                        sdg.at[idx, 'postal_code'] = data.get('postal_code', '')
                        sdg.at[idx, 'city'] = data.get('city', '')
    except:
        pass

# Ajouter country
sdg['country'] = 'France'
sdg['country_code'] = 'FR'

sdg.to_csv('SDG_FRANCE_COMPLETE.csv', index=False, encoding='utf-8-sig')
print(f"   ✅ {len(sdg)} sociétés")
print(f"   ✉️  Emails: {sdg['email'].notna().sum()}/{len(sdg)}")
print(f"   📞 Phones: {sdg['phone'].notna().sum()}/{len(sdg)}")
print(f"   📍 Adresses: {sdg['address'].notna().sum()}/{len(sdg)}")
print(f"   🏙️  Villes: {sdg['city'].notna().sum()}/{len(sdg)}")

print("\n" + "="*70)
print("✅ RECONSTRUCTION TERMINÉE")
print("="*70)
print("\n📄 Fichiers créés:")
print("   - LUXEMBOURG_COMPLETE.csv")
print("   - SDG_FRANCE_COMPLETE.csv")
print("\n✅ Prêt pour import CRM!")
