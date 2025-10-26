import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from core.exceptions import ConflictError, ResourceNotFound
from models.organisation import Organisation, OrganisationType
from models.person import Person, PersonOrganizationLink
from schemas.person import (
    PersonCreate,
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkResponse,
    PersonOrganizationLinkUpdate,
    PersonResponse,
    PersonUpdate,
)
from services.base import BaseService

logger = logging.getLogger(__name__)


class PersonService(BaseService[Person, PersonCreate, PersonUpdate]):
    """CRUD principal pour les personnes physiques."""

    def __init__(self, db: Session):
        super().__init__(Person, db)

    async def search(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Person], int]:
        """Recherche simple sur nom/prénom/email."""
        pattern = f"%{search_term}%"
        query = self.db.query(Person).filter(
            or_(
                Person.first_name.ilike(pattern),
                Person.last_name.ilike(pattern),
                Person.email.ilike(pattern),
                Person.personal_email.ilike(pattern),
                Person.personal_phone.ilike(pattern),
            )
        )
        total = query.count()
        items = query.offset(skip).limit(limit).all()
        return items, total

    async def get_with_links(self, person_id: int) -> Tuple[Person, List[PersonOrganizationLink]]:
        """Retourner une personne et ses liens organisations."""
        person = await self.get_by_id(person_id)
        links = (
            self.db.query(PersonOrganizationLink)
            .options(joinedload(PersonOrganizationLink.organisation))
            .filter(PersonOrganizationLink.person_id == person_id)
            .all()
        )
        return person, links

    async def get_person_with_links(self, person_id: int) -> Dict[str, Any]:
        person, links = await self.get_with_links(person_id)
        return {"person": person, "links": links}


class PersonOrganizationLinkService:
    """Service pour gérer les relations personne ↔ organisation."""

    def __init__(self, db: Session):
        self.db = db

    async def get_link(self, link_id: int) -> PersonOrganizationLink:
        link = (
            self.db.query(PersonOrganizationLink)
            .options(
                joinedload(PersonOrganizationLink.person),
                joinedload(PersonOrganizationLink.organisation),
            )
            .filter(PersonOrganizationLink.id == link_id)
            .first()
        )
        if not link:
            raise ResourceNotFound("PersonOrganizationLink", link_id)
        return link

    def _ensure_person(self, person_id: int) -> Person:
        person = self.db.query(Person).filter(Person.id == person_id).first()
        if not person:
            raise ResourceNotFound("Person", person_id)
        return person

    def _ensure_organisation(self, organisation_id: int) -> Organisation:
        organisation = (
            self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
        )
        if not organisation:
            raise ResourceNotFound("Organisation", organisation_id)
        return organisation

    async def create_link(self, schema: PersonOrganizationLinkCreate) -> PersonOrganizationLink:
        person = self._ensure_person(schema.person_id)
        organisation = self._ensure_organisation(schema.organisation_id)

        existing = (
            self.db.query(PersonOrganizationLink)
            .filter(
                PersonOrganizationLink.person_id == schema.person_id,
                PersonOrganizationLink.organisation_id == schema.organisation_id,
            )
            .first()
        )
        if existing:
            raise ConflictError("Cette personne est déjà associée à cette organisation.")

        link = PersonOrganizationLink(
            person_id=person.id,
            organisation_id=organisation.id,
            organization_type=schema.organization_type,
            role=schema.role,
            is_primary=schema.is_primary,
            job_title=schema.job_title,
            work_email=schema.work_email,
            work_phone=schema.work_phone,
            notes=schema.notes,
        )
        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    async def update_link(self, link_id: int, schema: PersonOrganizationLinkUpdate) -> PersonOrganizationLink:
        link = (
            self.db.query(PersonOrganizationLink)
            .options(joinedload(PersonOrganizationLink.organisation))
            .filter(PersonOrganizationLink.id == link_id)
            .first()
        )
        if not link:
            raise ResourceNotFound("PersonOrganizationLink", link_id)

        for field, value in schema.model_dump(exclude_unset=True).items():
            setattr(link, field, value)

        self.db.add(link)
        self.db.commit()
        self.db.refresh(link)
        return link

    async def delete_link(self, link_id: int) -> None:
        link = self.db.query(PersonOrganizationLink).filter(PersonOrganizationLink.id == link_id).first()
        if not link:
            raise ResourceNotFound("PersonOrganizationLink", link_id)
        self.db.delete(link)
        self.db.commit()

    async def list_for_organisation(
        self,
        organisation_id: int,
        organization_type: Optional[OrganisationType] = None,
    ) -> List[PersonOrganizationLink]:
        self._ensure_organisation(organisation_id)
        query = (
            self.db.query(PersonOrganizationLink)
            .options(joinedload(PersonOrganizationLink.person))
            .filter(PersonOrganizationLink.organisation_id == organisation_id)
        )
        if organization_type:
            query = query.filter(PersonOrganizationLink.organization_type == organization_type)
        return query.all()

    async def list_for_person(self, person_id: int) -> List[PersonOrganizationLink]:
        self._ensure_person(person_id)
        return (
            self.db.query(PersonOrganizationLink)
            .options(
                joinedload(PersonOrganizationLink.organisation),
                joinedload(PersonOrganizationLink.person),
            )
            .filter(PersonOrganizationLink.person_id == person_id)
            .all()
        )

    def serialize_links(self, links: List[PersonOrganizationLink]) -> List[Dict[str, Any]]:
        serialized: List[Dict[str, Any]] = []
        for link in links:
            schema = PersonOrganizationLinkResponse.model_validate(link)
            payload = schema.model_dump(by_alias=True)
            if link.organisation:
                payload["organisation_name"] = getattr(link.organisation, "name", None)
            if getattr(link, "person", None):
                payload["person"] = PersonResponse.model_validate(link.person).model_dump(by_alias=True)
            serialized.append(payload)
        return serialized
