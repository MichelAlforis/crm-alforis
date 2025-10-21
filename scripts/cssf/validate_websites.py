#!/usr/bin/env python3
"""
Validate Websites - CSSF Luxembourg
Backtest 260 websites to verify which ones are valid/reachable
"""

import csv
import time
import requests
from pathlib import Path
from urllib.parse import urlparse

BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_WITH_WEBSITES.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_WEBSITES_VALIDATED.csv"

# HTTP headers to mimic a real browser
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
}

def check_website(url, company_name):
    """Check if website is valid/reachable"""
    if not url or not url.startswith('http'):
        return {
            'status': 'INVALID',
            'status_code': None,
            'final_url': url,
            'error': 'No URL or invalid format'
        }

    try:
        # Try HEAD request first (faster)
        response = requests.head(url, headers=HEADERS, timeout=10, allow_redirects=True)

        # Some servers don't support HEAD, try GET if HEAD fails
        if response.status_code >= 400:
            response = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)

        final_url = response.url
        status_code = response.status_code

        if status_code < 400:
            status = 'VALID'
        elif status_code == 404:
            status = 'NOT_FOUND'
        else:
            status = 'ERROR'

        return {
            'status': status,
            'status_code': status_code,
            'final_url': final_url,
            'error': None
        }

    except requests.exceptions.SSLError as e:
        # Try without SSL verification
        try:
            response = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True, verify=False)
            return {
                'status': 'VALID_NO_SSL',
                'status_code': response.status_code,
                'final_url': response.url,
                'error': 'SSL cert issue (valid otherwise)'
            }
        except Exception as e2:
            return {
                'status': 'SSL_ERROR',
                'status_code': None,
                'final_url': url,
                'error': str(e)[:100]
            }

    except requests.exceptions.ConnectionError as e:
        return {
            'status': 'CONNECTION_ERROR',
            'status_code': None,
            'final_url': url,
            'error': 'Cannot connect to server'
        }

    except requests.exceptions.Timeout:
        return {
            'status': 'TIMEOUT',
            'status_code': None,
            'final_url': url,
            'error': 'Request timeout (>10s)'
        }

    except Exception as e:
        return {
            'status': 'UNKNOWN_ERROR',
            'status_code': None,
            'final_url': url,
            'error': str(e)[:100]
        }

print("🔍 VALIDATING LUXEMBOURG WEBSITES")
print("=" * 70)
print()

# Load companies
with open(INPUT_CSV, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    companies = list(reader)

print(f"📊 {len(companies)} companies to validate")
print()

stats = {
    'VALID': 0,
    'VALID_NO_SSL': 0,
    'NOT_FOUND': 0,
    'CONNECTION_ERROR': 0,
    'TIMEOUT': 0,
    'SSL_ERROR': 0,
    'INVALID': 0,
    'ERROR': 0,
    'UNKNOWN_ERROR': 0
}

results = []

for i, company in enumerate(companies, 1):
    name = company['name']
    website = company.get('website', '')
    email = company.get('email', '')

    # Skip if no website
    if not website:
        print(f"[{i}/266] ⊘ {name[:50]:50} | NO WEBSITE")
        company['website_status'] = 'NO_WEBSITE'
        company['website_status_code'] = ''
        company['website_final_url'] = ''
        company['website_error'] = ''
        results.append(company)
        continue

    # Check website
    result = check_website(website, name)
    status = result['status']

    # Update stats
    stats[status] = stats.get(status, 0) + 1

    # Status emoji
    emoji_map = {
        'VALID': '✓',
        'VALID_NO_SSL': '⚠',
        'NOT_FOUND': '✗',
        'CONNECTION_ERROR': '✗',
        'TIMEOUT': '⏱',
        'SSL_ERROR': '✗',
        'INVALID': '⊘',
        'ERROR': '✗',
        'UNKNOWN_ERROR': '✗'
    }
    emoji = emoji_map.get(status, '?')

    # Print result
    status_short = status[:15]
    website_short = website[:35]
    print(f"[{i}/266] {emoji} {name[:40]:40} | {website_short:35} → {status_short}")

    # Add validation results to company
    company['website_status'] = status
    company['website_status_code'] = result['status_code'] or ''
    company['website_final_url'] = result['final_url']
    company['website_error'] = result['error'] or ''

    results.append(company)

    # Rate limiting: 1 request per second
    time.sleep(1)

# Save results
print("\n" + "=" * 70)
fieldnames = list(companies[0].keys()) + ['website_status', 'website_status_code', 'website_final_url', 'website_error']
with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(results)

print(f"💾 {OUTPUT_CSV}\n")

print("=" * 70)
print("📊 VALIDATION RESULTS")
print("=" * 70)
print()

# Valid websites
valid_count = stats['VALID'] + stats['VALID_NO_SSL']
total_with_website = sum(1 for c in companies if c.get('website'))

print(f"✓ Valid websites:        {stats['VALID']}")
print(f"⚠ Valid (SSL warning):   {stats['VALID_NO_SSL']}")
print(f"✗ Not found (404):       {stats['NOT_FOUND']}")
print(f"✗ Connection error:      {stats['CONNECTION_ERROR']}")
print(f"✗ SSL error:             {stats['SSL_ERROR']}")
print(f"⏱ Timeout:               {stats['TIMEOUT']}")
print(f"⊘ Invalid format:        {stats['INVALID']}")
print(f"✗ Other errors:          {stats['ERROR'] + stats['UNKNOWN_ERROR']}")
print()
print(f"TOTAL VALID: {valid_count}/{total_with_website} ({(valid_count/total_with_website*100):.1f}%)")
print()

# List invalid websites for manual correction
invalid_companies = [c for c in results if c.get('website_status') in ['NOT_FOUND', 'CONNECTION_ERROR', 'SSL_ERROR', 'INVALID', 'ERROR', 'UNKNOWN_ERROR']]

if invalid_companies:
    print("=" * 70)
    print(f"⚠️  {len(invalid_companies)} WEBSITES NEED MANUAL CORRECTION")
    print("=" * 70)
    print()
    for c in invalid_companies[:20]:  # Show first 20
        print(f"  • {c['name'][:45]:45} | {c.get('website', '')[:30]:30} | {c.get('website_status', '')}")

    if len(invalid_companies) > 20:
        print(f"\n  ... and {len(invalid_companies) - 20} more (see {OUTPUT_CSV})")

print()
