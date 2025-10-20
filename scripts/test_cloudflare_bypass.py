#!/usr/bin/env python3
"""
Test Cloudflare bypass with undetected-chromedriver
"""
import undetected_chromedriver as uc
import time

print("🚀 Test Cloudflare bypass avec undetected-chromedriver\n")

# Create undetected Chrome instance
options = uc.ChromeOptions()
options.add_argument('--headless=new')  # New headless mode
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')

print("🔧 Initialisation driver...")
driver = uc.Chrome(options=options, use_subprocess=True)

url = "https://www.infogreffe.fr/entreprise/lazard-freres-gestion/352213599/"
print(f"🔍 Chargement: {url}\n")

driver.get(url)
time.sleep(8)  # Wait for Cloudflare check + page load

# Get page title and text
title = driver.title
page_text = driver.find_element("tag name", "body").text

print(f"📄 Titre: {title}")
print(f"📊 Longueur texte: {len(page_text)} chars")
print("\n📄 Début du contenu:")
print("-" * 60)
print(page_text[:500])
print("-" * 60)

# Check if blocked
if "blocked" in page_text.lower() or "cloudflare" in page_text.lower():
    print("\n❌ BLOQUÉ par Cloudflare")
else:
    print("\n✅ SUCCÈS - Cloudflare bypassé!")

    # Save HTML
    with open("/tmp/infogreffe_undetected.html", "w", encoding='utf-8') as f:
        f.write(driver.page_source)
    print("📁 HTML sauvegardé: /tmp/infogreffe_undetected.html")

driver.quit()
