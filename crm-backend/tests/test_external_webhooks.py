from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi.testclient import TestClient
from svix.webhooks import Webhook

from core.config import settings
from models.email import (
    EmailCampaign,
    EmailCampaignStatus,
    EmailEvent,
    EmailEventType,
    EmailProvider,
    EmailSend,
    EmailSendStatus,
)


def _create_email_send(db, provider_message_id: str = "msg_123") -> EmailSend:
    """Crée une campagne et un envoi minimal pour les tests webhooks."""
    campaign = EmailCampaign(
        name="Test Campaign",
        provider=EmailProvider.RESEND,
        from_name="Alforis",
        from_email="noreply@alforis.fr",
        status=EmailCampaignStatus.RUNNING,
    )
    db.add(campaign)
    db.flush()

    send = EmailSend(
        campaign_id=campaign.id,
        recipient_email="user@example.com",
        status=EmailSendStatus.SENT,
        provider_message_id=provider_message_id,
    )
    db.add(send)
    db.commit()
    db.refresh(send)
    return send


def _build_payload(send: EmailSend) -> str:
    payload = {
        "event_type": "email.delivered",
        "status": "delivered",
        "email_id": send.provider_message_id,
        "to": send.recipient_email,
        "from": "Alforis <noreply@alforis.fr>",
        "subject": "Test message",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {"provider": "resend"},
    }
    return json.dumps(payload)


def test_receive_resend_webhook_valid_signature(client: TestClient, test_db, monkeypatch):
    send = _create_email_send(test_db)
    payload_json = _build_payload(send)

    secret = "whsec_test_valid"
    monkeypatch.setattr(settings, "resend_signing_secret", secret)

    headers = Webhook(secret).sign(payload_json)
    headers["Content-Type"] = "application/json"

    response = client.post("/api/v1/webhooks/resend", content=payload_json, headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True

    events = test_db.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == EmailEventType.DELIVERED

    test_db.refresh(send)
    assert send.status == EmailSendStatus.DELIVERED


def test_receive_resend_webhook_invalid_signature_is_ignored(
    client: TestClient, test_db, monkeypatch
):
    send = _create_email_send(test_db, provider_message_id="msg_invalid")
    payload_json = _build_payload(send)

    secret = "whsec_expected"
    monkeypatch.setattr(settings, "resend_signing_secret", secret)

    wrong_headers = Webhook("whsec_wrong").sign(payload_json)
    wrong_headers["Content-Type"] = "application/json"

    response = client.post("/api/v1/webhooks/resend", content=payload_json, headers=wrong_headers)
    assert response.status_code == 202
    body = response.json()
    assert body["success"] is False

    events = test_db.query(EmailEvent).all()
    assert len(events) == 0


def test_receive_resend_webhook_with_bearer_token(client: TestClient, test_db, monkeypatch):
    send = _create_email_send(test_db, provider_message_id="msg_proxy")
    payload_json = _build_payload(send)

    token = "proxy-token"
    monkeypatch.setattr(settings, "webhook_secret", token)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    response = client.post("/api/v1/webhooks/resend", content=payload_json, headers=headers)
    assert response.status_code == 200
    assert response.json()["success"] is True

    events = test_db.query(EmailEvent).all()
    assert len(events) == 1
    assert events[0].event_type == EmailEventType.DELIVERED
