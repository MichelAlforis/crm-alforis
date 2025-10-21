#!/usr/bin/env python3
"""
Génère un rapport final de l'enrichissement Selenium
Compare avec les objectifs Luxembourg (99%)
"""

import json
import csv
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent
CACHE_FILE = BASE_DIR / "output/selenium_cache.json"
OUTPUT_CSV = BASE_DIR / "output/cnmv_selenium_enriched.csv"

def generate_report():
    print("=" * 80)
    print("  RAPPORT FINAL - ENRICHISSEMENT SELENIUM ESPAÑA (CNMV)")
    print("=" * 80)
    print()

    # Load cache
    if not CACHE_FILE.exists():
        print("❌ Cache file not found")
        return

    with open(CACHE_FILE, 'r', encoding='utf-8') as f:
        cache = json.load(f)

    total = len(cache)
    target = 117

    # Calculate stats
    with_website = sum(1 for v in cache.values() if v.get('website'))
    with_email = sum(1 for v in cache.values() if v.get('email'))
    with_phone = sum(1 for v in cache.values() if v.get('phone'))

    complete_all = sum(1 for v in cache.values() if v.get('website') and v.get('email') and v.get('phone'))
    complete_web_email = sum(1 for v in cache.values() if v.get('website') and v.get('email'))

    # Progress
    print(f"📊 PROGRESSION GLOBALE")
    print(f"   Sociétés scrapées: {total}/{target} ({total/target*100:.1f}%)")
    print()

    # Enrichment rates
    print(f"📈 TAUX D'ENRICHISSEMENT")
    print(f"   🌐 Websites:      {with_website:>3}/{total:>3}  ({with_website/total*100:.1f}%)")
    print(f"   📧 Emails:        {with_email:>3}/{total:>3}  ({with_email/total*100:.1f}%)")
    print(f"   📞 Téléphones:    {with_phone:>3}/{total:>3}  ({with_phone/total*100:.1f}%)")
    print()
    print(f"   ✅ Complet (W+E+P): {complete_all:>3}/{total:>3}  ({complete_all/total*100:.1f}%)")
    print(f"   ✅ Complet (W+E):   {complete_web_email:>3}/{total:>3}  ({complete_web_email/total*100:.1f}%)")
    print()

    # Compare with Luxembourg target (99%)
    luxembourg_target = 99.0
    print(f"🎯 COMPARAISON AVEC LUXEMBOURG (objectif: {luxembourg_target}%)")

    web_diff = with_website/total*100 - luxembourg_target
    email_diff = with_email/total*100 - luxembourg_target

    web_status = "✅" if web_diff >= -5 else "⚠️" if web_diff >= -15 else "❌"
    email_status = "✅" if email_diff >= -5 else "⚠️" if email_diff >= -15 else "❌"

    print(f"   {web_status} Websites:  {with_website/total*100:.1f}% (écart: {web_diff:+.1f}%)")
    print(f"   {email_status} Emails:    {with_email/total*100:.1f}% (écart: {email_diff:+.1f}%)")
    print()

    # Quality checks
    print(f"🔍 CONTRÔLE QUALITÉ")

    # Check for invalid emails
    invalid_emails = []
    for name, data in cache.items():
        email = data.get('email', '')
        if email and ('.png' in email or len(email) < 5 or '@' not in email):
            invalid_emails.append((name, email))

    if invalid_emails:
        print(f"   ⚠️  {len(invalid_emails)} email(s) invalide(s) détecté(s)")
        for name, email in invalid_emails[:3]:
            print(f"      - {name[:50]}: {email}")
    else:
        print(f"   ✅ Tous les emails valides")

    # Check for invalid websites
    invalid_websites = []
    for name, data in cache.items():
        website = data.get('website', '')
        if website and not website.startswith('http'):
            invalid_websites.append((name, website))

    if invalid_websites:
        print(f"   ⚠️  {len(invalid_websites)} website(s) invalide(s)")
        for name, website in invalid_websites[:3]:
            print(f"      - {name[:50]}: {website}")
    else:
        print(f"   ✅ Tous les websites valides")
    print()

    # Top companies by tier (if available)
    print(f"🏆 TOP SOCIÉTÉS ENRICHIES")

    # Load original data with tiers
    input_json = BASE_DIR / "output/cnmv_all_sgiic_raw.json"
    if input_json.exists():
        with open(input_json, 'r', encoding='utf-8') as f:
            original_data = {c['name']: c for c in json.load(f)}

        # Merge with cache
        tier1_complete = []
        for name, data in cache.items():
            if data.get('website') and data.get('email'):
                orig = original_data.get(name, {})
                tier = orig.get('tier', 'Unknown')
                aum = orig.get('aum', 0)
                if tier == 'Tier 1' or aum > 1_000_000_000:
                    tier1_complete.append((name, data, aum))

        tier1_complete.sort(key=lambda x: x[2], reverse=True)

        if tier1_complete:
            print(f"   Tier 1 enrichies (AUM ≥ 1Bn€): {len(tier1_complete)}")
            for name, data, aum in tier1_complete[:5]:
                aum_bn = aum / 1_000_000_000 if aum else 0
                print(f"      • {name[:45]} ({aum_bn:.1f}Bn€)")
                print(f"        🌐 {data['website']}")

    print()

    # Recommendations
    print(f"💡 RECOMMANDATIONS")

    if total < target:
        remaining = target - total
        print(f"   ⏳ Attendre la fin du scraping ({remaining} sociétés restantes)")

    if with_website/total*100 < 90:
        print(f"   🔧 Améliorer l'extraction des websites (actuellement {with_website/total*100:.0f}%)")
        print(f"      → Vérifier les sélecteurs CSS")
        print(f"      → Augmenter le fallback email→domain")

    if with_phone/total*100 < 50:
        print(f"   📞 Téléphones: taux faible normal (standards souvent non publiés)")

    if invalid_emails:
        print(f"   🧹 Nettoyer les {len(invalid_emails)} emails invalides")

    print()
    print("=" * 80)

    # Save timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n📅 Rapport généré le: {timestamp}")
    print(f"💾 Cache: {CACHE_FILE}")
    print(f"💾 CSV final: {OUTPUT_CSV}")
    print()

if __name__ == '__main__':
    generate_report()
