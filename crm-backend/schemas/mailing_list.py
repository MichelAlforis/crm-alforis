"""Schémas pour les listes de diffusion."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import Field

from schemas.base import BaseSchema, TimestampedSchema


class MailingListBase(BaseSchema):
    """Champs communs pour une liste de diffusion."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_type: str = Field(..., description="Type: 'contacts' ou 'organisations'")
    filters: Dict[str, Any] = Field(
        default_factory=dict,
        description="Filtres de sélection (languages, countries, categories, specific_ids, exclude_ids)",
    )


class MailingListCreate(MailingListBase):
    """Création d'une liste de diffusion."""

    recipient_count: int = Field(0, ge=0, description="Nombre de destinataires")


class MailingListUpdate(BaseSchema):
    """Mise à jour d'une liste."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    target_type: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    recipient_count: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None


class MailingListResponse(TimestampedSchema, MailingListBase):
    """Liste retournée par l'API."""

    id: int
    recipient_count: int
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_by: Optional[int] = None


class MailingListListResponse(BaseSchema):
    """Liste paginée de listes de diffusion."""

    items: List[MailingListResponse]
    total: int
    page: int
    page_size: int
