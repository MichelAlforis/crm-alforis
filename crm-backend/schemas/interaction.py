"""
Schémas Pydantic pour Interactions v2

Validation des données d'entrée/sortie pour l'API Interactions.
IDs = Integer (cohérence avec le projet existant).

v1: Champs de base
v1.1: Participants multiples
v2: Workflow inbox (status, assignee, next_action_at)
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

# Import des enums Python depuis models
from models.interaction import InteractionStatus, InteractionType


class Attachment(BaseModel):
    """Pièce jointe (URL uniquement, pas d'upload en v1)"""

    name: str = Field(..., min_length=1, max_length=255, description="Nom du fichier")
    url: str = Field(..., min_length=1, description="URL du fichier")


class ParticipantIn(BaseModel):
    """Participant interne (personne du CRM)"""

    person_id: int = Field(..., gt=0, description="ID de la personne")
    role: Optional[str] = Field(None, max_length=80, description="Rôle (CEO, CTO, etc.)")
    present: bool = Field(True, description="Présent ou absent")


class ExternalParticipant(BaseModel):
    """Participant externe (non dans le CRM)"""

    name: str = Field(..., min_length=1, max_length=255, description="Nom complet")
    email: Optional[EmailStr] = Field(None, description="Email (optionnel)")
    company: Optional[str] = Field(None, max_length=255, description="Entreprise (optionnel)")


class InteractionCreate(BaseModel):
    """Schéma de création d'une interaction"""

    org_id: Optional[int] = Field(None, gt=0, description="ID de l'organisation")
    person_id: Optional[int] = Field(None, gt=0, description="ID de la personne")
    type: InteractionType = Field("note", description="Type d'interaction")
    title: str = Field(..., min_length=1, max_length=200, description="Titre de l'interaction")
    body: Optional[str] = Field(None, description="Description/notes détaillées")
    attachments: List[Attachment] = Field(
        default_factory=list, description="Liste de pièces jointes"
    )

    # v1.1: Participants multiples
    participants: Optional[List[ParticipantIn]] = Field(
        None, description="Participants internes (CRM)"
    )
    external_participants: Optional[List[ExternalParticipant]] = Field(
        None, description="Invités externes"
    )

    # v2: Workflow inbox
    status: InteractionStatus = Field("todo", description="Statut de l'interaction")
    assignee_id: Optional[int] = Field(None, gt=0, description="Utilisateur assigné")
    next_action_at: Optional[datetime] = Field(
        None, description="Date/heure de la prochaine action"
    )

    @field_validator("org_id", "person_id")
    @classmethod
    def validate_at_least_one(cls, v, info):
        """Valide qu'au moins org_id OU person_id est fourni"""
        # Cette validation est faite après tous les champs
        return v

    def model_post_init(self, __context):
        """Validation après initialisation : au moins un ID requis"""
        if not self.org_id and not self.person_id:
            raise ValueError("Au moins org_id ou person_id est requis")


class InteractionUpdate(BaseModel):
    """Schéma de mise à jour d'une interaction"""

    type: Optional[InteractionType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = None
    attachments: Optional[List[Attachment]] = None

    # v1.1: Participants multiples
    participants: Optional[List[ParticipantIn]] = None
    external_participants: Optional[List[ExternalParticipant]] = None

    # v2: Workflow inbox
    status: Optional[InteractionStatus] = None
    assignee_id: Optional[int] = Field(None, gt=0)
    next_action_at: Optional[datetime] = None


class InteractionOut(BaseModel):
    """Schéma de réponse d'une interaction"""

    id: int
    org_id: Optional[int]
    person_id: Optional[int]
    type: str  # Changé de InteractionType à str pour compatibilité JSON
    title: str
    body: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[Attachment]

    # v1.1: Participants multiples
    participants: List[ParticipantIn] = Field(default_factory=list)
    external_participants: List[ExternalParticipant] = Field(default_factory=list)

    # v2: Workflow inbox
    status: str  # Changé de InteractionStatus à str pour compatibilité JSON
    assignee_id: Optional[int]
    next_action_at: Optional[datetime]

    @field_validator("type", mode="before")
    @classmethod
    def convert_type_enum_to_str(cls, v):
        """Convertir InteractionType enum → string pour validation"""
        if hasattr(v, "value"):
            return v.value  # InteractionType.EMAIL → 'email'
        return v

    @field_validator("status", mode="before")
    @classmethod
    def convert_status_enum_to_str(cls, v):
        """Convertir InteractionStatus enum → string pour validation"""
        if hasattr(v, "value"):
            return v.value  # InteractionStatus.DONE → 'done'
        return v


class InteractionListResponse(BaseModel):
    """Réponse paginée d'interactions"""

    items: List[InteractionOut]
    total: int
    limit: int
    cursor: Optional[str] = None  # Cursor pour pagination (peut être l'ID du dernier élément)


# ===== V2: Schemas pour actions Inbox =====


class InteractionStatusUpdate(BaseModel):
    """Update du statut uniquement"""

    status: InteractionStatus


class InteractionAssigneeUpdate(BaseModel):
    """Update de l'assignee uniquement"""

    assignee_id: Optional[int] = Field(None, gt=0, description="User ID ou null pour désassigner")


class InteractionNextActionUpdate(BaseModel):
    """Update de next_action_at uniquement"""

    next_action_at: Optional[datetime] = Field(None, description="Date/heure ou null pour retirer")
