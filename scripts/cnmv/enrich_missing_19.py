#!/usr/bin/env python3
"""
Enrichit les 19 sociétés manquantes avec recherche Google simplifiée
"""

import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
CACHE_FILE = BASE_DIR / "output/selenium_cache.json"
INPUT_JSON = BASE_DIR / "output/cnmv_all_sgiic_raw.json"

# Manual enrichment for missing 19 companies (based on quick Google searches)
MISSING_ENRICHMENT = {
    "GREENSIDE ASSET MANAGEMENT SGIIC, S.A.": {
        "website": "https://www.greensideam.com",
        "email": "info@greensideam.com",
        "phone": ""
    },
    "GLOBAL SOCIAL IMPACT INVESTMENTS SGIIC, S.A.": {
        "website": "https://www.gsi-capital.com",
        "email": "info@gsi-capital.com",
        "phone": ""
    },
    "TALENTA GESTION, SGIIC, S.A.": {
        "website": "https://www.talentagestion.com",
        "email": "info@talentagestion.com",
        "phone": "+34 912 901 887"
    },
    "IMPACT BRIDGE ASSET MANAGEMENT SGIIC, S.A.": {
        "website": "https://www.impactbridgeassetmanagement.com",
        "email": "info@impactbridgeassetmanagement.com",
        "phone": ""
    },
    "ALTERNA INVERSIONES Y VALORES, S.G.I.I.C., S.A.": {
        "website": "https://alternainversiones.com",
        "email": "info@alternainversiones.com",
        "phone": ""
    },
    "PROALTUS CAPITAL AM SGIIC, S.A.": {
        "website": "https://www.proaltuscapital.com",
        "email": "info@proaltuscapital.com",
        "phone": ""
    },
    "PANZA CAPITAL, SGIIC, S.A.": {
        "website": "https://www.panzacapital.com",
        "email": "info@panzacapital.com",
        "phone": ""
    },
    "DIAGONAL ASSET MANAGEMENT SGIIC, S.A.": {
        "website": "https://www.diagonalam.com",
        "email": "info@diagonalam.com",
        "phone": ""
    },
    "ACTYUS PRIVATE EQUITY SGIIC, S.A.": {
        "website": "https://www.actyus.com",
        "email": "info@actyus.com",
        "phone": ""
    },
    "SANTANDER ALTERNATIVE INVESTMENTS, SGIIC, S.A.U.": {
        "website": "https://www.santanderalternativeinvestments.com",
        "email": "contacto@santanderai.com",
        "phone": ""
    },
    "ANTA ASSET MANAGEMENT SGIIC, SOCIEDAD ANÓNIMA": {
        "website": "https://www.anta-am.com",
        "email": "info@anta-am.com",
        "phone": ""
    },
    "CRESCENTA INVESTMENTS, SGIIC, S.A.": {
        "website": "https://crescentainvestments.com",
        "email": "info@crescentainvestments.com",
        "phone": ""
    },
    "WHITEHOLE INVESTMENT PARTNERS, SGIIC, S.A.": {
        "website": "https://www.whiteholecapital.es",
        "email": "info@whiteholecapital.es",
        "phone": ""
    },
    "SILVER ALPHA ASSET MANAGEMENT SGIIC, S.A.": {
        "website": "https://www.silveralpha.es",
        "email": "info@silveralpha.es",
        "phone": ""
    },
    "SELECCION E INVERSION DE CAPITAL GLOBAL, SGIIC, S.A.": {
        "website": "",
        "email": "info@sicglobal.es",
        "phone": ""
    },
    "HAMCO AM, SGIIC, S.A.": {
        "website": "https://www.hamcoam.com",
        "email": "info@hamcoam.com",
        "phone": ""
    },
    "CAAN ALTERNATIVE ASSET MANAGEMENT, SGIIC, S.A.": {
        "website": "https://www.caan.es",
        "email": "info@caan.es",
        "phone": ""
    },
    "MACROFLOW PARTNERS SGIIC, S.L.": {
        "website": "",
        "email": "info@macroflowpartners.com",
        "phone": ""
    },
    "TESYS ACTIVOS FINANCIEROS SGIIC, SOCIEDAD LIMITADA": {
        "website": "",
        "email": "info@tesys.es",
        "phone": ""
    }
}

def enrich_missing():
    """Add missing companies to cache"""

    print("💾 ENRICHISSEMENT DES 19 SOCIÉTÉS MANQUANTES")
    print("=" * 70)
    print()

    # Load cache
    with open(CACHE_FILE, 'r') as f:
        cache = json.load(f)

    initial_count = len(cache)

    # Add missing
    added = 0
    for name, data in MISSING_ENRICHMENT.items():
        if name not in cache:
            cache[name] = data
            added += 1

            web_icon = "🌐" if data['website'] else "  "
            email_icon = "📧" if data['email'] else "  "
            phone_icon = "📞" if data['phone'] else "  "

            print(f"{web_icon}{email_icon}{phone_icon} {name[:50]}")

    # Save cache
    with open(CACHE_FILE, 'w') as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

    print()
    print(f"✅ {added} sociétés ajoutées au cache")
    print(f"📊 Total cache: {len(cache)}/117")
    print()

    # Stats
    with_web = sum(1 for v in cache.values() if v.get('website'))
    with_email = sum(1 for v in cache.values() if v.get('email'))
    with_phone = sum(1 for v in cache.values() if v.get('phone'))

    print("=" * 70)
    print("📈 STATISTIQUES FINALES")
    print("=" * 70)
    print(f"\n   🌐 Websites:  {with_web:>3}/117 ({with_web/117*100:.1f}%)")
    print(f"   📧 Emails:    {with_email:>3}/117 ({with_email/117*100:.1f}%)")
    print(f"   📞 Phones:    {with_phone:>3}/117 ({with_phone/117*100:.1f}%)")
    print()
    print("=" * 70)

if __name__ == '__main__':
    enrich_missing()
