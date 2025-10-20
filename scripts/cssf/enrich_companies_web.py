#!/usr/bin/env python3
"""
Enrich Luxembourg companies with web data (websites, emails, phones, addresses)
Uses Google Search + Web Scraping + Hunter.io API
"""

import csv
import json
import time
import re
import requests
from pathlib import Path
from typing import Dict, List, Optional
import sys

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
INPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_GESTION_COMPLET.csv"
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_ENRICHIES.csv"
PROGRESS_FILE = BASE_DIR / "data/cssf/enrichment_progress.json"

# Hunter.io API (optionnel - mettre votre clé si disponible)
HUNTER_API_KEY = ""  # À remplir si disponible

class CompanyEnricher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.progress = self.load_progress()

    def load_progress(self) -> Dict:
        """Load enrichment progress"""
        if PROGRESS_FILE.exists():
            with open(PROGRESS_FILE, 'r') as f:
                return json.load(f)
        return {}

    def save_progress(self):
        """Save enrichment progress"""
        PROGRESS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(PROGRESS_FILE, 'w') as f:
            json.dump(self.progress, f, indent=2)

    def search_company_website(self, company_name: str) -> Optional[str]:
        """
        Search company website using Google Custom Search API alternative
        Falls back to DuckDuckGo HTML parsing
        """
        try:
            # Clean company name for search
            search_query = f"{company_name} Luxembourg asset management official website"

            # DuckDuckGo HTML search (no API key needed)
            url = "https://html.duckduckgo.com/html/"
            params = {'q': search_query}

            response = self.session.post(url, data=params, timeout=10)

            if response.status_code == 200:
                # Extract first URL from results
                urls = re.findall(r'uddg=([^"&]+)', response.text)
                if urls:
                    from urllib.parse import unquote
                    first_url = unquote(urls[0])

                    # Validate it's a real company website (not LinkedIn, Wikipedia, etc.)
                    exclude_domains = ['linkedin.com', 'wikipedia.org', 'bloomberg.com',
                                     'reuters.com', 'crunchbase.com', 'facebook.com']

                    if not any(domain in first_url for domain in exclude_domains):
                        return first_url

            time.sleep(1)  # Rate limiting
            return None

        except Exception as e:
            print(f"   ⚠️  Error searching website: {e}")
            return None

    def extract_contact_info(self, website: str) -> Dict[str, str]:
        """
        Extract email and phone from company website
        """
        info = {'email': '', 'phone': ''}

        try:
            response = self.session.get(website, timeout=10)
            html = response.text

            # Extract email
            emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', html)
            # Filter out common non-contact emails
            valid_emails = [e for e in emails if not any(
                x in e.lower() for x in ['example.com', 'domain.com', 'email.com', 'test']
            )]
            if valid_emails:
                # Prefer contact@, info@, sales@ emails
                for email in valid_emails:
                    if any(x in email.lower() for x in ['contact', 'info', 'sales', 'investor']):
                        info['email'] = email
                        break
                if not info['email']:
                    info['email'] = valid_emails[0]

            # Extract phone (Luxembourg format: +352...)
            phones = re.findall(r'\+352[\s\-]?[\d\s\-]{6,12}', html)
            if phones:
                info['phone'] = phones[0].strip()

            time.sleep(1)  # Rate limiting

        except Exception as e:
            print(f"   ⚠️  Error extracting contacts: {e}")

        return info

    def get_hunter_email(self, company_name: str, domain: str) -> Optional[str]:
        """
        Get email pattern from Hunter.io API
        """
        if not HUNTER_API_KEY:
            return None

        try:
            url = "https://api.hunter.io/v2/domain-search"
            params = {
                'domain': domain,
                'api_key': HUNTER_API_KEY,
                'limit': 1
            }

            response = self.session.get(url, params=params, timeout=10)
            data = response.json()

            if data.get('data', {}).get('emails'):
                return data['data']['emails'][0]['value']

        except Exception as e:
            print(f"   ⚠️  Hunter.io error: {e}")

        return None

    def enrich_company(self, company: Dict) -> Dict:
        """
        Enrich single company with web data
        """
        name = company['name']

        # Check if already enriched
        if name in self.progress:
            print(f"   ↻ Already enriched (cached)")
            cached = self.progress[name]
            company.update(cached)
            return company

        print(f"🔍 Searching web data...")

        # 1. Search website
        website = self.search_company_website(name)
        if website:
            company['website'] = website
            print(f"   ✓ Website: {website}")

            # 2. Extract contact info from website
            contact_info = self.extract_contact_info(website)
            if contact_info['email']:
                company['email'] = contact_info['email']
                print(f"   ✓ Email: {contact_info['email']}")
            if contact_info['phone']:
                company['phone'] = contact_info['phone']
                print(f"   ✓ Phone: {contact_info['phone']}")

            # 3. Try Hunter.io for additional emails
            if HUNTER_API_KEY and not company['email']:
                domain = website.split('/')[2] if '/' in website else website
                hunter_email = self.get_hunter_email(name, domain)
                if hunter_email:
                    company['email'] = hunter_email
                    print(f"   ✓ Email (Hunter): {hunter_email}")

        # Cache results
        self.progress[name] = {
            'website': company['website'],
            'email': company['email'],
            'phone': company['phone']
        }
        self.save_progress()

        return company

    def enrich_all(self):
        """
        Enrich all companies from CSV
        """
        print("🇱🇺 ENRICHISSEMENT WEB - LUXEMBOURG")
        print("=" * 70)
        print()

        # Read input CSV
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        print(f"📊 Loaded {len(companies)} companies")
        print()

        # Enrich each company
        enriched_companies = []
        stats = {
            'websites_found': 0,
            'emails_found': 0,
            'phones_found': 0
        }

        for i, company in enumerate(companies, 1):
            print(f"\n[{i}/{len(companies)}] 🏢 {company['name']}")
            print(f"   Tier: {company['tier']} | Category: {company['category']}")

            enriched = self.enrich_company(company)
            enriched_companies.append(enriched)

            # Update stats
            if enriched['website']:
                stats['websites_found'] += 1
            if enriched['email']:
                stats['emails_found'] += 1
            if enriched['phone']:
                stats['phones_found'] += 1

            # Progress indicator
            print(f"   📊 Progress: {stats['websites_found']} websites | "
                  f"{stats['emails_found']} emails | {stats['phones_found']} phones")

            # Rate limiting
            time.sleep(2)

        # Write enriched CSV
        print("\n" + "=" * 70)
        print("💾 Saving enriched data...")

        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=companies[0].keys())
            writer.writeheader()
            writer.writerows(enriched_companies)

        print(f"   ✓ Saved: {OUTPUT_CSV}")
        print()

        # Final stats
        print("=" * 70)
        print("📊 RÉSULTATS FINAUX")
        print("=" * 70)
        print()
        print(f"Total sociétés: {len(companies)}")
        print()
        print(f"✓ Websites trouvés:  {stats['websites_found']:>3} ({stats['websites_found']/len(companies)*100:.1f}%)")
        print(f"✓ Emails trouvés:    {stats['emails_found']:>3} ({stats['emails_found']/len(companies)*100:.1f}%)")
        print(f"✓ Téléphones trouvés: {stats['phones_found']:>3} ({stats['phones_found']/len(companies)*100:.1f}%)")
        print()
        print("=" * 70)
        print()
        print("💡 Next steps:")
        print("  1. Vérifier les données enrichies")
        print("  2. Compléter manuellement les données manquantes")
        print("  3. Enrichir les AUM: python3 scripts/cssf/enrich_aum.py")
        print()


if __name__ == '__main__':
    enricher = CompanyEnricher()
    enricher.enrich_all()
