"""
Routes API - Webhooks externes entrants (alforis.fr -> CRM)

Endpoints sécurisés par Bearer Token pour recevoir:
1. Événements Resend (via proxy alforis.fr)
2. Désabonnements depuis le site web
"""

from datetime import datetime, timezone
from typing import Dict, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import and_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

import logging

from core import get_db, verify_webhook_token
from core.exceptions import ConflictError
from models.email import EmailEvent, EmailSend, UnsubscribedEmail, EmailEventType
from models.person import Person
from models.organisation import Organisation
from schemas.email import (
    ResendWebhookEvent,
    ResendWebhookResponse,
    UnsubscribeRequest,
    UnsubscribeResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["external-webhooks"])


# Mapping des événements Resend vers EmailEventType
# EmailEventType disponibles: PROCESSED, DELIVERED, OPENED, CLICKED, BOUNCED, DROPPED, SPAM_REPORT, UNSUBSCRIBED, DEFERRED
RESEND_EVENT_MAPPING = {
    "email.sent": EmailEventType.PROCESSED,
    "email.delivered": EmailEventType.DELIVERED,
    "email.delivery_delayed": EmailEventType.DEFERRED,
    "email.failed": EmailEventType.DROPPED,  # Utilise DROPPED pour les échecs
    "email.bounced": EmailEventType.BOUNCED,
    "email.opened": EmailEventType.OPENED,
    "email.clicked": EmailEventType.CLICKED,
    "email.complained": EmailEventType.SPAM_REPORT,
    "email.scheduled": EmailEventType.PROCESSED,  # Pas d'équivalent, utilise PROCESSED
}


@router.post("/resend", response_model=ResendWebhookResponse)
async def receive_resend_webhook(
    event: ResendWebhookEvent,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_webhook_token),
):
    """
    Recevoir un événement Resend depuis le proxy alforis.fr.

    Les 9 types d'événements Resend sont mappés vers EmailEventType:
    - email.sent → SENT
    - email.delivered → DELIVERED
    - email.delivery_delayed → DEFERRED
    - email.failed → FAILED
    - email.bounced → BOUNCED
    - email.opened → OPENED
    - email.clicked → CLICKED
    - email.complained → COMPLAINED
    - email.scheduled → QUEUED
    """
    try:
        # 1. Trouver l'EmailSend correspondant via provider_message_id
        email_send = (
            db.query(EmailSend)
            .filter(
                and_(
                    EmailSend.provider_message_id == event.email_id,
                    EmailSend.recipient_email == event.to,
                )
            )
            .first()
        )

        if not email_send:
            # Log l'événement sans send_id (peut arriver si l'email vient d'un autre système)
            logger.warning(
                "resend_webhook_no_send_found",
                extra={
                    "email_id": event.email_id,
                    "recipient": event.to,
                    "event_type": event.event_type,
                },
            )
            # On retourne success quand même pour éviter des retries inutiles côté Resend
            return ResendWebhookResponse(
                success=True,
                message=f"Event received but no matching EmailSend found for email_id={event.email_id}",
            )

        # 2. Mapper l'événement Resend vers EmailEventType
        event_type = RESEND_EVENT_MAPPING.get(event.event_type)
        if not event_type:
            logger.warning(
                "resend_webhook_unknown_event",
                extra={"event_type": event.event_type, "email_id": event.email_id},
            )
            return ResendWebhookResponse(
                success=False,
                message=f"Unknown event type: {event.event_type}",
            )

        # 3. Créer l'EmailEvent
        email_event = EmailEvent(
            send_id=email_send.id,
            event_type=event_type,
            event_at=event.timestamp,
            provider_event_id=event.email_id,
            provider_message_id=event.email_id,
            raw_payload=event.model_dump(by_alias=True),
            url=event.data.get("clicked_url") if event.data and event.event_type == "email.clicked" else None,
        )
        db.add(email_event)
        db.flush()

        # 4. Mettre à jour les statistiques de l'EmailSend si nécessaire
        if event_type == EmailEventType.DELIVERED and email_send.status != "DELIVERED":
            email_send.status = "DELIVERED"
        elif event_type == EmailEventType.OPENED and email_send.status not in ["OPENED", "CLICKED"]:
            email_send.status = "OPENED"
        elif event_type == EmailEventType.CLICKED:
            email_send.status = "CLICKED"
        elif event_type in [EmailEventType.BOUNCED, EmailEventType.FAILED]:
            email_send.status = "FAILED"
            email_send.error_message = event.data.get("bounce_reason") or event.data.get("failure_reason") if event.data else None

        db.commit()

        logger.info(
            "resend_webhook_processed",
            extra={
                "event_id": email_event.id,
                "send_id": email_send.id,
                "event_type": event.event_type,
                "recipient": event.to,
            },
        )

        return ResendWebhookResponse(
            success=True,
            message="Event recorded successfully",
            event_id=email_event.id,
        )

    except Exception as e:
        db.rollback()
        logger.exception("resend_webhook_error", extra={"error": str(e)})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process webhook: {str(e)}",
        )


@router.post("/unsubscribe", response_model=UnsubscribeResponse)
async def handle_unsubscribe(
    request: UnsubscribeRequest,
    db: Session = Depends(get_db),
    _auth: bool = Depends(verify_webhook_token),
):
    """
    Gérer un désabonnement depuis le site web alforis.fr.

    Ajoute l'email à la liste noire globale et met à jour les contacts/organisations.
    """
    try:
        email_lower = request.email.lower()
        unsubscribed_at = request.unsubscribed_at or datetime.now(timezone.utc)

        # 1. Vérifier si déjà désabonné
        existing = db.query(UnsubscribedEmail).filter(UnsubscribedEmail.email == email_lower).first()
        if existing:
            raise ConflictError(f"Email {email_lower} is already unsubscribed")

        # 2. Ajouter à la table unsubscribed_emails
        unsubscribed = UnsubscribedEmail(
            email=email_lower,
            unsubscribed_at=unsubscribed_at,
            source=request.source,
            reason=request.reason,
        )
        db.add(unsubscribed)
        db.flush()

        # 3. Désabonner dans les tables Person et Organisation
        updated_people = (
            db.query(Person)
            .filter(Person.email == email_lower)
            .update({"email_unsubscribed": True}, synchronize_session=False)
        )

        updated_orgs = (
            db.query(Organisation)
            .filter(Organisation.email == email_lower)
            .update({"email_unsubscribed": True}, synchronize_session=False)
        )

        db.commit()

        logger.info(
            "email_unsubscribed",
            extra={
                "email": email_lower,
                "source": request.source,
                "updated_people": updated_people,
                "updated_orgs": updated_orgs,
            },
        )

        return UnsubscribeResponse(
            success=True,
            message=f"Email {email_lower} successfully unsubscribed",
            email=email_lower,
        )

    except ConflictError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        )
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email {request.email} is already unsubscribed",
        )
    except Exception as e:
        db.rollback()
        logger.exception("unsubscribe_error", extra={"error": str(e), "email": request.email})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process unsubscribe: {str(e)}",
        )
