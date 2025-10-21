#!/usr/bin/env python3
"""
CSSF Address Scraper - Extract official addresses from CSSF registry
Uses Selenium to search https://edesk.apps.cssf.lu/search-entities/search
"""

import csv
import time
import json
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_FINAL.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_WITH_ADDRESSES.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "addresses_cache.json"

CSSF_URL = "https://edesk.apps.cssf.lu/search-entities/search"

# Create cache directory
CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)

# Load cache
if CACHE_FILE.exists():
    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)
else:
    cache = {}

def save_cache():
    """Save cache to disk"""
    with open(CACHE_FILE, 'w', encoding='utf-8') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

def search_cssf_entity(driver, company_name):
    """Search for entity on CSSF and extract address"""

    # Check cache first
    if company_name in cache:
        print(f"  💾 Cache hit: {cache[company_name].get('address', 'N/A')}")
        return cache[company_name]

    try:
        # Navigate to search page
        driver.get(CSSF_URL)
        time.sleep(2)

        # Find search input
        search_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text'], input[name='search'], input[placeholder*='Search']"))
        )

        # Clear and enter company name
        search_input.clear()
        search_input.send_keys(company_name)
        search_input.send_keys(Keys.RETURN)

        time.sleep(3)

        # Try to find first result
        try:
            first_result = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr:first-child, .result-item:first-child, .entity-result:first-child"))
            )
            first_result.click()
            time.sleep(2)

            # Extract address from details page
            address_elements = driver.find_elements(By.CSS_SELECTOR,
                "[class*='address'], [class*='Address'], .entity-address, .registered-office")

            if address_elements:
                address_text = address_elements[0].text.strip()

                result = {
                    'address': address_text,
                    'city': 'Luxembourg',  # Most are in Luxembourg
                    'country': 'Luxembourg'
                }

                # Cache result
                cache[company_name] = result
                save_cache()

                print(f"  ✓ Found: {address_text}")
                return result

        except Exception as e:
            print(f"  ⚠ No results found")
            result = {
                'address': '',
                'city': 'Luxembourg',
                'country': 'Luxembourg'
            }
            cache[company_name] = result
            save_cache()
            return result

    except Exception as e:
        print(f"  ✗ Error: {str(e)[:60]}")
        result = {
            'address': '',
            'city': 'Luxembourg',
            'country': 'Luxembourg'
        }
        cache[company_name] = result
        save_cache()
        return result

    return {
        'address': '',
        'city': 'Luxembourg',
        'country': 'Luxembourg'
    }

print("🏢 CSSF ADDRESS SCRAPER")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

print(f"📊 {len(companies)} companies to enrich")
print(f"💾 Cache: {len(cache)} addresses already scraped")
print()

# Setup Selenium
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

driver = webdriver.Chrome(options=options)

try:
    for i, company in enumerate(companies, 1):
        name = company['name']

        print(f"[{i}/266] {name[:50]}")

        # Search CSSF
        result = search_cssf_entity(driver, name)

        # Update company data
        company['address'] = result['address']
        company['city'] = result.get('city', 'Luxembourg')
        company['country'] = result.get('country', 'Luxembourg')

        # Rate limiting
        time.sleep(2)

        # Save progress every 10 companies
        if i % 10 == 0:
            with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
                fieldnames = list(companies[0].keys())
                if 'address' not in fieldnames:
                    fieldnames.append('address')
                if 'city' not in fieldnames:
                    fieldnames.append('city')
                if 'country' not in fieldnames:
                    fieldnames.append('country')

                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(companies)

            print(f"\n💾 Progress saved ({i}/266)\n")

finally:
    driver.quit()

# Final save
fieldnames = list(companies[0].keys())
if 'address' not in fieldnames:
    fieldnames.append('address')
if 'city' not in fieldnames:
    fieldnames.append('city')
if 'country' not in fieldnames:
    fieldnames.append('country')

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(companies)

print()
print("=" * 70)
print("✅ ADDRESSES EXTRACTION COMPLETE")
print("=" * 70)
print()

addresses_found = sum(1 for c in companies if c.get('address'))
print(f"✓ Addresses found: {addresses_found}/266 ({(addresses_found/266*100):.1f}%)")
print()
print(f"💾 {OUTPUT_CSV}")
print()
