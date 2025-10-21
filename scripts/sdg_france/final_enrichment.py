#!/usr/bin/env python3
"""
Enrichissement FINAL SDG France
1. Fusion AMF (téléphones + sites officiels)
2. Scraping mentions légales (adresses + villes)
3. Complétion emails via cache Google
"""

import pandas as pd
import json
import requests
import re
import time
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse

BASE_DIR = Path(__file__).parent.parent.parent

# Fichiers
AMF_FILE = BASE_DIR / "data/amf_sgp_official.csv"
INPUT_CSV = BASE_DIR / "SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv"
CACHE_GOOGLE = BASE_DIR / "data/sdg_france/selenium_cache.json"
OUTPUT_CSV = BASE_DIR / "SDG_FRANCE_FINAL_COMPLETE.csv"
CACHE_MENTIONS = BASE_DIR / "data/sdg_france/mentions_legales_cache.json"

def load_cache(cache_file):
    """Charge un cache JSON"""
    if cache_file.exists():
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_cache(cache_file, cache):
    """Sauvegarde un cache JSON"""
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_file, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def extract_address_from_text(text):
    """Extrait adresse et ville depuis texte de mentions légales"""
    result = {'address': '', 'city': '', 'postal_code': ''}

    # Patterns pour adresses françaises
    # Format: "X rue/avenue/boulevard ..., XXXXX Ville"
    patterns = [
        r'(?:Siège social|Adresse|Siege|Address)[\s:]*([0-9]+[^,\n]+),?\s*([0-9]{5})\s+([A-Z][a-zéèêàâ\-\s]+)',
        r'([0-9]+\s+(?:rue|avenue|boulevard|place|allée|impasse|chemin)[^,\n]+),?\s*([0-9]{5})\s+([A-Z][a-zéèêàâ\-\s]+)',
        r'([0-9]+[^,\n]{10,80}),?\s*([0-9]{5})\s+([A-Z][a-zéèêàâ\-\s]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result['address'] = match.group(1).strip()
            result['postal_code'] = match.group(2).strip()
            result['city'] = match.group(3).strip()
            return result

    # Essayer de trouver juste ville + code postal
    match = re.search(r'([0-9]{5})\s+([A-Z][a-zéèêàâ\-\s]+)', text)
    if match:
        result['postal_code'] = match.group(1).strip()
        result['city'] = match.group(2).strip()

    return result

def scrape_mentions_legales(website):
    """Scrape la page mentions légales pour trouver l'adresse"""
    if not website:
        return None

    try:
        # Nettoyer l'URL
        if not website.startswith('http'):
            website = 'https://' + website

        # URLs possibles pour mentions légales
        mentions_urls = [
            '/mentions-legales',
            '/mentions-legales/',
            '/mentions',
            '/legal',
            '/legal-notice',
            '/a-propos',
            '/about',
            '/contact'
        ]

        # Essayer la page d'accueil d'abord
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }

        for url_suffix in [''] + mentions_urls:
            try:
                url = urljoin(website, url_suffix)
                response = requests.get(url, headers=headers, timeout=10)

                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, 'html.parser')

                    # Chercher dans le texte
                    text = soup.get_text()

                    # Extraire adresse
                    address_data = extract_address_from_text(text)

                    if address_data['address'] or address_data['city']:
                        return address_data

                time.sleep(0.5)  # Rate limiting
            except:
                continue

        return None

    except Exception as e:
        return None

def main():
    print("🔍 ENRICHISSEMENT FINAL SDG FRANCE")
    print("=" * 70)
    print()

    # 1. Charger les données
    print("📥 Chargement des données...")
    df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')
    df_amf = pd.read_csv(AMF_FILE, sep=';', encoding='utf-8-sig')
    cache_google = load_cache(CACHE_GOOGLE)
    cache_mentions = load_cache(CACHE_MENTIONS)

    print(f"   ✓ {len(df)} sociétés dans CSV")
    print(f"   ✓ {len(df_amf)} entrées AMF")
    print(f"   ✓ {len(cache_google)} dans cache Google")
    print(f"   ✓ {len(cache_mentions)} dans cache mentions légales")
    print()

    # 2. Fusionner avec AMF
    print("🔗 Fusion avec données AMF...")
    df_amf_uniq = df_amf.drop_duplicates(subset=['entite_nom'])
    amf_dict = df_amf_uniq.set_index('entite_nom').to_dict('index')

    enriched_amf = 0
    for idx, row in df.iterrows():
        company_name = row['name']

        if company_name in amf_dict:
            amf_data = amf_dict[company_name]

            # Téléphone AMF
            if pd.notna(amf_data.get('telephone')) and amf_data['telephone']:
                if pd.isna(df.at[idx, 'phone']) or df.at[idx, 'phone'] == '':
                    df.at[idx, 'phone'] = amf_data['telephone']
                    enriched_amf += 1

            # Site web AMF
            if pd.notna(amf_data.get('site_internet')) and amf_data['site_internet']:
                if pd.isna(df.at[idx, 'website']) or df.at[idx, 'website'] == '':
                    df.at[idx, 'website'] = amf_data['site_internet']

    print(f"   ✓ {enriched_amf} enrichissements depuis AMF")
    print()

    # 3. Compléter avec cache Google
    print("📧 Complétion avec cache Google...")
    enriched_google = 0
    for idx, row in df.iterrows():
        company_name = row['name']

        if company_name in cache_google:
            google_data = cache_google[company_name]

            if google_data.get('email') and (pd.isna(df.at[idx, 'email']) or df.at[idx, 'email'] == ''):
                df.at[idx, 'email'] = google_data['email']
                enriched_google += 1

            if google_data.get('phone') and (pd.isna(df.at[idx, 'phone']) or df.at[idx, 'phone'] == ''):
                df.at[idx, 'phone'] = google_data['phone']
                enriched_google += 1

    print(f"   ✓ {enriched_google} enrichissements depuis Google")
    print()

    # 4. Scraper mentions légales pour adresses
    print("🏢 Scraping mentions légales pour adresses...")
    print("   (Uniquement sociétés sans adresse)")
    print()

    to_scrape = df[(df['address'].isna()) | (df['address'] == '')]
    scraped = 0

    for idx, row in to_scrape.iterrows():
        company_name = row['name']
        website = row.get('website')

        if not website or pd.isna(website) or website == '':
            continue

        # Vérifier cache
        if company_name in cache_mentions:
            data = cache_mentions[company_name]
        else:
            print(f"   [{scraped+1}] {company_name[:50]}")
            data = scrape_mentions_legales(website)
            cache_mentions[company_name] = data if data else {}

            if data and data.get('address'):
                print(f"      ✓ {data['address']}, {data.get('postal_code', '')} {data.get('city', '')}")
            else:
                print(f"      ❌ Non trouvé")

            # Sauvegarder cache tous les 10
            if (scraped + 1) % 10 == 0:
                save_cache(CACHE_MENTIONS, cache_mentions)

            time.sleep(2)  # Rate limiting

        # Appliquer les données
        if data:
            if data.get('address'):
                df.at[idx, 'address'] = data['address']
            if data.get('city'):
                df.at[idx, 'city'] = data['city']
            if data.get('postal_code'):
                df.at[idx, 'postal_code'] = data['postal_code']

        scraped += 1

        # Limiter à 100 pour ne pas bloquer
        if scraped >= 100:
            print(f"\n   ⚠️  Limite de 100 atteinte, arrêt du scraping")
            break

    save_cache(CACHE_MENTIONS, cache_mentions)
    print()

    # 5. Sauvegarder le résultat final
    print("💾 Sauvegarde du résultat final...")
    df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')

    # Statistiques finales
    print()
    print("=" * 70)
    print("📊 RÉSULTAT FINAL")
    print("=" * 70)
    print(f"Total: {len(df)} sociétés")
    print()
    print(f"✅ Emails:     {(df['email'].notna() & (df['email'] != '')).sum():>3} / {len(df)} ({(df['email'].notna() & (df['email'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"✅ Téléphones: {(df['phone'].notna() & (df['phone'] != '')).sum():>3} / {len(df)} ({(df['phone'].notna() & (df['phone'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"✅ Sites web:  {(df['website'].notna() & (df['website'] != '')).sum():>3} / {len(df)} ({(df['website'].notna() & (df['website'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"✅ Adresses:   {(df['address'].notna() & (df['address'] != '')).sum():>3} / {len(df)} ({(df['address'].notna() & (df['address'] != '')).sum()/len(df)*100:.1f}%)")
    print(f"✅ Villes:     {(df['city'].notna() & (df['city'] != '')).sum():>3} / {len(df)} ({(df['city'].notna() & (df['city'] != '')).sum()/len(df)*100:.1f}%)")
    print()
    print(f"💾 Fichier: {OUTPUT_CSV.name}")
    print("=" * 70)

if __name__ == '__main__':
    main()
