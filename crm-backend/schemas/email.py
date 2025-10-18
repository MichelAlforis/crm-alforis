from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field, field_validator

from models.email import (
    EmailCampaignStatus,
    EmailEventType,
    EmailProvider,
    EmailScheduleType,
    EmailSendStatus,
    EmailTemplateCategory,
    EmailVariant,
)
from schemas.base import BaseSchema, TimestampedSchema


class EmailTemplateBase(BaseSchema):
    """Champs communs pour un template email."""

    name: str = Field(..., min_length=1, max_length=255)
    subject: str = Field(..., min_length=1, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    category: EmailTemplateCategory = EmailTemplateCategory.CUSTOM
    design_json: Optional[Dict[str, Any]] = None
    code: Optional[str] = Field(None, max_length=128)
    tags: Optional[List[str]] = None


class EmailTemplateCreate(EmailTemplateBase):
    """Création d'un template email."""

    html_content: str = Field(..., min_length=1)
    is_active: bool = True
    is_default: bool = False


class EmailTemplateUpdate(BaseSchema):
    """Mise à jour d'un template."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    subject: Optional[str] = Field(None, min_length=1, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = Field(None, max_length=500)
    category: Optional[EmailTemplateCategory] = None
    design_json: Optional[Dict[str, Any]] = None
    html_content: Optional[str] = Field(None, min_length=1)
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None


class EmailTemplateResponse(TimestampedSchema, EmailTemplateBase):
    """Template retourné par l'API."""

    id: int
    is_active: bool
    is_default: bool
    html_content: str
    last_used_at: Optional[datetime] = None


class EmailCampaignStepBase(BaseSchema):
    """Step commun (drip)."""

    template_id: Optional[int] = Field(None, ge=1)
    subject: Optional[str] = Field(None, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    order_index: int = Field(1, ge=1, description="Ordre d'envoi de la séquence")
    delay_hours: int = Field(0, ge=0, description="Délai après l'étape précédente, en heures")
    wait_for_event: Optional[EmailEventType] = Field(
        None, description="Déclencher l'étape uniquement après un événement précis"
    )
    variant: Optional[EmailVariant] = None
    send_window_hours: Optional[int] = Field(
        None, ge=1, le=168, description="Fenêtre maximale pour l'envoi (heures)"
    )
    metadata: Optional[Dict[str, Any]] = None


class EmailCampaignStepCreate(EmailCampaignStepBase):
    """Création d'une étape de campagne."""

    pass


class EmailCampaignStepUpdate(BaseSchema):
    """Mise à jour d'une étape."""

    template_id: Optional[int] = Field(None, ge=1)
    subject: Optional[str] = Field(None, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    order_index: Optional[int] = Field(None, ge=1)
    delay_hours: Optional[int] = Field(None, ge=0)
    wait_for_event: Optional[EmailEventType] = None
    variant: Optional[EmailVariant] = None
    send_window_hours: Optional[int] = Field(None, ge=1, le=168)
    metadata: Optional[Dict[str, Any]] = None


class EmailCampaignStepResponse(TimestampedSchema, EmailCampaignStepBase):
    """Étape complète renvoyée dans la réponse."""

    id: int


class EmailRecipient(BaseSchema):
    """Destinataire pour planification."""

    email: str = Field(..., min_length=3, max_length=255)
    first_name: Optional[str] = Field(None, max_length=255)
    last_name: Optional[str] = Field(None, max_length=255)
    full_name: Optional[str] = Field(None, max_length=255)
    person_id: Optional[int] = Field(None, ge=1)
    organisation_id: Optional[int] = Field(None, ge=1)
    organisation_name: Optional[str] = Field(None, max_length=255)
    custom_data: Dict[str, Any] = Field(default_factory=dict)


class EmailCampaignBase(BaseSchema):
    """Champs communs d'une campagne."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    provider: EmailProvider = EmailProvider.SENDGRID
    from_name: str = Field(..., min_length=1, max_length=255)
    from_email: str = Field(..., min_length=3, max_length=255)
    reply_to: Optional[str] = Field(None, max_length=255)
    default_template_id: Optional[int] = Field(None, ge=1)
    subject: Optional[str] = Field(None, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    audience_filters: Optional[Dict[str, Any]] = None
    track_opens: bool = True
    track_clicks: bool = True
    is_ab_test: bool = False
    ab_test_split_percentage: int = Field(50, ge=1, le=99)
    rate_limit_per_minute: Optional[int] = Field(None, ge=1)
    schedule_type: EmailScheduleType = EmailScheduleType.MANUAL


class EmailCampaignCreate(EmailCampaignBase):
    """Création campagne."""

    steps: List[EmailCampaignStepCreate] = Field(default_factory=list)
    owner_id: Optional[int] = Field(None, ge=1)


class EmailCampaignUpdate(BaseSchema):
    """Mise à jour campagne."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    provider: Optional[EmailProvider] = None
    from_name: Optional[str] = Field(None, min_length=1, max_length=255)
    from_email: Optional[str] = Field(None, min_length=3, max_length=255)
    reply_to: Optional[str] = Field(None, max_length=255)
    default_template_id: Optional[int] = Field(None, ge=1)
    subject: Optional[str] = Field(None, max_length=255)
    preheader: Optional[str] = Field(None, max_length=255)
    audience_filters: Optional[Dict[str, Any]] = None
    track_opens: Optional[bool] = None
    track_clicks: Optional[bool] = None
    is_ab_test: Optional[bool] = None
    ab_test_split_percentage: Optional[int] = Field(None, ge=1, le=99)
    rate_limit_per_minute: Optional[int] = Field(None, ge=1)
    schedule_type: Optional[EmailScheduleType] = None
    status: Optional[EmailCampaignStatus] = None
    steps: Optional[List[EmailCampaignStepCreate]] = None
    owner_id: Optional[int] = Field(None, ge=1)


class EmailCampaignResponse(TimestampedSchema, EmailCampaignBase):
    """Réponse campagne complète."""

    id: int
    status: EmailCampaignStatus
    schedule_type: EmailScheduleType
    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = None
    total_recipients: Optional[int] = None
    total_sent: int = 0
    last_sent_at: Optional[datetime] = None
    steps: List[EmailCampaignStepResponse] = Field(default_factory=list)

    @field_validator("scheduled_at", "last_sent_at", mode="before")
    @classmethod
    def parse_datetime(cls, value):
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        return value


class EmailRecipientSummary(BaseSchema):
    """Résumé d'audience utilisé lors de la planification."""

    total_contacts: int = 0
    total_organisations: int = 0
    filters_applied: Optional[Dict[str, Any]] = None


class EmailCampaignScheduleRequest(BaseSchema):
    """Payload de planification d'une campagne."""

    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = Field("Europe/Paris", max_length=64)
    recipients: List[EmailRecipient] = Field(default_factory=list)
    audience_snapshot: Optional[EmailRecipientSummary] = None
    rate_limit_per_minute: Optional[int] = Field(None, ge=1)
    schedule_type: EmailScheduleType = EmailScheduleType.IMMEDIATE

    @field_validator("scheduled_at", mode="before")
    @classmethod
    def parse_scheduled_at(cls, value):
        if isinstance(value, str):
            return datetime.fromisoformat(value)
        return value


class EmailSendResponse(TimestampedSchema):
    """Retour d'un envoi."""

    id: int
    campaign_id: int
    step_id: Optional[int]
    template_id: Optional[int]
    recipient_email: str
    recipient_name: Optional[str]
    recipient_person_id: Optional[int]
    organisation_id: Optional[int]
    variant: Optional[EmailVariant]
    status: EmailSendStatus
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    provider_message_id: Optional[str]
    error_message: Optional[str]


class EmailEventResponse(TimestampedSchema):
    """Événement côté provider."""

    id: int
    send_id: int
    event_type: EmailEventType
    event_at: datetime
    provider_event_id: Optional[str]
    provider_message_id: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    url: Optional[str]


class EmailCampaignStatsVariant(BaseSchema):
    """Statistiques par variante."""

    variant: EmailVariant
    total_sent: int = 0
    opens: int = 0
    clicks: int = 0
    bounces: int = 0
    unsubscribes: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0


class EmailCampaignStatsResponse(BaseSchema):
    """KPIs suivi des campagnes."""

    campaign_id: int
    total_recipients: int = 0
    total_sent: int = 0
    delivered: int = 0
    opens: int = 0
    unique_opens: int = 0
    clicks: int = 0
    unique_clicks: int = 0
    bounces: int = 0
    unsubscribes: int = 0
    complaints: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0
    bounce_rate: float = 0.0
    unsubscribe_rate: float = 0.0
    last_event_at: Optional[datetime] = None
    per_variant: List[EmailCampaignStatsVariant] = Field(default_factory=list)


class EmailSendFilterParams(BaseSchema):
    """Filtres pour lister les envois."""

    status: Optional[EmailSendStatus] = None
    variant: Optional[EmailVariant] = None
