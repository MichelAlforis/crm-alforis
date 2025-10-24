"""
Modèles Email Marketing - Tracking emails et lead scoring

EmailSend: Historique des emails envoyés via providers (Resend, etc.)
LeadScore: Score d'engagement calculé automatiquement
"""

from __future__ import annotations

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum,
    ForeignKey,
    DateTime,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from models.base import BaseModel
from models.constants import (
    FK_ORGANISATIONS_ID,
    FK_PEOPLE_ID,
    ONDELETE_CASCADE,
    ONDELETE_SET_NULL,
)


class EmailStatus(str, enum.Enum):
    """Statuts possibles d'un email envoyé."""

    SENT = "sent"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"


class EmailSend(BaseModel):
    """
    Historique des emails marketing envoyés.

    Lié à une organisation OU une personne.
    Provider: resend, sendgrid, etc.
    External ID: ID fourni par le provider (pour dédupe)

    Tracking:
    - status: dernier état connu
    - open_count, click_count: compteurs
    - last_open_at, last_click_at: timestamps

    Liaison avec Interaction:
    - interaction_id: Si l'email génère une interaction (première ouverture)
    """

    __tablename__ = "email_sends"
    __table_args__ = (
        CheckConstraint(
            '(organisation_id IS NOT NULL) OR (person_id IS NOT NULL)',
            name='chk_email_org_or_person'
        ),
        Index('idx_email_sends_person_sent', 'person_id', 'sent_at'),
        Index('idx_email_sends_status', 'status'),
        Index('idx_email_sends_provider_ext', 'provider', 'external_id'),
        {'extend_existing': True}
    )

    # Relation avec Organisation/Personne (nullable)
    organisation_id = Column(
        Integer,
        ForeignKey(FK_ORGANISATIONS_ID, ondelete=ONDELETE_CASCADE),
        nullable=True,
        index=True,
    )
    person_id = Column(
        Integer,
        ForeignKey(FK_PEOPLE_ID, ondelete=ONDELETE_CASCADE),
        nullable=True,
        index=True,
    )

    # Provider et ID externe (pour dédupe)
    provider = Column(String(50), nullable=False, index=True)
    external_id = Column(String(255), nullable=False, index=True)

    # Métadonnées email
    subject = Column(String(500), nullable=True)

    # Statut et tracking
    status = Column(
        Enum(EmailStatus, name="email_status"),
        nullable=False,
        default=EmailStatus.SENT,
        index=True,
    )
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    open_count = Column(Integer, nullable=False, default=0)
    click_count = Column(Integer, nullable=False, default=0)
    last_open_at = Column(DateTime(timezone=True), nullable=True)
    last_click_at = Column(DateTime(timezone=True), nullable=True)

    # Liaison avec Interaction (créée automatiquement lors du premier open)
    interaction_id = Column(
        Integer,
        ForeignKey("crm_interactions.id", ondelete=ONDELETE_SET_NULL),
        nullable=True,
    )

    # Relations SQLAlchemy
    organisation = relationship("Organisation")
    person = relationship("Person")
    interaction = relationship("Interaction")

    def __repr__(self) -> str:
        return (
            f"<EmailSend(id={self.id}, provider={self.provider}, "
            f"status={self.status}, subject={self.subject[:30]})>"
        )


class LeadScore(BaseModel):
    """
    Score d'engagement pour chaque personne (lead scoring).

    Calcul automatique basé sur:
    - Ouvertures emails: +3 premier open, +1 par open supplémentaire
    - Clics emails: +8 premier clic, +2 par clic supplémentaire
    - Bounces: -10 (min 0)
    - Décroissance: -1/semaine sans event (job hebdo)

    Seuil "hot lead": 15+ points (configurable)
    """

    __tablename__ = "lead_scores"
    __table_args__ = (
        Index('idx_lead_scores_score', 'score'),
        {'extend_existing': True}
    )

    # PK = person_id (relation 1-to-1)
    person_id = Column(
        Integer,
        ForeignKey(FK_PEOPLE_ID, ondelete=ONDELETE_CASCADE),
        primary_key=True,
    )

    # Score calculé
    score = Column(Integer, nullable=False, default=0, index=True)

    # Dernier événement ayant impacté le score
    last_event_at = Column(DateTime(timezone=True), nullable=True)

    # Relation SQLAlchemy
    person = relationship("Person")

    def __repr__(self) -> str:
        return f"<LeadScore(person_id={self.person_id}, score={self.score})>"
