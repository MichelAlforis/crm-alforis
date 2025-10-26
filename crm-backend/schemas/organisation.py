import json
from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from models.organisation import OrganisationCategory, OrganisationType, PipelineStage
from schemas.base import TimestampedSchema
from schemas.organisation_activity import OrganisationActivityResponse
from schemas.person import PersonOrganizationLinkResponse, PersonResponse

# =======================
# Organisation Schemas
# =======================


class OrganisationBase(BaseModel):
    """Schéma de base pour une organisation unifiée."""

    name: str = Field(..., min_length=1, max_length=255)
    type: OrganisationType = Field(
        ..., description="client|fournisseur|distributeur|emetteur|autre"
    )
    category: Optional[OrganisationCategory] = Field(
        None, description="Institution, Wholesale, SDG, CGPI, Autres"
    )

    email: Optional[EmailStr] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)

    pipeline_stage: PipelineStage = Field(default=PipelineStage.PROSPECT)
    potential_amount: Optional[Decimal] = Field(
        None, description="Montant potentiel pour les clients (pipeline)"
    )
    signature_date: Optional[date] = None
    signature_probability: Optional[int] = Field(
        None, ge=0, le=100, description="Probabilité de signature (0-100%)"
    )

    aum: Optional[Decimal] = Field(None, description="Assets Under Management")
    aum_date: Optional[date] = None
    strategies: List[str] = Field(default_factory=list)
    domicile: Optional[str] = Field(None, max_length=255)
    language: str = Field(default="FR", max_length=5, description="Langue principale")

    notes: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    is_active: bool = Field(default=True)
    created_by: Optional[int] = Field(None, description="User ID créateur")
    assigned_to: Optional[int] = Field(None, description="User ID assigné")

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: str) -> str:
        return value.upper()


class OrganisationCreate(OrganisationBase):
    """Payload création."""

    name: str = Field(..., min_length=1, max_length=255)
    type: OrganisationType = Field(default=OrganisationType.AUTRE)
    pipeline_stage: PipelineStage = Field(default=PipelineStage.PROSPECT)


class OrganisationUpdate(BaseModel):
    """Payload mise à jour (patch)."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    type: Optional[OrganisationType] = None
    category: Optional[OrganisationCategory] = None
    email: Optional[EmailStr] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    pipeline_stage: Optional[PipelineStage] = None
    potential_amount: Optional[Decimal] = None
    signature_date: Optional[date] = None
    signature_probability: Optional[int] = Field(None, ge=0, le=100)
    aum: Optional[Decimal] = None
    aum_date: Optional[date] = None
    strategies: Optional[List[str]] = None
    domicile: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, max_length=5)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_active: Optional[bool] = None
    created_by: Optional[int] = None
    assigned_to: Optional[int] = None


class OrganisationResponse(OrganisationBase, TimestampedSchema):
    """Réponse standard."""

    id: int

    class Config:
        from_attributes = True

    @field_validator("strategies", "tags", mode="before")
    @classmethod
    def _coerce_lists(cls, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            try:
                loaded = json.loads(value)
                if isinstance(loaded, list):
                    return loaded
            except Exception:
                return [value]
        return value


class OrganisationDetailResponse(OrganisationResponse):
    """Réponse détaillée avec relations principales."""

    people_links: List[PersonOrganizationLinkResponse] = Field(default_factory=list)
    activities: List[OrganisationActivityResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


# =======================
# Contact Organisation Schemas
# =======================


class OrganisationContactBase(BaseModel):
    """Schéma de base pour un contact d'organisation"""

    organisation_id: int
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class OrganisationContactCreate(OrganisationContactBase):
    """Schéma pour la création d'un contact d'organisation"""

    pass


class OrganisationContactUpdate(BaseModel):
    """Schéma pour la mise à jour d'un contact d'organisation"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class OrganisationContactResponse(OrganisationContactBase, TimestampedSchema):
    """Schéma de réponse pour un contact d'organisation"""

    id: int

    class Config:
        from_attributes = True


# =======================
# Mandat Distribution Schemas
# =======================


class MandatDistributionBase(BaseModel):
    """Schéma de base pour un mandat de distribution"""

    organisation_id: int
    status: str = Field(default="proposé", description="proposé, signé, actif, terminé")
    date_signature: Optional[date] = None
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ["proposé", "signé", "actif", "terminé"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class MandatDistributionCreate(MandatDistributionBase):
    """Schéma pour la création d'un mandat de distribution"""

    pass


class MandatDistributionUpdate(BaseModel):
    """Schéma pour la mise à jour d'un mandat de distribution"""

    status: Optional[str] = None
    date_signature: Optional[date] = None
    date_debut: Optional[date] = None
    date_fin: Optional[date] = None
    notes: Optional[str] = None


class MandatDistributionResponse(MandatDistributionBase, TimestampedSchema):
    """Schéma de réponse pour un mandat de distribution"""

    id: int
    is_actif: bool = Field(description="True si le mandat est signé ou actif")

    class Config:
        from_attributes = True


class MandatDistributionDetailResponse(MandatDistributionResponse):
    """Schéma de réponse détaillée pour un mandat avec les produits associés"""

    organisation: OrganisationResponse
    produits: List["ProduitResponse"] = []

    class Config:
        from_attributes = True


# =======================
# Produit Schemas
# =======================


class ProduitBase(BaseModel):
    """Schéma de base pour un produit"""

    name: str = Field(..., min_length=1, max_length=255)
    isin: Optional[str] = Field(None, max_length=12, description="Code ISIN unique")
    type: str = Field(..., description="OPCVM, FCP, SICAV, ETF, Fonds Alternatif, Autre")
    status: str = Field(default="en_attente", description="actif, inactif, en_attente")
    notes: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        valid_types = ["OPCVM", "FCP", "SICAV", "ETF", "Fonds Alternatif", "Autre"]
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ["actif", "inactif", "en_attente"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class ProduitCreate(ProduitBase):
    """Schéma pour la création d'un produit"""

    pass


class ProduitUpdate(BaseModel):
    """Schéma pour la mise à jour d'un produit"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    isin: Optional[str] = Field(None, max_length=12)
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class ProduitResponse(ProduitBase, TimestampedSchema):
    """Schéma de réponse pour un produit"""

    id: int

    class Config:
        from_attributes = True


class ProduitDetailResponse(ProduitResponse):
    """Schéma de réponse détaillée pour un produit avec les mandats associés"""

    mandats: List["MandatProduitResponse"] = []

    class Config:
        from_attributes = True


# =======================
# Mandat Produit Schemas
# =======================


class MandatProduitBase(BaseModel):
    """Schéma de base pour l'association mandat-produit"""

    mandat_id: int
    produit_id: int
    date_ajout: Optional[date] = None
    notes: Optional[str] = None


class MandatProduitCreate(MandatProduitBase):
    """Schéma pour la création d'une association mandat-produit"""

    pass


class MandatProduitUpdate(BaseModel):
    """Schéma pour la mise à jour d'une association mandat-produit"""

    date_ajout: Optional[date] = None
    notes: Optional[str] = None


class MandatProduitResponse(MandatProduitBase, TimestampedSchema):
    """Schéma de réponse pour une association mandat-produit"""

    id: int
    mandat: MandatDistributionResponse
    produit: ProduitResponse

    class Config:
        from_attributes = True


# =======================
# Interaction Schemas
# =======================


class InteractionBase(BaseModel):
    """Schéma de base pour une interaction"""

    organisation_id: int
    personne_id: Optional[int] = None
    produit_id: Optional[int] = Field(
        None, description="Produit concerné (nécessite un mandat actif)"
    )
    date: date
    type: str = Field(..., description="appel, email, reunion, webinaire, autre")
    pipeline: str = Field(..., description="fournisseur ou vente")
    status: Optional[str] = Field(
        None,
        description="Pour pipeline fournisseur: prospect_froid, prospect_chaud, refus, en_discussion, validé",
    )
    duration_minutes: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        valid_types = ["appel", "email", "reunion", "webinaire", "autre"]
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

    @field_validator("pipeline")
    @classmethod
    def validate_pipeline(cls, v):
        valid_pipelines = ["fournisseur", "vente"]
        if v not in valid_pipelines:
            raise ValueError(f"Pipeline must be one of {valid_pipelines}")
        return v


class InteractionCreate(InteractionBase):
    """Schéma pour la création d'une interaction"""

    pass


class InteractionUpdate(BaseModel):
    """Schéma pour la mise à jour d'une interaction"""

    organisation_id: Optional[int] = None
    personne_id: Optional[int] = None
    produit_id: Optional[int] = None
    date: Optional[date] = None
    type: Optional[str] = None
    pipeline: Optional[str] = None
    status: Optional[str] = None
    duration_minutes: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class InteractionResponse(InteractionBase, TimestampedSchema):
    """Schéma de réponse pour une interaction"""

    id: int

    class Config:
        from_attributes = True


class InteractionDetailResponse(InteractionResponse):
    """Schéma de réponse détaillée pour une interaction avec relations"""

    organisation: OrganisationResponse
    personne: Optional["PersonResponse"] = None
    produit: Optional[ProduitResponse] = None

    class Config:
        from_attributes = True


# Résoudre les références circulaires
OrganisationDetailResponse.model_rebuild()
MandatDistributionDetailResponse.model_rebuild()
ProduitDetailResponse.model_rebuild()
MandatProduitResponse.model_rebuild()
InteractionDetailResponse.model_rebuild()
