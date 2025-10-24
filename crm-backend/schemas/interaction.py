"""
Schémas Pydantic pour Interactions v1

Validation des données d'entrée/sortie pour l'API Interactions.
IDs = Integer (cohérence avec le projet existant).
"""

from pydantic import BaseModel, Field, field_validator, EmailStr
from typing import Optional, List, Literal
from datetime import datetime

# Type littéral pour le type d'interaction (v1.1: ajout 'visio')
InteractionType = Literal['call', 'email', 'meeting', 'visio', 'note', 'other']


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
    type: InteractionType = Field('note', description="Type d'interaction")
    title: str = Field(..., min_length=1, max_length=200, description="Titre de l'interaction")
    body: Optional[str] = Field(None, description="Description/notes détaillées")
    attachments: List[Attachment] = Field(default_factory=list, description="Liste de pièces jointes")

    # v1.1: Participants multiples
    participants: Optional[List[ParticipantIn]] = Field(None, description="Participants internes (CRM)")
    external_participants: Optional[List[ExternalParticipant]] = Field(None, description="Invités externes")

    @field_validator('org_id', 'person_id')
    @classmethod
    def validate_at_least_one(cls, v, info):
        """Valide qu'au moins org_id OU person_id est fourni"""
        # Cette validation est faite après tous les champs
        return v

    def model_post_init(self, __context):
        """Validation après initialisation : au moins un ID requis"""
        if not self.org_id and not self.person_id:
            raise ValueError("Au moins org_id ou person_id est requis")

    class Config:
        json_schema_extra = {
            "example": {
                "org_id": 42,
                "person_id": None,
                "type": "call",
                "title": "Appel découverte produit",
                "body": "Discussion sur leurs besoins en CRM, très intéressés",
                "attachments": [
                    {"name": "compte-rendu.pdf", "url": "https://example.com/files/cr.pdf"}
                ]
            }
        }


class InteractionUpdate(BaseModel):
    """Schéma de mise à jour d'une interaction"""
    type: Optional[InteractionType] = None
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    body: Optional[str] = None
    attachments: Optional[List[Attachment]] = None

    # v1.1: Participants multiples
    participants: Optional[List[ParticipantIn]] = None
    external_participants: Optional[List[ExternalParticipant]] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Appel découverte produit (suivi)",
                "body": "Décision positive, signature prévue mardi prochain"
            }
        }


class InteractionOut(BaseModel):
    """Schéma de réponse d'une interaction"""
    id: int
    org_id: Optional[int]
    person_id: Optional[int]
    type: InteractionType
    title: str
    body: Optional[str]
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    attachments: List[Attachment]

    # v1.1: Participants multiples
    participants: List[ParticipantIn] = Field(default_factory=list)
    external_participants: List[ExternalParticipant] = Field(default_factory=list)

    class Config:
        from_attributes = True  # Permet de créer depuis un modèle SQLAlchemy
        json_schema_extra = {
            "example": {
                "id": 123,
                "org_id": 42,
                "person_id": None,
                "type": "call",
                "title": "Appel découverte produit",
                "body": "Discussion sur leurs besoins en CRM",
                "created_by": 1,
                "created_at": "2025-10-24T14:30:00Z",
                "updated_at": None,
                "attachments": []
            }
        }


class InteractionListResponse(BaseModel):
    """Réponse paginée d'interactions"""
    items: List[InteractionOut]
    total: int
    limit: int
    cursor: Optional[str] = None  # Cursor pour pagination (peut être l'ID du dernier élément)

    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 45,
                "limit": 50,
                "cursor": "123"
            }
        }
