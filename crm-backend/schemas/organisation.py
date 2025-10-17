from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import date, datetime
from schemas.base import TimestampedSchema
from schemas.person import PersonResponse


# =======================
# Organisation Schemas
# =======================

class OrganisationBase(BaseModel):
    """Schéma de base pour Organisation"""
    name: str = Field(..., min_length=1, max_length=255)
    category: str = Field(..., description="Institution, Wholesale, SDG, CGPI, Autres")
    aum: Optional[float] = Field(None, description="Assets Under Management")
    aum_date: Optional[date] = None
    strategies: Optional[List[str]] = Field(default_factory=list)
    website: Optional[str] = Field(None, max_length=255)
    country_code: Optional[str] = Field(None, max_length=2)
    domicile: Optional[str] = Field(None, max_length=255)
    language: str = Field(default='FR', max_length=5, description="Langue principale de l'organisation")
    notes: Optional[str] = None
    is_active: bool = True

    @field_validator('category')
    @classmethod
    def validate_category(cls, v):
        valid_categories = ['Institution', 'Wholesale', 'SDG', 'CGPI', 'Autres']
        if v not in valid_categories:
            raise ValueError(f"Category must be one of {valid_categories}")
        return v

    @field_validator('language')
    @classmethod
    def validate_language(cls, v):
        valid_languages = ['FR', 'EN', 'ES', 'DE', 'IT']
        if v and v not in valid_languages:
            raise ValueError(f"Language must be one of {valid_languages}")
        return v


class OrganisationCreate(OrganisationBase):
    """Schéma pour la création d'une organisation"""
    pass


class OrganisationUpdate(BaseModel):
    """Schéma pour la mise à jour d'une organisation"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[str] = None
    aum: Optional[float] = None
    aum_date: Optional[date] = None
    strategies: Optional[List[str]] = None
    website: Optional[str] = Field(None, max_length=255)
    country_code: Optional[str] = Field(None, max_length=2)
    domicile: Optional[str] = Field(None, max_length=255)
    language: Optional[str] = Field(None, max_length=5)
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class OrganisationResponse(OrganisationBase, TimestampedSchema):
    """Schéma de réponse pour une organisation"""
    id: int

    class Config:
        from_attributes = True


class OrganisationDetailResponse(OrganisationResponse):
    """Schéma de réponse détaillée pour une organisation avec relations"""
    mandats: List["MandatDistributionResponse"] = []
    contacts: List["OrganisationContactResponse"] = []

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

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ['proposé', 'signé', 'actif', 'terminé']
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

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        valid_types = ['OPCVM', 'FCP', 'SICAV', 'ETF', 'Fonds Alternatif', 'Autre']
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = ['actif', 'inactif', 'en_attente']
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
    produit_id: Optional[int] = Field(None, description="Produit concerné (nécessite un mandat actif)")
    date: date
    type: str = Field(..., description="appel, email, reunion, webinaire, autre")
    pipeline: str = Field(..., description="fournisseur ou vente")
    status: Optional[str] = Field(None, description="Pour pipeline fournisseur: prospect_froid, prospect_chaud, refus, en_discussion, validé")
    duration_minutes: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator('type')
    @classmethod
    def validate_type(cls, v):
        valid_types = ['appel', 'email', 'reunion', 'webinaire', 'autre']
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v

    @field_validator('pipeline')
    @classmethod
    def validate_pipeline(cls, v):
        valid_pipelines = ['fournisseur', 'vente']
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
