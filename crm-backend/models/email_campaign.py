import enum

from sqlalchemy import JSON, Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from core.database import Base


class CampaignStatus(str, enum.Enum):
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class EmailStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    BOUNCED = "bounced"
    OPENED = "opened"
    CLICKED = "clicked"


# NOTE: There's also an EmailTemplate in models/email.py with the same table
# This duplicate definition is kept for backward compatibility
# Both should map to the same 'email_templates' table
class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    variables = Column(JSON, default=[])  # Liste des variables disponibles
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    campaigns = relationship("EmailCampaign", back_populates="template")


class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)

    # Template
    template_id = Column(Integer, ForeignKey("email_templates.id"), nullable=False)
    template = relationship("EmailTemplate", back_populates="campaigns")

    # Filtres de destinataires (stockés en JSON)
    recipient_filters = Column(JSON, nullable=False)
    # {
    #   "target_type": "organisations" | "contacts",
    #   "languages": ["FR", "EN"],
    #   "countries": ["FR", "LU"],
    #   "organisation_categories": ["BANK", "ASSET_MANAGER"],
    #   "specific_ids": [1, 2, 3]  # IDs spécifiques
    # }

    # Statistiques
    total_recipients = Column(Integer, default=0)
    emails_sent = Column(Integer, default=0)
    emails_failed = Column(Integer, default=0)
    emails_opened = Column(Integer, default=0)
    emails_clicked = Column(Integer, default=0)

    # Configuration d'envoi
    batch_size = Column(Integer, default=600)
    delay_between_batches = Column(Integer, default=60)  # secondes

    # Statut
    status = Column(SQLEnum(CampaignStatus), default=CampaignStatus.DRAFT)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    emails = relationship("CampaignEmail", back_populates="campaign")


class CampaignEmail(Base):
    __tablename__ = "campaign_emails"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("email_campaigns.id"), nullable=False)
    campaign = relationship("EmailCampaign", back_populates="emails")

    # Destinataire
    recipient_type = Column(String(50), nullable=False)  # "organisation" ou "contact"
    recipient_id = Column(Integer, nullable=False)
    recipient_email = Column(String(255), nullable=False)
    recipient_name = Column(String(200))

    # Contenu personnalisé
    subject = Column(String(500), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text)
    personalization_data = Column(JSON, default={})

    # Statut
    status = Column(SQLEnum(EmailStatus), default=EmailStatus.PENDING)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    clicked_at = Column(DateTime(timezone=True), nullable=True)

    # Erreur
    error_message = Column(Text, nullable=True)

    # Batch
    batch_number = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
