#!/usr/bin/env python3
"""
Enrichissement rapide depuis les sites web (requests + BeautifulSoup)
- Email (mentions légales, contact)
- Téléphone
- Adresse complète (siège social)
"""

import json
import csv
import requests
from bs4 import BeautifulSoup
import time
import re
from pathlib import Path
from urllib.parse import urljoin
import pandas as pd

BASE_DIR = Path(__file__).parent
INPUT_CSV = "SDG_FRANCE_FINAL_COMPLETE.csv"
OUTPUT_CSV = "SDG_FRANCE_ENRICHED_FAST.csv"
CACHE_FILE = "data/sdg_france/fast_enrichment_cache.json"

class FastWebsiteEnricher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.cache = self.load_cache()

    def load_cache(self):
        """Load cache"""
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}

    def save_cache(self):
        """Save cache"""
        Path(CACHE_FILE).parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def extract_email(self, text):
        """Extract email"""
        emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
        for email in emails:
            if not any(word in email.lower() for word in ['noreply', 'webmaster', 'mailer-daemon', 'example']):
                return email.lower()
        return None

    def extract_phone(self, text):
        """Extract French phone"""
        patterns = [
            r'\+33\s*[1-9](?:[\s.-]*\d{2}){4}',  # +33 1 23 45 67 89
            r'0[1-9](?:[\s.-]*\d{2}){4}',  # 01 23 45 67 89
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                phone = match.group(0)
                phone = re.sub(r'[\s.-]', '', phone)
                if phone.startswith('0') and len(phone) == 10:
                    phone = '+33' + phone[1:]
                return phone
        return None

    def extract_address(self, text):
        """Extract address from text"""
        patterns = [
            # "Siège social : 123 rue de Paris, 75001 Paris"
            r'(?:Siège social|Siège|Adresse)[\s:]*([0-9]+[^,\n]+?),?\s*([0-9]{5})\s+([A-Z][a-zéèêàâôûîïäëüöç\-\s]+)',
            # "123 rue de Paris - 75001 Paris"
            r'([0-9]+\s+(?:rue|avenue|boulevard|allée|place|impasse|chemin|route)[^,\n]+?)[,\s-]+([0-9]{5})\s+([A-Z][a-zéèêàâôûîïäëüöç\-\s]+)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
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

    def scrape_page(self, url):
        """Scrape a single page"""
        try:
            response = self.session.get(url, timeout=10, allow_redirects=True)
            if response.status_code != 200:
                return None

            soup = BeautifulSoup(response.content, 'html.parser')

            # Remove scripts and styles
            for script in soup(['script', 'style']):
                script.decompose()

            text = soup.get_text(separator=' ')
            return text

        except Exception as e:
            return None

    def enrich_from_website(self, website_url, company_name):
        """Enrich from website"""

        # Check cache
        if website_url in self.cache:
            return self.cache[website_url]

        result = {
            'email': None,
            'phone': None,
            'address': None,
            'postal_code': None,
            'city': None
        }

        try:
            # Clean URL
            if not website_url.startswith('http'):
                website_url = 'https://' + website_url

            # Pages to try
            pages = [
                website_url,  # Homepage
                urljoin(website_url, '/mentions-legales'),
                urljoin(website_url, '/contact'),
                urljoin(website_url, '/fr/mentions-legales'),
                urljoin(website_url, '/fr/contact'),
            ]

            all_text = ""

            for page_url in pages:
                text = self.scrape_page(page_url)
                if text:
                    all_text += " " + text
                    # Stop if we already found what we need
                    if result['email'] and result['phone'] and result['address']:
                        break

            # Extract data
            if not result['email']:
                result['email'] = self.extract_email(all_text)

            if not result['phone']:
                result['phone'] = self.extract_phone(all_text)

            if not result['address']:
                address_data = self.extract_address(all_text)
                if address_data:
                    result.update(address_data)

        except Exception as e:
            pass

        # Cache result
        self.cache[website_url] = result
        return result

    def enrich_all(self):
        """Enrich all companies"""

        print("="*80)
        print("  ENRICHISSEMENT RAPIDE DEPUIS WEBSITES (requests + BeautifulSoup)")
        print("="*80)
        print()

        # Load data
        df = pd.read_csv(INPUT_CSV, encoding='utf-8-sig')

        # Filter companies with websites
        companies_with_websites = df[df['website'].notna()].copy()

        total = len(companies_with_websites)
        print(f"🎯 {total} sociétés avec site web à enrichir")
        print(f"📦 {len(self.cache)} déjà en cache\n")

        # Counters
        found_email = 0
        found_phone = 0
        found_address = 0
        processed = 0

        for idx, row in companies_with_websites.iterrows():
            processed += 1
            name = row['name']
            website = row['website']

            print(f"[{processed}/{total}] 🏢 {name[:50]}")
            print(f"   🌐 {website}")

            # Scrape
            data = self.enrich_from_website(website, name)

            # Update if empty
            found = []

            if data['email'] and (pd.isna(df.at[idx, 'email']) or not df.at[idx, 'email']):
                df.at[idx, 'email'] = data['email']
                found_email += 1
                found.append(f"✉️ {data['email']}")

            if data['phone'] and (pd.isna(df.at[idx, 'phone']) or not df.at[idx, 'phone']):
                df.at[idx, 'phone'] = data['phone']
                found_phone += 1
                found.append(f"📞 {data['phone']}")

            if data['address'] and (pd.isna(df.at[idx, 'address']) or not df.at[idx, 'address']):
                df.at[idx, 'address'] = data['address']
                df.at[idx, 'postal_code'] = data['postal_code']
                df.at[idx, 'city'] = data['city']
                found_address += 1
                found.append(f"📍 {data['city']}")

            if found:
                print(f"   ✅ {', '.join(found)}")
            else:
                print(f"   ⚠️  Rien de nouveau")

            # Save every 20
            if processed % 20 == 0:
                self.save_cache()
                df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')
                print(f"\n💾 Sauvegarde: {processed}/{total}")
                print(f"   ✉️ Emails: +{found_email} | 📞 Phones: +{found_phone} | 📍 Adresses: +{found_address}\n")

            # Rate limiting
            time.sleep(1)

        # Final save
        self.save_cache()
        df.to_csv(OUTPUT_CSV, index=False, encoding='utf-8-sig')

        # Final stats
        print("\n" + "="*80)
        print("✅ ENRICHISSEMENT TERMINÉ")
        print("="*80)
        print(f"\n📊 Sites scrapés: {processed}")
        print(f"✉️ Nouveaux emails: {found_email}")
        print(f"📞 Nouveaux téléphones: {found_phone}")
        print(f"📍 Nouvelles adresses: {found_address}")

        total_rows = len(df)
        print(f"\n📈 STATISTIQUES FINALES ({total_rows} sociétés):")
        print(f"   ✉️  Emails:     {df['email'].notna().sum():3d}/{total_rows} ({df['email'].notna().sum()/total_rows*100:5.1f}%)")
        print(f"   📞 Téléphones: {df['phone'].notna().sum():3d}/{total_rows} ({df['phone'].notna().sum()/total_rows*100:5.1f}%)")
        print(f"   🌐 Sites web:  {df['website'].notna().sum():3d}/{total_rows} ({df['website'].notna().sum()/total_rows*100:5.1f}%)")
        print(f"   📍 Adresses:   {df['address'].notna().sum():3d}/{total_rows} ({df['address'].notna().sum()/total_rows*100:5.1f}%)")
        print(f"   🏙️  Villes:     {df['city'].notna().sum():3d}/{total_rows} ({df['city'].notna().sum()/total_rows*100:5.1f}%)")
        print(f"\n📄 Fichier final: {OUTPUT_CSV}")
        print("="*80)

if __name__ == '__main__':
    enricher = FastWebsiteEnricher()
    enricher.enrich_all()
