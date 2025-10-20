#!/usr/bin/env python3
"""
Script to scrape SGIIC companies from CNMV registry
Updated to handle list-based HTML structure
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

    companies = []

    # Find all list items that contain company data
    # The structure has repeating patterns for each company
    # Look for the main container with company data

    # Find all elements with 'repListaPrincipal' pattern
    main_div = soup.find('div', id=lambda x: x and 'wucRelacionRegistros' in x)

    if not main_div:
        print("Trying alternative approach - looking for all company entries...")
        # Look for span elements with company names
        company_spans = soup.find_all('span', class_='tit-small')
        print(f"Found {len(company_spans)} company name elements")

        for span in company_spans:
            # Try to extract company info from surrounding structure
            # Find parent list item
            parent_li = span.find_parent('li')
            if not parent_li:
                continue

            # Get company name
            name = span.get_text(strip=True)

            # Look for registration number, date, and address in nearby elements
            # These are typically in <p> or <span> tags with specific classes

            # Find all text content in this list item group
            # We need to find the parent structure that contains all fields
            container = parent_li.find_parent('ul')
            if container:
                # Find the group of <li> elements for this company
                all_lis = container.find_all('li', recursive=False)

                reg_number = ""
                reg_date = ""
                address_full = ""

                # Try to find the data in the structure
                for li in all_lis:
                    text = li.get_text(strip=True)
                    # Look for patterns
                    if 'Nº Registro' in text or 'Número de registro' in text:
                        # Extract number after this
                        match = re.search(r'(\d+)', text)
                        if match:
                            reg_number = match.group(1)
                    elif 'Fecha' in text or re.match(r'\d{2}/\d{2}/\d{4}', text):
                        # Extract date
                        match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
                        if match:
                            reg_date = match.group(1)
                    elif ' - ' in text and re.search(r'\d{5}', text):
                        # Likely address with postal code
                        address_full = text

                if name and (reg_number or reg_date or address_full):
                    companies.append({
                        'name': name,
                        'register_number': reg_number,
                        'register_date': reg_date,
                        'address': address_full,
                        'raw_text': parent_li.get_text(' ', strip=True)[:200]
                    })
                    print(f"  {len(companies)}: {name}")

    if not companies:
        print("\nTrying raw text parsing approach...")
        # Get all text and try to parse it
        html_text = soup.get_text()

        # Split by company names (they typically have SGIIC in them)
        # or by registration numbers

        # Save HTML for manual inspection
        with open('/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/scripts/cnmv/output/debug.html', 'w', encoding='utf-8') as f:
            f.write(str(soup.prettify()))
        print("Saved HTML to debug.html for inspection")

        # Try to find all registration entries
        # Look for pattern: Number, Name with SGIIC, Date, Address
        lines = html_text.split('\n')

        current_entry = {}
        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            # Look for registration number pattern
            if re.match(r'^\d+$', line) and len(line) <= 3:
                if current_entry and 'name' in current_entry:
                    companies.append(current_entry)
                current_entry = {'register_number': line}
            elif 'SGIIC' in line or 'S.G.I.I.C' in line:
                current_entry['name'] = line
            elif re.match(r'^\d{2}/\d{2}/\d{4}$', line):
                current_entry['register_date'] = line
            elif ' - ' in line and '\d{5}' in line:
                current_entry['address'] = line

        if current_entry and 'name' in current_entry:
            companies.append(current_entry)

        print(f"Extracted {len(companies)} companies using raw text parsing")

    # If still no companies, let's try one more approach
    if not companies:
        print("\nTrying span-based extraction...")
        # Find all spans with 'tit-small' class which contain company names
        name_spans = soup.find_all('span', class_='tit-small')
        print(f"Found {len(name_spans)} company names")

        for span in name_spans:
            name = span.get_text(strip=True)
            # Navigate to find related data
            # Try to find parent article or div that groups company data
            parent = span.find_parent('div', class_=lambda x: x and 'row' in str(x)) or span.find_parent('article')

            if parent:
                text_content = parent.get_text(' | ', strip=True)
                # Parse the text content
                reg_match = re.search(r'Nº Registro[:\s]*(\d+)', text_content)
                date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text_content)
                # Address usually has pattern: text - postal code CITY
                addr_match = re.search(r'([A-ZÑÁÉÍÓÚ][^|]+?\s+-\s+\d{5}\s+[A-ZÑÁÉÍÓÚ]+)', text_content, re.IGNORECASE)

                company = {
                    'name': name,
                    'register_number': reg_match.group(1) if reg_match else '',
                    'register_date': date_match.group(1) if date_match else '',
                    'address': addr_match.group(1) if addr_match else '',
                    'raw': text_content[:300]
                }
                companies.append(company)
                print(f"  {len(companies)}: {name}")

    return companies

def main():
    print("Starting CNMV SGIIC scraper v2...")
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

        # Also write a sample for inspection
        if len(cleaned_companies) > 0:
            print(f"\nFirst company sample:")
            print(json.dumps(cleaned_companies[0], indent=2, ensure_ascii=False))
    else:
        print("ERROR: No companies extracted!")
        return 1

    return 0

if __name__ == "__main__":
    exit(main())
