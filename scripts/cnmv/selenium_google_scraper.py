#!/usr/bin/env python3
"""
Selenium Google Scraper pour Espagne (CNMV SGIIC)
Récupère websites, emails, phones via Google Search
Basé sur la méthode Luxembourg qui a atteint 99%
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
BASE_DIR = Path(__file__).parent
INPUT_JSON = BASE_DIR / "output/cnmv_all_sgiic_raw.json"
OUTPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
CACHE_FILE = BASE_DIR / "output/selenium_cache.json"

class SeleniumGoogleScraper:
    def __init__(self, headless=True):
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
            chrome_options.add_argument('--headless=new')

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

        # Language - Spanish
        chrome_options.add_argument('--lang=es-ES')

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
            self.driver.get('https://www.google.es')
            time.sleep(2)

            # Accept cookies if popup appears
            try:
                # Try multiple cookie button selectors
                accept_selectors = [
                    "//button[contains(., 'Aceptar')]",
                    "//button[contains(., 'Accept')]",
                    "//button[contains(., 'Acepto')]",
                    "//button[@id='L2AGLb']",
                    "//button[contains(@class, 'accept')]"
                ]

                for selector in accept_selectors:
                    try:
                        accept_button = self.driver.find_element(By.XPATH, selector)
                        if accept_button.is_displayed():
                            accept_button.click()
                            time.sleep(1)
                            break
                    except:
                        continue
            except:
                pass

            # Find search box with multiple strategies
            search_box = None
            search_selectors = [
                (By.NAME, 'q'),
                (By.CSS_SELECTOR, 'textarea[name="q"]'),
                (By.CSS_SELECTOR, 'input[name="q"]'),
                (By.CSS_SELECTOR, 'textarea.gLFyf'),
                (By.XPATH, "//textarea[@aria-label='Buscar']")
            ]

            for by_method, selector in search_selectors:
                try:
                    search_box = WebDriverWait(self.driver, 5).until(
                        EC.presence_of_element_located((by_method, selector))
                    )
                    if search_box:
                        break
                except:
                    continue

            if not search_box:
                raise Exception("Could not find search box")

            # Clear and search
            search_box.clear()
            search_box.send_keys(query)
            time.sleep(0.5)
            search_box.send_keys(Keys.RETURN)

            # Wait for results
            time.sleep(3)

            # Extract website from first result
            try:
                # Try multiple selectors for result links
                result_selectors = [
                    'div.g a[href]',
                    'div[data-hveid] a[href]',
                    'div.yuRUbf a[href]',
                    'a[jsname][href]'
                ]

                results = []
                for selector in result_selectors:
                    found = self.driver.find_elements(By.CSS_SELECTOR, selector)
                    if found:
                        results = found
                        break

                exclude_domains = [
                    'linkedin.com', 'wikipedia.org', 'bloomberg.com', 'reuters.com',
                    'crunchbase.com', 'facebook.com', 'twitter.com', 'youtube.com',
                    'google.com', 'gstatic.com', 'instagram.com', 'cnmv.es',
                    'rankia.com', 'eleconomista.es', 'cincodias.com'
                ]

                for result_elem in results[:15]:  # Check first 15 results
                    try:
                        url = result_elem.get_attribute('href')
                        if url and url.startswith('http'):
                            # Skip excluded domains
                            if any(domain in url for domain in exclude_domains):
                                continue

                            # Clean URL
                            clean_url = url.split('?')[0].split('#')[0]

                            # Extract domain
                            from urllib.parse import urlparse
                            domain = urlparse(clean_url).netloc

                            # Found valid URL
                            result['website'] = f"https://{domain}"
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

            # Exclude patterns
            exclude_email_patterns = [
                'example.com', 'domain.com', 'google.com', 'gstatic.com',
                'w3.org', 'schema.org', 'sentry.io', 'yourdomain.com'
            ]

            for email in emails:
                email_lower = email.lower()
                # Skip excluded domains
                if any(x in email_lower for x in exclude_email_patterns):
                    continue
                # Skip generic/spam patterns
                if email_lower.startswith(('noreply', 'no-reply', 'admin@', 'webmaster@')):
                    continue
                valid_emails.append(email)

            if valid_emails:
                # Prefer contact/info emails
                for email in valid_emails:
                    email_lower = email.lower()
                    if any(x in email_lower for x in ['contact', 'info', 'espana', 'spain', 'comunicacion', 'atencion']):
                        result['email'] = email
                        print(f"      ✓ Email: {email}")
                        break
                if not result['email']:
                    result['email'] = valid_emails[0]
                    print(f"      ✓ Email: {valid_emails[0]}")

            # Phone (Spain: +34)
            phone_patterns = [
                r'\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',
                r'0034[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',
                r'\(34\)[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',
                r'\+34[\s\-]?\d{9}'
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

        # Clean company name (remove SGIIC, S.A., etc.)
        clean_name = company_name.replace(' SGIIC', '').replace(' S.A.', '').replace(' S.L.', '').replace(',', '').strip()

        # Search query
        query = f"{clean_name} España gestora contacto email telefono"
        print(f"   🔍 {query}")

        result = self.google_search(query)

        # If no website found, try simpler query
        if not result['website']:
            print(f"   🔍 Retry with simpler query...")
            query2 = f"{clean_name} España"
            result2 = self.google_search(query2)
            if result2['website']:
                result['website'] = result2['website']

        # If still no website but have email, extract domain from email
        if not result['website'] and result['email']:
            email_domain = result['email'].split('@')[-1]
            # Only use if not generic domain
            generic_domains = ['gmail.com', 'hotmail.com', 'yahoo.com', 'outlook.com', 'qemailserver.com']
            if email_domain not in generic_domains and '.' in email_domain:
                # Try both with and without www
                result['website'] = f"https://{email_domain}"
                print(f"   ℹ️  Website from email domain: {result['website']}")

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
        print("🔍 SELENIUM GOOGLE SCRAPER - ESPAÑA (CNMV SGIIC)")
        print("=" * 70)
        print()

        # Read companies from JSON
        with open(INPUT_JSON, 'r', encoding='utf-8') as f:
            companies = json.load(f)

        print(f"📊 Total sociétés: {len(companies)}")
        print()

        # Initialize driver
        self.init_driver()
        print()
        print(f"⏱️  Temps estimé: ~{len(companies) * 4 / 60:.0f} minutes")
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
                name = company.get('name', '')

                print(f"\n[{i}/{len(companies)}] 🏢 {name}")

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

                # Save progress every 10 companies
                if i % 10 == 0:
                    self.save_progress(enriched)

        finally:
            # Close driver
            if self.driver:
                print("\n🛑 Closing browser...")
                self.driver.quit()

        # Save final results
        print("\n" + "=" * 70)
        print("💾 Saving results...")

        # Convert to CSV
        self.save_to_csv(enriched)

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

    def save_progress(self, companies):
        """Save intermediate progress"""
        progress_file = BASE_DIR / "output/selenium_progress.json"
        with open(progress_file, 'w', encoding='utf-8') as f:
            json.dump(companies, f, indent=2, ensure_ascii=False)

    def save_to_csv(self, companies):
        """Convert JSON to CSV format"""

        # Prepare CSV rows
        csv_rows = []
        for company in companies:
            row = {
                'name': company.get('name', ''),
                'email': company.get('email', ''),
                'phone': company.get('phone', ''),
                'website': company.get('website', ''),
                'address': company.get('address', ''),
                'city': company.get('city', ''),
                'postal_code': company.get('postal_code', ''),
                'country': 'Spain',
                'country_code': 'ES',
                'category': 'Asset Manager',
                'type': 'SGIIC',
                'register_number': company.get('register_number', ''),
                'register_date': company.get('register_date', ''),
                'aum': company.get('aum', ''),
                'aum_date': company.get('aum_date', ''),
                'tier': company.get('tier', ''),
                'notes': '',
                'pipeline_stage': 'Lead'
            }
            csv_rows.append(row)

        # Write CSV
        fieldnames = [
            'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'country', 'country_code', 'category', 'type', 'register_number',
            'register_date', 'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
        ]

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)


if __name__ == '__main__':
    import sys

    headless = '--headless' in sys.argv or len(sys.argv) == 1  # Default headless

    scraper = SeleniumGoogleScraper(headless=headless)
    scraper.enrich_all()
