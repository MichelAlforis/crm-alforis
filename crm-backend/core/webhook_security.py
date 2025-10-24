"""
Webhook Security Utilities

Fonctions pour valider les webhooks entrants:
- HMAC signature verification
- Timestamp validation (reject old events)
- Replay attack prevention
"""

import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from fastapi import HTTPException, status


def compute_hmac_signature(payload: Dict[str, Any], secret: str) -> str:
    """
    Calcule la signature HMAC SHA-256 d'un payload.

    Args:
        payload: Dict représentant le webhook payload
        secret: Secret partagé avec le provider

    Returns:
        Signature HMAC en hexadécimal
    """
    # Serialize payload to JSON (sorted keys for consistency)
    payload_bytes = json.dumps(payload, sort_keys=True).encode('utf-8')

    # Compute HMAC
    signature = hmac.new(
        key=secret.encode('utf-8'),
        msg=payload_bytes,
        digestmod=hashlib.sha256
    ).hexdigest()

    return signature


def verify_webhook_signature(
    payload: Dict[str, Any],
    received_signature: Optional[str],
    secret: str,
    header_prefix: str = ""
) -> bool:
    """
    Vérifie la signature HMAC d'un webhook.

    Args:
        payload: Webhook payload (dict)
        received_signature: Signature reçue dans header (ex: "sha256=abc123")
        secret: Secret partagé
        header_prefix: Préfixe optionnel (ex: "sha256=")

    Returns:
        True si signature valide, False sinon
    """
    if not received_signature:
        return False

    # Remove prefix if present (ex: "sha256=abc123" → "abc123")
    if header_prefix and received_signature.startswith(header_prefix):
        received_signature = received_signature[len(header_prefix):]

    # Compute expected signature
    expected_signature = compute_hmac_signature(payload, secret)

    # Constant-time comparison to prevent timing attacks
    return hmac.compare_digest(expected_signature, received_signature)


def validate_webhook_timestamp(
    timestamp_str: Optional[str],
    max_age_seconds: int = 300
) -> datetime:
    """
    Valide le timestamp d'un webhook (reject events trop anciens).

    Args:
        timestamp_str: Timestamp ISO 8601 ou Unix timestamp (str)
        max_age_seconds: Âge maximum accepté (default: 300s = 5min)

    Returns:
        datetime validé

    Raises:
        HTTPException: Si timestamp manquant, invalide ou trop ancien
    """
    if not timestamp_str:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing webhook timestamp (X-Timestamp header required)"
        )

    try:
        # Try to parse as Unix timestamp (integer)
        if timestamp_str.isdigit():
            event_time = datetime.utcfromtimestamp(int(timestamp_str))
        else:
            # Try to parse as ISO 8601
            event_time = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except (ValueError, OSError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid timestamp format: {e}"
        )

    # Check age
    now = datetime.utcnow()
    age_seconds = (now - event_time).total_seconds()

    if age_seconds > max_age_seconds:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Webhook event too old ({int(age_seconds)}s > {max_age_seconds}s)"
        )

    if age_seconds < -60:  # Future event (tolerate 1min clock drift)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Webhook event timestamp is in the future"
        )

    return event_time


def verify_resend_webhook(
    payload: Dict[str, Any],
    signature: Optional[str],
    secret: str
) -> bool:
    """
    Vérifie un webhook Resend (format spécifique).

    Resend format: X-Resend-Signature: v1=<hmac_sha256>

    Args:
        payload: Webhook payload
        signature: Header X-Resend-Signature
        secret: Secret Resend

    Returns:
        True si valide
    """
    return verify_webhook_signature(
        payload=payload,
        received_signature=signature,
        secret=secret,
        header_prefix="v1="
    )


def verify_sendgrid_webhook(
    payload: Dict[str, Any],
    signature: Optional[str],
    public_key: str
) -> bool:
    """
    Vérifie un webhook Sendgrid (signature ECDSA + public key).

    Note: Sendgrid utilise ECDSA, pas HMAC.
    Requiert: cryptography library

    Args:
        payload: Webhook payload
        signature: Header X-Twilio-Email-Event-Webhook-Signature
        public_key: Clé publique Sendgrid (PEM format)

    Returns:
        True si valide

    Raises:
        NotImplementedError: Si cryptography non installé
    """
    # TODO: Implémenter ECDSA verification
    # Requires: from cryptography.hazmat.primitives import hashes, serialization
    # Requires: from cryptography.hazmat.primitives.asymmetric import ec
    raise NotImplementedError("Sendgrid ECDSA verification not yet implemented")
