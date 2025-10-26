"""
Core - Webhooks Delivery

Fournit les utilitaires pour déclencher les webhooks sortants lors des événements clés.
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Iterable, Optional

import httpx

from core.database import SessionLocal
from core.monitoring import get_logger
from services.webhook import WebhookService

logger = get_logger(__name__)

# Timeout générique pour l'envoi des webhooks
HTTP_TIMEOUT_SECONDS = 5.0


def _json_default(value):
    """Serializer JSON pour les types non natifs."""
    if isinstance(value, (datetime,)):
        return value.isoformat()
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time()).isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return str(value)


async def _deliver_webhook(
    client: httpx.AsyncClient,
    webhook,
    payload: dict,
    timestamp: str,
) -> None:
    """Envoie un webhook unique et journalise le résultat."""
    payload_json = json.dumps(payload, default=_json_default, ensure_ascii=False)
    signature = hmac.new(
        webhook.secret.encode("utf-8"),
        payload_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Id": str(webhook.id),
        "X-Webhook-Event": payload["event"],
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
    }

    try:
        response = await client.post(
            webhook.url,
            content=payload_json,
            headers=headers,
        )
        response.raise_for_status()
        logger.info(
            "webhook_delivered",
            extra={
                "webhook_id": webhook.id,
                "event": payload["event"],
                "status_code": response.status_code,
            },
        )
    except httpx.TimeoutException as exc:
        logger.warning(
            "webhook_timeout",
            extra={
                "webhook_id": webhook.id,
                "event": payload["event"],
                "error": str(exc),
            },
        )
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "webhook_http_error",
            extra={
                "webhook_id": webhook.id,
                "event": payload["event"],
                "status_code": exc.response.status_code,
                "body": exc.response.text[:500],
            },
        )
    except httpx.HTTPError as exc:
        logger.error(
            "webhook_delivery_failed",
            extra={
                "webhook_id": webhook.id,
                "event": payload["event"],
                "error": str(exc),
            },
        )


async def trigger_webhooks_for_event(
    event: str,
    data: dict,
    user_id: Optional[int] = None,
) -> None:
    """
    Déclencher les webhooks pour un événement donné.

    Args:
        event: Nom de l'événement (EventType.value)
        data: Payload spécifique à l'événement
        user_id: ID utilisateur ayant déclenché l'action (optionnel)
    """
    db = SessionLocal()
    try:
        service = WebhookService(db)
        webhooks = service.get_active_for_event(event)
    except Exception as exc:
        logger.error(
            "webhook_lookup_failed",
            extra={"event": event, "error": str(exc)},
        )
        return
    finally:
        db.close()

    if not webhooks:
        return

    timestamp = datetime.now(timezone.utc).isoformat()
    payload = {
        "event": event,
        "data": data,
        "timestamp": timestamp,
    }
    if user_id is not None:
        payload["user_id"] = user_id

    timeout = httpx.Timeout(HTTP_TIMEOUT_SECONDS)
    async with httpx.AsyncClient(timeout=timeout) as client:
        await asyncio.gather(
            *[_deliver_webhook(client, webhook, payload, timestamp) for webhook in webhooks]
        )


def get_default_webhook_events() -> Iterable[str]:
    """Retourne la liste des événements à surveiller par défaut."""
    from core.events import EventType  # Import paresseux pour éviter les cycles

    return [
        EventType.ORGANISATION_CREATED.value,
        EventType.ORGANISATION_UPDATED.value,
        EventType.ORGANISATION_DELETED.value,
        EventType.PERSON_CREATED.value,
        EventType.PERSON_UPDATED.value,
        EventType.PERSON_DELETED.value,
        EventType.TASK_CREATED.value,
        EventType.TASK_COMPLETED.value,
        EventType.MANDAT_CREATED.value,
        EventType.MANDAT_UPDATED.value,
        EventType.MANDAT_SIGNED.value,
        EventType.INTERACTION_CREATED.value,
        EventType.INTERACTION_UPDATED.value,
    ]


def register_webhook_listeners(event_bus) -> None:
    """
    Enregistre dynamiquement les listeners sur l'event bus.

    Chaque événement de la liste renverra le payload via les webhooks configurés.
    """
    from core.events import Event, EventType  # Import local pour éviter les cycles

    for event_value in get_default_webhook_events():
        event_type = EventType(event_value)

        @event_bus.subscribe(event_type)
        async def _forward(event: Event, _event_value=event_value):
            await trigger_webhooks_for_event(
                event=_event_value,
                data=event.data,
                user_id=event.user_id,
            )
