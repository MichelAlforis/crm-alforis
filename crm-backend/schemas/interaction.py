from pydantic import Field
from typing import Optional
from datetime import datetime
from schemas.base import TimestampedSchema, BaseSchema
from models.investor import InteractionType

class InteractionCreate(BaseSchema):
    """Création d'une interaction"""
    type: InteractionType
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")  # Format YYYY-MM-DD
    duration_minutes: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class InteractionUpdate(BaseSchema):
    """Mise à jour d'une interaction"""
    type: Optional[InteractionType] = None
    date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    duration_minutes: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class InteractionResponse(TimestampedSchema):
    """Réponse interaction"""
    investor_id: int
    type: InteractionType
    date: str
    duration_minutes: Optional[int]
    subject: Optional[str]
    notes: Optional[str]

class InteractionSummary(BaseSchema):
    """Résumé des interactions pour une période"""
    total_interactions: int
    by_type: dict[str, int]
    total_duration_minutes: int
    date_range: str

class InteractionFilterParams(BaseSchema):
    """Paramètres de filtrage pour les interactions"""
    investor_id: Optional[int] = None
    type: Optional[InteractionType] = None
    date_from: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_to: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    skip: int = 0
    limit: int = 100