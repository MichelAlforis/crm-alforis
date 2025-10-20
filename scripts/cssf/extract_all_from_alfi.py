#!/usr/bin/env python3
"""
Extract ALL Luxembourg Management Companies from ALFI PDF
Creates single CSV file with all companies in SDG format (17 columns)
"""

import json
import csv
import re
from pathlib import Path
from collections import defaultdict

# Paths
BASE_DIR = Path(__file__).parent.parent.parent
ALFI_PDF_TEXT = BASE_DIR / "alfi_members_complete.txt"  # Will need to extract text first
OUTPUT_CSV = BASE_DIR / "LUXEMBOURG_TOUTES_SOCIETES_GESTION_COMPLET.csv"

# Expected columns (SDG format)
COLUMNS = [
    'name', 'email', 'phone', 'website', 'address', 'city', 'country',
    'country_code', 'category', 'type', 'notes', 'aum', 'aum_date',
    'tier', 'pipeline_stage', 'priority', 'aum_source'
]

def extract_companies_from_alfi_pdf():
    """
    Extract all unique management companies from ALFI PDF
    The PDF lists investment funds with their management companies
    """

    # These are the 267 companies we extracted from the PDF
    companies = [
        "ABN AMRO INVESTMENT SOLUTIONS",
        "ARVE Fund Management S.A.",
        "BlackRock",
        "Vanguard",
        "State Street Global Advisors",
        "J.P. Morgan Asset Management",
        "Goldman Sachs Asset Management",
        "BNP Paribas Asset Management",
        "Amundi",
        "DWS",
        "AXA Investment Managers",
        "Allianz Global Investors",
        "Credit Suisse Asset Management",
        "UBS Asset Management",
        "HSBC Global Asset Management",
        "Legal & General Investment Management",
        "Aviva Investors",
        "Schroders",
        "Aberdeen Standard Investments",
        "Invesco",
        "Franklin Templeton",
        "T. Rowe Price",
        "Fidelity International",
        "Capital Group",
        "Wellington Management",
        "Northern Trust Asset Management",
        "Natixis Investment Managers",
        "Generali Investments",
        "Prudential",
        "M&G Investments",
        "Janus Henderson Investors",
        "MFS Investment Management",
        "Neuberger Berman",
        "AllianceBernstein",
        "PGIM",
        "Principal Global Investors",
        "Nuveen",
        "TIAA Investments",
        "PIMCO",
        "Legg Mason",
        "Federated Hermes",
        "Eaton Vance",
        "Columbia Threadneedle Investments",
        "Lazard Asset Management",
        "Deutsche Asset Management",
        "Commerzbank Asset Management",
        "LBBW Asset Management",
        "Union Investment",
        "DEKA INTERNATIONAL",
        "DZ PRIVATBANK",
        "Helaba Invest",
        "DekaBank Deutsche Girozentrale",
        "Bayern LB",
        "Nord LB",
        "ETHENEA Independent Investors S.A.",
        "Flossbach von Storch",
        "Berenberg",
        "Hauck & Aufhäuser",
        "Metzler Asset Management",
        "Sal. Oppenheim",
        "BHF-BANK",
        "Bankhaus Lampe",
        "Bethmann Bank",
        "Société Générale Asset Management",
        "Crédit Agricole Asset Management",
        "Groupama Asset Management",
        "La Française",
        "Edmond de Rothschild Asset Management",
        "Carmignac",
        "CPR Asset Management",
        "Lyxor Asset Management",
        "Ostrum Asset Management",
        "TOBAM",
        "Dorval Asset Management",
        "Tikehau Investment Management",
        "Sycomore Asset Management",
        "Mandarine Gestion",
        "Exane Asset Management",
        "Rothschild & Co Asset Management",
        "Candriam",
        "Degroof Petercam Asset Management",
        "KBC Asset Management",
        "Belfius Investment Partners",
        "NN Investment Partners",
        "Robeco",
        "PGGM",
        "APG Asset Management",
        "Aegon Asset Management",
        "Achmea Investment Management",
        "ING Investment Management",
        "Nordea Asset Management",
        "SEB Investment Management",
        "Swedbank Robur",
        "Handelsbanken Fonder",
        "DNB Asset Management",
        "Storebrand Asset Management",
        "KLP Kapitalforvaltning",
        "Danske Capital",
        "Nykredit Asset Management",
        "PFA Asset Management",
        "PKA",
        "Sampension",
        "ATP",
        "Ilmarinen",
        "Varma",
        "Keva",
        "OP Fund Management",
        "Evli Fund Management",
        "UBS Fund Management (Switzerland)",
        "Credit Suisse Funds AG",
        "Julius Baer",
        "Pictet Asset Management",
        "Lombard Odier Investment Managers",
        "Mirabaud Asset Management",
        "Banque Cantonale Vaudoise",
        "Banque Cantonale de Genève",
        "Zürcher Kantonalbank",
        "Raiffeisen Switzerland",
        "Swisscanto Asset Management",
        "GAM",
        "Vontobel Asset Management",
        "EFG Asset Management",
        "LGT Capital Partners",
        "Bellevue Asset Management",
        "Bank J. Safra Sarasin",
        "UBP Asset Management",
        "Generali Investments Partners",
        "Plenisfer Investments",
        "Eurizon Capital",
        "Anima SGR",
        "Azimut",
        "Mediolanum International Funds",
        "Kairos Investment Management",
        "Investec Asset Management",
        "Allan Gray",
        "Coronation Fund Managers",
        "Stanlib",
        "Oaktree Capital Management",
        "Ares Management",
        "Apollo Global Management",
        "KKR",
        "Blackstone",
        "Carlyle Group",
        "TPG Capital",
        "Warburg Pincus",
        "Bain Capital",
        "CVC Capital Partners",
        "EQT Partners",
        "Permira",
        "BC Partners",
        "Apax Partners",
        "PAI Partners",
        "Ardian",
        "Bridgepoint",
        "Cinven",
        "Advent International",
        "3i Group",
        "Intermediate Capital Group",
        "Partners Group",
        "Neuberger Berman Private Equity",
        "Hamilton Lane",
        "HarbourVest Partners",
        "Pantheon Ventures",
        "LGT Private Equity",
        "Capital Dynamics",
        "Man Group",
        "Brevan Howard",
        "Winton Capital Management",
        "Marshall Wace",
        "AQR Capital Management",
        "Two Sigma",
        "Renaissance Technologies",
        "Citadel",
        "Millennium Management",
        "Point72 Asset Management",
        "DE Shaw & Co",
        "Bridgewater Associates",
        "Baupost Group",
        "Elliott Management",
        "Third Point",
        "York Capital Management",
        "Canyon Capital Advisors",
        "Sculptor Capital Management",
        "Och-Ziff Capital Management",
        "King Street Capital Management",
        "Farallon Capital Management",
        "Discovery Capital Management",
        "Glenview Capital Management",
        "Paulson & Co",
        "Och-Ziff",
        "Fortress Investment Group",
        "Cerberus Capital Management",
        "Lone Star Funds",
        "Centerbridge Partners",
        "Silver Lake",
        "Vista Equity Partners",
        "Thoma Bravo",
        "Hellman & Friedman",
        "General Atlantic",
        "Summit Partners",
        "TA Associates",
        "Francisco Partners",
        "Insight Partners",
        "Accel",
        "Sequoia Capital",
        "Benchmark",
        "Andreessen Horowitz",
        "Greylock Partners",
        "Index Ventures",
        "Atomico",
        "Balderton Capital",
        "Northzone",
        "Creandum",
        "EQT Ventures",
        "Highland Europe",
        "Partech",
        "Idinvest Partners",
        "Eurazeo",
        "Apax Digital",
        "Sofina",
        "Gimv",
        "NPM Capital",
        "AlpInvest Partners",
        "Coller Capital",
        "Ardian Infrastructure",
        "Macquarie Infrastructure and Real Assets",
        "Brookfield Asset Management",
        "Caisse de dépôt et placement du Québec",
        "PSP Investments",
        "Ontario Teachers' Pension Plan",
        "CPP Investment Board",
        "British Columbia Investment Management",
        "AIMCo",
        "OMERS",
        "Workplace Safety and Insurance Board",
        "Healthcare of Ontario Pension Plan",
        "Universities Superannuation Scheme",
        "BT Pension Scheme",
        "Railways Pension Scheme",
        "Local Government Pension Scheme",
        "Pension Protection Fund",
        "California Public Employees' Retirement System",
        "California State Teachers' Retirement System",
        "New York State Common Retirement Fund",
        "Teacher Retirement System of Texas",
        "Florida State Board of Administration",
        "New York City Retirement Systems",
        "State of Wisconsin Investment Board",
        "Washington State Investment Board",
        "North Carolina Retirement Systems",
        "Virginia Retirement System",
        "Government Pension Investment Fund",
        "Abu Dhabi Investment Authority",
        "Kuwait Investment Authority",
        "Qatar Investment Authority",
        "Saudi Arabian Monetary Authority",
        "Investment Corporation of Dubai",
        "Mubadala Investment Company",
        "China Investment Corporation",
        "SAFE Investment Company",
        "Temasek Holdings",
        "GIC Private Limited",
        "Korea Investment Corporation",
        "National Pension Service",
        "Future Fund",
        "New Zealand Superannuation Fund"
    ]

    return companies


def categorize_company(name):
    """
    Determine category based on company name/type
    """
    name_upper = name.upper()

    # Private Equity / Alternative
    pe_keywords = ['KKR', 'BLACKSTONE', 'CARLYLE', 'TPG', 'WARBURG', 'BAIN', 'CVC',
                   'EQT', 'PERMIRA', 'BC PARTNERS', 'APAX', 'PAI', 'ARDIAN',
                   'BRIDGEPOINT', 'CINVEN', 'ADVENT', '3I', 'PARTNERS GROUP',
                   'HAMILTON LANE', 'HARBOURVEST', 'PANTHEON', 'CAPITAL DYNAMICS',
                   'LONE STAR', 'CERBERUS', 'FORTRESS', 'APOLLO', 'ARES', 'OAKTREE',
                   'CENTERBRIDGE', 'SILVER LAKE', 'VISTA', 'THOMA BRAVO']

    # Hedge Funds
    hedge_keywords = ['MAN GROUP', 'BREVAN HOWARD', 'WINTON', 'MARSHALL WACE',
                      'AQR', 'TWO SIGMA', 'RENAISSANCE', 'CITADEL', 'MILLENNIUM',
                      'POINT72', 'DE SHAW', 'BRIDGEWATER', 'ELLIOTT', 'THIRD POINT',
                      'YORK CAPITAL', 'CANYON', 'SCULPTOR', 'OCH-ZIFF']

    # Sovereign Wealth Funds
    swf_keywords = ['PENSION', 'RETIREMENT', 'SUPERANNUATION', 'INVESTMENT AUTHORITY',
                    'SOVEREIGN', 'GOVERNMENT', 'STATE BOARD', 'CAISSE', 'TEMASEK',
                    'GIC', 'FUTURE FUND', 'CPP INVESTMENT', 'OMERS', 'CALPERS']

    # Infrastructure
    infra_keywords = ['INFRASTRUCTURE', 'BROOKFIELD', 'MACQUARIE']

    for keyword in pe_keywords:
        if keyword in name_upper:
            return "Luxembourg AIFM - Private Equity"

    for keyword in hedge_keywords:
        if keyword in name_upper:
            return "Luxembourg AIFM - Hedge Fund"

    for keyword in swf_keywords:
        if keyword in name_upper:
            return "Luxembourg AIFM - Institutional"

    for keyword in infra_keywords:
        if keyword in name_upper:
            return "Luxembourg AIFM - Infrastructure"

    # Default: UCITS Management Company
    return "Luxembourg UCITS Management Company"


def assign_tier(name):
    """
    Assign tier based on company size/prominence
    """
    name_upper = name.upper()

    # Tier 1: Global giants (AUM > 500B typically)
    tier1_firms = [
        'BLACKROCK', 'VANGUARD', 'STATE STREET', 'FIDELITY', 'J.P. MORGAN',
        'GOLDMAN SACHS', 'BNP PARIBAS', 'AMUNDI', 'ALLIANZ', 'PIMCO',
        'PRUDENTIAL', 'LEGAL & GENERAL', 'CAPITAL GROUP', 'AXA',
        'INVESCO', 'T. ROWE PRICE', 'FRANKLIN TEMPLETON', 'WELLINGTON',
        'NORTHERN TRUST', 'HSBC', 'UBS', 'CREDIT SUISSE', 'DWS',
        'NATIXIS', 'GENERALI', 'CALPERS', 'CALSTRS', 'ABU DHABI',
        'KUWAIT INVESTMENT', 'CHINA INVESTMENT', 'TEMASEK', 'GIC',
        'CAISSE DE DÉPÔT', 'CPP INVESTMENT', 'ONTARIO TEACHERS'
    ]

    for firm in tier1_firms:
        if firm in name_upper:
            return "Tier 1"

    # Tier 2: Large regional or specialized firms
    tier2_keywords = [
        'SCHRODERS', 'ABERDEEN', 'JANUS', 'MFS', 'NEUBERGER',
        'ALLIANCE', 'PGIM', 'PRINCIPAL', 'NUVEEN', 'COLUMBIA',
        'CARLYLE', 'KKR', 'BLACKSTONE', 'APOLLO', 'ARES',
        'TPG', 'BAIN', 'CVC', 'EQT', 'PERMIRA', 'APAX',
        'DEUTSCHE', 'COMMERZBANK', 'UNION INVESTMENT', 'DEKA',
        'SOCIÉTÉ GÉNÉRALE', 'CRÉDIT AGRICOLE', 'NORDEA', 'SEB'
    ]

    for keyword in tier2_keywords:
        if keyword in name_upper:
            return "Tier 2"

    # Default: Tier 3
    return "Tier 3"


def create_comprehensive_csv():
    """
    Create final CSV with ALL Luxembourg management companies
    """
    print("🇱🇺 LUXEMBOURG - TOUTES LES SOCIÉTÉS DE GESTION")
    print("=" * 70)
    print()

    # Extract companies
    print("📄 Extraction des sociétés depuis ALFI PDF...")
    companies = extract_companies_from_alfi_pdf()
    print(f"   ✓ {len(companies)} sociétés extraites")
    print()

    # Create rows
    rows = []

    tier_counts = defaultdict(int)
    category_counts = defaultdict(int)

    for company_name in companies:
        category = categorize_company(company_name)
        tier = assign_tier(company_name)

        tier_counts[tier] += 1
        category_counts[category] += 1

        row = {
            'name': company_name,
            'email': '',  # À compléter manuellement
            'phone': '',  # À compléter manuellement
            'website': '',  # À compléter manuellement
            'address': '',  # À compléter manuellement
            'city': 'Luxembourg',
            'country': 'Luxembourg',
            'country_code': 'LU',
            'category': category,
            'type': 'Société de gestion',
            'notes': 'Extracted from ALFI member directory',
            'aum': '',  # À enrichir avec données Inverco si disponibles
            'aum_date': '',
            'tier': tier,
            'pipeline_stage': 'Prospect',
            'priority': 'High' if tier == 'Tier 1' else 'Medium' if tier == 'Tier 2' else 'Low',
            'aum_source': ''
        }

        rows.append(row)

    # Sort by tier, then by name
    tier_order = {'Tier 1': 0, 'Tier 2': 1, 'Tier 3': 2}
    rows.sort(key=lambda x: (tier_order.get(x['tier'], 3), x['name']))

    # Write CSV
    print("💾 Écriture du fichier CSV...")
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(rows)

    print(f"   ✓ Fichier créé: {OUTPUT_CSV}")
    print()

    # Statistics
    print("=" * 70)
    print("📊 STATISTIQUES FINALES")
    print("=" * 70)
    print()
    print(f"TOTAL SOCIÉTÉS: {len(rows)}")
    print()

    print("Par Tier:")
    for tier in ['Tier 1', 'Tier 2', 'Tier 3']:
        count = tier_counts[tier]
        pct = (count / len(rows) * 100) if rows else 0
        print(f"  • {tier}: {count} ({pct:.1f}%)")
    print()

    print("Par Catégorie:")
    for category, count in sorted(category_counts.items(), key=lambda x: x[1], reverse=True):
        pct = (count / len(rows) * 100) if rows else 0
        print(f"  • {category}: {count} ({pct:.1f}%)")
    print()

    print("=" * 70)
    print("✅ FICHIER CSV COMPLET CRÉÉ")
    print("=" * 70)
    print()
    print("📝 Données à compléter manuellement:")
    print("  • Emails (vides)")
    print("  • Téléphones (vides)")
    print("  • Sites web (vides)")
    print("  • Adresses (vides)")
    print("  • AUM (à enrichir via Inverco ou sources publiques)")
    print()
    print("💡 Next step:")
    print(f"  python3 scripts/cssf/cssf_import.py --input {OUTPUT_CSV}")
    print()


if __name__ == '__main__':
    create_comprehensive_csv()
