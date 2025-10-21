#!/usr/bin/env python3
"""
Selenium Google Scraper pour Luxembourg
Récupère websites, emails, phones via Google Search
"""

import csv
import json
import time
import re
from pathlib import Path
from typing import Dict, Optional
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_SELENIUM_ENRICHED.csv"
CACHE_FILE = BASE_DIR / "data/cssf/selenium_cache.json"

class SeleniumGoogleScraper:
    def __init__(self, headless=False):
        """
        Initialize Selenium with Chrome
        """
        self.driver = None
        self.headless = headless
        self.cache = self.load_cache()

    def load_cache(self) -> Dict:
        """Load cache"""
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def save_cache(self):
        """Save cache"""
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def init_driver(self):
        """Initialize Chrome driver"""
        print("🚀 Initializing Chrome driver...")

        chrome_options = Options()

        if self.headless:
            chrome_options.add_argument('--headless')

        # Anti-detection
        chrome_options.add_argument('--disable-blink-features=AutomationControlled')
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)

        # User agent
        chrome_options.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

        # Other options
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.add_argument('--disable-gpu')
        chrome_options.add_argument('--window-size=1920,1080')

        # Language
        chrome_options.add_argument('--lang=en-US')

        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            print("   ✓ Chrome driver ready")

            # Remove automation flags
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        except Exception as e:
            print(f"   ❌ Error: {e}")
            print("\n💡 Install ChromeDriver:")
            print("   brew install chromedriver")
            raise

    def google_search(self, query: str) -> Dict[str, str]:
        """
        Perform Google search and extract data
        """
        result = {
            'website': '',
            'email': '',
            'phone': ''
        }

        try:
            # Go to Google
            self.driver.get('https://www.google.com')
            time.sleep(2)

            # Accept cookies if popup appears
            try:
                accept_button = self.driver.find_element(By.XPATH, "//button[contains(., 'Accept') or contains(., 'Accepter') or contains(., 'J\\'accepte')]")
                accept_button.click()
                time.sleep(1)
            except:
                pass

            # Find search box
            search_box = self.driver.find_element(By.NAME, 'q')
            search_box.clear()
            search_box.send_keys(query)
            search_box.send_keys(Keys.RETURN)

            # Wait for results
            time.sleep(3)

            # Extract website from first result
            try:
                # Try to find main result links (excluding ads, Wikipedia, LinkedIn, etc.)
                results = self.driver.find_elements(By.CSS_SELECTOR, 'div.g a[href]')

                exclude_domains = [
                    'linkedin.com', 'wikipedia.org', 'bloomberg.com', 'reuters.com',
                    'crunchbase.com', 'facebook.com', 'twitter.com', 'youtube.com',
                    'google.com', 'gstatic.com'
                ]

                for result_elem in results[:10]:  # Check first 10 results
                    try:
                        url = result_elem.get_attribute('href')
                        if url and url.startswith('http'):
                            # Skip excluded domains
                            if any(domain in url for domain in exclude_domains):
                                continue

                            # Found valid URL
                            result['website'] = url.split('?')[0].split('#')[0]
                            print(f"      ✓ Website: {result['website']}")
                            break
                    except:
                        continue

            except Exception as e:
                print(f"      ⚠️  Could not extract website: {e}")

            # Extract email and phone from page source
            page_source = self.driver.page_source

            # Email
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', page_source)
            valid_emails = []
            for email in emails:
                if not any(x in email.lower() for x in [
                    'example.com', 'domain.com', 'google.com', 'gstatic.com',
                    'w3.org', 'schema.org', 'sentry.io'
                ]):
                    valid_emails.append(email)

            if valid_emails:
                # Prefer contact/info emails
                for email in valid_emails:
                    if any(x in email.lower() for x in ['contact', 'info', 'luxembourg', 'lux', 'sales']):
                        result['email'] = email
                        print(f"      ✓ Email: {email}")
                        break
                if not result['email']:
                    result['email'] = valid_emails[0]
                    print(f"      ✓ Email: {valid_emails[0]}")

            # Phone (Luxembourg: +352)
            phone_patterns = [
                r'\+352[\s\-]?[\d\s\-]{6,15}',
                r'00352[\s\-]?[\d\s\-]{6,15}',
                r'\(352\)[\s\-]?[\d\s\-]{6,15}'
            ]

            for pattern in phone_patterns:
                phones = re.findall(pattern, page_source)
                if phones:
                    phone = phones[0].strip()
                    phone = re.sub(r'\s+', ' ', phone)
                    result['phone'] = phone
                    print(f"      ✓ Phone: {phone}")
                    break

        except Exception as e:
            print(f"      ❌ Error: {e}")

        return result

    def search_company(self, company_name: str) -> Dict[str, str]:
        """
        Search company and return contact data
        """
        # Check cache
        if company_name in self.cache:
            print(f"   ↻ Cached")
            return self.cache[company_name]

        # Search query
        query = f"{company_name} Luxembourg contact email phone"
        print(f"   🔍 {query}")

        result = self.google_search(query)

        # Cache result
        self.cache[company_name] = result
        self.save_cache()

        # Rate limiting
        time.sleep(4)  # 4 seconds between searches

        return result

    def enrich_all(self):
        """
        Enrich all companies
        """
        print("🔍 SELENIUM GOOGLE SCRAPER - LUXEMBOURG")
        print("=" * 70)
        print()

        # Read companies
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 Total sociétés: {len(companies)}")
        print()

        # Ask for headless mode
        print("💡 Mode d'exécution:")
        print("   - Headless (invisible): plus rapide, moins de détection")
        print("   - Visible: voir le navigateur en action")
        print()

        # Initialize driver
        self.init_driver()
        print()
        print("⏱️  Temps estimé: ~{:.0f} minutes".format(len(companies) * 4 / 60))
        print()

        # Enrich
        enriched = []
        stats = {
            'websites': 0,
            'emails': 0,
            'phones': 0
        }

        try:
            for i, company in enumerate(companies, 1):
                name = company['name']
                tier = company['tier']

                print(f"\n[{i}/{len(companies)}] 🏢 {name}")
                print(f"   Tier: {tier}")

                # Skip if already complete
                if company.get('website') and company.get('email') and company.get('phone'):
                    print(f"   ↻ Already complete")
                    enriched.append(company)
                    stats['websites'] += 1
                    stats['emails'] += 1
                    stats['phones'] += 1
                    continue

                # Search
                data = self.search_company(name)

                # Update
                if data['website'] and not company.get('website'):
                    company['website'] = data['website']
                    stats['websites'] += 1

                if data['email'] and not company.get('email'):
                    company['email'] = data['email']
                    stats['emails'] += 1

                if data['phone'] and not company.get('phone'):
                    company['phone'] = data['phone']
                    stats['phones'] += 1

                enriched.append(company)

                # Progress
                print(f"   📊 Total: {stats['websites']} sites | {stats['emails']} emails | {stats['phones']} phones")

        finally:
            # Close driver
            if self.driver:
                print("\n🛑 Closing browser...")
                self.driver.quit()

        # Save
        print("\n" + "=" * 70)
        print("💾 Saving results...")

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(enriched)

        print(f"   ✓ Saved: {OUTPUT_CSV}")
        print()

        # Stats
        print("=" * 70)
        print("📊 RÉSULTATS FINAUX")
        print("=" * 70)
        print()
        print(f"Total sociétés:    {len(companies)}")
        print()
        print(f"✓ Websites:  {stats['websites']:>3} ({stats['websites']/len(companies)*100:.1f}%)")
        print(f"✓ Emails:    {stats['emails']:>3} ({stats['emails']/len(companies)*100:.1f}%)")
        print(f"✓ Phones:    {stats['phones']:>3} ({stats['phones']/len(companies)*100:.1f}%)")
        print()
        print("=" * 70)
        print()


if __name__ == '__main__':
    import sys

    headless = '--headless' in sys.argv

    scraper = SeleniumGoogleScraper(headless=headless)
    scraper.enrich_all()
