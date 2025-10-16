import enum
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Enum,
    ForeignKey,
    UniqueConstraint,
    Text,
)
from sqlalchemy.orm import relationship
from models.base import BaseModel


class OrganizationType(str, enum.Enum):
    INVESTOR = "investor"
    FOURNISSEUR = "fournisseur"


class Person(BaseModel):
    """
    Entité centrale pour les personnes physiques.
    Les informations professionnelles spécifiques à une organisation
    sont stockées dans PersonOrganizationLink.
    """

    __tablename__ = "people"

    first_name = Column(String(255), nullable=False, index=True)
    last_name = Column(String(255), nullable=False, index=True)
    personal_email = Column(String(255), unique=True, index=True, nullable=True)
    personal_phone = Column(String(20), nullable=True)
    role = Column(String(255), nullable=True)
    linkedin_url = Column(String(512), nullable=True)
    notes = Column(Text, nullable=True)

    organizations = relationship(
        "PersonOrganizationLink",
        back_populates="person",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Person(id={self.id}, name='{self.first_name} {self.last_name}')>"


class PersonOrganizationLink(BaseModel):
    """
    Association entre une personne et une organisation (investisseur ou fournisseur).
    Peut contenir des informations professionnelles spécifiques (email pro, téléphone pro, rôle).
    """

    __tablename__ = "person_org_links"
    __table_args__ = (
        UniqueConstraint(
            "person_id",
            "organization_type",
            "organization_id",
            name="uq_person_org_unique",
        ),
    )

    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=False, index=True)
    organization_type = Column(Enum(OrganizationType), nullable=False, index=True)
    organization_id = Column(Integer, nullable=False, index=True)

    job_title = Column(String(255), nullable=True)
    work_email = Column(String(255), nullable=True)
    work_phone = Column(String(20), nullable=True)
    is_primary = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    person = relationship("Person", back_populates="organizations")

    def __repr__(self) -> str:
        return (
            f"<PersonOrganizationLink(person_id={self.person_id}, "
            f"type={self.organization_type}, org_id={self.organization_id})>"
        )
