"""
Modèle Interaction - Historique des communications et activités

v1 : Champs de base (type, title, body, attachments)
v1.1 : Participants multiples (M-N avec Person + external_participants JSON)
v2 : Workflow inbox (status, assignee, next_action_at)

Contrainte métier :
- Chaque interaction doit être liée à une organisation OU une personne
- CHECK: (org_id IS NOT NULL) OR (person_id IS NOT NULL)
"""

from __future__ import annotations

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Enum,
    ForeignKey,
    DateTime,
    JSON,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from models.base import BaseModel
from models.constants import (
    FK_USERS_ID,
    FK_ORGANISATIONS_ID,
    FK_PEOPLE_ID,
    ONDELETE_SET_NULL,
    ONDELETE_CASCADE,
)


class InteractionType(str, enum.Enum):
    """Types d'interactions supportées."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    VISIO = "visio"
    NOTE = "note"
    OTHER = "other"


class InteractionStatus(str, enum.Enum):
    """Statuts d'une interaction (workflow inbox)."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class InteractionParticipant(BaseModel):
    """
    Participant interne à une interaction (M-N avec Person).

    Utilisé principalement pour les réunions avec plusieurs participants.

    Relations:
    - interaction: Interaction concernée
    - person: Personne (collaborateur du CRM)

    Attributs:
    - role: Rôle du participant (ex: "CEO", "CTO", "Animateur")
    - present: Présent ou absent (default TRUE)
    """

    __tablename__ = "interaction_participants"
    __table_args__ = (
        # PK composite
        {"extend_existing": True},
    )

    interaction_id = Column(
        Integer,
        ForeignKey("crm_interactions.id", ondelete=ONDELETE_CASCADE),
        primary_key=True,
        nullable=False,
    )
    person_id = Column(
        Integer,
        ForeignKey(FK_PEOPLE_ID, ondelete=ONDELETE_CASCADE),
        primary_key=True,
        nullable=False,
    )

    role = Column(String(80), nullable=True)
    present = Column(Boolean, nullable=False, default=True, server_default="true")

    # Pas de created_at/updated_at (relation pure)

    # Relations
    interaction = relationship("Interaction", back_populates="participants")
    person = relationship("Person")

    def __repr__(self) -> str:
        return (
            f"<InteractionParticipant(interaction_id={self.interaction_id}, "
            f"person_id={self.person_id}, role={self.role})>"
        )


class Interaction(BaseModel):
    """
    Interaction = communication ou activité liée à une organisation/personne.

    Exemples:
    - Appel téléphonique avec un contact
    - Email envoyé à un client
    - Compte-rendu de réunion
    - Note post-déjeuner d'affaires

    Relations:
    - organisation (nullable): Organisation concernée
    - person (nullable): Personne concernée
    - creator: Utilisateur ayant créé l'interaction
    """

    __tablename__ = "crm_interactions"  # Nouveau nom pour éviter conflit avec l'ancien modèle
    __table_args__ = (
        # Contrainte métier: au moins organisation OU personne
        CheckConstraint(
            '(org_id IS NOT NULL) OR (person_id IS NOT NULL)',
            name='chk_interaction_org_or_person'
        ),
        # Index pour requêtes optimisées
        Index('idx_interactions_org_created_at', 'org_id', 'created_at'),
        Index('idx_interactions_person_created_at', 'person_id', 'created_at'),
        Index('idx_interactions_created_at', 'created_at'),
    )

    # Relations avec Organisation/Personne (nullable)
    org_id = Column(
        Integer,
        ForeignKey(FK_ORGANISATIONS_ID, ondelete=ONDELETE_SET_NULL),
        nullable=True,
        index=True,
    )
    person_id = Column(
        Integer,
        ForeignKey(FK_PEOPLE_ID, ondelete=ONDELETE_SET_NULL),
        nullable=True,
        index=True,
    )

    # Type d'interaction
    type = Column(
        Enum(InteractionType, name="interaction_type"),
        nullable=False,
        default=InteractionType.NOTE,
    )

    # Contenu
    title = Column(String(200), nullable=False)
    description = Column("body", Text, nullable=True)  # Renommé pour cohérence avec autres modèles

    # Métadonnées
    created_by = Column(
        Integer,
        ForeignKey(FK_USERS_ID),
        nullable=False,
        index=True,
    )

    # Pièces jointes (liste d'objets { name: str, url: str })
    attachments = Column(JSON, nullable=False, default=list)

    # Participants externes (liste d'objets { name, email, company })
    external_participants = Column(JSON, nullable=False, default=list)

    # ===== V2: Workflow Inbox =====
    # Status de l'interaction (workflow)
    status = Column(
        Enum(InteractionStatus, name="interaction_status"),
        nullable=False,
        default=InteractionStatus.TODO,
        index=True,
    )

    # Assignee (utilisateur responsable)
    assignee_id = Column(
        Integer,
        ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL),
        nullable=True,
        index=True,
    )

    # Date/heure de la prochaine action à faire
    next_action_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Timestamp de la dernière notification envoyée (évite re-notification)
    notified_at = Column(DateTime(timezone=True), nullable=True)

    # Optional: Links vers Tasks et Events (future)
    linked_task_id = Column(Integer, nullable=True)
    linked_event_id = Column(Integer, nullable=True)

    # Relations SQLAlchemy
    organisation = relationship("Organisation", back_populates="interactions")
    person = relationship("Person", back_populates="interactions")
    creator = relationship("User", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assignee_id])

    # Participants internes (M-N avec Person)
    participants = relationship(
        "InteractionParticipant",
        cascade="all, delete-orphan",
        passive_deletes=True,
        back_populates="interaction",
    )

    def __repr__(self) -> str:
        return (
            f"<Interaction(id={self.id}, type={self.type}, "
            f"org_id={self.org_id}, person_id={self.person_id})>"
        )

    @property
    def body(self):
        """Alias pour compatibilité API."""
        return self.description

    @body.setter
    def body(self, value):
        """Alias pour compatibilité API."""
        self.description = value
