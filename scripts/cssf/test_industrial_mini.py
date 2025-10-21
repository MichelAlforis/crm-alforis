#!/usr/bin/env python3
"""
MINI TEST - Industrial Scraper
Test sur 1 société avec retour détaillé
"""

import requests
from bs4 import BeautifulSoup
import re
import json
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

# Test sur SDG plus petite (bas de tableau)
TEST_URL = "https://www.pictet.com"
COMPANY_NAME = "Pictet Asset Management"

HEADERS = {'User-Agent': 'alforis-bot/1.0'}

print("=" * 80)
print(f"🧪 MINI TEST INDUSTRIEL - {COMPANY_NAME}")
print("=" * 80)
print(f"🌐 URL: {TEST_URL}")
print()

# Step 1: Check robots.txt
print("📋 ÉTAPE 1: Vérification robots.txt")
print("-" * 80)
try:
    robots_url = urljoin(TEST_URL, '/robots.txt')
    r = requests.get(robots_url, headers=HEADERS, timeout=5)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        sitemaps_found = []
        for line in r.text.split('\n')[:50]:  # First 50 lines
            if line.lower().startswith('sitemap:'):
                sitemap_url = line.split(':', 1)[1].strip()
                sitemaps_found.append(sitemap_url)
                print(f"  ✅ Sitemap trouvé: {sitemap_url}")

        if not sitemaps_found:
            print("  ⊘ Pas de sitemap dans robots.txt")
    else:
        print(f"  ❌ Robots.txt non accessible")
except Exception as e:
    print(f"  ❌ Erreur: {e}")

print()

# Step 2: Check sitemap.xml
print("📋 ÉTAPE 2: Vérification sitemap.xml direct")
print("-" * 80)
try:
    sitemap_url = urljoin(TEST_URL, '/sitemap.xml')
    r = requests.get(sitemap_url, headers=HEADERS, timeout=5)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        print(f"  ✅ Sitemap trouvé!")
        print(f"  Taille: {len(r.content)} bytes")

        # Parse XML
        try:
            root = ET.fromstring(r.content)
            urls_found = []

            for url_elem in root.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
                url = url_elem.text
                # Filter contact/about/legal pages
                if any(kw in url.lower() for kw in ['contact', 'about', 'team', 'legal']):
                    urls_found.append(url)

            print(f"  📄 URLs pertinentes trouvées: {len(urls_found)}")
            for url in urls_found[:5]:
                print(f"      • {url}")
            if len(urls_found) > 5:
                print(f"      ... et {len(urls_found) - 5} autres")
        except:
            print("  ⚠️  Impossible de parser le XML")
    else:
        print(f"  ❌ Sitemap.xml non trouvé (404)")
except Exception as e:
    print(f"  ❌ Erreur: {e}")

print()

# Step 3: Scrape homepage
print("📋 ÉTAPE 3: Scraping page d'accueil")
print("-" * 80)
try:
    r = requests.get(TEST_URL, headers=HEADERS, timeout=10)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'lxml')

        # Extract emails
        emails = set()
        for a in soup.select('a[href^="mailto:"]'):
            email = a.get('href').split(':', 1)[1].split('?')[0]
            emails.add(email.lower().strip())

        # Regex fallback
        email_re = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')
        for match in email_re.findall(r.text):
            if 'blackrock' in match.lower():
                emails.add(match.lower())

        print(f"  ✉️  Emails trouvés: {len(emails)}")
        for email in list(emails)[:5]:
            print(f"      • {email}")

        # Extract phones
        phones = set()
        for a in soup.select('a[href^="tel:"]'):
            tel = a.get('href').split(':', 1)[1]
            phones.add(tel)

        phone_re = re.compile(r'\+352[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,4}')
        for match in phone_re.findall(r.text):
            phones.add(match)

        print(f"  ☎️  Téléphones trouvés: {len(phones)}")
        for phone in list(phones)[:3]:
            print(f"      • {phone}")

        # Extract address
        addr_re = re.compile(r'(\d+[^,\n]{5,70}[,\s]+L-?\d{4}\s+[A-Za-z]+)', re.I)
        addr_match = addr_re.search(r.text)

        if addr_match:
            print(f"  📍 Adresse Luxembourg trouvée:")
            print(f"      {addr_match.group(1).strip()}")
        else:
            print(f"  ⊘ Pas d'adresse Luxembourg trouvée")

        # Check JSON-LD
        json_ld_found = len(soup.find_all('script', type='application/ld+json'))
        print(f"  📊 JSON-LD schema.org trouvés: {json_ld_found}")

    else:
        print(f"  ❌ Page non accessible")

except Exception as e:
    print(f"  ❌ Erreur: {e}")

print()

# Step 4: Check /contact page
print("📋 ÉTAPE 4: Scraping page /contact")
print("-" * 80)
try:
    contact_url = urljoin(TEST_URL, '/contact')
    r = requests.get(contact_url, headers=HEADERS, timeout=10)
    print(f"Status: {r.status_code}")

    if r.status_code == 200:
        soup = BeautifulSoup(r.text, 'lxml')

        # Count contact info
        emails = len(soup.select('a[href^="mailto:"]'))
        phones = len(soup.select('a[href^="tel:"]'))

        print(f"  ✉️  Emails trouvés: {emails}")
        print(f"  ☎️  Téléphones trouvés: {phones}")
    else:
        print(f"  ⊘ Page /contact non trouvée (essayer /contact-us, /about)")

except Exception as e:
    print(f"  ❌ Erreur: {e}")

print()
print("=" * 80)
print("✅ TEST TERMINÉ")
print("=" * 80)
print()
print("💡 RECOMMANDATIONS:")
print("   1. Si sitemap.xml existe → l'utiliser pour trouver pages")
print("   2. Si pas de sitemap → fallback sur /contact /about /team")
print("   3. Parser JSON-LD schema.org en priorité")
print("   4. Regex fallback sur texte brut")
print()
