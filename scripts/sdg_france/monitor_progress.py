#!/usr/bin/env python3
"""
Moniteur de progression du scraping SDG France
Affiche en temps réel l'avancement du scraping
"""

import json
import time
import os
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent.parent
CACHE_FILE = BASE_DIR / 'data' / 'sdg_france' / 'selenium_cache.json'
CSV_FILE = BASE_DIR / 'SDG_FRANCE_677_CONSOLIDATED_FOR_CRM.csv'

TOTAL_COMPANIES = 677

def clear_screen():
    """Clear terminal screen"""
    os.system('clear' if os.name != 'nt' else 'cls')

def load_cache():
    """Load cache"""
    if CACHE_FILE.exists():
        with open(CACHE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def print_progress_bar(current, total, width=50):
    """Print a progress bar"""
    percent = current / total
    filled = int(width * percent)
    bar = '█' * filled + '░' * (width - filled)
    return f"[{bar}] {percent*100:.1f}%"

def get_stats(cache):
    """Calculate statistics from cache"""
    stats = {
        'total': len(cache),
        'with_email': 0,
        'with_phone': 0,
        'with_website': 0,
        'complete': 0
    }

    for company, data in cache.items():
        if data.get('email'):
            stats['with_email'] += 1
        if data.get('phone'):
            stats['with_phone'] += 1
        if data.get('website'):
            stats['with_website'] += 1
        if data.get('email') and data.get('phone') and data.get('website'):
            stats['complete'] += 1

    return stats

def format_time_remaining(scraped, total, seconds_per_company=4):
    """Estimate time remaining"""
    remaining = total - scraped
    seconds = remaining * seconds_per_company

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60

    if hours > 0:
        return f"{int(hours)}h {int(minutes)}m"
    else:
        return f"{int(minutes)}m"

def display_latest_entries(cache, n=5):
    """Display latest scraped companies"""
    if not cache:
        return []

    # Sort by scraped_at timestamp
    sorted_entries = sorted(
        cache.items(),
        key=lambda x: x[1].get('scraped_at', ''),
        reverse=True
    )

    return sorted_entries[:n]

def main():
    print("🔍 MONITEUR DE PROGRESSION - SDG FRANCE")
    print("=" * 80)
    print("Appuyez sur Ctrl+C pour quitter\n")

    try:
        while True:
            clear_screen()

            # Header
            print("=" * 80)
            print("🔍 SCRAPING SDG FRANCE - PROGRESSION EN TEMPS RÉEL")
            print("=" * 80)
            print()

            # Load cache
            cache = load_cache()
            stats = get_stats(cache)

            # Progress
            print(f"📊 PROGRESSION GLOBALE")
            print(f"   {print_progress_bar(stats['total'], TOTAL_COMPANIES, 60)}")
            print(f"   Scrapées: {stats['total']} / {TOTAL_COMPANIES}")
            print(f"   Restantes: {TOTAL_COMPANIES - stats['total']}")
            print(f"   ⏱️  Temps restant estimé: {format_time_remaining(stats['total'], TOTAL_COMPANIES)}")
            print()

            # Statistics
            print("=" * 80)
            print("📈 STATISTIQUES DES DONNÉES RÉCUPÉRÉES")
            print("=" * 80)
            print()

            # Emails
            email_percent = (stats['with_email'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"📧 EMAILS")
            print(f"   {print_progress_bar(stats['with_email'], stats['total'], 40)} {stats['with_email']}/{stats['total']} ({email_percent:.1f}%)")
            print()

            # Phones
            phone_percent = (stats['with_phone'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"📞 TÉLÉPHONES")
            print(f"   {print_progress_bar(stats['with_phone'], stats['total'], 40)} {stats['with_phone']}/{stats['total']} ({phone_percent:.1f}%)")
            print()

            # Websites
            website_percent = (stats['with_website'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"🌐 SITES WEB")
            print(f"   {print_progress_bar(stats['with_website'], stats['total'], 40)} {stats['with_website']}/{stats['total']} ({website_percent:.1f}%)")
            print()

            # Complete
            complete_percent = (stats['complete'] / stats['total'] * 100) if stats['total'] > 0 else 0
            print(f"✅ COMPLÈTES (email + téléphone + site)")
            print(f"   {print_progress_bar(stats['complete'], stats['total'], 40)} {stats['complete']}/{stats['total']} ({complete_percent:.1f}%)")
            print()

            # Latest entries
            print("=" * 80)
            print("🆕 DERNIÈRES SOCIÉTÉS SCRAPÉES")
            print("=" * 80)
            print()

            latest = display_latest_entries(cache, 8)
            for company, data in latest:
                email = "✅" if data.get('email') else "❌"
                phone = "✅" if data.get('phone') else "❌"
                website = "✅" if data.get('website') else "❌"

                company_short = company[:45] + "..." if len(company) > 45 else company
                print(f"   {company_short:<50} {email} {phone} {website}")

            print()
            print("=" * 80)
            print(f"🔄 Dernière mise à jour: {datetime.now().strftime('%H:%M:%S')}")
            print(f"💾 Fichier cache: {CACHE_FILE.name}")
            print("=" * 80)

            # Check if complete
            if stats['total'] >= TOTAL_COMPANIES:
                print()
                print("🎉 " + "=" * 76 + " 🎉")
                print("🎉 " + " " * 26 + "SCRAPING TERMINÉ!" + " " * 26 + " 🎉")
                print("🎉 " + "=" * 76 + " 🎉")
                print()
                print(f"✅ {stats['total']} sociétés scrapées")
                print(f"📧 {stats['with_email']} emails trouvés ({email_percent:.1f}%)")
                print(f"📞 {stats['with_phone']} téléphones trouvés ({phone_percent:.1f}%)")
                print(f"🌐 {stats['with_website']} sites web trouvés ({website_percent:.1f}%)")
                print()
                break

            # Refresh every 5 seconds
            time.sleep(5)

    except KeyboardInterrupt:
        print("\n\n⚠️  Moniteur arrêté par l'utilisateur")
        print(f"📊 Progression au moment de l'arrêt: {stats['total']}/{TOTAL_COMPANIES}")

if __name__ == '__main__':
    main()
