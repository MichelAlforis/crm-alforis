from pydantic import Field, EmailStr, field_validator
from typing import Optional, List, Dict
from datetime import datetime
from schemas.base import TimestampedSchema, BaseSchema
from schemas.person import PersonOrganizationLinkResponse
from models.fournisseur import StageFournisseur, TypeFournisseur, InteractionType

# =====================================================
# CONTACTS FOURNISSEUR
# =====================================================

class FournisseurContactCreate(BaseSchema):
    """Création d'un contact fournisseur"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return v.strip().lower() if isinstance(v, str) else v


class FournisseurContactUpdate(BaseSchema):
    """Mise à jour d'un contact fournisseur"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return v.strip().lower() if isinstance(v, str) else v


class FournisseurContactResponse(TimestampedSchema):
    """Réponse contact fournisseur"""
    fournisseur_id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    title: Optional[str]
    notes: Optional[str]


# =====================================================
# INTERACTIONS FOURNISSEUR
# =====================================================

class FournisseurInteractionCreate(BaseSchema):
    """Création d'une interaction fournisseur"""
    type: InteractionType
    date: str = Field(..., min_length=10, max_length=10, description="YYYY-MM-DD")
    duration_minutes: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class FournisseurInteractionUpdate(BaseSchema):
    """Mise à jour d'une interaction fournisseur"""
    type: Optional[InteractionType] = None
    date: Optional[str] = Field(None, min_length=10, max_length=10, description="YYYY-MM-DD")
    duration_minutes: Optional[int] = Field(None, ge=0)
    subject: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


class FournisseurInteractionResponse(TimestampedSchema):
    """Réponse interaction fournisseur"""
    fournisseur_id: int
    type: InteractionType
    date: str
    duration_minutes: Optional[int]
    subject: Optional[str]
    notes: Optional[str]


# =====================================================
# KPIs FOURNISSEUR
# =====================================================

class FournisseurKPICreate(BaseSchema):
    """Création d'un KPI fournisseur (mensuel)"""
    year: int = Field(..., ge=1900, le=2100)
    month: int = Field(..., ge=1, le=12)
    rdv_count: int = Field(0, ge=0)
    pitchs: int = Field(0, ge=0)
    due_diligences: int = Field(0, ge=0)
    closings: int = Field(0, ge=0)
    revenue: float = Field(0, ge=0)
    commission_rate: float = Field(0, ge=0)  # %
    notes: Optional[str] = None


class FournisseurKPIUpdate(BaseSchema):
    """Mise à jour d'un KPI fournisseur (mensuel)"""
    year: Optional[int] = Field(None, ge=1900, le=2100)
    month: Optional[int] = Field(None, ge=1, le=12)
    rdv_count: Optional[int] = Field(None, ge=0)
    pitchs: Optional[int] = Field(None, ge=0)
    due_diligences: Optional[int] = Field(None, ge=0)
    closings: Optional[int] = Field(None, ge=0)
    revenue: Optional[float] = Field(None, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0)  # %
    notes: Optional[str] = None


class FournisseurKPIResponse(TimestampedSchema):
    """Réponse KPI fournisseur"""
    fournisseur_id: int
    year: int
    month: int
    rdv_count: int
    pitchs: int
    due_diligences: int
    closings: int
    revenue: float
    commission_rate: float
    notes: Optional[str]


# =====================================================
# FOURNISSEUR (ENTITÉ PRINCIPALE)
# =====================================================

class FournisseurCreate(BaseSchema):
    """Création d'un fournisseur"""
    name: str = Field(..., min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    main_phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    activity: Optional[str] = Field(None, max_length=255)  # ex: "Asset Management"
    stage: StageFournisseur = StageFournisseur.PROSPECT_FROID
    type_fournisseur: Optional[TypeFournisseur] = None
    notes: Optional[str] = None
    country_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=2,
        pattern=r"^[A-Za-z]{2}$",
        description="Code pays ISO 3166-1 alpha-2",
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=5,
        pattern=r"^[A-Za-z]{2,5}$",
        description="Langue préférée ISO 639-1",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

    @field_validator("country_code")
    @classmethod
    def normalize_country_code(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().upper()

    @field_validator("language")
    @classmethod
    def normalize_language(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        return value.strip().lower()


class FournisseurUpdate(BaseSchema):
    """Mise à jour d'un fournisseur"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    email: Optional[EmailStr] = None
    main_phone: Optional[str] = Field(None, max_length=20)
    website: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    activity: Optional[str] = Field(None, max_length=255)
    stage: Optional[StageFournisseur] = None
    type_fournisseur: Optional[TypeFournisseur] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    country_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=2,
        pattern=r"^[A-Za-z]{2}$",
        description="Code pays ISO 3166-1 alpha-2",
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=5,
        pattern=r"^[A-Za-z]{2,5}$",
        description="Langue préférée ISO 639-1",
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, v):
        return v.strip().lower() if isinstance(v, str) else v

    _normalize_country_code = field_validator("country_code")(
        FournisseurCreate.normalize_country_code.__func__
    )
    _normalize_language = field_validator("language")(
        FournisseurCreate.normalize_language.__func__
    )


class FournisseurResponse(TimestampedSchema):
    """Réponse fournisseur"""
    name: str
    email: Optional[str]
    main_phone: Optional[str]
    website: Optional[str]
    company: Optional[str]
    activity: Optional[str]
    stage: Optional[StageFournisseur] = StageFournisseur.PROSPECT_FROID
    type_fournisseur: Optional[TypeFournisseur]
    notes: Optional[str]
    is_active: bool = True
    country_code: Optional[str] = None
    language: Optional[str] = None

    @field_validator("stage", mode="before")
    @classmethod
    def ensure_stage(cls, value):
        return value or StageFournisseur.PROSPECT_FROID

    @field_validator("is_active", mode="before")
    @classmethod
    def coerce_is_active(cls, value):
        if value is None:
            return True
        return bool(value)


class FournisseurDetailResponse(FournisseurResponse):
    """Réponse détaillée fournisseur avec relations"""
    contacts: List[FournisseurContactResponse] = []  # Legacy
    people: List[PersonOrganizationLinkResponse] = []


# =====================================================
# AGGRÉGATS / FILTRES
# =====================================================

class FournisseurStatsResponse(BaseSchema):
    """Statistiques sur les fournisseurs"""
    total_count: int
    active_count: int
    by_stage: Dict[str, int]
    by_type_fournisseur: Dict[str, int]


class FournisseurFilterParams(BaseSchema):
    """Paramètres de filtrage pour les fournisseurs"""
    stage: Optional[StageFournisseur] = None
    type_fournisseur: Optional[TypeFournisseur] = None
    is_active: Optional[bool] = True
    country_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=2,
        pattern=r"^[A-Za-z]{2}$",
        description="Filtrer par code pays ISO 3166-1 alpha-2",
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=5,
        pattern=r"^[A-Za-z]{2,5}$",
        description="Filtrer par langue ISO 639-1",
    )
    search: Optional[str] = None  # Recherche sur name, email, company, activity
    skip: int = 0
    limit: int = 100

    _normalize_filter_country = field_validator("country_code")(
        FournisseurCreate.normalize_country_code.__func__
    )
    _normalize_filter_language = field_validator("language")(
        FournisseurCreate.normalize_language.__func__
    )
