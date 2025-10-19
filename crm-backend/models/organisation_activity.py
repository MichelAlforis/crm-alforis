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
from models.constants import (
    FK_USERS_ID,
    FK_ORGANISATIONS_ID,
    ONDELETE_SET_NULL,
    ONDELETE_CASCADE,
)


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
        ForeignKey(FK_ORGANISATIONS_ID, ondelete=ONDELETE_CASCADE),
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
    created_by = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True, index=True)
    occurred_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)

    organisation = relationship("Organisation", back_populates="activities")

    def __init__(self, **kwargs):
        incoming_metadata = kwargs.pop("metadata", None)
        super().__init__(**kwargs)
        if incoming_metadata is not None:
            object.__setattr__(self, "activity_metadata", incoming_metadata)

    def __repr__(self) -> str:
        return (
            f"<OrganisationActivity(id={self.id}, organisation_id={self.organisation_id}, "
            f"type={self.type})>"
        )

    def __getattribute__(self, item: str):
        if item == "metadata":
            try:
                return super().__getattribute__("activity_metadata")
            except AttributeError:
                return None
        return super().__getattribute__(item)

    def __setattr__(self, key: str, value):
        if key == "metadata":
            key = "activity_metadata"
        super().__setattr__(key, value)
