import enum
from datetime import datetime, UTC
from typing import Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import BaseModel
from models.constants import (
    FK_USERS_ID,
    FK_EMAIL_TEMPLATES_ID,
    FK_EMAIL_CAMPAIGNS_ID,
    ONDELETE_SET_NULL,
    ONDELETE_CASCADE,
    ENUM_EMAIL_CAMPAIGN_STATUS,
    ENUM_EMAIL_SEND_STATUS,
)


class EmailTemplateCategory(str, enum.Enum):
    """Catégories de templates disponibles pour la bibliothèque."""

    WELCOME = "welcome"
    FOLLOW_UP = "follow_up"
    NEWSLETTER = "newsletter"
    CASE_STUDY = "case_study"
    EVENT = "event"
    ONBOARDING = "onboarding"
    CUSTOM = "custom"


class EmailProvider(str, enum.Enum):
    """Fournisseurs d'envoi email supportés."""

    SENDGRID = "sendgrid"
    MAILGUN = "mailgun"
    RESEND = "resend"


class EmailCampaignStatus(str, enum.Enum):
    """Statuts d'une campagne email."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class EmailScheduleType(str, enum.Enum):
    """Types de planification pour une campagne."""

    MANUAL = "manual"
    IMMEDIATE = "immediate"
    SCHEDULED = "scheduled"
    RECURRING = "recurring"


class EmailVariant(str, enum.Enum):
    """Variantes A/B."""

    A = "A"
    B = "B"


class EmailSendStatus(str, enum.Enum):
    """Statuts possibles pour l'envoi d'un email."""

    QUEUED = "queued"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    FAILED = "failed"
    BOUNCED = "bounced"
    UNSUBSCRIBED = "unsubscribed"
    COMPLAINED = "complained"


class EmailEventType(str, enum.Enum):
    """Types d'événements remontés par le provider."""

    PROCESSED = "processed"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    DROPPED = "dropped"
    SPAM_REPORT = "spamreport"
    UNSUBSCRIBED = "unsubscribe"
    GROUP_UNSUBSCRIBE = "group_unsubscribe"
    GROUP_RESUBSCRIBE = "group_resubscribe"
    DEFERRED = "deferred"


class EmailTemplate(BaseModel):
    """Template email réutilisable."""

    __tablename__ = "email_templates"
    __table_args__ = (
        Index("idx_email_templates_category", "category"),
        Index("idx_email_templates_code", "code", unique=True),
        Index("idx_email_templates_is_active", "is_active"),
    )

    name = Column(String(255), nullable=False, index=True)
    code = Column(String(128), nullable=True, unique=True)
    description = Column(String(500), nullable=True)
    category = Column(
        Enum(EmailTemplateCategory, name="emailtemplatecategory"),
        nullable=False,
        default=EmailTemplateCategory.CUSTOM,
    )
    subject = Column(String(255), nullable=False)
    preheader = Column(String(255), nullable=True)
    html_content = Column(Text, nullable=False)
    design_json = Column(JSON, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_default = Column(Boolean, nullable=False, default=False)
    tags = Column(JSON, nullable=True)
    created_by = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    steps = relationship(
        "EmailCampaignStep",
        back_populates="template",
        passive_deletes=True,
    )

    def mark_used(self):
        """Mettre à jour le timestamp d'utilisation."""
        self.last_used_at = datetime.now(UTC)

    def __repr__(self) -> str:
        return f"<EmailTemplate id={self.id} name='{self.name}'>"


class EmailCampaign(BaseModel):
    """Campagne email avec steps et segmentation."""

    __tablename__ = "email_campaigns"
    __table_args__ = (
        Index("idx_email_campaign_status", "status"),
        Index("idx_email_campaign_scheduled_at", "scheduled_at"),
        Index("idx_email_campaign_provider", "provider"),
    )

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(
        Enum(EmailCampaignStatus, name="emailcampaignstatus"),
        nullable=False,
        default=EmailCampaignStatus.DRAFT,
    )
    provider = Column(
        Enum(EmailProvider, name="emailprovider", values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=EmailProvider.SENDGRID,
    )
    schedule_type = Column(
        Enum(EmailScheduleType, name="emailscheduletype"),
        nullable=False,
        default=EmailScheduleType.MANUAL,
    )
    from_name = Column(String(255), nullable=False)
    from_email = Column(String(255), nullable=False, index=True)
    reply_to = Column(String(255), nullable=True)
    default_template_id = Column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=True)
    preheader = Column(String(255), nullable=True)
    audience_filters = Column(JSON, nullable=True)
    audience_snapshot = Column(JSON, nullable=True)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    timezone = Column(String(64), nullable=True, default="Europe/Paris")
    track_opens = Column(Boolean, nullable=False, default=True)
    track_clicks = Column(Boolean, nullable=False, default=True)
    is_ab_test = Column(Boolean, nullable=False, default=False)
    ab_test_split_percentage = Column(Integer, nullable=False, default=50)
    rate_limit_per_minute = Column(Integer, nullable=True)
    total_recipients = Column(Integer, nullable=True)
    total_sent = Column(Integer, nullable=False, default=0)
    last_sent_at = Column(DateTime(timezone=True), nullable=True)
    owner_id = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True)

    default_template = relationship("EmailTemplate")
    steps = relationship(
        "EmailCampaignStep",
        back_populates="campaign",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="EmailCampaignStep.order_index",
    )
    send_batches = relationship(
        "EmailSendBatch",
        back_populates="campaign",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    sends = relationship(
        "EmailSend",
        back_populates="campaign",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return f"<EmailCampaign id={self.id} name='{self.name}' status={self.status}>"


class EmailCampaignStep(BaseModel):
    """Étape de séquence pour une campagne (drip ou A/B)."""

    __tablename__ = "email_campaign_steps"
    __table_args__ = (
        Index("idx_email_campaign_steps_campaign", "campaign_id"),
        Index("idx_email_campaign_steps_order", "campaign_id", "order_index"),
    )

    campaign_id = Column(Integer, ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    subject = Column(String(255), nullable=True)
    preheader = Column(String(255), nullable=True)
    order_index = Column(Integer, nullable=False, default=1)
    delay_hours = Column(Integer, nullable=False, default=0)
    wait_for_event = Column(
        Enum(EmailEventType, name="emailcampaigneventtrigger"),
        nullable=True,
    )
    variant = Column(
        Enum(EmailVariant, name="emailvariant"),
        nullable=True,
    )
    send_window_hours = Column(Integer, nullable=True)
    step_metadata = Column("metadata", JSON, nullable=True)  # 'metadata' est réservé par SQLAlchemy

    campaign = relationship("EmailCampaign", back_populates="steps")
    template = relationship("EmailTemplate", back_populates="steps")
    sends = relationship(
        "EmailSend",
        back_populates="step",
        passive_deletes=True,
    )

    def __repr__(self) -> str:
        return (
            f"<EmailCampaignStep id={self.id} campaign_id={self.campaign_id} "
            f"order={self.order_index} variant={self.variant}>"
        )


class EmailSendBatch(BaseModel):
    """Batch/Groupe d'envois créé en une fois."""

    __tablename__ = "email_send_batches"
    __table_args__ = (
        Index("idx_email_send_batches_campaign", "campaign_id"),
        Index("idx_email_send_batches_status", "status"),
    )

    campaign_id = Column(Integer, ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    status = Column(
        Enum(EmailSendStatus, name="emailsendstatus"),
        nullable=False,
        default=EmailSendStatus.QUEUED,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    total_recipients = Column(Integer, nullable=False, default=0)
    sent_count = Column(Integer, nullable=False, default=0)
    delivered_count = Column(Integer, nullable=False, default=0)
    opened_count = Column(Integer, nullable=False, default=0)
    clicked_count = Column(Integer, nullable=False, default=0)
    bounced_count = Column(Integer, nullable=False, default=0)
    failed_count = Column(Integer, nullable=False, default=0)

    campaign = relationship("EmailCampaign", back_populates="send_batches")
    sends = relationship("EmailSend", back_populates="batch", cascade="all, delete-orphan", passive_deletes=True)


class EmailSend(BaseModel):
    """Historique des envois pour chaque destinataire."""

    __tablename__ = "email_sends"
    __table_args__ = (
        Index("idx_email_sends_campaign", "campaign_id"),
        Index("idx_email_sends_batch", "batch_id"),
        Index("idx_email_sends_status", "status"),
        Index("idx_email_sends_message", "provider_message_id"),
        Index("idx_email_sends_recipient", "recipient_email"),
    )

    campaign_id = Column(Integer, ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False)
    batch_id = Column(Integer, ForeignKey("email_send_batches.id", ondelete="CASCADE"), nullable=True)
    step_id = Column(Integer, ForeignKey("email_campaign_steps.id", ondelete="SET NULL"), nullable=True)
    template_id = Column(Integer, ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True)
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(255), nullable=True)
    recipient_person_id = Column(Integer, ForeignKey("people.id", ondelete="SET NULL"), nullable=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True)
    variant = Column(
        Enum(EmailVariant, name="emailvariant"),
        nullable=True,
    )
    status = Column(
        Enum(EmailSendStatus, name="emailsendstatus"),
        nullable=False,
        default=EmailSendStatus.QUEUED,
    )
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    provider_message_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    step_metadata = Column("metadata", JSON, nullable=True)  # 'metadata' est réservé par SQLAlchemy

    campaign = relationship("EmailCampaign", back_populates="sends")
    batch = relationship("EmailSendBatch", back_populates="sends")
    step = relationship("EmailCampaignStep", back_populates="sends")
    template = relationship("EmailTemplate")
    recipient_person = relationship("Person", foreign_keys=[recipient_person_id])
    organisation = relationship("Organisation")
    events = relationship(
        "EmailEvent",
        back_populates="send",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def mark_sent(self, message_id: Optional[str] = None):
        """Mettre à jour l'état suite à l'envoi."""
        self.status = EmailSendStatus.SENT
        self.sent_at = datetime.now(UTC)
        if message_id:
            self.provider_message_id = message_id

    def __repr__(self) -> str:
        return f"<EmailSend id={self.id} email='{self.recipient_email}' status={self.status}>"


class EmailEvent(BaseModel):
    """Événements renvoyés par SendGrid/Mailgun."""

    __tablename__ = "email_events"
    __table_args__ = (
        Index("idx_email_events_send", "send_id"),
        Index("idx_email_events_type", "event_type"),
        Index("idx_email_events_message", "provider_message_id"),
    )

    send_id = Column(Integer, ForeignKey("email_sends.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(
        Enum(EmailEventType, name="emaileventtype"),
        nullable=False,
    )
    event_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    provider_event_id = Column(String(255), nullable=True)
    provider_message_id = Column(String(255), nullable=True)
    raw_payload = Column(JSON, nullable=True)
    ip_address = Column(String(64), nullable=True)
    user_agent = Column(String(512), nullable=True)
    url = Column(Text, nullable=True)

    send = relationship("EmailSend", back_populates="events")

    def __repr__(self) -> str:
        return f"<EmailEvent id={self.id} send_id={self.send_id} type={self.event_type}>"


class CampaignSubscription(BaseModel):
    """Abonnement manuel d'une personne ou organisation à une campagne."""

    __tablename__ = "campaign_subscriptions"
    __table_args__ = (
        Index("idx_campaign_subscriptions_campaign", "campaign_id"),
        Index("idx_campaign_subscriptions_person", "person_id"),
        Index("idx_campaign_subscriptions_organisation", "organisation_id"),
        Index("idx_campaign_subscriptions_unique", "campaign_id", "person_id", "organisation_id", unique=True),
    )

    campaign_id = Column(Integer, ForeignKey("email_campaigns.id", ondelete="CASCADE"), nullable=False)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=True)
    subscribed_by = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    unsubscribed_at = Column(DateTime(timezone=True), nullable=True)

    campaign = relationship("EmailCampaign")
    person = relationship("Person", foreign_keys=[person_id])
    organisation = relationship("Organisation", foreign_keys=[organisation_id])

    def __repr__(self) -> str:
        entity_type = "Person" if self.person_id else "Organisation"
        entity_id = self.person_id or self.organisation_id
        return f"<CampaignSubscription id={self.id} campaign_id={self.campaign_id} {entity_type}={entity_id}>"


class UnsubscribedEmail(BaseModel):
    """Emails désabonnés globalement (liste noire)."""

    __tablename__ = "unsubscribed_emails"
    __table_args__ = (
        Index("idx_unsubscribed_email", "email", unique=True),
    )

    email = Column(String(255), nullable=False, unique=True)
    unsubscribed_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    source = Column(String(50), nullable=False, default="web")  # "web", "email", "manual"
    reason = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<UnsubscribedEmail id={self.id} email='{self.email}'>"
