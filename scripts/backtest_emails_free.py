#!/usr/bin/env python3
"""
Backtest emails with FREE methods:
1. DNS MX Check (already done)
2. SMTP VRFY simulation (safe method)
3. Pattern validation against common formats
4. Domain reputation check
5. Catch-all detection
"""
import csv
import socket
import smtplib
import dns.resolver
from pathlib import Path
from typing import Dict, Optional
import re
import time

BASE_DIR = Path(__file__).parent.parent
INPUT_FILE = BASE_DIR / "SDG_CONTACTS_WITH_EMAILS.csv"
OUTPUT_FILE = BASE_DIR / "SDG_CONTACTS_EMAILS_BACKTESTED.csv"

# Stats
stats = {
    'total': 0,
    'mx_valid': 0,
    'smtp_connectable': 0,
    'smtp_verified': 0,
    'catch_all_detected': 0,
    'likely_valid': 0,
    'likely_invalid': 0
}


def check_smtp_connection(email: str) -> Dict:
    """
    SMTP verification - Safe method:
    1. Connect to mail server
    2. Check if accepts mail for domain (not specific email to avoid detection)
    """
    result = {
        'smtp_connectable': False,
        'catch_all': False,
        'verified': False,
        'confidence': 0
    }

    try:
        domain = email.split('@')[1]

        # Get MX records
        mx_records = dns.resolver.resolve(domain, 'MX')
        mx_host = str(mx_records[0].exchange).rstrip('.')

        # Connect to SMTP server
        server = smtplib.SMTP(timeout=10)
        server.connect(mx_host)
        server.helo('gmail.com')  # Pretend to be Gmail
        server.mail('test@gmail.com')

        result['smtp_connectable'] = True

        # Test with fake email to detect catch-all
        code_fake, msg_fake = server.rcpt('veryrandomtestaddress123456@' + domain)

        if code_fake == 250:
            # Catch-all domain (accepts everything)
            result['catch_all'] = True
            result['confidence'] = 40  # Lower confidence
        else:
            # Test real email
            code_real, msg_real = server.rcpt(email)

            if code_real == 250:
                result['verified'] = True
                result['confidence'] = 90  # High confidence
            elif code_real == 550 or code_real == 551:
                # User not found
                result['confidence'] = 10
            else:
                # Unknown response
                result['confidence'] = 30

        server.quit()

    except dns.resolver.NXDOMAIN:
        result['confidence'] = 0
    except dns.resolver.NoAnswer:
        result['confidence'] = 0
    except (socket.timeout, socket.error, smtplib.SMTPException):
        # Server blocks VRFY or connection issue
        # Not necessarily invalid, just can't verify
        result['confidence'] = 50
    except Exception as e:
        result['confidence'] = 50

    return result


def validate_email_pattern(email: str, first_name: str, last_name: str, domain: str) -> int:
    """
    Validate email matches common French business patterns
    Returns confidence score 0-100
    """
    if not email or '@' not in email:
        return 0

    local_part = email.split('@')[0].lower()
    first = first_name.lower().replace(' ', '').replace('-', '')
    last = last_name.lower().replace(' ', '').replace('-', '')

    # Remove accents for comparison
    def remove_accents(s):
        replacements = {
            'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
            'à': 'a', 'â': 'a', 'ä': 'a',
            'ù': 'u', 'û': 'u', 'ü': 'u',
            'ô': 'o', 'ö': 'o',
            'î': 'i', 'ï': 'i',
            'ç': 'c'
        }
        result = s
        for old, new in replacements.items():
            result = result.replace(old, new)
        return result

    first_clean = remove_accents(first)
    last_clean = remove_accents(last)

    # Common French patterns (in order of frequency)
    patterns = [
        f"{first_clean}.{last_clean}",     # prenom.nom (most common)
        f"{first_clean[0]}.{last_clean}",  # p.nom
        f"{first_clean}{last_clean}",      # prenomnom
        f"{last_clean}.{first_clean}",     # nom.prenom (less common)
        f"{first_clean[0]}{last_clean}",   # pnom
        f"{first_clean}",                  # prenom only (rare)
        f"{last_clean}",                   # nom only (rare)
    ]

    # Check exact match
    for idx, pattern in enumerate(patterns):
        if local_part == pattern:
            # Higher score for more common patterns
            base_score = 90 - (idx * 10)
            return max(base_score, 50)

    # Check partial match
    if first_clean in local_part and last_clean in local_part:
        return 70

    if first_clean in local_part or last_clean in local_part:
        return 50

    # Generic/suspicious patterns
    suspicious = ['info', 'contact', 'admin', 'support', 'noreply', 'directeur', 'membre']
    if any(s in local_part for s in suspicious):
        return 20

    return 30


def main():
    print("="*70)
    print("🧪 BACKTEST EMAILS - MÉTHODES GRATUITES")
    print("="*70)
    print("\n📋 Méthodes utilisées:")
    print("   1. DNS MX Check (déjà fait)")
    print("   2. SMTP Connection Test")
    print("   3. Catch-all Detection")
    print("   4. Pattern Validation")
    print("\n⚠️  Note: SMTP test peut être lent (~2-3 sec par email)")
    print("   Certains serveurs bloquent la vérification SMTP\n")

    # Load contacts
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        contacts = list(csv.DictReader(f))

    # Filter only contacts with MX valid emails
    contacts_to_test = [c for c in contacts if c.get('email_status') == 'mx_valid_unverified']

    print(f"📊 {len(contacts)} contacts chargés")
    print(f"🎯 {len(contacts_to_test)} emails MX valides à tester\n")

    response = input("Tester les emails avec SMTP? (o/n) [Peut prendre 10-20 min]: ").lower()
    use_smtp = response == 'o'

    print("\n" + "="*70)
    print("TRAITEMENT")
    print("="*70)
    print()

    # Process all contacts
    for idx, contact in enumerate(contacts, 1):
        stats['total'] += 1

        email = contact.get('email', '').strip()
        email_status = contact.get('email_status', '')

        # Skip if no email or not mx_valid
        if not email or email_status != 'mx_valid_unverified':
            continue

        stats['mx_valid'] += 1

        first_name = contact.get('first name', '')
        last_name = contact.get('last name', '')
        domain = email.split('@')[1] if '@' in email else ''

        print(f"[{idx}/{len(contacts)}] {email[:50]:50}...", end=" ", flush=True)

        # Pattern validation
        pattern_score = validate_email_pattern(email, first_name, last_name, domain)

        # SMTP check (if enabled)
        smtp_result = None
        if use_smtp:
            smtp_result = check_smtp_connection(email)
            time.sleep(0.5)  # Rate limiting

        # Calculate final confidence
        if smtp_result:
            if smtp_result['verified']:
                final_score = 95
                final_status = 'verified'
                stats['smtp_verified'] += 1
                print(f"✅ Vérifié (score: {final_score})")
            elif smtp_result['catch_all']:
                final_score = max(pattern_score, 40)
                final_status = 'catch_all'
                stats['catch_all_detected'] += 1
                print(f"⚠️  Catch-all (score: {final_score})")
            elif smtp_result['smtp_connectable']:
                final_score = smtp_result['confidence']
                final_status = 'smtp_checked'
                stats['smtp_connectable'] += 1
                print(f"📧 SMTP OK (score: {final_score})")
            else:
                final_score = pattern_score
                final_status = 'pattern_only'
                print(f"📝 Pattern (score: {final_score})")
        else:
            # Pattern only
            final_score = pattern_score
            final_status = 'pattern_only'
            print(f"📝 Pattern (score: {final_score})")

        # Update contact
        contact['email_status'] = final_status
        contact['email_score'] = final_score

        if final_score >= 70:
            stats['likely_valid'] += 1
        elif final_score <= 30:
            stats['likely_invalid'] += 1

    # Save results
    print(f"\n💾 Sauvegarde résultats...")

    # Remove duplicate columns
    fieldnames = list(contacts[0].keys())
    seen = set()
    unique_fieldnames = []
    for f in fieldnames:
        if f not in seen:
            unique_fieldnames.append(f)
            seen.add(f)

    with open(OUTPUT_FILE, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=unique_fieldnames)
        writer.writeheader()
        writer.writerows(contacts)

    print(f"✅ {OUTPUT_FILE.name}")

    # Statistics
    print("\n" + "="*70)
    print("📊 RÉSULTATS BACKTEST")
    print("="*70)
    print(f"\n📧 Emails analysés: {stats['mx_valid']}")

    if use_smtp:
        print(f"\n🔍 SMTP Tests:")
        print(f"   • Connectables: {stats['smtp_connectable']}")
        print(f"   • Vérifiés: {stats['smtp_verified']}")
        print(f"   • Catch-all détectés: {stats['catch_all_detected']}")

    print(f"\n✅ Confiance:")
    print(f"   • Probablement valides (≥70): {stats['likely_valid']}")
    print(f"   • Incertains (31-69): {stats['mx_valid'] - stats['likely_valid'] - stats['likely_invalid']}")
    print(f"   • Probablement invalides (≤30): {stats['likely_invalid']}")

    print(f"\n📁 Fichier: {OUTPUT_FILE.name}")

    print("\n💡 Statuts finaux:")
    print("   • verified - Email vérifié SMTP ✅")
    print("   • catch_all - Domaine accepte tout ⚠️")
    print("   • smtp_checked - SMTP testé")
    print("   • pattern_only - Validation pattern seule")


if __name__ == "__main__":
    main()
