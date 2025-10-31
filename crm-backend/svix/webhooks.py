"""
Lightweight local implementation of the Svix webhook helpers.

The real ``svix`` package provides signature helpers for webhook validation.
For our test environment we only need deterministic signing and verification
based on a shared secret, so we reimplement the minimal behaviour here.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import time
import uuid
from typing import Dict


class WebhookVerificationError(Exception):
    """Raised when a webhook signature cannot be verified."""


class Webhook:
    """Mimic Svix Webhook utilities with HMAC SHA256 signing."""

    def __init__(self, secret: str):
        if not secret:
            raise ValueError("Webhook secret must be provided")
        self.secret = secret.encode("utf-8")

    def _compute_signature(self, payload: str, timestamp: str) -> str:
        message = f"{timestamp}.{payload}".encode("utf-8")
        digest = hmac.new(self.secret, message, hashlib.sha256).digest()
        return base64.b64encode(digest).decode("utf-8")

    def sign(self, payload: str) -> Dict[str, str]:
        """
        Generate Svix-compatible headers for the given payload.

        Returns:
            dict contenant svix-id, svix-timestamp et svix-signature
        """
        timestamp = str(int(time.time()))
        signature = self._compute_signature(payload, timestamp)
        return {
            "svix-id": str(uuid.uuid4()),
            "svix-timestamp": timestamp,
            "svix-signature": f"v1,{signature}",
        }

    def verify(self, payload: str, headers: Dict[str, str]) -> None:
        """
        Vérifie que la signature reçue correspond au payload envoyé.

        Lève WebhookVerificationError en cas d'échec.
        """
        timestamp = headers.get("svix-timestamp")
        signature = headers.get("svix-signature")

        if not timestamp or not signature:
            raise WebhookVerificationError("Missing Svix signature headers")

        expected = self._compute_signature(payload, timestamp)
        provided = signature.split(",", 1)[-1]

        if not hmac.compare_digest(expected, provided):
            raise WebhookVerificationError("Invalid Svix signature")

