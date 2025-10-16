from typing import Optional, List
from pydantic import Field, EmailStr

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
