#!/usr/bin/env python3
"""Test script for Outlook Mode 1 search"""

import requests
import sys

# URL de l'API
BASE_URL = "http://localhost:8000/api/v1"

# Recherche avec clacroix
query = "clacroix"

print(f"🔍 Test Mode 1 - Recherche Outlook pour '{query}'")
print("=" * 60)

# Demander le token à l'utilisateur
token = input("Entre ton token JWT (ou laisse vide pour test sans auth): ").strip()

if not token:
    print("❌ Token requis pour cette requête")
    sys.exit(1)

headers = {"Authorization": f"Bearer {token}"}

try:
    # Test recherche
    print(f"\n📡 Requête: GET /integrations/outlook/search?query={query}")
    response = requests.get(
        f"{BASE_URL}/integrations/outlook/search",
        params={"query": query, "limit": 10},
        headers=headers,
        timeout=30
    )

    print(f"📊 Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"\n✅ Succès!")
        print(f"   - Messages trouvés: {len(data.get('messages', []))}")
        print(f"   - Signatures extraites: {data.get('signatures_count', 0)}")
        print(f"   - Company domains: {data.get('company_domains', [])}")
        print(f"   - Dernier contact: {data.get('last_contact_date', 'N/A')}")

        signatures = data.get('signatures', [])
        if signatures:
            print(f"\n📧 Signatures détectées:")
            for i, sig in enumerate(signatures, 1):
                print(f"\n   {i}. {sig.get('email', 'N/A')}")
                if sig.get('phone'):
                    print(f"      📞 {sig['phone']}")
                if sig.get('job_title'):
                    print(f"      💼 {sig['job_title']}")
                if sig.get('company'):
                    print(f"      🏢 {sig['company']}")
                if sig.get('source_date'):
                    print(f"      📅 {sig['source_date']}")
        else:
            print("\n⚠️  Aucune signature trouvée")
            print("   Raisons possibles:")
            print("   - Aucun email avec 'clacroix' dans ta boîte mail")
            print("   - Les emails n'ont pas de signature détectable")
            print("   - Filtre anti-marketing a bloqué les résultats")

    elif response.status_code == 400:
        print(f"\n❌ Erreur 400: {response.json()}")
        print("   → Outlook n'est probablement pas connecté")

    elif response.status_code == 401:
        print(f"\n❌ Erreur 401: Token invalide ou expiré")

    else:
        print(f"\n❌ Erreur {response.status_code}")
        print(response.text)

except requests.exceptions.Timeout:
    print("\n⏱️  Timeout - La recherche a pris trop de temps")
except requests.exceptions.ConnectionError:
    print("\n❌ Impossible de se connecter à l'API")
except Exception as e:
    print(f"\n❌ Erreur: {e}")
