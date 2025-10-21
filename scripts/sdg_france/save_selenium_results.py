#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sauvegarde les résultats du scraping Selenium dans le CSV final
"""

import json
import pandas as pd
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent.parent
CACHE_FILE = BASE_DIR / 'data' / 'sdg_france' / 'selenium_cache.json'
CSV_FILE = BASE_DIR / 'SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv'
BACKUP_DIR = BASE_DIR / 'data' / 'sdg_france' / 'backups'
BACKUP_DIR.mkdir(parents=True, exist_ok=True)

def main():
    print("💾 Sauvegarde des résultats Selenium...\n")

    # Vérifier que le cache existe
    if not CACHE_FILE.exists():
        print("❌ Fichier cache introuvable!")
        return

    # Charger le cache
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)

    print(f"📦 {len(cache)} entrées dans le cache")

    # Charger le CSV
    df = pd.read_csv(CSV_FILE)
    print(f"📊 {len(df)} organisations dans le CSV")

    # Backup du CSV actuel
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = BACKUP_DIR / f'SDG_FRANCE_backup_{timestamp}.csv'
    df.to_csv(backup_file, index=False, encoding='utf-8-sig')
    print(f"💾 Backup créé: {backup_file.name}")

    # Enrichir avec les données du cache
    enriched_count = 0

    for idx, row in df.iterrows():
        company_name = row['name']

        if company_name in cache:
            data = cache[company_name]
            modified = False

            # Email
            if data.get('email') and (pd.isna(row['email']) or row['email'] == ''):
                df.at[idx, 'email'] = data['email']
                modified = True

            # Phone
            if data.get('phone') and (pd.isna(row['phone']) or row['phone'] == ''):
                df.at[idx, 'phone'] = data['phone']
                modified = True

            # Website
            if data.get('website') and (pd.isna(row['website']) or row['website'] == ''):
                df.at[idx, 'website'] = data['website']
                modified = True

            if modified:
                enriched_count += 1

    # Sauvegarder le CSV enrichi
    df.to_csv(CSV_FILE, index=False, encoding='utf-8-sig')

    # Statistiques
    print(f"\n✅ {enriched_count} organisations enrichies\n")
    print("📊 STATISTIQUES:")
    print(f"  • Avec email: {(df['email'].notna() & (df['email'] != '')).sum()} / {len(df)} ({(df['email'].notna() & (df['email'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"  • Avec téléphone: {(df['phone'].notna() & (df['phone'] != '')).sum()} / {len(df)} ({(df['phone'].notna() & (df['phone'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"  • Avec site web: {(df['website'].notna() & (df['website'] != '')).sum()} / {len(df)} ({(df['website'].notna() & (df['website'] != '')).sum()/len(df)*100:.1f}%)")

    print(f"\n✅ CSV mis à jour: {CSV_FILE.name}")

if __name__ == '__main__':
    main()
