from typing import List, Optional
import re

from pydantic import AliasChoices, ConfigDict, EmailStr, Field, field_validator

from models.person import OrganizationType, PersonRole
from schemas.base import BaseSchema, TimestampedSchema


class PersonBase(BaseSchema):
    """Schema partagé pour une personne."""

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=255)
    personal_email: Optional[EmailStr] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    personal_phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    job_title: Optional[str] = Field(None, max_length=200)
    role: Optional[str] = Field(None, max_length=150)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    language: Optional[str] = Field(None, max_length=5)
    notes: Optional[str] = None
    linkedin_url: Optional[str] = Field(None, max_length=500)
    is_active: bool = Field(default=True)

    @field_validator("phone", "personal_phone", "mobile")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Valide le format des numéros de téléphone."""
        if v:
            # Pattern flexible pour numéros internationaux (7-18 chiffres avec formatage)
            pattern = r'^[\+]?[0-9][\s\-\.\(\)0-9]{7,18}$'
            if not re.match(pattern, v):
                raise ValueError("Format de téléphone invalide")
        return v


class PersonCreate(PersonBase):
    """Payload création d'une personne."""

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)


class PersonUpdate(BaseSchema):
    """Payload patch d'une personne."""

    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = Field(None, max_length=255)
    personal_email: Optional[EmailStr] = Field(None, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    personal_phone: Optional[str] = Field(None, max_length=50)
    mobile: Optional[str] = Field(None, max_length=50)
    job_title: Optional[str] = Field(None, max_length=200)
    role: Optional[str] = Field(None, max_length=150)
    country_code: Optional[str] = Field(None, min_length=2, max_length=2)
    language: Optional[str] = Field(None, max_length=5)
    notes: Optional[str] = None
    linkedin_url: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class PersonResponse(PersonBase, TimestampedSchema):
    """Personne avec timestamps."""

    id: int

    class Config:
        from_attributes = True


class PersonOrganizationLinkBase(BaseSchema):
    """Données communes pour un lien Personne <-> Organisation."""

    organisation_id: int = Field(..., ge=1, alias="organization_id")
    organization_type: OrganizationType = Field(
        default=OrganizationType.CLIENT, alias="organization_type"
    )
    role: PersonRole = Field(default=PersonRole.CONTACT_SECONDAIRE)
    is_primary: bool = Field(default=False)
    job_title: Optional[str] = Field(None, max_length=200)
    work_email: Optional[EmailStr] = Field(None, max_length=255)
    work_phone: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("work_phone")
    @classmethod
    def validate_work_phone(cls, v: Optional[str]) -> Optional[str]:
        """Valide le format du numéro de téléphone professionnel."""
        if v:
            pattern = r'^[\+]?[0-9][\s\-\.\(\)0-9]{7,18}$'
            if not re.match(pattern, v):
                raise ValueError("Format de téléphone invalide")
        return v


class PersonOrganizationLinkCreate(PersonOrganizationLinkBase):
    """Création d'un lien."""

    person_id: int = Field(..., ge=1)


class PersonOrganizationLinkUpdate(BaseSchema):
    """Mise à jour d'un lien."""

    role: Optional[PersonRole] = None
    is_primary: Optional[bool] = None
    job_title: Optional[str] = Field(None, max_length=200)
    work_email: Optional[EmailStr] = Field(None, max_length=255)
    work_phone: Optional[str] = Field(None, max_length=50)
    organization_type: Optional[OrganizationType] = Field(None, alias="organization_type")
    notes: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class PersonOrganizationLinkResponse(TimestampedSchema, PersonOrganizationLinkBase):
    """Réponse API pour un lien."""

    id: int
    person_id: int
    organisation_name: Optional[str] = None
    person: Optional[PersonResponse] = None

    class Config:
        from_attributes = True


class PersonDetailResponse(PersonResponse):
    """Personne enrichie avec ses organisations."""

    organisations: List[PersonOrganizationLinkResponse] = Field(
        default_factory=list,
        serialization_alias="organizations",
        validation_alias=AliasChoices("organizations", "organisation_links"),
    )
