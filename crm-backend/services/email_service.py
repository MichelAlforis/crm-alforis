import hashlib
import logging
import re
from datetime import datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

from sqlalchemy import case, distinct, func
from sqlalchemy.orm import Session, selectinload

from core.config import settings
from core.exceptions import DatabaseError, ResourceNotFound, ValidationError
from models.email import (
    EmailCampaign,
    EmailCampaignStatus,
    EmailCampaignStep,
    EmailEvent,
    EmailEventType,
    EmailProvider,
    EmailScheduleType,
    EmailSend,
    EmailSendStatus,
    EmailTemplate,
    EmailVariant,
)
from schemas.email import (
    EmailCampaignCreate,
    EmailCampaignScheduleRequest,
    EmailCampaignStatsResponse,
    EmailCampaignStepCreate,
    EmailCampaignUpdate,
    EmailRecipient,
    EmailTemplateCreate,
    EmailTemplateUpdate,
)
from services.base import BaseService

logger = logging.getLogger(__name__)

STATUS_PRIORITY = {
    EmailSendStatus.QUEUED: 0,
    EmailSendStatus.SCHEDULED: 1,
    EmailSendStatus.SENDING: 2,
    EmailSendStatus.SENT: 3,
    EmailSendStatus.DELIVERED: 4,
    EmailSendStatus.OPENED: 5,
    EmailSendStatus.CLICKED: 6,
    EmailSendStatus.UNSUBSCRIBED: 7,
    EmailSendStatus.COMPLAINED: 8,
    EmailSendStatus.BOUNCED: 9,
    EmailSendStatus.FAILED: 10,
}

SENDGRID_HEADER_MESSAGE_ID = "X-Message-Id"
PLACEHOLDER_PATTERN = re.compile(r"\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}")


def _resolve_placeholder(context: Dict[str, Any], path: str) -> str:
    """Résout les placeholders {{foo.bar}} à partir du contexte."""
    parts = path.split(".")
    value: Any = context
    for segment in parts:
        if isinstance(value, dict) and segment in value:
            value = value[segment]
        else:
            return ""
    if value is None:
        return ""
    return str(value)


def render_dynamic_content(content: str, context: Dict[str, Any]) -> str:
    """Remplace les placeholders {{ var }} dans le HTML."""

    def _replacer(match: re.Match) -> str:
        placeholder = match.group(1)
        return _resolve_placeholder(context, placeholder)

    return PLACEHOLDER_PATTERN.sub(_replacer, content)


class EmailTemplateService(BaseService[EmailTemplate, EmailTemplateCreate, EmailTemplateUpdate]):
    """Gestion CRUD des templates email."""

    def __init__(self, db: Session):
        super().__init__(EmailTemplate, db)

    async def create(self, schema: EmailTemplateCreate) -> EmailTemplate:
        try:
            data = schema.model_dump()
            template = EmailTemplate(**data)
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)
            logger.info("email_template_created", extra={"template_id": template.id})
            return template
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_template_create_failed: %s", exc)
            raise DatabaseError("Failed to create email template") from exc

    async def update(self, template_id: int, schema: EmailTemplateUpdate) -> EmailTemplate:
        template = await self.get_by_id(template_id)
        data = schema.model_dump(exclude_unset=True)
        for key, value in data.items():
            setattr(template, key, value)
        try:
            self.db.add(template)
            self.db.commit()
            self.db.refresh(template)
            logger.info("email_template_updated", extra={"template_id": template.id})
            return template
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_template_update_failed: %s", exc)
            raise DatabaseError("Failed to update email template") from exc

    async def get_library(self, only_active: bool = True) -> List[EmailTemplate]:
        query = self.db.query(EmailTemplate)
        if only_active:
            query = query.filter(EmailTemplate.is_active.is_(True))
        return (
            query.order_by(EmailTemplate.category, EmailTemplate.name)
            .options(selectinload(EmailTemplate.steps))
            .all()
        )


class EmailCampaignService(BaseService[EmailCampaign, EmailCampaignCreate, EmailCampaignUpdate]):
    """Gestion des campagnes (création, mise à jour)."""

    def __init__(self, db: Session):
        super().__init__(EmailCampaign, db)

    async def get_by_id(self, campaign_id: int) -> EmailCampaign:
        campaign = (
            self.db.query(EmailCampaign)
            .filter(EmailCampaign.id == campaign_id)
            .options(
                selectinload(EmailCampaign.steps).selectinload(EmailCampaignStep.template),
                selectinload(EmailCampaign.sends),
            )
            .first()
        )
        if not campaign:
            raise ResourceNotFound("EmailCampaign", campaign_id)
        return campaign

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[EmailCampaign], int]:
        query = self.db.query(EmailCampaign)
        if filters:
            if status := filters.get("status"):
                query = query.filter(EmailCampaign.status == status)
            if provider := filters.get("provider"):
                query = query.filter(EmailCampaign.provider == provider)
        total = query.count()
        campaigns = (
            query.order_by(EmailCampaign.created_at.desc())
            .offset(skip)
            .limit(limit)
            .options(selectinload(EmailCampaign.steps))
            .all()
        )
        return campaigns, total

    async def create(self, payload: EmailCampaignCreate) -> EmailCampaign:
        data = payload.model_dump(exclude={"steps"}, exclude_none=True)
        steps_payload = payload.steps or []
        campaign = EmailCampaign(**data)

        if not steps_payload and campaign.default_template_id:
            steps_payload = [
                EmailCampaignStepCreate(
                    template_id=campaign.default_template_id,
                    order_index=1,
                )
            ]

        try:
            self.db.add(campaign)
            self.db.flush()
            self._sync_steps(campaign, steps_payload)
            self.db.commit()
            self.db.refresh(campaign)
            logger.info("email_campaign_created", extra={"campaign_id": campaign.id})
            return campaign
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_campaign_create_failed: %s", exc)
            raise DatabaseError("Failed to create email campaign") from exc

    async def update(self, campaign_id: int, payload: EmailCampaignUpdate) -> EmailCampaign:
        campaign = await self.get_by_id(campaign_id)
        data = payload.model_dump(exclude_unset=True, exclude={"steps"})
        for key, value in data.items():
            setattr(campaign, key, value)

        steps_payload = payload.steps
        try:
            if steps_payload is not None:
                self._sync_steps(campaign, steps_payload)
            self.db.add(campaign)
            self.db.commit()
            self.db.refresh(campaign)
            logger.info("email_campaign_updated", extra={"campaign_id": campaign.id})
            return campaign
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_campaign_update_failed: %s", exc)
            raise DatabaseError("Failed to update email campaign") from exc

    def _sync_steps(self, campaign: EmailCampaign, steps_payload: Sequence[EmailCampaignStepCreate]) -> None:
        """Synchroniser les steps d'une campagne."""
        existing = list(campaign.steps)
        for step in existing:
            self.db.delete(step)
        self.db.flush()

        if not steps_payload:
            return

        for index, step_payload in enumerate(steps_payload, start=1):
            step_data = step_payload.model_dump(exclude_unset=True) if hasattr(step_payload, "model_dump") else step_payload
            order_index = step_data.get("order_index") or index
            template_id = step_data.get("template_id") or campaign.default_template_id
            if not template_id:
                raise ValidationError("Chaque étape doit référencer un template")

            step = EmailCampaignStep(
                campaign_id=campaign.id,
                template_id=template_id,
                subject=step_data.get("subject"),
                preheader=step_data.get("preheader"),
                order_index=order_index,
                delay_hours=step_data.get("delay_hours", 0),
                wait_for_event=step_data.get("wait_for_event"),
                variant=step_data.get("variant"),
                send_window_hours=step_data.get("send_window_hours"),
                metadata=step_data.get("metadata"),
            )
            self.db.add(step)


class EmailDeliveryService:
    """Gestion de la planification et de l'envoi des emails."""

    def __init__(self, db: Session):
        self.db = db

    def schedule_campaign(self, campaign_id: int, payload: EmailCampaignScheduleRequest) -> Tuple[EmailCampaign, List[EmailSend]]:
        campaign = (
            self.db.query(EmailCampaign)
            .filter(EmailCampaign.id == campaign_id)
            .options(selectinload(EmailCampaign.steps).selectinload(EmailCampaignStep.template))
            .first()
        )
        if not campaign:
            raise ResourceNotFound("EmailCampaign", campaign_id)

        if not campaign.steps:
            raise ValidationError("La campagne doit contenir au moins une étape")

        recipients = payload.recipients or []
        if not recipients:
            raise ValidationError("Aucun destinataire fourni pour la campagne")

        scheduled_at = payload.scheduled_at or datetime.utcnow()
        now = datetime.utcnow()
        campaign.scheduled_at = scheduled_at
        campaign.timezone = payload.timezone or campaign.timezone
        campaign.rate_limit_per_minute = payload.rate_limit_per_minute or campaign.rate_limit_per_minute
        campaign.schedule_type = payload.schedule_type
        campaign.audience_snapshot = (
            payload.audience_snapshot.model_dump() if payload.audience_snapshot else None
        )
        campaign.total_recipients = len(recipients)
        campaign.status = (
            EmailCampaignStatus.RUNNING
            if payload.schedule_type == EmailScheduleType.IMMEDIATE and scheduled_at <= now
            else EmailCampaignStatus.SCHEDULED
        )

        created_sends: List[EmailSend] = []
        for recipient in recipients:
            send_created = self._create_sends_for_recipient(campaign, recipient, scheduled_at)
            created_sends.extend(send_created)

        try:
            self.db.add(campaign)
            self.db.commit()
            self.db.refresh(campaign)
            logger.info(
                "email_campaign_scheduled",
                extra={
                    "campaign_id": campaign.id,
                    "scheduled_at": scheduled_at.isoformat(),
                    "recipients": len(recipients),
                },
            )
            return campaign, created_sends
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_campaign_schedule_failed: %s", exc)
            raise DatabaseError("Failed to schedule email campaign") from exc

    def _assign_ab_test_variant(self, campaign: EmailCampaign, recipient: EmailRecipient) -> Optional[EmailVariant]:
        """Détermine la variante A/B test pour un destinataire."""
        if not campaign.is_ab_test:
            return None

        split = campaign.ab_test_split_percentage or 50
        token_source = (
            (recipient.email or "").lower()
            or f"{recipient.person_id or ''}:{recipient.organisation_id or ''}:{recipient.full_name or ''}"
        )
        digest = hashlib.sha1(token_source.encode("utf-8")).hexdigest()
        bucket = int(digest[:2], 16) % 100
        return EmailVariant.A if bucket < split else EmailVariant.B

    def _build_recipient_context(self, recipient: EmailRecipient) -> dict:
        """Construit le contexte de variables pour le destinataire."""
        first_name = recipient.first_name
        if not first_name and recipient.full_name:
            first_name = recipient.full_name.split(" ")[0]

        return {
            "contact": {
                "prenom": first_name,
                "nom": recipient.last_name,
                "email": recipient.email,
                "full_name": recipient.full_name,
            },
            "organisation": {
                "nom": recipient.organisation_name,
            },
            "recipient": recipient.custom_data or {},
        }

    def _should_skip_step(self, step, campaign: EmailCampaign, assigned_variant: Optional[EmailVariant]) -> bool:
        """Détermine si une étape doit être ignorée (A/B test filtering)."""
        return (
            step.variant
            and campaign.is_ab_test
            and assigned_variant
            and step.variant != assigned_variant
        )

    def _create_sends_for_recipient(
        self,
        campaign: EmailCampaign,
        recipient: EmailRecipient,
        scheduled_at: datetime,
    ) -> List[EmailSend]:
        sends: List[EmailSend] = []
        assigned_variant = self._assign_ab_test_variant(campaign, recipient)
        base_context = self._build_recipient_context(recipient)

        for step in campaign.steps:
            if self._should_skip_step(step, campaign, assigned_variant):
                continue

            delay = step.delay_hours or 0
            send_time = scheduled_at + timedelta(hours=delay)
            status = EmailSendStatus.QUEUED if send_time <= datetime.utcnow() else EmailSendStatus.SCHEDULED
            variant = step.variant or assigned_variant

            send = EmailSend(
                campaign_id=campaign.id,
                step_id=step.id,
                template_id=step.template_id,
                recipient_email=recipient.email,
                recipient_name=recipient.full_name or recipient.email,
                recipient_person_id=recipient.person_id,
                organisation_id=recipient.organisation_id,
                variant=variant,
                status=status,
                scheduled_at=send_time,
                metadata={
                    "context": base_context,
                    "variant": variant.value if isinstance(variant, EmailVariant) else variant,
                },
            )
            self.db.add(send)
            sends.append(send)

        return sends

    def send_now(self, send_id: int) -> EmailSend:
        send = (
            self.db.query(EmailSend)
            .filter(EmailSend.id == send_id)
            .options(
                selectinload(EmailSend.campaign).selectinload(EmailCampaign.steps),
                selectinload(EmailSend.step).selectinload(EmailCampaignStep.template),
                selectinload(EmailSend.template),
                selectinload(EmailSend.recipient_person),
                selectinload(EmailSend.organisation),
            )
            .first()
        )
        if not send:
            raise ResourceNotFound("EmailSend", send_id)

        if send.status in {EmailSendStatus.SENT, EmailSendStatus.DELIVERED, EmailSendStatus.CLICKED, EmailSendStatus.OPENED}:
            logger.info("email_send_already_processed", extra={"send_id": send.id, "status": send.status.value})
            return send

        template = self._resolve_template(send)
        if not template:
            raise ValidationError("Template introuvable pour l'envoi")

        context = self._build_context(send)
        html_content = render_dynamic_content(template.html_content, context)
        subject = send.step.subject if send.step and send.step.subject else send.campaign.subject or template.subject

        send.status = EmailSendStatus.SENDING
        send.error_message = None

        if send.campaign.provider == EmailProvider.SENDGRID:
            response = self._send_via_sendgrid(send, subject, html_content)
        elif send.campaign.provider == EmailProvider.MAILGUN:
            response = self._send_via_mailgun(send, subject, html_content)
        else:
            raise ValidationError(f"Provider {send.campaign.provider} non supporté")

        try:
            self.db.add(send)
            self.db.commit()
            self.db.refresh(send)
            return send
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_send_commit_failed: %s", exc)
            raise DatabaseError("Failed to persist email send") from exc

    def _resolve_template(self, send: EmailSend) -> Optional[EmailTemplate]:
        if send.template:
            return send.template
        if send.step and send.step.template:
            return send.step.template
        if send.campaign.default_template:
            return send.campaign.default_template
        return (
            self.db.query(EmailTemplate)
            .filter(EmailTemplate.id == send.template_id)
            .first()
        )

    def _build_context(self, send: EmailSend) -> Dict[str, Any]:
        context = send.metadata.get("context", {}) if send.metadata else {}
        person = send.recipient_person
        organisation = send.organisation
        context.setdefault("contact", {})
        context.setdefault("organisation", {})
        contact_ctx = context["contact"]
        org_ctx = context["organisation"]

        if person:
            contact_ctx.setdefault("prenom", getattr(person, "first_name", None))
            contact_ctx.setdefault("nom", getattr(person, "last_name", None))
            contact_ctx.setdefault("email", getattr(person, "email", None))
            fullname = getattr(person, "name", None)
            if fullname:
                contact_ctx.setdefault("full_name", fullname)

        if organisation:
            org_ctx.setdefault("nom", getattr(organisation, "name", None))

        system_ctx = context.setdefault("system", {})
        unsubscribe_base = settings.default_email_unsubscribe_base_url.rstrip("?")
        separator = "&" if "?" in unsubscribe_base else "?"
        unsubscribe_url = f"{unsubscribe_base}{separator}send_id={send.id}"
        system_ctx.setdefault("unsubscribe_url", unsubscribe_url)
        return context

    def _send_via_sendgrid(self, send: EmailSend, subject: str, html_content: str) -> Dict[str, Any]:
        if not settings.sendgrid_api_key:
            error = "SENDGRID_API_KEY manquant"
            send.status = EmailSendStatus.FAILED
            send.error_message = error
            logger.error("email_sendgrid_missing_key", extra={"send_id": send.id})
            return {"error": error}

        try:
            from sendgrid import SendGridAPIClient
            from sendgrid.helpers.mail import Mail
        except Exception as exc:
            send.status = EmailSendStatus.FAILED
            send.error_message = f"SendGrid import error: {exc}"
            logger.exception("email_sendgrid_import_failed: %s", exc)
            return {"error": str(exc)}

        mail = Mail(
            from_email=(send.campaign.from_email, send.campaign.from_name),
            to_emails=[send.recipient_email],
            subject=subject,
            html_content=html_content,
        )
        if send.campaign.reply_to:
            mail.reply_to = send.campaign.reply_to
        mail.custom_args = {
            "campaign_id": str(send.campaign_id),
            "send_id": str(send.id),
        }
        mail.tracking_settings = {
            "click_tracking": {"enable": send.campaign.track_clicks},
            "open_tracking": {"enable": send.campaign.track_opens},
        }
        try:
            client = SendGridAPIClient(settings.sendgrid_api_key)
            response = client.send(mail)
            message_id = response.headers.get(SENDGRID_HEADER_MESSAGE_ID) if response and response.headers else None
            if message_id:
                send.provider_message_id = message_id
            send.status = EmailSendStatus.SENT
            send.sent_at = datetime.utcnow()
            send.campaign.total_sent = (send.campaign.total_sent or 0) + 1
            send.campaign.last_sent_at = datetime.utcnow()
            logger.info(
                "email_sendgrid_sent",
                extra={
                    "send_id": send.id,
                    "message_id": send.provider_message_id,
                    "status_code": getattr(response, "status_code", None),
                },
            )
            return {"message_id": send.provider_message_id, "status_code": getattr(response, "status_code", None)}
        except Exception as exc:
            send.status = EmailSendStatus.FAILED
            send.error_message = str(exc)
            logger.exception("email_sendgrid_send_failed: %s", exc)
            return {"error": str(exc)}

    def _send_via_mailgun(self, send: EmailSend, subject: str, html_content: str) -> Dict[str, Any]:
        if not settings.mailgun_api_key or not settings.mailgun_domain:
            error = "MAILGUN_API_KEY ou MAILGUN_DOMAIN manquant"
            send.status = EmailSendStatus.FAILED
            send.error_message = error
            logger.error("email_mailgun_missing_credentials", extra={"send_id": send.id})
            return {"error": error}

        import requests

        auth = ("api", settings.mailgun_api_key)
        data = {
            "from": f"{send.campaign.from_name} <{send.campaign.from_email}>",
            "to": [send.recipient_email],
            "subject": subject,
            "html": html_content,
            "o:tracking": "yes" if send.campaign.track_opens or send.campaign.track_clicks else "no",
            "o:tag": [f"campaign:{send.campaign_id}"],
            "o:deliverytime": send.scheduled_at.isoformat() if send.scheduled_at and send.scheduled_at > datetime.utcnow() else None,
            "o:tracking-clicks": "yes" if send.campaign.track_clicks else "no",
            "o:tracking-opens": "yes" if send.campaign.track_opens else "no",
            "v:campaign_id": str(send.campaign_id),
            "v:send_id": str(send.id),
        }
        data = {k: v for k, v in data.items() if v is not None}
        try:
            response = requests.post(
                f"https://api.mailgun.net/v3/{settings.mailgun_domain}/messages",
                auth=auth,
                data=data,
            )
            response.raise_for_status()
            resp_json = response.json()
            message_id = resp_json.get("id")
            send.provider_message_id = message_id
            send.status = EmailSendStatus.SENT
            send.sent_at = datetime.utcnow()
            send.campaign.total_sent = (send.campaign.total_sent or 0) + 1
            send.campaign.last_sent_at = datetime.utcnow()
            logger.info(
                "email_mailgun_sent",
                extra={"send_id": send.id, "message_id": message_id},
            )
            return resp_json
        except Exception as exc:
            send.status = EmailSendStatus.FAILED
            send.error_message = str(exc)
            logger.exception("email_mailgun_send_failed: %s", exc)
            return {"error": str(exc)}


class EmailAnalyticsService:
    """Calcul des KPIs email."""

    def __init__(self, db: Session):
        self.db = db

    def get_campaign_stats(self, campaign_id: int) -> EmailCampaignStatsResponse:
        campaign = (
            self.db.query(EmailCampaign)
            .filter(EmailCampaign.id == campaign_id)
            .first()
        )
        if not campaign:
            raise ResourceNotFound("EmailCampaign", campaign_id)

        total_sent = (
            self.db.query(func.count(EmailSend.id))
            .filter(EmailSend.campaign_id == campaign_id)
            .scalar()
        ) or 0

        delivered = self._count_events(campaign_id, EmailEventType.DELIVERED)
        opens = self._count_events(campaign_id, EmailEventType.OPENED)
        unique_opens = self._count_distinct_events(campaign_id, EmailEventType.OPENED)
        clicks = self._count_events(campaign_id, EmailEventType.CLICKED)
        unique_clicks = self._count_distinct_events(campaign_id, EmailEventType.CLICKED)
        bounces = self._count_events(campaign_id, EmailEventType.BOUNCED)
        unsubscribes = self._count_events(campaign_id, EmailEventType.UNSUBSCRIBED)
        complaints = self._count_events(campaign_id, EmailEventType.SPAM_REPORT)
        last_event_at = (
            self.db.query(func.max(EmailEvent.event_at))
            .join(EmailSend, EmailSend.id == EmailEvent.send_id)
            .filter(EmailSend.campaign_id == campaign_id)
            .scalar()
        )

        per_variant = self._stats_by_variant(campaign_id)

        open_rate = (unique_opens / total_sent * 100) if total_sent else 0.0
        click_rate = (unique_clicks / total_sent * 100) if total_sent else 0.0
        bounce_rate = (bounces / max(total_sent, 1) * 100) if total_sent else 0.0
        unsubscribe_rate = (unsubscribes / max(total_sent, 1) * 100) if total_sent else 0.0

        return EmailCampaignStatsResponse(
            campaign_id=campaign_id,
            total_recipients=campaign.total_recipients or total_sent,
            total_sent=total_sent,
            delivered=delivered,
            opens=opens,
            unique_opens=unique_opens,
            clicks=clicks,
            unique_clicks=unique_clicks,
            bounces=bounces,
            unsubscribes=unsubscribes,
            complaints=complaints,
            open_rate=round(open_rate, 2),
            click_rate=round(click_rate, 2),
            bounce_rate=round(bounce_rate, 2),
            unsubscribe_rate=round(unsubscribe_rate, 2),
            last_event_at=last_event_at,
            per_variant=per_variant,
        )

    def _count_events(self, campaign_id: int, event_type: EmailEventType) -> int:
        return (
            self.db.query(func.count(EmailEvent.id))
            .join(EmailSend, EmailSend.id == EmailEvent.send_id)
            .filter(
                EmailSend.campaign_id == campaign_id,
                EmailEvent.event_type == event_type,
            )
            .scalar()
        ) or 0

    def _count_distinct_events(self, campaign_id: int, event_type: EmailEventType) -> int:
        return (
            self.db.query(func.count(distinct(EmailEvent.send_id)))
            .join(EmailSend, EmailSend.id == EmailEvent.send_id)
            .filter(
                EmailSend.campaign_id == campaign_id,
                EmailEvent.event_type == event_type,
            )
            .scalar()
        ) or 0

    def _stats_by_variant(self, campaign_id: int) -> List[Dict[str, Any]]:
        rows = (
            self.db.query(
                EmailSend.variant,
                func.count(EmailSend.id).label("total_sent"),
                func.sum(case((EmailEvent.event_type == EmailEventType.OPENED, 1), else_=0)).label("opens"),
                func.sum(case((EmailEvent.event_type == EmailEventType.CLICKED, 1), else_=0)).label("clicks"),
                func.sum(case((EmailEvent.event_type == EmailEventType.BOUNCED, 1), else_=0)).label("bounces"),
                func.sum(case((EmailEvent.event_type == EmailEventType.UNSUBSCRIBED, 1), else_=0)).label("unsubs"),
            )
            .outerjoin(EmailEvent, EmailEvent.send_id == EmailSend.id)
            .filter(
                EmailSend.campaign_id == campaign_id,
                EmailSend.variant.isnot(None),
            )
            .group_by(EmailSend.variant)
            .all()
        )

        result = []
        for row in rows:
            total_sent = row.total_sent or 0
            variant = row.variant or EmailVariant.A
            open_rate = (row.opens or 0) / total_sent * 100 if total_sent else 0
            click_rate = (row.clicks or 0) / total_sent * 100 if total_sent else 0
            result.append(
                {
                    "variant": variant,
                    "total_sent": total_sent,
                    "opens": row.opens or 0,
                    "clicks": row.clicks or 0,
                    "bounces": row.bounces or 0,
                    "unsubscribes": row.unsubs or 0,
                    "open_rate": round(open_rate, 2),
                    "click_rate": round(click_rate, 2),
                }
            )
        return result


class EmailEventIngestionService:
    """Traitement des webhooks providers (SendGrid/Mailgun)."""

    def __init__(self, db: Session):
        self.db = db

    def ingest_sendgrid_events(self, events: Iterable[Dict[str, Any]]) -> int:
        processed = 0
        for payload in events:
            try:
                event_type = self._map_sendgrid_event(payload.get("event"))
                if not event_type:
                    continue
                send = self._resolve_send_from_sendgrid(payload)
                if not send:
                    logger.warning(
                        "email_send_not_found_for_event",
                        extra={"payload": payload},
                    )
                    continue

                event_ts = payload.get("timestamp")
                event_time = (
                    datetime.utcfromtimestamp(event_ts)
                    if isinstance(event_ts, (int, float))
                    else datetime.utcnow()
                )
                emailevent = EmailEvent(
                    send_id=send.id,
                    event_type=event_type,
                    event_at=event_time,
                    provider_event_id=payload.get("sg_event_id"),
                    provider_message_id=payload.get("sg_message_id") or payload.get("smtp-id"),
                    raw_payload=payload,
                    ip_address=payload.get("ip"),
                    user_agent=payload.get("useragent"),
                    url=payload.get("url"),
                )
                self.db.add(emailevent)
                self._update_send_status(send, event_type)
                processed += 1
            except Exception as exc:
                logger.exception("email_event_ingestion_failed: %s", exc)
        try:
            if processed:
                self.db.commit()
            return processed
        except Exception as exc:
            self.db.rollback()
            logger.exception("email_event_commit_failed: %s", exc)
            raise DatabaseError("Failed to persist email events") from exc

    def _map_sendgrid_event(self, event_name: Optional[str]) -> Optional[EmailEventType]:
        if not event_name:
            return None
        try:
            return EmailEventType(event_name)
        except ValueError:
            aliases = {
                "spamreport": EmailEventType.SPAM_REPORT,
                "unsubscribe": EmailEventType.UNSUBSCRIBED,
                "group_unsubscribe": EmailEventType.GROUP_UNSUBSCRIBE,
                "group_resubscribe": EmailEventType.GROUP_RESUBSCRIBE,
            }
            return aliases.get(event_name)

    def _resolve_send_from_sendgrid(self, payload: Dict[str, Any]) -> Optional[EmailSend]:
        custom_args = payload.get("custom_args") or {}
        send_id = custom_args.get("send_id")
        if send_id:
            try:
                send_id_int = int(send_id)
            except (TypeError, ValueError):
                send_id_int = None
            if send_id_int:
                send = self.db.query(EmailSend).filter(EmailSend.id == send_id_int).first()
                if send:
                    return send

        message_id = payload.get("sg_message_id") or payload.get("smtp-id")
        if message_id and "." in message_id:
            message_id = message_id.split(".")[0]
        if message_id:
            send = (
                self.db.query(EmailSend)
                .filter(EmailSend.provider_message_id == message_id)
                .first()
            )
            if send:
                return send

        recipient = payload.get("email")
        timestamp = payload.get("timestamp")
        if recipient and timestamp:
            threshold = datetime.utcfromtimestamp(timestamp) - timedelta(hours=48)
            send = (
                self.db.query(EmailSend)
                .filter(
                    EmailSend.recipient_email == recipient,
                    EmailSend.created_at >= threshold,
                )
                .order_by(EmailSend.created_at.desc())
                .first()
            )
            return send

        return None

    def _update_send_status(self, send: EmailSend, event_type: EmailEventType) -> None:
        mapping = {
            EmailEventType.DELIVERED: EmailSendStatus.DELIVERED,
            EmailEventType.OPENED: EmailSendStatus.OPENED,
            EmailEventType.CLICKED: EmailSendStatus.CLICKED,
            EmailEventType.BOUNCED: EmailSendStatus.BOUNCED,
            EmailEventType.SPAM_REPORT: EmailSendStatus.COMPLAINED,
            EmailEventType.UNSUBSCRIBED: EmailSendStatus.UNSUBSCRIBED,
            EmailEventType.DROPPED: EmailSendStatus.FAILED,
        }
        new_status = mapping.get(event_type)
        if not new_status:
            return
        current_priority = STATUS_PRIORITY.get(send.status, 0)
        new_priority = STATUS_PRIORITY.get(new_status, 0)
        if new_priority >= current_priority:
            send.status = new_status


__all__ = [
    "EmailTemplateService",
    "EmailCampaignService",
    "EmailDeliveryService",
    "EmailAnalyticsService",
    "EmailEventIngestionService",
    "render_dynamic_content",
]
