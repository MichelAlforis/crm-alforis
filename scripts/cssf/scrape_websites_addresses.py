#!/usr/bin/env python3
"""
Scrape websites AND addresses for Luxembourg companies
"""

import csv
import json
import time
import re
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_COMPLETE.csv"
CACHE_FILE = BASE_DIR / "data/cssf/website_address_cache.json"

class WebsiteAddressScraper:
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
        self.driver = webdriver.Chrome(options=options)
        print("   ✓ Ready\n")

    def search_google(self, company_name: str) -> dict:
        """Search company on Google and extract website + address"""

        if company_name in self.cache:
            return self.cache[company_name]

        result = {'website': '', 'address': ''}

        try:
            query = f"{company_name} Luxembourg official website"
            self.driver.get(f"https://www.google.com/search?q={query.replace(' ', '+')}")
            time.sleep(3)

            # Accept cookies
            try:
                accept_btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Accept') or contains(., 'Accepter')]")
                accept_btn.click()
                time.sleep(1)
            except:
                pass

            # Extract website
            try:
                links = self.driver.find_elements(By.CSS_SELECTOR, 'div.g a[href]')
                exclude = ['linkedin.com', 'wikipedia.org', 'bloomberg.com', 'google.com', 'facebook.com']

                for link in links[:5]:
                    try:
                        url = link.get_attribute('href')
                        if url and url.startswith('http') and not any(d in url for d in exclude):
                            result['website'] = url.split('?')[0].split('#')[0]
                            break
                    except:
                        continue
            except:
                pass

            # Extract address from page source
            page_source = self.driver.page_source

            # Luxembourg address patterns
            patterns = [
                r'(\d+[A-Z]?\s+(?:Avenue|Rue|Boulevard|Place|Allée|rue|avenue)[^<>"]{5,60}L-?\d{4}\s+Luxembourg)',
                r'(L-\d{4}\s+Luxembourg[^<>"]{0,40})',
            ]

            for pattern in patterns:
                matches = re.findall(pattern, page_source, re.IGNORECASE)
                if matches:
                    address = matches[0].strip()
                    address = re.sub(r'&[a-z]+;', ' ', address)
                    address = re.sub(r'\s+', ' ', address)
                    if len(address) > 10:
                        result['address'] = address
                        break

            time.sleep(3)

        except Exception as e:
            print(f"      ❌ Error: {e}")

        self.cache[company_name] = result
        self.save_cache()
        return result

    def enrich_all(self):
        print("🌐 WEBSITES + ADDRESSES - LUXEMBOURG")
        print("=" * 70)
        print()

        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 Total: {len(companies)} sociétés\n")

        self.init_driver()

        stats = {'websites': 0, 'addresses': 0}

        for i, company in enumerate(companies, 1):
            name = company['name']
            print(f"[{i}/{len(companies)}] 🏢 {name}")

            # Search
            data = self.search_google(name)

            if data['website']:
                company['website'] = data['website']
                stats['websites'] += 1
                print(f"   ✓ Website: {data['website']}")

            if data['address']:
                company['address'] = data['address']
                stats['addresses'] += 1
                print(f"   ✓ Address: {data['address']}")

            if not data['website'] and not data['address']:
                print(f"   ⚠️  Nothing found")

        if self.driver:
            self.driver.quit()

        # Save
        print("\n" + "=" * 70)
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(companies)

        print(f"💾 Saved: {OUTPUT_CSV}\n")

        # Stats
        print("=" * 70)
        print("📊 RÉSULTATS FINAUX")
        print("=" * 70)
        print()
        print(f"✓ Websites:  {stats['websites']}/{len(companies)} ({stats['websites']/len(companies)*100:.1f}%)")
        print(f"✓ Addresses: {stats['addresses']}/{len(companies)} ({stats['addresses']/len(companies)*100:.1f}%)")
        print()

if __name__ == '__main__':
    scraper = WebsiteAddressScraper()
    scraper.enrich_all()
