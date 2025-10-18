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
    ForeignKey,
    Text,
    JSON,
    Index,
    DateTime,
)
from sqlalchemy.orm import relationship
from datetime import datetime

from models.base import BaseModel


class OrganisationActivityType(str, enum.Enum):
    """Types d'activités supportés dans la timeline unifiée."""

    NOTE = "note"
    APPEL = "appel"
    EMAIL = "email"
    REUNION = "reunion"
    TACHE_COMPLETEE = "tache_completee"
    CHANGEMENT_STAGE = "changement_stage"
    ORGANISATION_CREATED = "organisation_created"
    ORGANISATION_UPDATED = "organisation_updated"
    ORGANISATION_DELETED = "organisation_deleted"
    MANDAT_CREATED = "mandat_created"
    MANDAT_UPDATED = "mandat_updated"
    MANDAT_SIGNED = "mandat_signed"
    AUTRE = "autre"


class OrganisationActivity(BaseModel):
    """
    Ligne d'activité associée à une organisation.

    Les activités forment la timeline consolidée :
    notes, appels, emails, réunions, changements de pipeline, etc.
    """

    __tablename__ = "organisation_activities"
    __table_args__ = (
        Index("idx_org_activities_org", "organisation_id"),
        Index("idx_org_activities_type", "type"),
        Index("idx_org_activities_created", "created_at"),
    )

    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    type = Column(
        Enum(OrganisationActivityType, name="organisationactivitytype"),
        nullable=False,
        index=True,
    )
    title = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    activity_metadata = Column("metadata", JSON, nullable=True)  # Renommé: 'metadata' est réservé par SQLAlchemy
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    organisation = relationship("Organisation", back_populates="activities")

    def __repr__(self) -> str:
        return (
            f"<OrganisationActivity(id={self.id}, organisation_id={self.organisation_id}, "
            f"type={self.type})>"
        )
