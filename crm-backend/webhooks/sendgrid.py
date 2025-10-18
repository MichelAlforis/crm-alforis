import base64
import hashlib
import hmac
from typing import Any, Iterable, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from core import get_db, settings
from core.events import EventType, emit_event
from services.email_service import EmailEventIngestionService

router = APIRouter(
    prefix="/email/webhooks/sendgrid",
    tags=["email-webhooks"],
)


def _verify_signature(signature: Optional[str], timestamp: Optional[str], payload: bytes) -> bool:
    if not settings.sendgrid_event_webhook_key:
        return True  # Pas de clé configurée → skip verification (dev environments)
    if not signature or not timestamp:
        return False
    try:
        decoded_key = base64.b64decode(settings.sendgrid_event_webhook_key)
        signed_payload = timestamp.encode("utf-8") + payload
        computed_signature = hmac.new(decoded_key, signed_payload, hashlib.sha256).digest()
        expected = base64.b64encode(computed_signature).decode()
        return hmac.compare_digest(expected, signature)
    except Exception:
        return False


@router.post("", status_code=status.HTTP_202_ACCEPTED)
async def handle_sendgrid_webhook(
    request: Request,
    signature: Optional[str] = Header(None, alias="X-Twilio-Email-Event-Webhook-Signature"),
    timestamp: Optional[str] = Header(None, alias="X-Twilio-Email-Event-Webhook-Timestamp"),
    db: Session = Depends(get_db),
):
    raw_body = await request.body()
    if not _verify_signature(signature, timestamp, raw_body):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON payload")

    events: Iterable[dict[str, Any]]
    if isinstance(payload, dict):
        events = [payload]
    elif isinstance(payload, list):
        events = payload
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unexpected payload format")

    service = EmailEventIngestionService(db)
    processed = service.ingest_sendgrid_events(events)
    await emit_event(
        EventType.EMAIL_EVENT_RECEIVED,
        data={"provider": "sendgrid", "events": processed},
        user_id=None,
    )
    return {"status": "accepted", "processed": processed}
