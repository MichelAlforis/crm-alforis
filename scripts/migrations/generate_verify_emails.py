#!/usr/bin/env python3
"""
Generate and verify professional emails for contacts
1. Generate email pattern: prenom.nom@domain.com
2. DNS MX Check (free)
3. Hunter.io verification (50 free/month)
"""
import csv
import re
from pathlib import Path
from typing import Dict, Optional
import dns.resolver
import requests
from urllib.parse import urlparse

BASE_DIR = Path(__file__).parent.parent
CONTACTS_FILE = BASE_DIR / "SDG_CONTACTS_CRM_IMPORT.csv"
ORGS_FILE = BASE_DIR / "SDG_677_IMPORT_FINAL.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_WITH_EMAILS.csv"

# Hunter.io API (optional - 50 free requests/month)
HUNTER_API_KEY = ""  # Leave empty to skip Hunter verification
HUNTER_API_URL = "https://api.hunter.io/v2/email-verifier"

# Statistics
stats = {
    'total': 0,
    'emails_generated': 0,
    'mx_valid': 0,
    'hunter_verified': 0,
    'no_domain': 0
}


def load_org_domains() -> Dict[str, str]:
    """Load organization websites/domains from SDG file"""
    domains = {}

    with open(ORGS_FILE, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            name = row.get('name', '').strip()
            website = row.get('website', '').strip()

            if website and name:
                # Extract domain from website
                if not website.startswith('http'):
                    website = 'https://' + website

                try:
                    parsed = urlparse(website)
                    domain = parsed.netloc.replace('www.', '')
                    if domain:
                        domains[name] = domain
                except:
                    pass

    return domains


def normalize_name(name: str) -> str:
    """Normalize name for email (remove accents, lowercase, etc.)"""
    # Remove accents
    replacements = {
        'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
        'à': 'a', 'â': 'a', 'ä': 'a',
        'ù': 'u', 'û': 'u', 'ü': 'u',
        'ô': 'o', 'ö': 'o',
        'î': 'i', 'ï': 'i',
        'ç': 'c',
        'É': 'e', 'È': 'e', 'Ê': 'e', 'Ë': 'e',
        'À': 'a', 'Â': 'a', 'Ä': 'a',
        'Ù': 'u', 'Û': 'u', 'Ü': 'u',
        'Ô': 'o', 'Ö': 'o',
        'Î': 'i', 'Ï': 'i',
        'Ç': 'c'
    }

    result = name
    for old, new in replacements.items():
        result = result.replace(old, new)

    # Remove non-alphanumeric except dash
    result = re.sub(r'[^a-zA-Z0-9-]', '', result)

    return result.lower()


def generate_email(first_name: str, last_name: str, domain: str) -> str:
    """Generate email pattern: prenom.nom@domain.com"""
    first = normalize_name(first_name)
    last = normalize_name(last_name)

    # Most common pattern in France
    return f"{first}.{last}@{domain}"


def check_mx_record(domain: str) -> bool:
    """Check if domain has MX records (accepts emails)"""
    try:
        mx_records = dns.resolver.resolve(domain, 'MX')
        return len(mx_records) > 0
    except:
        return False


def verify_with_hunter(email: str, api_key: str) -> Optional[Dict]:
    """Verify email with Hunter.io API"""
    if not api_key:
        return None

    try:
        params = {
            'email': email,
            'api_key': api_key
        }
        response = requests.get(HUNTER_API_URL, params=params, timeout=10)

        if response.status_code == 200:
            data = response.json()
            if 'data' in data:
                return {
                    'status': data['data'].get('status'),  # valid/invalid/accept_all/unknown
                    'score': data['data'].get('score', 0),  # 0-100
                    'smtp_check': data['data'].get('smtp_check', False)
                }
    except:
        pass

    return None


def main():
    print("="*70)
    print("🚀 GÉNÉRATION ET VÉRIFICATION EMAILS PROFESSIONNELS")
    print("="*70)
    print()

    # Load organization domains
    print("📋 Chargement domaines organisations...")
    org_domains = load_org_domains()
    print(f"   ✅ {len(org_domains)} domaines chargés\n")

    # Load contacts
    print("📊 Chargement contacts...")
    with open(CONTACTS_FILE, 'r', encoding='utf-8') as f:
        contacts = list(csv.DictReader(f))
    print(f"   ✅ {len(contacts)} contacts chargés\n")

    # Hunter.io status
    if HUNTER_API_KEY:
        print("🔍 Hunter.io: ACTIVÉ (50 vérifications gratuites)")
    else:
        print("⚠️  Hunter.io: DÉSACTIVÉ (pas de clé API)")
        print("   → Pour activer: https://hunter.io/api")
    print()

    print("="*70)
    print("TRAITEMENT")
    print("="*70)
    print()

    # Process contacts
    enriched_contacts = []
    hunter_count = 0
    max_hunter = 50  # Free tier limit

    for idx, contact in enumerate(contacts, 1):
        stats['total'] += 1

        first_name = contact.get('first name', '').strip()
        last_name = contact.get('last name', '').strip()
        org_name = contact.get('organisation', '').strip()

        print(f"[{idx}/{len(contacts)}] {first_name} {last_name} @ {org_name[:30]}...", end=" ")

        # Get domain
        domain = org_domains.get(org_name)

        if not domain:
            print("❌ Pas de domaine")
            stats['no_domain'] += 1
            contact['email'] = ''
            contact['email_status'] = 'no_domain'
            contact['email_score'] = 0
            enriched_contacts.append(contact)
            continue

        # Generate email
        email = generate_email(first_name, last_name, domain)
        stats['emails_generated'] += 1

        # Check MX record
        has_mx = check_mx_record(domain)

        if not has_mx:
            print(f"⚠️  {email} (MX invalide)")
            contact['email'] = email
            contact['email_status'] = 'mx_invalid'
            contact['email_score'] = 0
            enriched_contacts.append(contact)
            continue

        stats['mx_valid'] += 1

        # Verify with Hunter.io (if API key and under limit)
        hunter_result = None
        if HUNTER_API_KEY and hunter_count < max_hunter:
            hunter_result = verify_with_hunter(email, HUNTER_API_KEY)
            hunter_count += 1

        if hunter_result:
            stats['hunter_verified'] += 1
            status = hunter_result['status']
            score = hunter_result['score']

            if status == 'valid':
                print(f"✅ {email} (score: {score})")
            elif status == 'accept_all':
                print(f"⚠️  {email} (accept_all, score: {score})")
            else:
                print(f"❓ {email} ({status}, score: {score})")

            contact['email'] = email
            contact['email_status'] = status
            contact['email_score'] = score
        else:
            # MX valid but not verified
            print(f"📧 {email} (MX OK, non vérifié)")
            contact['email'] = email
            contact['email_status'] = 'mx_valid_unverified'
            contact['email_score'] = 50  # Medium confidence

        enriched_contacts.append(contact)

    # Save results
    print(f"\n💾 Sauvegarde résultats...")

    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        fieldnames = list(contacts[0].keys()) + ['email_status', 'email_score']
        # Remove duplicate 'email' if exists
        if 'email' in fieldnames:
            fieldnames.remove('email')
        fieldnames.insert(3, 'email')  # Insert email after personal_email

        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_contacts)

    print(f"✅ {OUTPUT_FILE.name}")

    # Statistics
    print("\n" + "="*70)
    print("📊 STATISTIQUES")
    print("="*70)
    print(f"\n✅ Total contacts: {stats['total']}")
    print(f"   • Emails générés: {stats['emails_generated']}")
    print(f"   • MX valides: {stats['mx_valid']} ({stats['mx_valid']*100//stats['total']}%)")
    print(f"   • Vérifiés Hunter.io: {stats['hunter_verified']}")
    print(f"   • Sans domaine: {stats['no_domain']}")

    print(f"\n📁 Fichier généré: {OUTPUT_FILE.name}")
    print("\n💡 Colonnes ajoutées:")
    print("   • email - Email professionnel généré")
    print("   • email_status - Statut vérification")
    print("   • email_score - Score confiance (0-100)")

    if not HUNTER_API_KEY:
        print("\n⚠️  Pour vérifier les emails avec Hunter.io:")
        print("   1. Créer compte: https://hunter.io/users/sign_up")
        print("   2. Copier API key")
        print("   3. Éditer ce script ligne 17: HUNTER_API_KEY = 'votre_clé'")
        print("   4. Relancer le script")


if __name__ == "__main__":
    main()
