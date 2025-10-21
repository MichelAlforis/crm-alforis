#!/usr/bin/env python3
"""
Extraction des dirigeants depuis les pages websites
Pour les sociétés <1Mds (Tier 2 + Tier 3) qui ont un website
"""

import json
import csv
import requests
from bs4 import BeautifulSoup
import time
import re
from pathlib import Path
from urllib.parse import urljoin, urlparse

BASE_DIR = Path(__file__).parent
INPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
OUTPUT_JSON = BASE_DIR / "output/website_directors.json"
CACHE_FILE = BASE_DIR / "output/website_directors_cache.json"

class WebsiteDirectorExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        })
        self.cache = self.load_cache()

        # Common page paths to check
        self.team_paths = [
            '/equipo', '/equipe', '/team', '/about-us', '/nosotros', '/about',
            '/quienes-somos', '/empresa', '/contact', '/contacto',
            '/nuestra-empresa', '/our-team', '/management', '/direccion',
            '/es/equipo', '/es/equipe', '/en/team'
        ]

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

    def extract_directors_from_page(self, url):
        """Extract director names and positions from a page"""
        directors = []

        try:
            response = self.session.get(url, timeout=10)
            if response.status_code != 200:
                return directors

            soup = BeautifulSoup(response.content, 'html.parser')

            # Pattern 1: Look for specific sections
            team_sections = soup.find_all(['div', 'section'], class_=re.compile(
                r'(team|equipo|equipe|management|direccion|directiv|about)', re.I
            ))

            for section in team_sections:
                # Look for name + position patterns
                people = section.find_all(['div', 'article', 'li'], class_=re.compile(
                    r'(member|person|bio|profile|card)', re.I
                ))

                for person in people:
                    name = None
                    position = None

                    # Try to find name (usually in h2, h3, h4, or class="name")
                    name_elem = person.find(['h2', 'h3', 'h4', 'h5', 'p'], class_=re.compile(r'name', re.I))
                    if not name_elem:
                        name_elem = person.find(['h2', 'h3', 'h4', 'h5'])

                    if name_elem:
                        name = name_elem.get_text(strip=True)

                    # Try to find position
                    position_elem = person.find(['p', 'span', 'div'], class_=re.compile(
                        r'(position|cargo|title|role|puesto)', re.I
                    ))
                    if position_elem:
                        position = position_elem.get_text(strip=True)

                    # Validate name (should be 2+ words, capitalized)
                    if name and len(name.split()) >= 2:
                        # Check if it looks like a person name
                        if re.match(r'^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+', name):
                            directors.append({
                                'name': name,
                                'position': position or '',
                                'source': 'Website'
                            })

            # Pattern 2: Text search for common titles
            text_content = soup.get_text()

            # Spanish director titles
            director_patterns = [
                r'Director\s+General[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Director\s+Comercial[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Consejero\s+Delegado[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'CEO[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Managing\s+Director[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                r'Chief\s+Executive[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)',
                r'Presidente[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)'
            ]

            for pattern in director_patterns:
                matches = re.findall(pattern, text_content)
                for match in matches:
                    # Check if already found
                    if match not in [d['name'] for d in directors]:
                        # Determine position from pattern
                        if 'Comercial' in pattern:
                            pos = 'Director Comercial'
                        elif 'General' in pattern:
                            pos = 'Director General'
                        elif 'CEO' in pattern:
                            pos = 'CEO'
                        elif 'Managing' in pattern:
                            pos = 'Managing Director'
                        else:
                            pos = 'Director'

                        directors.append({
                            'name': match,
                            'position': pos,
                            'source': 'Website'
                        })

        except Exception as e:
            pass  # Silent fail for now

        return directors

    def find_team_page(self, base_url):
        """Try to find the team/about page"""

        # First try common paths
        for path in self.team_paths:
            try:
                url = urljoin(base_url, path)
                response = self.session.head(url, timeout=5, allow_redirects=True)
                if response.status_code == 200:
                    return url
            except:
                continue

        # Try homepage
        return base_url

    def extract_directors_from_website(self, website_url):
        """Extract directors from website"""

        # Check cache
        if website_url in self.cache:
            return self.cache[website_url]

        all_directors = []

        try:
            # Clean URL
            if not website_url.startswith('http'):
                website_url = 'https://' + website_url

            print(f"      🔍 Searching team page...")

            # Try to find team page
            team_url = self.find_team_page(website_url)

            if team_url:
                print(f"      📄 Found: {team_url}")
                directors = self.extract_directors_from_page(team_url)
                all_directors.extend(directors)

            # Also try homepage if different
            if team_url != website_url:
                directors_home = self.extract_directors_from_page(website_url)
                for d in directors_home:
                    if d['name'] not in [x['name'] for x in all_directors]:
                        all_directors.append(d)

            # Remove duplicates
            seen = set()
            unique_directors = []
            for d in all_directors:
                if d['name'] not in seen:
                    seen.add(d['name'])
                    unique_directors.append(d)

            if unique_directors:
                print(f"      ✅ {len(unique_directors)} dirigeant(s) trouvé(s)")
            else:
                print(f"      ⚠️  Aucun dirigeant trouvé")

        except Exception as e:
            print(f"      ❌ Error: {e}")
            unique_directors = []

        # Cache result
        self.cache[website_url] = unique_directors
        self.save_cache()

        # Rate limiting
        time.sleep(3)

        return unique_directors

    def extract_all_directors(self):
        """Extract directors for all Tier 2 and 3 companies with websites"""

        print("=" * 80)
        print("  EXTRACTION DIRIGEANTS WEBSITES - SOCIÉTÉS <1Mds")
        print("=" * 80)
        print()

        # Load companies
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        # Filter Tier 2 and 3 with websites
        target_companies = []
        for c in companies:
            tier = c.get('tier', '')
            website = c.get('website', '')
            if tier in ['Tier 2', 'Tier 3'] and website:
                target_companies.append(c)

        print(f"🎯 Target: {len(target_companies)} sociétés avec website")
        print()

        # Extract directors
        results = []

        for i, company in enumerate(target_companies, 1):
            name = company['name']
            website = company.get('website', '')
            tier = company.get('tier', '')

            print(f"\n[{i}/{len(target_companies)}] 🏢 {name}")
            print(f"   Tier: {tier}")
            print(f"   🌐 {website}")

            # Extract directors
            directors = self.extract_directors_from_website(website)

            result = {
                'company_name': name,
                'website': website,
                'tier': tier,
                'directors': directors,
                'directors_count': len(directors)
            }

            results.append(result)

            # Save progress every 10
            if i % 10 == 0:
                self.save_results(results)

        # Save final results
        self.save_results(results)

        # Stats
        print("\n" + "=" * 80)
        print("📊 RÉSULTATS")
        print("=" * 80)
        print()

        total_directors = sum(r['directors_count'] for r in results)
        companies_with_directors = sum(1 for r in results if r['directors_count'] > 0)

        print(f"Sociétés scrapées:        {len(results)}")
        print(f"Sociétés avec dirigeants: {companies_with_directors} ({companies_with_directors/len(results)*100:.1f}%)")
        print(f"Total dirigeants trouvés: {total_directors}")
        print()
        print(f"✅ Saved: {OUTPUT_JSON}")
        print()
        print("=" * 80)

    def save_results(self, results):
        """Save results to JSON"""
        with open(OUTPUT_JSON, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

if __name__ == '__main__':
    extractor = WebsiteDirectorExtractor()
    extractor.extract_all_directors()
