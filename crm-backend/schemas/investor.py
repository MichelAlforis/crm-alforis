from pydantic import Field, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from schemas.base import TimestampedSchema, BaseSchema
from models.investor import PipelineStage, ClientType

# ============= CONTACT SCHEMAS =============

class ContactCreate(BaseSchema):
    """Création d'un contact"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class ContactUpdate(BaseSchema):
    """Mise à jour d'un contact"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

class ContactResponse(TimestampedSchema):
    """Réponse contact"""
    investor_id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    title: Optional[str]
    notes: Optional[str]

# ============= INVESTOR SCHEMAS =============

from schemas.person import PersonOrganizationLinkResponse

class InvestorCreate(BaseSchema):
    """Création d'un investisseur"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    main_phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=255)
    pipeline_stage: PipelineStage = PipelineStage.PROSPECT_FROID
    client_type: Optional[ClientType] = None
    notes: Optional[str] = None


class InvestorUpdate(BaseSchema):
    """Mise à jour d'un investisseur"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    main_phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    industry: Optional[str] = Field(None, max_length=255)
    pipeline_stage: Optional[PipelineStage] = None
    client_type: Optional[ClientType] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class InvestorResponse(TimestampedSchema):
    """Réponse investisseur"""
    name: str
    email: Optional[str]
    main_phone: Optional[str]
    website: Optional[str]
    company: Optional[str]
    industry: Optional[str]
    pipeline_stage: Optional[PipelineStage] = PipelineStage.PROSPECT_FROID
    client_type: Optional[ClientType]
    notes: Optional[str]
    is_active: bool = True

    @field_validator("pipeline_stage", mode="before")
    @classmethod
    def ensure_pipeline_stage(cls, value):
        return value or PipelineStage.PROSPECT_FROID

    @field_validator("is_active", mode="before")
    @classmethod
    def coerce_is_active(cls, value):
        if value is None:
            return True
        return bool(value)


class InvestorDetailResponse(InvestorResponse):
    """Réponse détaillée investisseur avec relations"""
    contacts: List[ContactResponse] = []  # Legacy - conservé pour compatibilité
    people: List[PersonOrganizationLinkResponse] = []

class InvestorStatsResponse(BaseSchema):
    """Statistiques sur les investisseurs"""
    total_count: int
    active_count: int
    by_pipeline_stage: dict[str, int]
    by_client_type: dict[str, int]

class InvestorFilterParams(BaseSchema):
    """Paramètres de filtrage pour les investisseurs"""
    pipeline_stage: Optional[PipelineStage] = None
    client_type: Optional[ClientType] = None
    is_active: Optional[bool] = True
    search: Optional[str] = None  # Recherche sur name, email, company
    skip: int = 0
    limit: int = 100
