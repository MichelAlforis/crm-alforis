#!/usr/bin/env python3
"""
Script to scrape SGIIC companies from CNMV registry - V3
Improved extraction of all fields
"""
import requests
from bs4 import BeautifulSoup
import json
import re

def parse_address(full_address):
    """Parse address to extract street, city, postal code"""
    # Clean up "Dirección:" prefix if present
    full_address = re.sub(r'^Dirección:\s*', '', full_address, flags=re.IGNORECASE)

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

    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }

    print(f"Fetching data from {url}...")
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    print("Parsing HTML...")
    soup = BeautifulSoup(response.content, 'html.parser')

    companies = []

    # Find all article elements that contain company data
    # The structure has <article class="..."> for each company
    articles = soup.find_all('article', class_=lambda x: x and 'row' in str(x))

    print(f"Found {len(articles)} article elements")

    if not articles:
        # Try alternative: find all div.row that might contain companies
        articles = soup.find_all('div', class_='row')
        print(f"Found {len(articles)} row divs")

    for article in articles:
        # Extract all text and look for patterns
        text = article.get_text('\n', strip=True)

        # Look for company name (contains SGIIC or S.G.I.I.C)
        name_match = re.search(r'([A-Z&][^\n]*?S\.?G\.?I\.?I\.?C\.?[^\n]*)', text, re.IGNORECASE)
        if not name_match:
            continue

        name = name_match.group(1).strip()

        # Look for registration number
        reg_match = re.search(r'Nº Registro[:\s]*(\d+)', text, re.IGNORECASE)
        reg_number = reg_match.group(1) if reg_match else ''

        # Look for date
        date_match = re.search(r'Fecha[^\d]*(\d{2}/\d{2}/\d{4})', text, re.IGNORECASE)
        reg_date = date_match.group(1) if date_match else ''

        # Look for address (typically has pattern: text - postal_code CITY)
        addr_match = re.search(r'Direcci[oó]n[:\s]*(.+?\s+-\s+\d{5}\s+[A-ZÑÁÉÍÓÚ][^\n]+)', text, re.IGNORECASE)
        address = addr_match.group(1).strip() if addr_match else ''

        if name:
            company = {
                'name': name,
                'register_number': reg_number,
                'register_date': reg_date,
                'address': address
            }
            companies.append(company)
            print(f"  {len(companies)}: {name} ({reg_number})")

    # If we didn't get enough companies, try a different approach
    if len(companies) < 90:
        print(f"\nOnly found {len(companies)} companies. Trying comprehensive text extraction...")

        # Get all text and split into chunks
        all_text = soup.get_text('\n')

        # Find all occurrences of patterns that look like company entries
        # Pattern: Registration number, then name with SGIIC, then date, then address

        # Split by "Nº Registro" which marks the start of each entry
        entries = re.split(r'Nº Registro', all_text)

        companies = []
        for entry in entries[1:]:  # Skip first split (header stuff)
            lines = [l.strip() for l in entry.split('\n') if l.strip()]

            # First line should have the number
            reg_number = ''
            if lines and re.match(r'^\d+$', lines[0]):
                reg_number = lines[0]

            # Find name (contains SGIIC)
            name = ''
            for line in lines:
                if 'SGIIC' in line or 'S.G.I.I.C' in line:
                    name = line
                    break

            # Find date
            reg_date = ''
            for line in lines:
                if re.match(r'^\d{2}/\d{2}/\d{4}$', line):
                    reg_date = line
                    break

            # Find address (has postal code pattern)
            address = ''
            for line in lines:
                if re.search(r'\d{5}\s+[A-ZÑÁÉÍÓÚ]', line, re.IGNORECASE):
                    # Clean up common prefixes
                    line = re.sub(r'^Direcci[oó]n[:\s]*', '', line, flags=re.IGNORECASE)
                    address = line
                    break

            if name:
                companies.append({
                    'name': name,
                    'register_number': reg_number,
                    'register_date': reg_date,
                    'address': address
                })
                print(f"  {len(companies)}: {name} ({reg_number})")

    return companies

def main():
    print("Starting CNMV SGIIC scraper v3...")
    companies = scrape_cnmv_sgiic()

    print(f"\nExtracted {len(companies)} companies")

    if companies:
        # Clean up and structure the data properly
        cleaned_companies = []
        for comp in companies:
            name = comp.get('name', '')
            reg_num = comp.get('register_number', '')
            reg_date = comp.get('register_date', '')
            address_full = comp.get('address', '')

            # Parse address
            street, city, postal_code = parse_address(address_full)

            cleaned_company = {
                "name": name,
                "register_number": reg_num,
                "register_date": reg_date,
                "address": address_full,
                "street": street if street != address_full else "",
                "city": city,
                "postal_code": postal_code,
                "country": "ES",
                "source": "CNMV Registry 2025"
            }
            cleaned_companies.append(cleaned_company)

        output_file = "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/scripts/cnmv/output/cnmv_all_sgiic_raw.json"
        print(f"\nWriting to {output_file}...")
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(cleaned_companies, f, indent=2, ensure_ascii=False)
        print("Done!")

        # Print statistics
        with_reg_num = sum(1 for c in cleaned_companies if c['register_number'])
        with_date = sum(1 for c in cleaned_companies if c['register_date'])
        with_address = sum(1 for c in cleaned_companies if c['address'])

        print(f"\nStatistics:")
        print(f"  Total companies: {len(cleaned_companies)}")
        print(f"  With registration number: {with_reg_num}")
        print(f"  With registration date: {with_date}")
        print(f"  With address: {with_address}")

        # Show first few samples
        print(f"\nFirst 3 company samples:")
        for i, comp in enumerate(cleaned_companies[:3]):
            print(f"\n{i+1}. {comp['name']}")
            print(f"   Reg#: {comp['register_number']}")
            print(f"   Date: {comp['register_date']}")
            print(f"   Address: {comp['address']}")
    else:
        print("ERROR: No companies extracted!")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
