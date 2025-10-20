#!/usr/bin/env python3
"""
Test scraping Infogreffe with full browser simulation
"""
import requests
from bs4 import BeautifulSoup
import re

# Full browser headers to bypass JavaScript detection
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://www.infogreffe.fr/'
}

def test_infogreffe(siren: str, company_name: str):
    """Test Infogreffe scraping with browser simulation"""

    # Construct URL (slug format: lowercase, hyphens)
    slug = company_name.lower().replace(' ', '-').replace("'", '-')
    url = f"https://www.infogreffe.fr/entreprise/{slug}/{siren}/"

    print(f"🔍 Testing: {company_name}")
    print(f"📍 URL: {url}\n")

    try:
        # Create session to maintain cookies
        session = requests.Session()
        session.headers.update(HEADERS)

        # Make request
        response = session.get(url, timeout=15, allow_redirects=True)

        print(f"Status: {response.status_code}")
        print(f"Content length: {len(response.text)} chars")
        print(f"Content-Type: {response.headers.get('Content-Type', 'N/A')}\n")

        # Parse with BeautifulSoup
        soup = BeautifulSoup(response.text, 'html.parser')

        # Search for dirigeants keywords
        text = soup.get_text()

        # Look for common patterns
        patterns = [
            r'Président[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Directeur\s+général[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Gérant[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
            r'Dirigeant[e]?\s*:?\s*([A-ZÀ-Ü][a-zà-ü]+(?:\s+[A-ZÀ-Ü][a-zà-ü]+)+)',
        ]

        found_dirigeants = []
        for pattern in patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            found_dirigeants.extend(matches)

        if found_dirigeants:
            print("✅ Dirigeants trouvés:")
            for dir in set(found_dirigeants):
                print(f"   • {dir}")
        else:
            print("❌ Aucun dirigeant trouvé dans le texte")

            # Debug: show first 500 chars of visible text
            print("\n📄 Extrait du contenu visible:")
            clean_text = ' '.join(text.split())[:500]
            print(f"   {clean_text}...")

        # Check if it's a real page or JavaScript redirect
        if 'gatsby' in response.text.lower() or 'react' in response.text.lower():
            print("\n⚠️  Page JavaScript détectée (Gatsby/React)")

        # Look for any structured data (JSON-LD)
        scripts = soup.find_all('script', type='application/ld+json')
        if scripts:
            print(f"\n📊 {len(scripts)} scripts JSON-LD trouvés")
            for script in scripts:
                try:
                    import json
                    data = json.loads(script.string)
                    print(f"   Type: {data.get('@type', 'Unknown')}")
                except:
                    pass

        return response.text

    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur réseau: {e}")
        return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None


# Test cases
test_companies = [
    ("352213599", "LAZARD FRERES GESTION"),
    ("437574452", "AMUNDI ASSET MANAGEMENT"),
    ("340800907", "BNP PARIBAS ASSET MANAGEMENT")
]

print("="*60)
print("TEST SCRAPING INFOGREFFE - Simulation navigateur")
print("="*60)
print()

for siren, name in test_companies:
    html = test_infogreffe(siren, name)
    print("\n" + "-"*60 + "\n")

    if html and len(html) > 10000:
        print("💡 Contenu HTML significatif reçu, analyse possible")

        # Save HTML for inspection
        filename = f"/tmp/infogreffe_{siren}.html"
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"📁 HTML sauvegardé: {filename}")

    print("\n")
