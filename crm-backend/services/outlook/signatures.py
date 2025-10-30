"""
Outlook Signature Parser - Email signature extraction & validation

Fonctionnalités:
- Parse signatures HTML (email, phone, job, company)
- Détection marketing/spam
- Normalisation téléphones internationaux
- Extraction depuis messages Outlook
"""

import re
from typing import Dict, List, Optional

from bs4 import BeautifulSoup

# Patterns email marketing/spam à bloquer
EMAIL_BLOCKLIST_PATTERNS = [
    r"noreply",
    r"no-reply",
    r"notification",
    r"newsletter",
    r"marketing",
    r"promo",
    r"support@.*",
    r"info@.*",
    r"contact@.*",
    r".*@outlook\.com$",  # Emails publicitaires Outlook
    r".*@.*\.onmicrosoft\.com$",
    r"bounce",
    r"mailer",
    r"postmaster",
    r"unsubscribe",
]


def is_marketing_email(email: str) -> bool:
    """
    Détecte si un email est probablement du marketing/spam

    Args:
        email: Adresse email à vérifier

    Returns:
        True si email marketing, False sinon
    """
    if not email:
        return True

    email_lower = email.lower()

    # Vérifier contre la blocklist
    for pattern in EMAIL_BLOCKLIST_PATTERNS:
        if re.search(pattern, email_lower):
            return True

    return False


def parse_signature(html_body: str) -> Optional[Dict]:
    """
    Extrait les informations d'une signature email

    Args:
        html_body: Corps HTML de l'email

    Returns:
        {
            "email": "alice.durand@acme.com",
            "phone": "+33184201234",
            "job_title": "Head of Sales",
            "company": "ACME Corp",
            "address": "123 rue de la Paix, 75001 Paris"
        }
    """
    if not html_body:
        return None

    # Parser HTML
    soup = BeautifulSoup(html_body, "html.parser")
    text = soup.get_text()

    # Patterns regex
    email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    phone_pattern = r"(?:Tel|Tél|Phone|Mobile|Mob)[\s:]*([+]?[0-9][\s\-\.\(\)0-9]{7,18})"

    # Extraction
    signature = {}

    # Email
    emails = re.findall(email_pattern, text)
    if emails:
        # Prendre le premier email qui n'est pas microsoft.com
        for email in emails:
            if "microsoft.com" not in email.lower():
                signature["email"] = email
                break

    # Téléphone
    phone_match = re.search(phone_pattern, text, re.IGNORECASE)
    if phone_match:
        signature["phone"] = phone_match.group(1).strip()

    # Fonction (patterns courants)
    job_patterns = [
        r"(CEO|CTO|CFO|COO|Directeur|Director|Manager|Head of|VP|Responsable|Président)",
        r"([A-Z][a-z]+\s+(?:de|of)\s+[A-Z][a-z]+)",
    ]
    for pattern in job_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            signature["job_title"] = match.group(0).strip()
            break

    return signature if signature else None


def extract_signatures_from_messages(
    messages: List[Dict], filter_marketing: bool = True
) -> List[Dict]:
    """
    Extrait les signatures de plusieurs messages

    Args:
        messages: Liste messages Graph API
        filter_marketing: Si True, filtre les emails marketing

    Returns:
        Liste signatures trouvées
    """
    signatures = []
    seen_emails = set()

    for msg in messages:
        body_html = msg.get("body", {}).get("content", "")
        if not body_html:
            continue

        sig = parse_signature(body_html)
        if not sig or not sig.get("email"):
            continue

        email = sig["email"].lower()

        # Skip marketing
        if filter_marketing and is_marketing_email(email):
            continue

        # Skip duplicates
        if email in seen_emails:
            continue

        seen_emails.add(email)

        # Ajouter metadata du message
        sig["source_message_id"] = msg.get("id")
        sig["source_date"] = msg.get("receivedDateTime") or msg.get("sentDateTime")

        signatures.append(sig)

    return signatures


def normalize_phone_from_signature(phone: str, country_code: str = "FR") -> Optional[str]:
    """
    Normalise un téléphone extrait d'une signature

    Args:
        phone: Numéro brut (peut contenir espaces, points, etc.)
        country_code: Code pays (FR, US, etc.)

    Returns:
        Téléphone normalisé au format international ou None
    """
    if not phone:
        return None

    # Nettoyer (garder seulement chiffres et +)
    cleaned = re.sub(r"[^\d+]", "", phone)

    # Si déjà format international
    if cleaned.startswith("+"):
        return cleaned

    # Ajouter indicatif pays
    if country_code == "FR":
        # 06 12 34 56 78 → +33612345678
        if cleaned.startswith("0"):
            return f"+33{cleaned[1:]}"
        # Déjà sans le 0
        if len(cleaned) == 9:
            return f"+33{cleaned}"

    return f"+{cleaned}" if len(cleaned) >= 10 else None
