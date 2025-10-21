#!/usr/bin/env python3
"""
Enrichissement complet depuis les websites:
- Téléphones standards
- Dirigeants/Représentants
"""

import json
import csv
import requests
from bs4 import BeautifulSoup
import time
import re
from pathlib import Path
from urllib.parse import urljoin

BASE_DIR = Path(__file__).parent
INPUT_CSV = BASE_DIR / "output/cnmv_import_crm.csv"
OUTPUT_JSON = BASE_DIR / "output/website_enrichment.json"
CACHE_FILE = BASE_DIR / "output/website_enrichment_cache.json"

class WebsiteEnricher:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.cache = self.load_cache()

    def load_cache(self):
        """Load cache"""
        if CACHE_FILE.exists():
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        return {}

    def save_cache(self):
        """Save cache"""
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(self.cache, f, indent=2, ensure_ascii=False)

    def extract_phone_from_page(self, url):
        """Extract phone numbers from a page"""
        phones = []

        try:
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                return phones

            soup = BeautifulSoup(response.content, 'html.parser')
            text = soup.get_text()

            # Spanish phone patterns
            phone_patterns = [
                r'\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3}',
                r'\+34[\s\-]?\d{9}',
                r'34[\s\-]\d{2,3}[\s\-]\d{3}[\s\-]\d{3}',
                r'Tel[éeE]fono[:\s]+(\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3})',
                r'Tel[:\s]+(\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3})',
                r'Phone[:\s]+(\+34[\s\-]?\d{2,3}[\s\-]?\d{3}[\s\-]?\d{3})'
            ]

            for pattern in phone_patterns:
                matches = re.findall(pattern, text)
                for match in matches:
                    # Clean phone
                    if isinstance(match, tuple):
                        match = match[0]
                    phone = re.sub(r'\s+', ' ', match.strip())

                    # Ensure it starts with +34
                    if not phone.startswith('+'):
                        if phone.startswith('34'):
                            phone = '+' + phone
                        else:
                            phone = '+34 ' + phone

                    phones.append(phone)

            # Remove duplicates
            phones = list(set(phones))

        except Exception as e:
            pass

        return phones

    def extract_directors_from_page(self, url):
        """Extract director names from a page"""
        directors = []

        try:
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                return directors

            soup = BeautifulSoup(response.content, 'html.parser')

            # Look for team sections
            team_sections = soup.find_all(['div', 'section'], class_=re.compile(
                r'(team|equipo|equipe|management|direccion|directiv|about|nosotros)', re.I
            ))

            for section in team_sections:
                # Look for people
                people = section.find_all(['div', 'article', 'li'], class_=re.compile(
                    r'(member|person|bio|profile|card)', re.I
                ))

                for person in people:
                    name = None
                    position = None

                    # Find name
                    name_elem = person.find(['h2', 'h3', 'h4', 'h5', 'p'], class_=re.compile(r'name', re.I))
                    if not name_elem:
                        name_elem = person.find(['h2', 'h3', 'h4', 'h5'])

                    if name_elem:
                        name = name_elem.get_text(strip=True)

                    # Find position
                    position_elem = person.find(['p', 'span', 'div'], class_=re.compile(
                        r'(position|cargo|title|role|puesto)', re.I
                    ))
                    if position_elem:
                        position = position_elem.get_text(strip=True)

                    # Validate name
                    if name and len(name.split()) >= 2:
                        if re.match(r'^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+', name):
                            directors.append({
                                'name': name,
                                'position': position or 'Director'
                            })

            # Text search for titles
            text_content = soup.get_text()
            director_patterns = [
                r'Director\s+General[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Director\s+Comercial[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'CEO[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Managing\s+Director[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
            ]

            for pattern in director_patterns:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    if match not in [d['name'] for d in directors]:
                        directors.append({
                            'name': match,
                            'position': 'Director General' if 'General' in pattern else 'Director'
                        })

        except Exception as e:
            pass

        return directors

    def enrich_from_website(self, website_url):
        """Enrich data from website"""

        # Check cache
        if website_url in self.cache:
            return self.cache[website_url]

        result = {
            'phones': [],
            'directors': []
        }

        try:
            # Clean URL
            if not website_url.startswith('http'):
                website_url = 'https://' + website_url

            # Try homepage first
            phones = self.extract_phone_from_page(website_url)
            directors = self.extract_directors_from_page(website_url)

            result['phones'].extend(phones)
            result['directors'].extend(directors)

            # Try contact page
            contact_paths = ['/contacto', '/contact', '/es/contacto', '/en/contact']
            for path in contact_paths:
                try:
                    contact_url = urljoin(website_url, path)
                    response = self.session.head(contact_url, timeout=5, allow_redirects=True)
                    if response.status_code == 200:
                        phones_contact = self.extract_phone_from_page(contact_url)
                        result['phones'].extend(phones_contact)
                        break
                except:
                    continue

            # Try team page
            team_paths = ['/equipo', '/team', '/nosotros', '/about', '/es/equipo', '/en/team']
            for path in team_paths:
                try:
                    team_url = urljoin(website_url, path)
                    response = self.session.head(team_url, timeout=5, allow_redirects=True)
                    if response.status_code == 200:
                        directors_team = self.extract_directors_from_page(team_url)
                        result['directors'].extend(directors_team)
                        break
                except:
                    continue

            # Remove duplicates
            result['phones'] = list(set(result['phones']))

            # Remove duplicate directors
            seen = set()
            unique_directors = []
            for d in result['directors']:
                if d['name'] not in seen:
                    seen.add(d['name'])
                    unique_directors.append(d)
            result['directors'] = unique_directors

        except Exception as e:
            pass

        # Cache result
        self.cache[website_url] = result
        self.save_cache()

        # Rate limiting
        time.sleep(3)

        return result

    def enrich_all(self):
        """Enrich all organizations with websites"""

        print("=" * 80)
        print("  ENRICHISSEMENT DEPUIS WEBSITES")
        print("=" * 80)
        print()

        # Load organizations
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        # Filter those with websites
        companies_with_websites = [c for c in companies if c.get('website')]

        print(f"🎯 Target: {len(companies_with_websites)} organisations avec website")
        print()

        # Enrich
        results = []

        for i, company in enumerate(companies_with_websites, 1):
            name = company['name']
            website = company['website']

            print(f"[{i}/{len(companies_with_websites)}] 🏢 {name[:50]}")
            print(f"   🌐 {website}")

            # Enrich
            data = self.enrich_from_website(website)

            result = {
                'company_name': name,
                'website': website,
                'phones': data['phones'],
                'directors': data['directors'],
                'phones_count': len(data['phones']),
                'directors_count': len(data['directors'])
            }

            if data['phones']:
                print(f"   ✅ {len(data['phones'])} téléphone(s): {data['phones'][0]}")
            if data['directors']:
                print(f"   ✅ {len(data['directors'])} dirigeant(s): {data['directors'][0]['name']}")
            if not data['phones'] and not data['directors']:
                print(f"   ⚠️  Aucune donnée extraite")

            results.append(result)

            # Save progress every 10
            if i % 10 == 0:
                self.save_results(results)

        # Save final
        self.save_results(results)

        # Stats
        print("\n" + "=" * 80)
        print("📊 RÉSULTATS")
        print("=" * 80)
        print()

        total_phones = sum(r['phones_count'] for r in results)
        companies_with_phones = sum(1 for r in results if r['phones_count'] > 0)

        total_directors = sum(r['directors_count'] for r in results)
        companies_with_directors = sum(1 for r in results if r['directors_count'] > 0)

        print(f"Sociétés scrapées:           {len(results)}")
        print()
        print(f"📞 Téléphones:")
        print(f"   Sociétés avec téléphones: {companies_with_phones} ({companies_with_phones/len(results)*100:.1f}%)")
        print(f"   Total téléphones trouvés: {total_phones}")
        print()
        print(f"👤 Dirigeants:")
        print(f"   Sociétés avec dirigeants: {companies_with_directors} ({companies_with_directors/len(results)*100:.1f}%)")
        print(f"   Total dirigeants trouvés: {total_directors}")
        print()
        print(f"✅ Saved: {OUTPUT_JSON}")
        print()
        print("=" * 80)

    def save_results(self, results):
        """Save results to JSON"""
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    enricher = WebsiteEnricher()
    enricher.enrich_all()
