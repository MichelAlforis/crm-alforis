#!/usr/bin/env python3
"""
Debug: inspect rendered HTML from Infogreffe to find dirigeants selectors
"""
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Setup headless Chrome
options = Options()
options.add_argument('--headless')
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
options.add_argument('--window-size=1920,1080')

driver = webdriver.Chrome(options=options)

# Test URL
url = "https://www.infogreffe.fr/entreprise/lazard-freres-gestion/352213599/"

print(f"🔍 Loading: {url}\n")
driver.get(url)

# Wait for page load
wait = WebDriverWait(driver, 20)
time.sleep(5)  # Extra wait for JavaScript

# Get page text
print("📄 Page text (first 1000 chars):")
print("-" * 60)
page_text = driver.find_element(By.TAG_NAME, "body").text
print(page_text[:1000])
print("-" * 60)

# Save full HTML
with open("/tmp/infogreffe_rendered_full.html", "w", encoding='utf-8') as f:
    f.write(driver.page_source)

print("\n✅ HTML complet sauvegardé: /tmp/infogreffe_rendered_full.html")

# Try to find specific elements
print("\n🔎 Recherche d'éléments spécifiques:\n")

# Look for common class names/IDs
selectors_to_try = [
    "//h2[contains(text(), 'Dirigeants')]",
    "//h3[contains(text(), 'Dirigeants')]",
    "//div[contains(@class, 'dirigeant')]",
    "//div[contains(@class, 'representant')]",
    "//div[contains(@class, 'mandataire')]",
    "//*[contains(text(), 'Président')]",
    "//*[contains(text(), 'Directeur général')]",
]

for selector in selectors_to_try:
    try:
        elements = driver.find_elements(By.XPATH, selector)
        if elements:
            print(f"✅ Trouvé ({len(elements)}): {selector}")
            for elem in elements[:3]:  # Show first 3
                text = elem.text.strip()[:100]
                print(f"   → {text}")
        else:
            print(f"❌ Non trouvé: {selector}")
    except Exception as e:
        print(f"⚠️  Erreur: {selector} - {e}")

driver.quit()

print("\n💡 Ouvrir le fichier HTML dans un navigateur pour inspecter la structure:")
print("   open /tmp/infogreffe_rendered_full.html")
