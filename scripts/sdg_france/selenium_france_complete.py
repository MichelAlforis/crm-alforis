#!/usr/bin/env python3
"""
Scraper complet SDG France
"""
import csv, json, time, re
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv"
CACHE_FILE = BASE_DIR / "data/sdg_france/selenium_cache.json"
OUTPUT_CSV = BASE_DIR / "SDG_FRANCE_FINAL_FOR_CRM.csv"

class FranceGoogleScraper:
    def __init__(self, headless=True):
        self.driver = None
        self.headless = headless
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
        print("🚀 Chrome...")
        opts = Options()
        if self.headless:
            opts.add_argument('--headless=new')
        opts.add_argument('--disable-blink-features=AutomationControlled')
        opts.add_experimental_option("excludeSwitches", ["enable-automation"])
        opts.add_argument('user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        opts.add_argument('--no-sandbox')
        opts.add_argument('--disable-dev-shm-usage')
        opts.add_argument('--lang=fr-FR')
        self.driver = webdriver.Chrome(options=opts)
        print("   ✓ OK")

    def search(self, company_name):
        result = {'website': '', 'email': '', 'phone': '', 'address': '', 'city': ''}
        try:
            self.driver.get('https://www.google.fr')
            time.sleep(2)
            try:
                btn = self.driver.find_element(By.XPATH, "//button[contains(., 'Accepter')]")
                btn.click()
                time.sleep(1)
            except: pass
            
            search_box = None
            for by, sel in [(By.NAME, 'q'), (By.CSS_SELECTOR, 'textarea[name="q"]')]:
                try:
                    search_box = WebDriverWait(self.driver, 5).until(EC.presence_of_element_located((by, sel)))
                    if search_box: break
                except: continue
            
            if not search_box: return result
            
            search_box.clear()
            search_box.send_keys(f"{company_name} France contact")
            time.sleep(0.5)
            search_box.send_keys(Keys.RETURN)
            time.sleep(3)
            
            # Website
            results = self.driver.find_elements(By.CSS_SELECTOR, 'div.g a[href]')
            exclude = ['linkedin', 'wikipedia', 'facebook', 'societe.com', 'pappers', 'google']
            for r in results[:10]:
                try:
                    url = r.get_attribute('href')
                    if url and url.startswith('http') and not any(e in url for e in exclude):
                        from urllib.parse import urlparse
                        result['website'] = f"https://{urlparse(url).netloc}"
                        print(f"      ✓ Site: {result['website']}")
                        break
                except: continue
            
            page = self.driver.page_source
            
            # Email
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', page)
            for email in emails:
                if not any(x in email.lower() for x in ['example', 'google', 'w3.org']):
                    result['email'] = email
                    print(f"      ✓ Email: {email}")
                    break
            
            # Phone
            for pattern in [r'\+33[\s\-]?[1-9](?:[\s\-]?\d{2}){4}', r'0[1-9](?:[\s\-]?\d{2}){4}']:
                phones = re.findall(pattern, page)
                if phones:
                    phone = phones[0].strip()
                    if phone.startswith('0'):
                        phone = '+33 ' + phone[1:]
                    result['phone'] = phone
                    print(f"      ✓ Phone: {phone}")
                    break
        except Exception as e:
            print(f"      ❌ {e}")
        return result

    def enrich_all(self):
        print("🔍 SDG FRANCE COMPLET")
        print("="*70)
        
        with open(INPUT_CSV, 'r', encoding='utf-8-sig') as f:
            companies = list(csv.DictReader(f))
        
        print(f"📊 {len(companies)} sociétés | 💾 {len(self.cache)} cache")
        self.init_driver()
        
        stats = {'sites': 0, 'emails': 0, 'phones': 0}
        
        try:
            for i, comp in enumerate(companies, 1):
                name = comp['name']
                print(f"\n[{i}/{len(companies)}] {name}")
                
                if name in self.cache:
                    print("   ↻ Cache")
                    data = self.cache[name]
                else:
                    data = self.search(name)
                    self.cache[name] = data
                    self.save_cache()
                    time.sleep(4)
                
                # Update company with data from cache
                for key in ['website', 'email', 'phone', 'address', 'city']:
                    if data.get(key) and not comp.get(key):
                        comp[key] = data[key]
                        if key in ['website', 'email', 'phone']:
                            stats[key+'s' if key != 'email' else 'emails'] += 1
                
                if i % 10 == 0:
                    print(f"\n💾 {stats}")
        finally:
            if self.driver:
                self.driver.quit()
        
        # Save
        with open(OUTPUT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(companies)
        
        print("\n✅ FAIT!")
        print(f"💾 {OUTPUT_CSV.name}")
        print(f"📊 {stats}")

if __name__ == '__main__':
    FranceGoogleScraper(headless=True).enrich_all()
