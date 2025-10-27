"""Schemas Pydantic pour les participants aux activités."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ActivityParticipantBase(BaseModel):
    """Base schema pour les participants."""

    person_id: Optional[int] = Field(None, gt=0, description="ID de la personne (si dans le CRM)")
    organisation_id: Optional[int] = Field(
        None, gt=0, description="ID de l'organisation du participant"
    )

    # Pour participants externes
    external_name: Optional[str] = Field(None, max_length=255, description="Nom complet si externe")
    external_email: Optional[str] = Field(None, max_length=255, description="Email si externe")
    external_role: Optional[str] = Field(None, max_length=255, description="Fonction si externe")

    # Métadonnées
    is_organizer: bool = Field(False, description="Organisateur de l'événement")
    attendance_status: Optional[str] = Field(
        None, max_length=50, description="confirmed/tentative/declined"
    )
    notes: Optional[str] = Field(
        None, max_length=500, description="Notes spécifiques au participant"
    )


class ActivityParticipantCreate(ActivityParticipantBase):
    """Schema pour créer un participant à une activité."""

    activity_id: int = Field(..., gt=0, description="ID de l'activité")


class ActivityParticipantUpdate(BaseModel):
    """Schema pour mettre à jour un participant."""

    attendance_status: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)
    is_organizer: Optional[bool] = None


class ActivityParticipantResponse(ActivityParticipantBase):
    """Schema de réponse pour un participant."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Enrichissements depuis les relations
    display_name: Optional[str] = None


class ActivityWithParticipantsCreate(BaseModel):
    """Schema pour créer une activité avec participants."""

    # Champs de l'activité
    organisation_id: int = Field(..., gt=0)
    type: str = Field(..., description="appel/email/reunion/dejeuner/note/autre")
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, description="Description détaillée")
    metadata: Optional[dict] = Field(None, description="Métadonnées JSON")
    occurred_at: Optional[datetime] = Field(None, description="Date/heure de l'événement")

    # Participants
    participants: list[ActivityParticipantBase] = Field(
        default_factory=list, description="Liste des participants (CRM ou externes)"
    )


class ActivityWithParticipantsResponse(BaseModel):
    """Schema de réponse pour une activité avec participants."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    organisation_id: int
    type: str
    title: str
    description: Optional[str] = None
    metadata: Optional[dict] = None
    occurred_at: datetime
    created_at: datetime
    updated_at: Optional[datetime] = None

    participants: list[ActivityParticipantResponse] = []
    attachments_count: int = 0
