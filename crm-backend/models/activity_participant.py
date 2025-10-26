"""Modèle ActivityParticipant - Participants aux activités (réunions, calls, etc.).

Ce modèle permet de gérer les interactions multi-participants :
- Réunion avec 6 personnes d'une même société
- Call avec 3 contacts
- Déjeuner d'affaires avec plusieurs participants
"""

from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.constants import ONDELETE_CASCADE


class ActivityParticipant(BaseModel):
    """
    Participant à une activité (réunion, call, déjeuner, etc.).

    Relation many-to-many entre OrganisationActivity et Person.
    Permet de tracker qui était présent à quel événement.
    """

    __tablename__ = "activity_participants"
    __table_args__ = (
        Index("idx_activity_participants_activity", "activity_id"),
        Index("idx_activity_participants_person", "person_id"),
        Index("idx_activity_participants_org", "organisation_id"),
    )

    activity_id = Column(
        Integer,
        ForeignKey("organisation_activities.id", ondelete=ONDELETE_CASCADE),
        nullable=False,
        index=True,
    )

    person_id = Column(
        Integer,
        ForeignKey("people.id", ondelete=ONDELETE_CASCADE),
        nullable=True,  # Peut être null si participant externe
        index=True,
    )

    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id", ondelete=ONDELETE_CASCADE),
        nullable=True,  # L'organisation du participant
        index=True,
    )

    # Pour les participants externes (non dans le CRM)
    external_name = Column(String(255), nullable=True)  # Ex: "Jean Dupont (externe)"
    external_email = Column(String(255), nullable=True)
    external_role = Column(String(255), nullable=True)  # Ex: "CEO", "CFO"

    # Métadonnées
    is_organizer = Column(Boolean, default=False)  # Organisateur de la réunion
    attendance_status = Column(String(50), nullable=True)  # "confirmed", "tentative", "declined"
    notes = Column(String(500), nullable=True)  # Notes spécifiques au participant

    # Relations
    activity = relationship(
        "OrganisationActivity", back_populates="participants", foreign_keys=[activity_id]
    )

    person = relationship(
        "Person", back_populates="activity_participations", foreign_keys=[person_id]
    )

    organisation = relationship("Organisation", foreign_keys=[organisation_id])

    def __repr__(self) -> str:
        if self.person_id:
            return (
                f"<ActivityParticipant(activity_id={self.activity_id}, person_id={self.person_id})>"
            )
        else:
            return f"<ActivityParticipant(activity_id={self.activity_id}, external={self.external_name})>"

    @property
    def display_name(self) -> str:
        """Retourne le nom à afficher (Person ou externe)."""
        if self.person:
            return f"{self.person.first_name} {self.person.last_name}".strip()
        return self.external_name or "Participant inconnu"
