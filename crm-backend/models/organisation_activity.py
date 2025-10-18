"""Modèle OrganisationActivity - Historique unifié des activités.

Ce modèle alimente la timeline par organisation (Phase 2 - widgets Activity).
Chaque ligne représente un événement métier significatif (interaction,
tâche, mandat, email, etc.) afin de fournir un flux chronologique unifié.
"""

from __future__ import annotations

import enum
from sqlalchemy import (
    Column,
    Integer,
    String,
    Enum,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Index,
    func,
)
from sqlalchemy.orm import relationship

from models.base import BaseModel


class OrganisationActivityType(str, enum.Enum):
    """Types d'activités supportés dans la timeline."""

    INTERACTION_CREATED = "interaction_created"
    INTERACTION_UPDATED = "interaction_updated"
    TASK_CREATED = "task_created"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    NOTE_ADDED = "note_added"
    DOCUMENT_ADDED = "document_added"
    MANDAT_CREATED = "mandat_created"
    MANDAT_STATUS_CHANGED = "mandat_status_changed"
    MANDAT_UPDATED = "mandat_updated"
    ORGANISATION_CREATED = "organisation_created"
    ORGANISATION_UPDATED = "organisation_updated"
    EMAIL_SENT = "email_sent"
    SYSTEM_EVENT = "system_event"


class OrganisationActivity(BaseModel):
    """
    Ligne d'activité associée à une organisation.

    Champs principaux:
        - organisation_id: Organisation concernée
        - occurred_at: Horodatage de l'événement métier
        - type: Catégorie d'événement
        - title: Résumé lisible (titre)
        - preview: Détails additionnels (optionnel)
        - actor_id / actor_name: Utilisateur ou système à l'origine
        - resource_type / resource_id: Lien vers la ressource concernée
        - metadata: Données contextuelles JSON (payload libre)
    """

    __tablename__ = "organisation_activities"
    __table_args__ = (
        Index(
            "idx_org_activities_org_occurred",
            "organisation_id",
            "occurred_at",
            postgresql_using="btree",
        ),
        Index("idx_org_activities_type", "type"),
        Index("idx_org_activities_resource", "resource_type", "resource_id"),
    )

    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    occurred_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    type = Column(
        Enum(OrganisationActivityType, name="organisationactivitytype"),
        nullable=False,
        index=True,
    )

    title = Column(String(255), nullable=False)
    preview = Column(Text, nullable=True)

    actor_id = Column(String(64), nullable=True, index=True)
    actor_name = Column(String(255), nullable=True)
    actor_avatar_url = Column(String(512), nullable=True)

    resource_type = Column(String(64), nullable=True)
    resource_id = Column(Integer, nullable=True)

    metadata = Column(JSON, nullable=True)

    # Relations
    organisation = relationship("Organisation", back_populates="activities")

    def __repr__(self) -> str:
        return (
            f"<OrganisationActivity(id={self.id}, organisation_id={self.organisation_id}, "
            f"type={self.type}, occurred_at={self.occurred_at})>"
        )
