from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import BaseModel, Field

from schemas.base import TimestampedSchema
from models.organisation_activity import OrganisationActivityType


class OrganisationActivityBase(BaseModel):
    """Schéma de base commun aux activités d'organisation."""

    organisation_id: int = Field(..., ge=1)
    type: OrganisationActivityType
    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_by: Optional[int] = Field(None, ge=1)


class OrganisationActivityCreate(OrganisationActivityBase):
    """Schéma pour la création (manuelle ou système) d'une activité."""


class OrganisationActivityUpdate(BaseModel):
    """Schéma pour la modification ponctuelle d'une activité."""

    title: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_by: Optional[int] = Field(None, ge=1)


class OrganisationActivityResponse(OrganisationActivityBase, TimestampedSchema):
    """Schéma de réponse via API."""

    id: int

    class Config:
        from_attributes = True
