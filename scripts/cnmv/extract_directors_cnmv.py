#!/usr/bin/env python3
"""
Extraction des dirigeants depuis le registre CNMV
Pour les sociétés <1Mds (Tier 2 + Tier 3)
"""

import json
import csv
import requests
from bs4 import BeautifulSoup
import time
import re
from pathlib import Path

BASE_DIR = Path(__file__).parent
INPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"
OUTPUT_JSON = BASE_DIR / "output/cnmv_directors.json"
CACHE_FILE = BASE_DIR / "output/directors_cache.json"

class CNMVDirectorExtractor:
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

    def extract_directors_from_cnmv(self, register_number):
        """
        Extract directors from CNMV registry page
        """
        # Check cache
        if register_number in self.cache:
            return self.cache[register_number]

        directors = []

        try:
            # CNMV URL for entity details
            url = f"https://www.cnmv.es/Portal/Consultas/IIC/SGIICDetalle.aspx?nif={register_number}"

            print(f"   🔍 Fetching CNMV page for register #{register_number}...")

            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Look for directors section
            # Common patterns: "Consejo de Administración", "Administradores", "Directivos"

            # Find tables with director information
            tables = soup.find_all('table')

            for table in tables:
                # Look for header mentioning directors/administrators
                headers = table.find_all('th')
                header_text = ' '.join([h.get_text(strip=True) for h in headers]).lower()

                if any(keyword in header_text for keyword in ['administr', 'consej', 'directiv', 'cargo']):
                    rows = table.find_all('tr')

                    for row in rows[1:]:  # Skip header
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            # Usually: Name | Position
                            name = cells[0].get_text(strip=True)
                            position = cells[1].get_text(strip=True) if len(cells) > 1 else ''

                            if name and len(name) > 3:  # Valid name
                                directors.append({
                                    'name': name,
                                    'position': position,
                                    'source': 'CNMV'
                                })

            # Also look for specific divs/sections
            content = soup.get_text()

            # Pattern: Look for "Director General", "CEO", "Consejero Delegado"
            director_patterns = [
                r'Director\s+General[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Consejero\s+Delegado[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'CEO[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)',
                r'Presidente[:\s]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)'
            ]

            for pattern in director_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if match not in [d['name'] for d in directors]:
                        directors.append({
                            'name': match,
                            'position': 'Director',
                            'source': 'CNMV'
                        })

            if directors:
                print(f"      ✅ {len(directors)} dirigeant(s) trouvé(s)")
            else:
                print(f"      ⚠️  Aucun dirigeant trouvé")

        except Exception as e:
            print(f"      ❌ Error: {e}")

        # Cache result
        self.cache[register_number] = directors
        self.save_cache()

        # Rate limiting
        time.sleep(2)

        return directors

    def extract_all_directors(self):
        """Extract directors for all Tier 2 and 3 companies"""

        print("=" * 80)
        print("  EXTRACTION DIRIGEANTS CNMV - SOCIÉTÉS <1Mds")
        print("=" * 80)
        print()

        # Load companies
        with open(INPUT_CSV, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            companies = list(reader)

        # Filter Tier 2 and 3
        target_companies = []
        for c in companies:
            tier = c.get('tier', '')
            if tier in ['Tier 2', 'Tier 3']:
                target_companies.append(c)

        print(f"🎯 Target: {len(target_companies)} sociétés (Tier 2 + Tier 3)")
        print()

        # Extract directors
        results = []

        for i, company in enumerate(target_companies, 1):
            name = company['name']
            register_number = company.get('register_number', '')
            tier = company.get('tier', '')

            print(f"\n[{i}/{len(target_companies)}] 🏢 {name}")
            print(f"   Tier: {tier} | Register: #{register_number}")

            if not register_number:
                print(f"   ⚠️  No register number")
                continue

            # Extract directors
            directors = self.extract_directors_from_cnmv(register_number)

            result = {
                'company_name': name,
                'register_number': register_number,
                'tier': tier,
                'website': company.get('website', ''),
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
    extractor = CNMVDirectorExtractor()
    extractor.extract_all_directors()
