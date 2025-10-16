from typing import Optional, List
from pydantic import Field, EmailStr, field_validator

from schemas.base import BaseSchema, TimestampedSchema
from models.person import OrganizationType


class PersonBase(BaseSchema):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    personal_email: Optional[EmailStr] = Field(None, max_length=255)
    personal_phone: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=512)
    notes: Optional[str] = None
    country_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=2,
        pattern=r"^[A-Za-z]{2}$",
        description="Code pays ISO 3166-1 alpha-2 (ex: FR, US)",
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=5,
        pattern=r"^[A-Za-z]{2,5}$",
        description="Langue préférée ISO 639-1 (ex: fr, en)",
    )

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


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseSchema):
    first_name: Optional[str] = Field(None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(None, min_length=1, max_length=255)
    personal_email: Optional[EmailStr] = Field(None, max_length=255)
    personal_phone: Optional[str] = Field(None, max_length=20)
    role: Optional[str] = Field(None, max_length=255)
    linkedin_url: Optional[str] = Field(None, max_length=512)
    notes: Optional[str] = None
    country_code: Optional[str] = Field(
        None,
        min_length=2,
        max_length=2,
        pattern=r"^[A-Za-z]{2}$",
        description="Code pays ISO 3166-1 alpha-2 (ex: FR, US)",
    )
    language: Optional[str] = Field(
        None,
        min_length=2,
        max_length=5,
        pattern=r"^[A-Za-z]{2,5}$",
        description="Langue préférée ISO 639-1 (ex: fr, en)",
    )

    _normalize_country_code = field_validator("country_code")(
        PersonBase.normalize_country_code.__func__
    )
    _normalize_language = field_validator("language")(
        PersonBase.normalize_language.__func__
    )


class PersonResponse(TimestampedSchema, PersonBase):
    pass


class PersonOrganizationLinkBase(BaseSchema):
    organization_type: OrganizationType
    organization_id: int = Field(..., ge=1)
    job_title: Optional[str] = Field(None, max_length=255)
    work_email: Optional[EmailStr] = Field(None, max_length=255)
    work_phone: Optional[str] = Field(None, max_length=20)
    is_primary: bool = False
    notes: Optional[str] = None


class PersonOrganizationLinkCreate(PersonOrganizationLinkBase):
    person_id: int = Field(..., ge=1)


class PersonOrganizationLinkUpdate(BaseSchema):
    job_title: Optional[str] = Field(None, max_length=255)
    work_email: Optional[EmailStr] = Field(None, max_length=255)
    work_phone: Optional[str] = Field(None, max_length=20)
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class PersonOrganizationLinkResponse(TimestampedSchema, PersonOrganizationLinkBase):
    id: Optional[int] = None
    person_id: int
    organization_name: Optional[str] = None
    person: Optional[PersonResponse] = None


class PersonDetailResponse(PersonResponse):
    organizations: List[PersonOrganizationLinkResponse] = []
