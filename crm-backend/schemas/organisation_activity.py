from __future__ import annotations

from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

from schemas.base import TimestampedSchema
from models.organisation_activity import OrganisationActivityType


class OrganisationActivityBase(BaseModel):
    """Schéma de base commun aux activités d'organisation."""

    organisation_id: int = Field(..., ge=1)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    type: OrganisationActivityType
    title: str = Field(..., min_length=1, max_length=255)
    preview: Optional[str] = None
    actor_id: Optional[str] = Field(None, max_length=64)
    actor_name: Optional[str] = Field(None, max_length=255)
    actor_avatar_url: Optional[str] = Field(None, max_length=512)
    resource_type: Optional[str] = Field(None, max_length=64)
    resource_id: Optional[int] = Field(None, ge=1)
    metadata: Optional[Dict[str, Any]] = None


class OrganisationActivityCreate(OrganisationActivityBase):
    """Schéma pour la création (manuelle ou système) d'une activité."""

    pass


class OrganisationActivityUpdate(BaseModel):
    """Schéma pour la modification ponctuelle d'une activité."""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    preview: Optional[str] = None
    actor_name: Optional[str] = Field(None, max_length=255)
    actor_avatar_url: Optional[str] = Field(None, max_length=512)
    metadata: Optional[Dict[str, Any]] = None


class OrganisationActivityResponse(OrganisationActivityBase, TimestampedSchema):
    """Schéma de réponse via API."""

    id: int

    class Config:
        from_attributes = True
