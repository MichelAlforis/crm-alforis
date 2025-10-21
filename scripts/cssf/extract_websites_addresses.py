#!/usr/bin/env python3
"""
Extract websites + addresses for Luxembourg companies
Uses Selenium + Google Search
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

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_COMPLETE.csv"
CACHE_FILE = BASE_DIR / "data/cssf/web_addr_cache.json"

class DataExtractor:
    def __init__(self):
        self.driver = None
        self.cache = self.load_cache()

    def load_cache(self):
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r') as f:
                return json.load(f)
        return {}

    def save_cache(self):
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, 'w') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def init_driver(self):
        print("🚀 Chrome init...")
        opts = Options()
        opts.add_argument('--disable-blink-features=AutomationControlled')
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        self.driver = webdriver.Chrome(options=opts)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        print("   ✓ Ready\n")

    def extract(self, name: str) -> dict:
        """Extract website + address"""

        if name in self.cache:
            return self.cache[name]

        result = {'website': '', 'address': ''}

        try:
            # Google search
            self.driver.get('https://www.google.com')
            time.sleep(2)

            # Accept cookies
            try:
                btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Accept') or contains(., 'Accepter')]")
                btn.click()
                time.sleep(1)
            except:
                pass

            # Search
            search_box = self.driver.find_element(By.NAME, 'q')
            search_box.clear()
            search_box.send_keys(f"{name} Luxembourg")
            search_box.send_keys(Keys.RETURN)
            time.sleep(3)

            # Extract website
            try:
                links = self.driver.find_elements(By.CSS_SELECTOR, 'div.g a[href]')
                exclude = ['linkedin.com', 'wikipedia.org', 'bloomberg.com', 'google.com',
                          'facebook.com', 'twitter.com', 'crunchbase.com', 'reuters.com']

                for link in links[:10]:
                    try:
                        url = link.get_attribute('href')
                        if url and url.startswith('http') and not any(d in url for d in exclude):
                            result['website'] = url.split('?')[0].split('#')[0]
                            break
                    except:
                        continue
            except:
                pass

            # Extract address from page
            page = self.driver.page_source

            # Luxembourg patterns
            addr_patterns = [
                r'(\d+[A-Z]?\s+(?:Avenue|Rue|Boulevard|Place|Allée)[^<>"]{5,50}L-?\d{4}\s+Luxembourg)',
                r'(\d+[^<>"]{10,50}L-\d{4}\s+Luxembourg)',
                r'(L-\d{4}\s+Luxembourg[^<>"]{5,30})',
            ]

            for pattern in addr_patterns:
                matches = re.findall(pattern, page, re.IGNORECASE)
                if matches:
                    addr = matches[0].strip()
                    addr = re.sub(r'&[a-z]+;', ' ', addr)
                    addr = re.sub(r'\s+', ' ', addr)
                    if 10 < len(addr) < 100:
                        result['address'] = addr
                        break

            time.sleep(3)

        except Exception as e:
            print(f"      ⚠️  Error: {e}")

        self.cache[name] = result
        self.save_cache()
        return result

    def run(self):
        print("🌐 WEBSITES + ADDRESSES EXTRACTION")
        print("=" * 70)
        print()

        # Load
        with open(INPUT_CSV, 'r') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 {len(companies)} companies\n")

        self.init_driver()

        stats = {'web': 0, 'addr': 0}

        for i, company in enumerate(companies, 1):
            name = company['name']
            print(f"[{i}/{len(companies)}] 🏢 {name}")

            data = self.extract(name)

            if data['website']:
                company['website'] = data['website']
                stats['web'] += 1
                print(f"   ✓ Website: {data['website']}")

            if data['address']:
                company['address'] = data['address']
                stats['addr'] += 1
                print(f"   ✓ Address: {data['address']}")

            if not data['website'] and not data['address']:
                print(f"   ⚠️  Nothing found")

        if self.driver:
            self.driver.quit()

        # Save
        print("\n" + "=" * 70)
        with open(OUTPUT_CSV, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(companies)

        print(f"💾 {OUTPUT_CSV}\n")

        print("=" * 70)
        print("📊 RESULTS")
        print("=" * 70)
        print(f"\n✓ Websites:  {stats['web']}/{len(companies)} ({stats['web']/len(companies)*100:.1f}%)")
        print(f"✓ Addresses: {stats['addr']}/{len(companies)} ({stats['addr']/len(companies)*100:.1f}%)\n")

if __name__ == '__main__':
    extractor = DataExtractor()
    extractor.run()
