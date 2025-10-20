#!/usr/bin/env python3
"""
Script to scrape SGIIC companies from CNMV registry
"""
import requests
from bs4 import BeautifulSoup
import json
import re

def parse_address(full_address):
    """Parse address to extract street, city, postal code"""
    # Pattern: STREET - POSTAL_CODE CITY
    match = re.search(r'(.+?)\s*-\s*(\d{5})\s+(.+)', full_address)
    if match:
        street = match.group(1).strip()
        postal_code = match.group(2).strip()
        city = match.group(3).strip()
        return street, city, postal_code
    else:
        # Fallback if pattern doesn't match
        return full_address, "", ""

def scrape_cnmv_sgiic():
    """Scrape all SGIIC companies from CNMV registry"""
    url = "https://cnmv.es/Portal/Consultas/ListadoEntidad.aspx?id=2&tipoent=0"

    # Headers to mimic a browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }

    print(f"Fetching data from {url}...")
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    print("Parsing HTML...")
    soup = BeautifulSoup(response.content, 'html.parser')

    # Find the table with companies
    # The table typically has class or id - we'll search for it
    table = soup.find('table')

    if not table:
        print("ERROR: Could not find table in HTML")
        # Try to find any table
        tables = soup.find_all('table')
        print(f"Found {len(tables)} tables total")
        if tables:
            table = tables[0]  # Use first table
        else:
            return []

    companies = []
    rows = table.find_all('tr')
    print(f"Found {len(rows)} rows in table")

    # Skip header row(s)
    for row in rows[1:]:  # Skip first row (header)
        cells = row.find_all('td')
        if len(cells) >= 4:
            reg_number = cells[0].get_text(strip=True)
            name = cells[1].get_text(strip=True)
            reg_date = cells[2].get_text(strip=True)
            address_full = cells[3].get_text(strip=True)

            # Parse address
            street, city, postal_code = parse_address(address_full)

            company = {
                "name": name,
                "register_number": reg_number,
                "register_date": reg_date,
                "address": address_full,
                "street": street,
                "city": city,
                "postal_code": postal_code,
                "country": "ES",
                "source": "CNMV Registry 2025"
            }
            companies.append(company)
            print(f"  {len(companies)}: {name}")

    return companies

def main():
    print("Starting CNMV SGIIC scraper...")
    companies = scrape_cnmv_sgiic()

    print(f"\nExtracted {len(companies)} companies")

    if companies:
        output_file = "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/scripts/cnmv/output/cnmv_all_sgiic_raw.json"
        print(f"\nWriting to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(companies, f, indent=2, ensure_ascii=False)
        print("Done!")
    else:
        print("ERROR: No companies extracted!")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
