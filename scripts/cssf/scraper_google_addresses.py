#!/usr/bin/env python3
"""
Google Address Scraper - Luxembourg CSSF
Scrape missing addresses via Selenium + Google Search
Target: 100% address coverage (227 companies missing addresses)
"""

import csv
import time
import json
import re
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_ENRICHED.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_ORGANISATIONS_COMPLETE.csv"
CACHE_FILE = BASE_DIR / "data" / "cssf" / "google_addresses_cache.json"

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

def extract_luxembourg_address(text):
    """Extract Luxembourg address from text"""
    patterns = [
        # Full address with L-code
        r'(\d+[a-z]?,?\s+(?:Avenue|Rue|Boulevard|Place|Route|Allée|Chemin|Street|Road)[^,\n]{5,60}[,\s]+L-?\d{4}\s+[A-Z]\w+)',
        # Reverse order
        r'(L-?\d{4}\s+\w+[,\s]+\d+[^,\n]{10,60})',
        # Simple format
        r'([A-Z][^,\n]{10,50}[,\s]+L-?\d{4}\s+[A-Z]\w+)',
        # Just street + code
        r'(\d+[,\s]+[^,\n]{5,40}\s+L-?\d{4})',
    ]

    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
        for match in matches:
            address = match.group(1).strip()
            address = re.sub(r'\s+', ' ', address)
            if 'L-' in address.upper():
                return address

    return None

def search_google_address(driver, company_name):
    """Search Google for company address in Luxembourg"""

    # Check cache
    cache_key = company_name
    if cache_key in cache:
        return cache[cache_key]

    result = {'address': ''}

    try:
        # Navigate to Google
        driver.get("https://www.google.com")
        time.sleep(1)

        # Find search box
        search_box = driver.find_element(By.NAME, "q")

        # Search query: "Company Name Luxembourg address"
        query = f'"{company_name}" Luxembourg address'
        search_box.clear()
        search_box.send_keys(query)
        search_box.send_keys(Keys.RETURN)

        time.sleep(2)

        # Extract text from search results
        try:
            results_container = driver.find_element(By.ID, "search")
            results_text = results_container.text
        except:
            results_text = driver.find_element(By.TAG_NAME, "body").text

        # Extract address
        address = extract_luxembourg_address(results_text)

        if address:
            result['address'] = address
            print(f"      ✓ Found: {address[:70]}")
        else:
            print(f"      ⊘ Not found")

        # Cache result
        cache[cache_key] = result
        save_cache()

        return result

    except Exception as e:
        print(f"      ✗ Error: {str(e)[:60]}")
        cache[cache_key] = result
        save_cache()
        return result

print("🔍 GOOGLE ADDRESS SCRAPER - LUXEMBOURG CSSF")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

# Filter companies without address
companies_without_address = [c for c in companies if not c.get('address')]
companies_with_address = [c for c in companies if c.get('address')]

print(f"📊 Total companies: {len(companies)}")
print(f"✓ Already have address: {len(companies_with_address)}")
print(f"⚠ Missing address: {len(companies_without_address)}")
print(f"💾 Cache: {len(cache)} addresses already searched")
print()

if len(companies_without_address) == 0:
    print("✅ All companies already have addresses!")
    exit(0)

# Setup Selenium
options = webdriver.ChromeOptions()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')

driver = webdriver.Chrome(options=options)

stats = {
    'found': 0,
    'not_found': 0,
}

try:
    for i, company in enumerate(companies_without_address, 1):
        name = company['name']

        print(f"[{i}/{len(companies_without_address)}] {name[:50]}")

        # Search Google
        result = search_google_address(driver, name)

        # Update company
        if result['address']:
            company['address'] = result['address']
            stats['found'] += 1
        else:
            stats['not_found'] += 1

        # Rate limiting - 3 seconds between searches
        time.sleep(3)

        # Save progress every 10 companies
        if i % 10 == 0:
            # Merge with companies that already had addresses
            all_companies = companies_with_address + companies_without_address

            with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
                fieldnames = list(companies[0].keys())
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(all_companies)

            print(f"\n💾 Progress saved ({i}/{len(companies_without_address)})\n")

finally:
    driver.quit()

# Final save
all_companies = companies_with_address + companies_without_address

with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    fieldnames = list(companies[0].keys())
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(all_companies)

print()
print("=" * 70)
print("✅ GOOGLE ADDRESS SCRAPING COMPLETE")
print("=" * 70)
print()

total_addresses = len([c for c in all_companies if c.get('address')])

print(f"✓ Addresses found (new):  {stats['found']}")
print(f"⊘ Not found:              {stats['not_found']}")
print()
print(f"🎯 TOTAL ADDRESSES: {total_addresses}/266 ({(total_addresses/266*100):.1f}%)")
print()
print(f"💾 {OUTPUT_CSV}")
print()
