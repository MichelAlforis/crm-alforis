#!/usr/bin/env python3
"""
Enrichissement des SDG françaises avec Pappers.fr
Récupère: adresse, ville, site web depuis la base Pappers (gratuit)
"""

import pandas as pd
import requests
import time
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv"
OUTPUT_CSV = BASE_DIR / "SDG_FRANCE_COMPLETE_WITH_ADDRESSES.csv"
CACHE_FILE = BASE_DIR / "data/sdg_france/pappers_cache.json"

# Pappers API (gratuit, 100 requêtes/mois)
PAPPERS_API_KEY = "votre_clé_api"  # À remplacer si vous avez une clé

def search_company_pappers(company_name):
    """Cherche une entreprise sur Pappers (gratuit, pas de clé nécessaire pour recherche basique)"""
    try:
        # Utiliser l'API publique de Pappers (pas d'auth pour recherche basique)
        url = f"https://suggestions.pappers.fr/v2?q={company_name}&cibles=nom_entreprise"

        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()

            if data.get('resultats_nom_entreprise'):
                # Prendre le premier résultat
                result = data['resultats_nom_entreprise'][0]

                return {
                    'website': result.get('site_internet', ''),
                    'address': result.get('siege', {}).get('adresse_ligne_1', ''),
                    'city': result.get('siege', {}).get('ville', ''),
                    'postal_code': result.get('siege', {}).get('code_postal', '')
                }

        return None
    except Exception as e:
        print(f"   ⚠️  Error: {e}")
        return None

def main():
    print("🔍 ENRICHISSEMENT PAPPERS - SDG FRANCE")
    print("=" * 70)
    print()

    # Charger le CSV
    df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
    print(f"📊 {len(df)} sociétés chargées")

    # Charger le cache
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            cache = json.load(f)
        print(f"💾 Cache chargé: {len(cache)} entrées")
    else:
        cache = {}

    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Enrichir
    enriched = 0
    for idx, row in df.iterrows():
        company_name = row['name']

        # Skip si déjà toutes les données
        if (pd.notna(row.get('address')) and row.get('address') != '' and
            pd.notna(row.get('city')) and row.get('city') != '' and
            pd.notna(row.get('website')) and row.get('website') != ''):
            continue

        # Chercher dans le cache
        if company_name in cache:
            data = cache[company_name]
        else:
            print(f"\n[{idx+1}/{len(df)}] {company_name}")
            data = search_company_pappers(company_name)

            if data:
                cache[company_name] = data
                print(f"   ✓ Adresse: {data.get('address', '')}")
                print(f"   ✓ Ville: {data.get('city', '')}")
                print(f"   ✓ Site: {data.get('website', '')}")
            else:
                cache[company_name] = {}
                print(f"   ❌ Non trouvé")

            # Sauvegarder le cache tous les 10
            if (idx + 1) % 10 == 0:
                with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                    json.dump(cache, f, indent=2, ensure_ascii=False)

            time.sleep(2)  # Rate limiting

        # Enrichir les données
        if data:
            if not pd.notna(df.at[idx, 'address']) or df.at[idx, 'address'] == '':
                if data.get('address'):
                    df.at[idx, 'address'] = data['address']
                    enriched += 1

            if not pd.notna(df.at[idx, 'city']) or df.at[idx, 'city'] == '':
                if data.get('city'):
                    df.at[idx, 'city'] = data['city']

            if not pd.notna(df.at[idx, 'website']) or df.at[idx, 'website'] == '':
                if data.get('website'):
                    df.at[idx, 'website'] = data['website']

    # Sauvegarder le cache final
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    # Sauvegarder le CSV
    df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')

    # Statistiques
    print("\n" + "=" * 70)
    print("📊 RÉSULTATS")
    print("=" * 70)
    print(f"✓ {enriched} sociétés enrichies")
    print(f"🌐 Sites web: {(df['website'].notna() & (df['website'] != '')).sum()}/{len(df)}")
    print(f"📍 Adresses: {(df['address'].notna() & (df['address'] != '')).sum()}/{len(df)}")
    print(f"🏙️  Villes: {(df['city'].notna() & (df['city'] != '')).sum()}/{len(df)}")
    print(f"\n💾 Fichier: {OUTPUT_CSV.name}")

if __name__ == '__main__':
    main()
