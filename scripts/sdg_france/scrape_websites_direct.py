#!/usr/bin/env python3
"""
Scrape direct depuis les sites web des SDG pour récupérer:
- Email (mentions légales, contact)
- Téléphone (mentions légales)
- Adresse complète (mentions légales - siège social)
- Ville + Code postal
"""

import pandas as pd
import json
import re
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from datetime import datetime

# Chemins
INPUT_CSV = 'SDG_FRANCE_FINAL_COMPLETE.csv'
OUTPUT_CSV = 'SDG_FRANCE_ENRICHED_FROM_WEBSITES.csv'
CACHE_FILE = 'data/sdg_france/website_scraping_cache.json'

class WebsiteScraper:
    def __init__(self):
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')
        chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        self.driver = webdriver.Chrome(options=chrome_options)
        self.cache = self.load_cache()

    def load_cache(self):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}

    def save_cache(self):
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, ensure_ascii=False, indent=2)

    def extract_email(self, text):
        """Extrait le premier email trouvé"""
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        if emails:
            # Éviter les emails génériques type webmaster@, noreply@
            for email in emails:
                if not any(word in email.lower() for word in ['noreply', 'webmaster', 'mailer-daemon']):
                    return email.lower()
        return None

    def extract_phone(self, text):
        """Extrait le téléphone français"""
        # Patterns français
        patterns = [
            r'\+33\s*[1-9](?:[\s.-]*\d{2}){4}',  # +33 1 23 45 67 89
            r'0[1-9](?:[\s.-]*\d{2}){4}',  # 01 23 45 67 89
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                phone = match.group(0)
                # Nettoyer et normaliser
                phone = re.sub(r'[\s.-]', '', phone)
                if phone.startswith('0') and len(phone) == 10:
                    phone = '+33' + phone[1:]
                return phone
        return None

    def extract_address(self, text):
        """Extrait l'adresse du siège social"""
        patterns = [
            # "Siège social : 123 rue de Paris, 75001 Paris"
            r'(?:Siège social|Adresse)[\s:]*([0-9]+[^,\n]+?),?\s*([0-9]{5})\s+([A-Z][a-zéèêàâôûîïäëüöç\-\s]+)',
            # "123 rue de Paris - 75001 Paris"
            r'([0-9]+\s+(?:rue|avenue|boulevard|allée|place|impasse)[^,\n]+?)[,\s-]+([0-9]{5})\s+([A-Z][a-zéèêàâôûîïäëüöç\-\s]+)',
            # Juste l'adresse avec code postal et ville
            r'([0-9]+[^0-9\n]+?)\s+([0-9]{5})\s+([A-Z][a-zéèêàâôûîïäëüöç\-\s]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                address = match.group(1).strip().strip(',')
                postal = match.group(2).strip()
                city = match.group(3).strip()
                return {
                    'address': address,
                    'postal_code': postal,
                    'city': city
                }
        return None

    def scrape_website(self, url, company_name):
        """Scrape un site web pour extraire toutes les infos"""
        print(f"\n🔍 Scraping: {company_name}")
        print(f"   URL: {url}")

        if url in self.cache:
            print(f"   ✅ Déjà en cache")
            return self.cache[url]

        result = {
            'email': None,
            'phone': None,
            'address': None,
            'postal_code': None,
            'city': None,
            'scraped_at': datetime.now().isoformat()
        }

        try:
            # Essayer la page d'accueil
            self.driver.get(url)
            time.sleep(2)

            # Chercher un lien "Mentions légales" ou "Contact"
            mentions_links = []
            try:
                # Chercher les liens possibles
                links = self.driver.find_elements(By.TAG_NAME, 'a')
                for link in links:
                    text = link.text.lower()
                    if any(word in text for word in ['mentions', 'légales', 'contact', 'informations']):
                        href = link.get_attribute('href')
                        if href and href.startswith('http'):
                            mentions_links.append(href)
            except:
                pass

            # Pages à scraper : accueil + mentions légales
            pages_to_scrape = [url] + mentions_links[:3]  # Max 3 pages supplémentaires

            all_text = ""
            for page_url in pages_to_scrape:
                try:
                    if page_url != url:
                        self.driver.get(page_url)
                        time.sleep(2)

                    # Récupérer le HTML
                    html = self.driver.page_source
                    soup = BeautifulSoup(html, 'html.parser')

                    # Nettoyer le texte
                    for script in soup(['script', 'style']):
                        script.decompose()

                    text = soup.get_text(separator=' ')
                    all_text += " " + text
                except:
                    continue

            # Extraire les données
            result['email'] = self.extract_email(all_text)
            result['phone'] = self.extract_phone(all_text)

            address_data = self.extract_address(all_text)
            if address_data:
                result.update(address_data)

            # Log des résultats
            found = []
            if result['email']: found.append(f"✉️ {result['email']}")
            if result['phone']: found.append(f"📞 {result['phone']}")
            if result['address']: found.append(f"📍 {result['address']}, {result['postal_code']} {result['city']}")

            if found:
                print(f"   ✅ Trouvé: {', '.join(found)}")
            else:
                print(f"   ⚠️ Rien trouvé")

        except Exception as e:
            print(f"   ❌ Erreur: {str(e)}")

        # Sauvegarder dans le cache
        self.cache[url] = result
        return result

    def enrich_data(self):
        """Enrichir toutes les sociétés qui ont un site web"""
        print("📊 Chargement des données...")
        df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')

        # Compteurs
        total_with_website = df['website'].notna().sum()
        processed = 0
        found_email = 0
        found_phone = 0
        found_address = 0

        print(f"\n🎯 {total_with_website} sociétés avec site web à enrichir")
        print(f"📦 {len(self.cache)} déjà en cache\n")

        for idx, row in df.iterrows():
            website = row.get('website')
            if pd.isna(website) or not website:
                continue

            # Normaliser l'URL
            if not website.startswith('http'):
                website = 'https://' + website

            # Scraper le site
            data = self.scrape_website(website, row['name'])
            processed += 1

            # Mettre à jour les données si vides
            if data['email'] and (pd.isna(row.get('email')) or not row.get('email')):
                df.at[idx, 'email'] = data['email']
                found_email += 1

            if data['phone'] and (pd.isna(row.get('phone')) or not row.get('phone')):
                df.at[idx, 'phone'] = data['phone']
                found_phone += 1

            if data['address'] and (pd.isna(row.get('address')) or not row.get('address')):
                df.at[idx, 'address'] = data['address']
                df.at[idx, 'postal_code'] = data['postal_code']
                df.at[idx, 'city'] = data['city']
                found_address += 1

            # Sauvegarder tous les 10 sites
            if processed % 10 == 0:
                self.save_cache()
                df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
                print(f"\n💾 Sauvegarde intermédiaire: {processed}/{total_with_website}")
                print(f"   ✉️ Emails: +{found_email} | 📞 Phones: +{found_phone} | 📍 Adresses: +{found_address}\n")

            # Pause pour éviter de surcharger
            time.sleep(1)

        # Sauvegarde finale
        self.save_cache()
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')

        print("\n" + "="*60)
        print("✅ ENRICHISSEMENT TERMINÉ")
        print("="*60)
        print(f"📊 Sites scrapés: {processed}")
        print(f"✉️ Nouveaux emails: {found_email}")
        print(f"📞 Nouveaux téléphones: {found_phone}")
        print(f"📍 Nouvelles adresses: {found_address}")
        print(f"\n📄 Fichier final: {OUTPUT_CSV}")

        # Stats finales
        total = len(df)
        print(f"\n📈 STATISTIQUES FINALES:")
        print(f"   Emails: {df['email'].notna().sum()}/{total} ({df['email'].notna().sum()/total*100:.1f}%)")
        print(f"   Téléphones: {df['phone'].notna().sum()}/{total} ({df['phone'].notna().sum()/total*100:.1f}%)")
        print(f"   Sites: {df['website'].notna().sum()}/{total} ({df['website'].notna().sum()/total*100:.1f}%)")
        print(f"   Adresses: {df['address'].notna().sum()}/{total} ({df['address'].notna().sum()/total*100:.1f}%)")
        print(f"   Villes: {df['city'].notna().sum()}/{total} ({df['city'].notna().sum()/total*100:.1f}%)")

    def close(self):
        self.driver.quit()

if __name__ == '__main__':
    scraper = WebsiteScraper()
    try:
        scraper.enrich_data()
    finally:
        scraper.close()
