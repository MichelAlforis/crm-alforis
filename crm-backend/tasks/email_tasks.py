"""
Tâches Celery liées à l'automatisation email.
"""

import logging
from datetime import datetime
from typing import Optional

from celery import Task

from models.email import EmailCampaign, EmailCampaignStatus, EmailSend, EmailSendStatus
from services.email_service import EmailDeliveryService
from tasks.celery_app import celery_app
from core.database import SessionLocal
from core.config import settings
from core.exceptions import ValidationError

logger = logging.getLogger(__name__)


def _get_db_session():
    return SessionLocal()


def _dispatch_campaign_queue(db_session, campaign: EmailCampaign, override_batch_size: Optional[int] = None) -> int:
    now = datetime.utcnow()
    rate_limit = campaign.rate_limit_per_minute or settings.email_rate_limit_per_minute or 60
    batch_size = min(rate_limit, settings.email_batch_size)
    if override_batch_size is not None:
        batch_size = min(batch_size, override_batch_size)

    sends = (
        db_session.query(EmailSend)
        .filter(
            EmailSend.campaign_id == campaign.id,
            EmailSend.status.in_([EmailSendStatus.QUEUED, EmailSendStatus.SCHEDULED]),
            EmailSend.scheduled_at <= now,
        )
        .order_by(EmailSend.scheduled_at.asc(), EmailSend.id.asc())
        .limit(batch_size)
        .all()
    )

    dispatched = 0
    for send in sends:
        send_email_send.delay(send.id)
        if send.status == EmailSendStatus.QUEUED:
            send.status = EmailSendStatus.SCHEDULED  # éviter double envoi pendant la processing window
        dispatched += 1
    if dispatched:
        logger.info(
            "email_campaign_batch_dispatched",
            extra={"campaign_id": campaign.id, "batch_size": dispatched},
        )
    return dispatched


@celery_app.task(name="tasks.email_tasks.send_email_send", bind=True, autoretry_for=(Exception,), max_retries=3, default_retry_delay=60)
def send_email_send(self: Task, send_id: int) -> dict:
    """Envoi d'un email unique."""
    db = _get_db_session()
    try:
        service = EmailDeliveryService(db)
        send = service.send_now(send_id)
        return {"send_id": send.id, "status": send.status.value}
    except ValidationError as exc:
        db.rollback()
        logger.error("email_send_validation_error", extra={"send_id": send_id, "error": str(exc)})
        return {"send_id": send_id, "status": "error", "detail": str(exc)}
    except Exception as exc:
        db.rollback()
        logger.exception("email_send_failed", extra={"send_id": send_id})
        raise self.retry(exc=exc)
    finally:
        db.close()


@celery_app.task(name="tasks.email_tasks.dispatch_campaign_queue")
def dispatch_campaign_queue(campaign_id: int, batch_size: Optional[int] = None) -> dict:
    """Déclencher un batch d'envoi pour une campagne spécifique."""
    db = _get_db_session()
    try:
        campaign = (
            db.query(EmailCampaign)
            .filter(EmailCampaign.id == campaign_id)
            .first()
        )
        if not campaign:
            return {"campaign_id": campaign_id, "dispatched": 0, "detail": "campaign_not_found"}
        dispatched = _dispatch_campaign_queue(db, campaign, override_batch_size=batch_size)
        db.commit()
        return {"campaign_id": campaign_id, "dispatched": dispatched}
    except Exception as exc:
        db.rollback()
        logger.exception("email_dispatch_failed", extra={"campaign_id": campaign_id})
        raise exc
    finally:
        db.close()


@celery_app.task(name="tasks.email_tasks.process_pending_sends")
def process_pending_sends() -> dict:
    """Tâche périodique: envoie les emails planifiés arrivés à échéance."""
    db = _get_db_session()
    total_dispatched = 0
    campaigns_processed = 0
    try:
        campaigns = (
            db.query(EmailCampaign)
            .filter(
                EmailCampaign.status.in_(
                    [EmailCampaignStatus.SCHEDULED, EmailCampaignStatus.RUNNING]
                )
            )
            .all()
        )
        for campaign in campaigns:
            campaigns_processed += 1
            dispatched = _dispatch_campaign_queue(db, campaign)
            total_dispatched += dispatched
        db.commit()
        return {"campaigns": campaigns_processed, "dispatched": total_dispatched}
    except Exception as exc:
        db.rollback()
        logger.exception("email_process_pending_failed")
        raise exc
    finally:
        db.close()
