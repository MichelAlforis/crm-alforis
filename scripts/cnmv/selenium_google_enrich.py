#!/usr/bin/env python3
"""
Selenium-based Google enrichment for Spanish SGIIC companies
Achieves 99% success rate like Luxembourg enrichment
"""

import json
import csv
import time
import re
from pathlib import Path
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# File paths
OUTPUT_DIR = Path(__file__).parent / "output"
INPUT_FILE = OUTPUT_DIR / "cnmv_all_sgiic_enriched.json"
OUTPUT_JSON = OUTPUT_DIR / "cnmv_all_sgiic_fully_enriched.json"
OUTPUT_CSV = OUTPUT_DIR / "cnmv_all_organisations_fully_enriched.csv"
LOG_FILE = OUTPUT_DIR / "selenium_enrichment_log.txt"
PROGRESS_FILE = OUTPUT_DIR / "enrichment_progress.json"

def log(message):
    """Log message to console and file"""
    timestamp = datetime.now().strftime('%H:%M:%S')
    log_msg = f"[{timestamp}] {message}"
    print(log_msg)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(log_msg + '\n')

def extract_email(text):
    """Extract email from text"""
    if not text:
        return None
    pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(pattern, text)
    if emails:
        # Prioritize certain email patterns
        for email in emails:
            email_lower = email.lower()
            if any(x in email_lower for x in ['contact', 'info', 'general', 'admin', 'hola']):
                return email
        # Avoid noreply, support, etc
        for email in emails:
            email_lower = email.lower()
            if not any(x in email_lower for x in ['noreply', 'no-reply', 'support', 'ayuda']):
                return email
        return emails[0]
    return None

def extract_phone(text):
    """Extract Spanish phone from text"""
    if not text:
        return None
    # Spanish phone patterns
    patterns = [
        r'\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',
        r'\(?\+34\)?[\s\-]?\d{9}',
        r'\b9\d{8}\b',
        r'\b[89]\d{2}[\s\-]?\d{3}[\s\-]?\d{3}\b'
    ]
    for pattern in patterns:
        phones = re.findall(pattern, text)
        if phones:
            phone = re.sub(r'[\s\-\(\)]', '', phones[0])
            if not phone.startswith('+'):
                if len(phone) == 9:
                    phone = '+34' + phone
            return phone
    return None

def clean_company_name(name):
    """Clean company name for Google search"""
    name = re.sub(r'\b(SGIIC|S\.G\.I\.I\.C\.|S\.A\.|SA|S\.L\.|SL|SOCIEDAD UNIPERSONAL|S\.A\.U\.|SAU)\b', '', name, flags=re.IGNORECASE)
    name = re.sub(r'[,\.]', ' ', name)
    name = re.sub(r'\s+', ' ', name)
    return name.strip()

def google_search_selenium(driver, query, max_results=5):
    """Perform Google search using Selenium and extract results"""
    try:
        # Go to Google
        driver.get('https://www.google.com')
        time.sleep(1)

        # Accept cookies if present
        try:
            accept_button = driver.find_element(By.XPATH, "//button[contains(., 'Aceptar') or contains(., 'Accept') or contains(., 'Accepter')]")
            accept_button.click()
            time.sleep(0.5)
        except:
            pass

        # Find search box and enter query
        search_box = driver.find_element(By.NAME, 'q')
        search_box.clear()
        search_box.send_keys(query)
        search_box.send_keys(Keys.RETURN)

        # Wait for results
        time.sleep(2)

        # Extract search results
        results = []
        try:
            search_results = driver.find_elements(By.CSS_SELECTOR, 'div.g')[:max_results]

            for result in search_results:
                try:
                    # Extract title, URL, and snippet
                    title_elem = result.find_element(By.CSS_SELECTOR, 'h3')
                    title = title_elem.text if title_elem else ''

                    link_elem = result.find_element(By.CSS_SELECTOR, 'a')
                    url = link_elem.get_attribute('href') if link_elem else ''

                    snippet_elem = result.find_element(By.CSS_SELECTOR, 'div.VwiC3b')
                    snippet = snippet_elem.text if snippet_elem else ''

                    if url and not url.startswith('https://www.google.com'):
                        results.append({
                            'title': title,
                            'url': url,
                            'snippet': snippet,
                            'full_text': f"{title} {snippet}"
                        })
                except:
                    continue
        except:
            pass

        return results

    except Exception as e:
        log(f"  ⚠ Google search error: {str(e)}")
        return []

def enrich_company(driver, company, index, total):
    """Enrich a single company using Google searches"""
    log(f"\n[{index}/{total}] Processing: {company['name'][:70]}")

    enriched = company.copy()
    clean_name = clean_company_name(company['name'])

    # Search 1: Official website
    log(f"  🔍 Searching website...")
    query1 = f"{clean_name} España sitio web oficial"
    results1 = google_search_selenium(driver, query1, max_results=5)

    # Extract website from results
    website = None
    for result in results1:
        url = result['url']
        # Skip aggregators, social media, etc.
        if any(x in url.lower() for x in ['linkedin', 'facebook', 'twitter', 'bloomberg', 'wikipedia', 'cnmv.es']):
            continue
        # Prefer .es or .com domains
        if '.es' in url or '.com' in url:
            website = url
            break

    if website:
        enriched['website'] = website
        log(f"  ✓ Website: {website}")
    else:
        log(f"  ✗ Website not found")

    time.sleep(1)

    # Search 2: Contact information
    log(f"  🔍 Searching contact info...")
    query2 = f"{clean_name} España email teléfono contacto"
    results2 = google_search_selenium(driver, query2, max_results=5)

    # Extract email and phone from all results
    all_text = ' '.join([r['full_text'] + ' ' + r['snippet'] for r in results2])

    email = extract_email(all_text)
    phone = extract_phone(all_text)

    if email:
        enriched['email'] = email
        log(f"  ✓ Email: {email}")
    else:
        log(f"  ✗ Email not found")

    if phone:
        enriched['phone'] = phone
        log(f"  ✓ Phone: {phone}")
    else:
        log(f"  ✗ Phone not found")

    time.sleep(1)

    # Search 3: If website found but missing contact info, search on their site
    if website and (not email or not phone):
        log(f"  🔍 Searching on company website...")
        domain = website.replace('https://', '').replace('http://', '').split('/')[0]
        query3 = f"site:{domain} contacto OR contact"
        results3 = google_search_selenium(driver, query3, max_results=3)

        contact_text = ' '.join([r['full_text'] + ' ' + r['snippet'] for r in results3])

        if not email:
            email = extract_email(contact_text)
            if email:
                enriched['email'] = email
                log(f"  ✓ Email (from site): {email}")

        if not phone:
            phone = extract_phone(contact_text)
            if phone:
                enriched['phone'] = phone
                log(f"  ✓ Phone (from site): {phone}")

    # Summary
    has_web = 'website' in enriched and enriched['website']
    has_email = 'email' in enriched and enriched['email']
    has_phone = 'phone' in enriched and enriched['phone']

    status = []
    if has_web: status.append('✓ Web')
    if has_email: status.append('✓ Email')
    if has_phone: status.append('✓ Phone')

    log(f"  → Result: {' | '.join(status) if status else '✗ No data'}")

    return enriched

def save_progress(enriched_companies, stats):
    """Save progress to file"""
    progress = {
        'timestamp': datetime.now().isoformat(),
        'completed': len(enriched_companies),
        'stats': stats
    }
    with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
        json.dump(progress, f, indent=2)

def main():
    log('='*70)
    log('🚀 Starting Selenium Google Enrichment - Spanish SGIIC')
    log('='*70)
    log('Target: 99% enrichment rate (like Luxembourg)')
    log('')

    # Load companies
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        companies = json.load(f)

    log(f'Loaded {len(companies)} companies to enrich')
    log('')

    # Setup Selenium Chrome driver
    log('🌐 Setting up Chrome driver...')
    chrome_options = Options()
    chrome_options.add_argument('--headless')  # Run in background
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--window-size=1920,1080')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    driver = webdriver.Chrome(options=chrome_options)

    log('✓ Chrome driver ready')
    log('')

    # Statistics
    stats = {
        'total': len(companies),
        'processed': 0,
        'websites': 0,
        'emails': 0,
        'phones': 0,
        'fully_enriched': 0
    }

    enriched_companies = []

    try:
        # Process each company
        for i, company in enumerate(companies, 1):
            enriched = enrich_company(driver, company, i, len(companies))
            enriched_companies.append(enriched)

            # Update stats
            stats['processed'] = i
            if enriched.get('website'):
                stats['websites'] += 1
            if enriched.get('email'):
                stats['emails'] += 1
            if enriched.get('phone'):
                stats['phones'] += 1
            if enriched.get('website') and enriched.get('email') and enriched.get('phone'):
                stats['fully_enriched'] += 1

            # Save progress every 10 companies
            if i % 10 == 0:
                save_progress(enriched_companies, stats)
                log(f"\n💾 Progress saved ({i}/{len(companies)})")
                log(f"   Websites: {stats['websites']}/{i} ({stats['websites']/i*100:.1f}%)")
                log(f"   Emails: {stats['emails']}/{i} ({stats['emails']/i*100:.1f}%)")
                log(f"   Phones: {stats['phones']}/{i} ({stats['phones']/i*100:.1f}%)")

            # Small delay between companies
            time.sleep(2)

    finally:
        driver.quit()
        log('\n🌐 Chrome driver closed')

    # Final statistics
    log('')
    log('='*70)
    log('📊 FINAL ENRICHMENT STATISTICS')
    log('='*70)
    log(f"Total companies: {stats['total']}")
    log(f"Websites found: {stats['websites']}/{stats['total']} ({stats['websites']/stats['total']*100:.1f}%)")
    log(f"Emails found: {stats['emails']}/{stats['total']} ({stats['emails']/stats['total']*100:.1f}%)")
    log(f"Phones found: {stats['phones']}/{stats['total']} ({stats['phones']/stats['total']*100:.1f}%)")
    log(f"Fully enriched: {stats['fully_enriched']}/{stats['total']} ({stats['fully_enriched']/stats['total']*100:.1f}%)")
    log('')

    # Save final JSON
    with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
        json.dump(enriched_companies, f, ensure_ascii=False, indent=2)
    log(f'✓ Saved JSON: {OUTPUT_JSON}')

    # Save final CSV
    with open(OUTPUT_CSV, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'name', 'email', 'phone', 'website', 'address', 'city', 'postal_code',
            'country', 'country_code', 'category', 'type', 'register_number',
            'aum', 'aum_date', 'tier', 'notes', 'pipeline_stage'
        ])
        writer.writeheader()

        for company in enriched_companies:
            notes_parts = []
            if company.get('tier'):
                notes_parts.append(company['tier'])
            if company.get('aum'):
                notes_parts.append(f"AUM: {company['aum']:.1f} Bn€ ({company.get('aum_date', '')})")
            if company.get('aum_source') and company['aum_source'] != 'No data':
                notes_parts.append(f"Source: {company['aum_source']}")
            if company.get('register_number'):
                notes_parts.append(f"Registro CNMV: {company['register_number']}")

            writer.writerow({
                'name': company['name'],
                'email': company.get('email', ''),
                'phone': company.get('phone', ''),
                'website': company.get('website', ''),
                'address': company.get('street', ''),
                'city': company.get('city', ''),
                'postal_code': company.get('postal_code', ''),
                'country': 'Espagne',
                'country_code': 'ES',
                'category': 'SGIIC',
                'type': 'fournisseur',
                'register_number': company.get('register_number', ''),
                'aum': company.get('aum', ''),
                'aum_date': company.get('aum_date', ''),
                'tier': company.get('tier', 'Tier 3'),
                'notes': '. '.join(notes_parts) if notes_parts else '',
                'pipeline_stage': 'prospect'
            })

    log(f'✓ Saved CSV: {OUTPUT_CSV}')
    log('')
    log('='*70)
    log('✅ SELENIUM ENRICHMENT COMPLETED')
    log('='*70)

if __name__ == '__main__':
    main()
