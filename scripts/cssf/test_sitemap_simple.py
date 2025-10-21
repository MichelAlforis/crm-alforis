#!/usr/bin/env python3
"""
Test Sitemap Simple - 1 société
"""
import requests

url = "https://www.axa.fr"
sitemap_url = url + "/sitemap.xml"

print(f"🗺️  Test sitemap: {sitemap_url}")

try:
    response = requests.get(sitemap_url, timeout=5)
    print(f"✅ Status: {response.status_code}")
    print(f"📏 Size: {len(response.content)} bytes")

    if response.status_code == 200:
        print("✅ Sitemap trouvé!")
        # Show first 500 chars
        print(response.text[:500])
    else:
        print("❌ Sitemap non trouvé")

except Exception as e:
    print(f"❌ Erreur: {e}")
