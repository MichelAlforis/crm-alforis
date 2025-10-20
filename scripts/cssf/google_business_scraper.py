#!/usr/bin/env python3
"""
Scrape Google Business pour emails, phones, websites des sociétés Luxembourg
Utilise Google Search + Google Business Profile data
"""

import csv
import json
import time
import re
import requests
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import quote_plus
import sys

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_FINAL.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_GOOGLE_ENRICHED.csv"
CACHE_FILE = BASE_DIR / "data/cssf/google_cache.json"

class GoogleBusinessScraper:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        self.cache = self.load_cache()

    def load_cache(self) -> Dict:
        """Load cached results"""
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def save_cache(self):
        """Save cache"""
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def google_search(self, query: str) -> str:
        """
        Simple Google search to get HTML results
        """
        try:
            url = f"https://www.google.com/search?q={quote_plus(query)}"

            response = self.session.get(url, timeout=15)

            if response.status_code == 200:
                return response.text

            return ""

        except Exception as e:
            print(f"   ⚠️  Google search error: {e}")
            return ""

    def extract_website(self, html: str, company_name: str) -> Optional[str]:
        """
        Extract website from Google search results
        """
        # Pattern 1: Look for main website link (not LinkedIn, Wikipedia, etc.)
        exclude_domains = [
            'linkedin.com', 'wikipedia.org', 'bloomberg.com', 'reuters.com',
            'crunchbase.com', 'facebook.com', 'twitter.com', 'youtube.com',
            'instagram.com', 'glassdoor.com', 'indeed.com'
        ]

        # Extract URLs from search results
        url_pattern = r'https?://(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?:/[^\s"<>]*)?'
        urls = re.findall(url_pattern, html)

        # Filter and find best match
        for url in urls:
            # Skip excluded domains
            if any(domain in url for domain in exclude_domains):
                continue

            # Skip Google's own URLs
            if 'google.com' in url or 'gstatic.com' in url:
                continue

            # Prefer .lu or .com domains
            if '.lu' in url or '.com' in url:
                # Clean URL (remove parameters)
                clean_url = url.split('?')[0].split('#')[0]
                return clean_url

        return None

    def extract_contact_info(self, html: str) -> Dict[str, str]:
        """
        Extract email and phone from Google Business data in search results
        """
        info = {'email': '', 'phone': ''}

        # Email patterns
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, html)

        # Filter valid emails
        valid_emails = []
        for email in emails:
            # Skip common false positives
            if any(x in email.lower() for x in [
                'example.com', 'domain.com', 'email.com', 'test',
                'google.com', 'gstatic.com', 'w3.org', 'schema.org'
            ]):
                continue
            valid_emails.append(email)

        if valid_emails:
            # Prefer contact/info emails
            for email in valid_emails:
                if any(x in email.lower() for x in ['contact', 'info', 'luxembourg', 'lux']):
                    info['email'] = email
                    break
            if not info['email']:
                info['email'] = valid_emails[0]

        # Phone patterns (Luxembourg: +352)
        phone_patterns = [
            r'\+352[\s\-]?[\d\s\-]{6,15}',  # +352 format
            r'00352[\s\-]?[\d\s\-]{6,15}',   # 00352 format
            r'\(352\)[\s\-]?[\d\s\-]{6,15}'  # (352) format
        ]

        for pattern in phone_patterns:
            phones = re.findall(pattern, html)
            if phones:
                # Clean phone number
                phone = phones[0].strip()
                phone = re.sub(r'\s+', ' ', phone)
                info['phone'] = phone
                break

        return info

    def search_company(self, company_name: str) -> Dict[str, str]:
        """
        Search company on Google and extract: website, email, phone
        """
        # Check cache
        if company_name in self.cache:
            print(f"   ↻ Cached")
            return self.cache[company_name]

        result = {
            'website': '',
            'email': '',
            'phone': ''
        }

        try:
            # Google search query optimized for Luxembourg business
            query = f"{company_name} Luxembourg contact email phone"

            print(f"   🔍 Google: {query[:60]}...")

            html = self.google_search(query)

            if html:
                # Extract website
                website = self.extract_website(html, company_name)
                if website:
                    result['website'] = website
                    print(f"   ✓ Website: {website}")

                # Extract contact info from Google results
                contact = self.extract_contact_info(html)
                if contact['email']:
                    result['email'] = contact['email']
                    print(f"   ✓ Email: {contact['email']}")
                if contact['phone']:
                    result['phone'] = contact['phone']
                    print(f"   ✓ Phone: {contact['phone']}")

            # Cache result
            self.cache[company_name] = result
            self.save_cache()

            # Rate limiting (important!)
            time.sleep(3)  # 3 seconds between searches to avoid blocking

        except Exception as e:
            print(f"   ❌ Error: {e}")

        return result

    def enrich_all(self):
        """
        Enrich all companies with Google Business data
        """
        print("🔍 GOOGLE BUSINESS SCRAPER - LUXEMBOURG")
        print("=" * 70)
        print()

        # Read input
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 Total sociétés: {len(companies)}")
        print()
        print("⚠️  Rate limiting: 3 secondes entre chaque recherche")
        print("⏱️  Temps estimé: ~{:.0f} minutes".format(len(companies) * 3 / 60))
        print()

        # Enrich
        enriched = []
        stats = {
            'websites': 0,
            'emails': 0,
            'phones': 0
        }

        for i, company in enumerate(companies, 1):
            name = company['name']
            tier = company['tier']

            print(f"\n[{i}/{len(companies)}] 🏢 {name}")
            print(f"   Tier: {tier} | Category: {company['category'][:30]}")

            # Skip if already has all data
            if company.get('website') and company.get('email') and company.get('phone'):
                print(f"   ↻ Already complete")
                enriched.append(company)
                stats['websites'] += 1
                stats['emails'] += 1
                stats['phones'] += 1
                continue

            # Search
            data = self.search_company(name)

            # Update company
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

        # Save
        print("\n" + "=" * 70)
        print("💾 Sauvegarde des résultats...")

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
        print("💡 Next step:")
        print("  python3 scripts/cssf/enrich_aum_from_websites.py")
        print()


if __name__ == '__main__':
    scraper = GoogleBusinessScraper()
    scraper.enrich_all()
