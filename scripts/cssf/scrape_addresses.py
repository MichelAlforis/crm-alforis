#!/usr/bin/env python3
"""
Scrape addresses for Luxembourg companies via Google Maps/Business
"""

import csv
import json
import time
import re
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_FINAL_WITH_ADDRESSES.csv"
CACHE_FILE = BASE_DIR / "data/cssf/address_cache.json"

class AddressScraper:
    def __init__(self):
        self.driver = None
        self.cache = self.load_cache()

    def load_cache(self):
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def save_cache(self):
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def init_driver(self):
        print("🚀 Initializing Chrome...")
        options = Options()
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        options.add_argument('--lang=en-US')

        self.driver = webdriver.Chrome(options=options)
        print("   ✓ Ready")

    def search_address_google_maps(self, company_name: str) -> str:
        """Search company on Google Maps and extract address"""

        if company_name in self.cache:
            return self.cache[company_name]

        try:
            # Google Maps search
            query = f"{company_name} Luxembourg"
            url = f"https://www.google.com/maps/search/{query.replace(' ', '+')}"

            self.driver.get(url)
            time.sleep(3)

            # Try to find address in Google Maps results
            try:
                # Wait for results
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='main']"))
                )

                # Look for address patterns
                page_source = self.driver.page_source

                # Luxembourg address patterns
                # Format: "XX Avenue/Rue Name, L-XXXX Luxembourg"
                patterns = [
                    r'(\d+[A-Z]?\s+(?:Avenue|Rue|Boulevard|Place|Allée)[^,]+,\s*L-\d{4}\s+Luxembourg)',
                    r'(L-\d{4}\s+Luxembourg[^<>"]+)',
                    r'(\d+[^,]+,\s*\d{4}\s+Luxembourg)',
                ]

                for pattern in patterns:
                    matches = re.findall(pattern, page_source)
                    if matches:
                        address = matches[0].strip()
                        # Clean HTML entities
                        address = re.sub(r'&[a-z]+;', ' ', address)
                        address = re.sub(r'\s+', ' ', address)

                        self.cache[company_name] = address
                        self.save_cache()
                        return address

            except Exception as e:
                print(f"      ⚠️  Maps error: {e}")

            time.sleep(2)

        except Exception as e:
            print(f"      ❌ Error: {e}")

        self.cache[company_name] = ""
        self.save_cache()
        return ""

    def enrich_all(self):
        print("📍 ADRESSES - LUXEMBOURG")
        print("=" * 70)
        print()

        # Read CSV
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 Total: {len(companies)} sociétés")
        print()

        self.init_driver()
        print()

        stats = {'found': 0, 'missing': 0}

        for i, company in enumerate(companies, 1):
            name = company['name']

            print(f"[{i}/{len(companies)}] 🏢 {name}")

            # Skip if already has address
            if company.get('address') and company['address'].strip():
                print(f"   ↻ Already has address")
                stats['found'] += 1
                continue

            # Search address
            address = self.search_address_google_maps(name)

            if address:
                company['address'] = address
                stats['found'] += 1
                print(f"   ✓ {address}")
            else:
                stats['missing'] += 1
                print(f"   ⚠️  No address found")

            time.sleep(3)

        # Close browser
        if self.driver:
            self.driver.quit()

        # Save
        print("\n" + "=" * 70)
        print("💾 Saving...")

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(companies)

        print(f"   ✓ {OUTPUT_CSV}")
        print()

        # Stats
        print("=" * 70)
        print("📊 RÉSULTATS")
        print("=" * 70)
        print()
        print(f"✓ Adresses trouvées:  {stats['found']}")
        print(f"⚠ Adresses manquantes: {stats['missing']}")
        print()

if __name__ == '__main__':
    scraper = AddressScraper()
    scraper.enrich_all()
