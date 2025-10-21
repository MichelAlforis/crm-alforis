#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enrichissement des sites web manquants pour les SDG françaises via recherche Google
"""

import pandas as pd
import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_DIR = Path(__file__).parent.parent

def setup_driver():
    """Configure le driver Selenium"""
    chrome_options = Options()
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--lang=fr-FR')
    chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

    driver = webdriver.Chrome(options=chrome_options)
    return driver

def search_website_google(driver, company_name):
    """Recherche le site web d'une entreprise via Google"""
    try:
        query = f"{company_name} société de gestion site officiel"
        url = f"https://www.google.com/search?q={query.replace(' ', '+')}"

        driver.get(url)
        time.sleep(2)

        # Chercher le premier résultat organique
        results = driver.find_elements(By.CSS_SELECTOR, 'div.g a')

        for result in results[:3]:  # Top 3 résultats
            href = result.get_attribute('href')
            if href and href.startswith('http'):
                # Exclure les sites non pertinents
                excluded = ['linkedin.com', 'wikipedia.org', 'societe.com', 'pappers.fr',
                           'infogreffe.fr', 'verif.com', 'manageo.fr', 'google.com']

                if not any(exc in href for exc in excluded):
                    return href

        return None

    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def main():
    print("🔍 Enrichissement des sites web manquants\n")

    # Charger le CSV
    csv_file = BASE_DIR / 'SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv'
    df = pd.read_csv(csv_file)

    print(f"📊 {len(df)} organisations chargées")

    # Corriger le champ country → FR
    print("\n🔧 Correction du champ 'country' → FR")
    df['country'] = 'FR'

    # Identifier les sites manquants
    missing_websites = df[(df['website'].isna()) | (df['website'] == '')]
    print(f"\n🌐 {len(missing_websites)} sites web manquants")

    if len(missing_websites) == 0:
        print("✅ Tous les sites web sont présents !")
        df.to_csv(csv_file, index=False, encoding='utf-8-sig')
        return

    # Charger le cache s'il existe
    cache_file = BASE_DIR / 'data' / 'sdg_france_website_cache.json'
    cache_file.parent.mkdir(exist_ok=True)

    if cache_file.exists():
        with open(cache_file, 'r', encoding='utf-8') as f:
            cache = json.load(f)
        print(f"📦 Cache chargé: {len(cache)} entrées")
    else:
        cache = {}

    # Lancer Selenium
    print("\n🚀 Démarrage de la recherche Google...\n")
    driver = setup_driver()

    enriched = 0
    errors = 0

    try:
        for idx, row in missing_websites.iterrows():
            company_name = row['name']

            # Vérifier le cache
            if company_name in cache:
                website = cache[company_name]
                if website:
                    df.at[idx, 'website'] = website
                    enriched += 1
                    print(f"✓ [{enriched}/{len(missing_websites)}] {company_name[:50]:<50} → {website} (cache)")
                continue

            print(f"🔍 [{enriched+1}/{len(missing_websites)}] {company_name[:50]:<50}", end=' → ')

            website = search_website_google(driver, company_name)

            if website:
                df.at[idx, 'website'] = website
                cache[company_name] = website
                enriched += 1
                print(f"✅ {website}")
            else:
                cache[company_name] = None
                errors += 1
                print("❌ Non trouvé")

            # Sauvegarder le cache tous les 10
            if (enriched + errors) % 10 == 0:
                with open(cache_file, 'w', encoding='utf-8') as f:
                    json.dump(cache, f, indent=2, ensure_ascii=False)

            time.sleep(3)  # Pause entre les requêtes

    except KeyboardInterrupt:
        print("\n\n⚠️  Interruption par l'utilisateur")
    finally:
        driver.quit()

        # Sauvegarder le cache final
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
        print(f"\n💾 Cache sauvegardé: {cache_file}")

    # Sauvegarder le CSV mis à jour
    df.to_csv(csv_file, index=False, encoding='utf-8-sig')

    print(f"\n📊 RÉSULTATS:")
    print(f"  ✅ {enriched} sites trouvés")
    print(f"  ❌ {errors} non trouvés")
    print(f"  📈 Taux de complétion: {(len(df) - (df['website'].isna() | (df['website'] == '')).sum()) / len(df) * 100:.1f}%")
    print(f"\n✅ Fichier mis à jour: {csv_file.name}")

if __name__ == '__main__':
    main()
