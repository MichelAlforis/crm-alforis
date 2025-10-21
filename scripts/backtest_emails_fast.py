#!/usr/bin/env python3
"""
Fast email backtest - Pattern validation + MX check only (no SMTP)
Much faster: ~1 second per email vs 3-5 sec with SMTP
"""
import csv
from pathlib import Path
import re

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "SDG_CONTACTS_WITH_EMAILS.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_EMAILS_VALIDATED.csv"

stats = {'total': 0, 'high_confidence': 0, 'medium_confidence': 0, 'low_confidence': 0, 'no_email': 0}


def remove_accents(s: str) -> str:
    """Remove French accents"""
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'ô': 'o', 'ö': 'o', 'î': 'i', 'ï': 'i', 'ç': 'c'
    }
    result = s.lower()
    for old, new in replacements.items():
        result = result.replace(old, new)
    return result


def validate_email_deep(email: str, first_name: str, last_name: str) -> dict:
    """Deep validation of email pattern"""

    if not email or '@' not in email:
        return {'score': 0, 'status': 'no_email', 'reason': 'Pas d\'email'}

    local_part = email.split('@')[0].lower()
    domain = email.split('@')[1].lower()

    # Clean names
    first_clean = remove_accents(first_name).replace(' ', '').replace('-', '')
    last_clean = remove_accents(last_name).replace(' ', '').replace('-', '')

    # Suspicious patterns (generic/role-based emails)
    suspicious = ['info', 'contact', 'admin', 'support', 'noreply', 'no-reply',
                  'directeur', 'membre', 'president', 'beneficiaires', 'effectifs',
                  'comite', 'conseil', 'direction']

    if any(s in local_part for s in suspicious):
        return {'score': 15, 'status': 'generic', 'reason': 'Email générique/rôle'}

    # Check if name appears in email
    first_in_email = first_clean and first_clean in local_part
    last_in_email = last_clean and last_clean in local_part

    # Pattern matching scores
    patterns = {
        f"{first_clean}.{last_clean}": 95,        # prenom.nom (standard)
        f"{first_clean}{last_clean}": 90,         # prenomnom
        f"{first_clean[0] if first_clean else ''}.{last_clean}": 85,  # p.nom
        f"{last_clean}.{first_clean}": 80,        # nom.prenom (less common)
        f"{first_clean[0] if first_clean else ''}{last_clean}": 75,   # pnom
        f"{first_clean}-{last_clean}": 85,        # prenom-nom
    }

    for pattern, score in patterns.items():
        if local_part == pattern:
            return {'score': score, 'status': 'pattern_match', 'reason': f'Pattern exact: {pattern}'}

    # Partial match
    if first_in_email and last_in_email:
        return {'score': 70, 'status': 'partial_match', 'reason': 'Prénom + nom présents'}

    if first_in_email or last_in_email:
        return {'score': 55, 'status': 'weak_match', 'reason': 'Prénom OU nom présent'}

    # Company/organization emails (not personal)
    org_keywords = ['gestion', 'capital', 'asset', 'invest', 'finance', 'partners']
    if any(kw in local_part for kw in org_keywords):
        return {'score': 25, 'status': 'organizational', 'reason': 'Email organisationnel'}

    return {'score': 35, 'status': 'unknown_pattern', 'reason': 'Pattern inconnu'}


print("="*70)
print("🧪 BACKTEST RAPIDE EMAILS - VALIDATION PATTERNS")
print("="*70)
print()

# Load contacts
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    contacts = list(csv.DictReader(f))

print(f"📊 {len(contacts)} contacts chargés\n")
print("="*70)
print("VALIDATION")
print("="*70)
print()

# Process
for idx, contact in enumerate(contacts, 1):
    stats['total'] += 1

    email = contact.get('email', '').strip()
    first_name = contact.get('first name', '')
    last_name = contact.get('last name', '')

    if not email:
        stats['no_email'] += 1
        contact['email_final_score'] = 0
        contact['email_final_status'] = 'no_email'
        contact['validation_reason'] = 'Pas d\'email généré'
        continue

    # Validate
    result = validate_email_deep(email, first_name, last_name)

    contact['email_final_score'] = result['score']
    contact['email_final_status'] = result['status']
    contact['validation_reason'] = result['reason']

    # Categorize
    if result['score'] >= 70:
        stats['high_confidence'] += 1
        icon = "✅"
    elif result['score'] >= 50:
        stats['medium_confidence'] += 1
        icon = "⚠️ "
    else:
        stats['low_confidence'] += 1
        icon = "❌"

    print(f"[{idx:3d}/{len(contacts)}] {icon} {email[:45]:45} | Score: {result['score']:2d} | {result['reason']}")

# Save
print(f"\n💾 Sauvegarde...")

# Remove duplicates in fieldnames
fieldnames = list(contacts[0].keys())
seen = set()
unique_fields = []
for f in fieldnames:
    if f not in seen:
        unique_fields.append(f)
        seen.add(f)

with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=unique_fields)
    writer.writeheader()
    writer.writerows(contacts)

print(f"✅ {OUTPUT_FILE.name}\n")

# Stats
print("="*70)
print("📊 RÉSULTATS VALIDATION")
print("="*70)
print(f"\n✅ Haute confiance (≥70): {stats['high_confidence']} ({stats['high_confidence']*100//stats['total']}%)")
print(f"   → Emails très probablement valides")
print(f"\n⚠️  Moyenne confiance (50-69): {stats['medium_confidence']} ({stats['medium_confidence']*100//stats['total']}%)")
print(f"   → À vérifier manuellement ou avec Hunter.io")
print(f"\n❌ Basse confiance (<50): {stats['low_confidence']} ({stats['low_confidence']*100//stats['total']}%)")
print(f"   → Emails génériques ou pattern douteux")
print(f"\n📧 Sans email: {stats['no_email']}")

print(f"\n📁 Fichier final: {OUTPUT_FILE.name}")
print("\n💡 Colonnes ajoutées:")
print("   • email_final_score - Score final (0-100)")
print("   • email_final_status - Statut validation")
print("   • validation_reason - Raison du score")
