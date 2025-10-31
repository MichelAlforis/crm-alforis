"""
Minimal local stub of the ``svix`` package used in tests.

Provides just enough functionality for the webhook signature flow exercised
by the API tests without requiring the external dependency.
"""

from .webhooks import Webhook, WebhookVerificationError  # noqa: F401

