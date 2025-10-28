import enum
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.organisation import OrganisationType

if TYPE_CHECKING:
    from models.organisation import Organisation


class PersonRole(str, enum.Enum):
    """Rôles possibles d'une personne vis-à-vis d'une organisation."""

    CONTACT_PRINCIPAL = "contact_principal"
    CONTACT_SECONDAIRE = "contact_secondaire"
    DECIDEUR = "decideur"
    TECHNIQUE = "technique"
    ADMINISTRATIF = "administratif"
    AUTRE = "autre"


class Person(BaseModel):
    """
    Entité centrale pour les personnes physiques.

    Les informations professionnelles spécifiques à une organisation
    sont stockées dans PersonOrganizationLink (relation N-N).
    """

    __tablename__ = "people"

    first_name = Column("prenom", String(100), nullable=True, index=True)
    last_name = Column("nom", String(100), nullable=True, index=True)
    email = Column(String(255), index=True, nullable=True)
    personal_email = Column(String(255), index=True, nullable=True)
    phone = Column("telephone", String(50), nullable=True)
    personal_phone = Column(String(50), nullable=True)
    mobile = Column(String(50), nullable=True)
    job_title = Column("fonction", String(200), nullable=True)
    role = Column(String(150), nullable=True)
    country_code = Column(String(2), nullable=True, index=True)
    language = Column(String(5), nullable=True, index=True)
    notes = Column(Text, nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True, index=True)
    email_unsubscribed = Column(Boolean, default=False, nullable=False)

    # RGPD Compliance Fields
    is_anonymized = Column(Boolean, default=False, nullable=False, index=True)
    gdpr_consent = Column(Boolean, nullable=True, index=True)
    gdpr_consent_date = Column(DateTime(timezone=True), nullable=True)
    anonymized_at = Column(DateTime(timezone=True), nullable=True)
    last_activity_date = Column(DateTime(timezone=True), nullable=True, index=True)

    organizations = relationship(
        "PersonOrganizationLink",
        back_populates="person",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Person(id={self.id}, name='{self.full_name}')>"

    @property
    def full_name(self) -> str:
        """Retourne le nom complet (robuste même si une partie manque)."""
        parts = [p for p in [self.first_name, self.last_name] if p]
        if parts:
            return " ".join(parts)
        return self.personal_email or self.email or "Contact"


class PersonOrganizationLink(BaseModel):
    """
    Lien N-N entre une personne et une organisation.

    Permet de définir le rôle, le caractère principal et des notes contextuelles.
    """

    __tablename__ = "person_organization_links"
    __table_args__ = (
        UniqueConstraint(
            "person_id",
            "organisation_id",
            name="uq_person_organisation_unique",
        ),
    )

    person_id = Column(
        Integer,
        ForeignKey("people.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organisation_id = Column(
        Integer,
        ForeignKey("organisations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role = Column(
        Enum(PersonRole, name="personrole"),
        nullable=False,
        default=PersonRole.CONTACT_SECONDAIRE,
        index=True,
    )
    organization_type = Column(
        Enum(OrganisationType, name="organisationtype"),
        nullable=False,
        default=OrganisationType.AUTRE,
        index=True,
    )
    is_primary = Column(Boolean, default=False, index=True)
    job_title = Column(String(200), nullable=True)
    work_email = Column(String(255), nullable=True)
    work_phone = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)

    person = relationship("Person", back_populates="organizations", lazy="joined")
    organisation = relationship("Organisation", back_populates="people_links", lazy="joined")

    def __repr__(self) -> str:
        return (
            f"<PersonOrganizationLink(person_id={self.person_id}, "
            f"organisation_id={self.organisation_id}, role={self.role})>"
        )

    @hybrid_property
    def organization_id(self) -> int:
        return self.organisation_id

    @organization_id.setter
    def organization_id(self, value: int) -> None:
        self.organisation_id = value


# Backwards compatibility alias (legacy spelling)
OrganizationType = OrganisationType
