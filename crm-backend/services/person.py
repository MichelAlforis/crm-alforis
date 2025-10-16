from typing import List, Tuple
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
import logging

from services.base import BaseService
from models.person import Person, PersonOrganizationLink, OrganizationType
from models.investor import Investor
from models.fournisseur import Fournisseur
from schemas.person import (
    PersonCreate,
    PersonUpdate,
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkUpdate,
    PersonOrganizationLinkResponse,
)
from core.exceptions import ResourceNotFound, ConflictError, ValidationError

logger = logging.getLogger(__name__)


class PersonService(BaseService[Person, PersonCreate, PersonUpdate]):
    """CRUD principal pour les personnes physiques."""

    def __init__(self, db: Session):
        super().__init__(Person, db)

    async def get_person_with_links(self, person_id: int) -> dict:
        """Récupérer une personne et ses rattachements organisations."""
        try:
            person = await self.get_by_id(person_id)
            links = (
                self.db.query(PersonOrganizationLink)
                .options(joinedload(PersonOrganizationLink.person))
                .filter(PersonOrganizationLink.person_id == person_id)
                .all()
            )
            return {"person": person, "links": links}
        except Exception as exc:
            logger.error(f"Error fetching person {person_id}: {exc}")
            raise

    async def search(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 100,
    ) -> Tuple[List[Person], int]:
        """Recherche simple sur nom/prénom/email personnel."""
        try:
            pattern = f"%{search_term}%"
            query = self.db.query(Person).filter(
                or_(
                    Person.first_name.ilike(pattern),
                    Person.last_name.ilike(pattern),
                    Person.personal_email.ilike(pattern),
                )
            )
            total = query.count()
            items = query.offset(skip).limit(limit).all()
            return items, total
        except Exception as exc:
            logger.error(f"Error searching people: {exc}")
            raise


class PersonOrganizationLinkService:
    """Service pour gérer les relations personne ↔ organisation."""

    def __init__(self, db: Session):
        self.db = db

    def _ensure_entity_exists(self, organization_type: OrganizationType, organization_id: int) -> None:
        if organization_type == OrganizationType.INVESTOR:
            exists = self.db.query(Investor.id).filter(Investor.id == organization_id).first()
            model_name = "Investor"
        elif organization_type == OrganizationType.FOURNISSEUR:
            exists = self.db.query(Fournisseur.id).filter(Fournisseur.id == organization_id).first()
            model_name = "Fournisseur"
        else:
            raise ValidationError("Invalid organization type")

        if not exists:
            raise ResourceNotFound(model_name, organization_id)

    async def create_link(self, link_schema: PersonOrganizationLinkCreate) -> PersonOrganizationLink:
        """Créer un rattachement entre une personne et une organisation."""
        try:
            person = self.db.query(Person).filter(Person.id == link_schema.person_id).first()
            if not person:
                raise ResourceNotFound("Person", link_schema.person_id)

            self._ensure_entity_exists(link_schema.organization_type, link_schema.organization_id)

            existing = (
                self.db.query(PersonOrganizationLink)
                .filter(
                    PersonOrganizationLink.person_id == link_schema.person_id,
                    PersonOrganizationLink.organization_type == link_schema.organization_type,
                    PersonOrganizationLink.organization_id == link_schema.organization_id,
                )
                .first()
            )
            if existing:
                raise ConflictError("Cette personne est déjà rattachée à cette organisation.")

            link = PersonOrganizationLink(
                person_id=link_schema.person_id,
                organization_type=link_schema.organization_type,
                organization_id=link_schema.organization_id,
                job_title=link_schema.job_title,
                work_email=link_schema.work_email,
                work_phone=link_schema.work_phone,
                is_primary=link_schema.is_primary,
                notes=link_schema.notes,
            )
            self.db.add(link)
            self.db.commit()
            self.db.refresh(link)
            return link
        except Exception as exc:
            self.db.rollback()
            logger.error(f"Error creating person/org link: {exc}")
            raise

    async def update_link(self, link_id: int, update_schema: PersonOrganizationLinkUpdate) -> PersonOrganizationLink:
        """Mettre à jour un rattachement existant."""
        try:
            link = self.db.query(PersonOrganizationLink).filter(PersonOrganizationLink.id == link_id).first()
            if not link:
                raise ResourceNotFound("PersonOrganizationLink", link_id)

            for field, value in update_schema.model_dump(exclude_unset=True).items():
                setattr(link, field, value)

            self.db.add(link)
            self.db.commit()
            self.db.refresh(link)
            return link
        except Exception as exc:
            self.db.rollback()
            logger.error(f"Error updating person/org link {link_id}: {exc}")
            raise

    async def delete_link(self, link_id: int) -> None:
        """Supprimer un rattachement."""
        try:
            link = self.db.query(PersonOrganizationLink).filter(PersonOrganizationLink.id == link_id).first()
            if not link:
                raise ResourceNotFound("PersonOrganizationLink", link_id)

            self.db.delete(link)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            logger.error(f"Error deleting person/org link {link_id}: {exc}")
            raise

    async def list_links_for_organization(
        self,
        organization_type: OrganizationType,
        organization_id: int,
    ) -> List[PersonOrganizationLink]:
        """Lister les liens pour une organisation donnée."""
        return (
            self.db.query(PersonOrganizationLink)
            .options(joinedload(PersonOrganizationLink.person))
            .filter(
                PersonOrganizationLink.organization_type == organization_type,
                PersonOrganizationLink.organization_id == organization_id,
            )
            .all()
        )

    def serialize_links(
        self,
        links: List[PersonOrganizationLink],
    ) -> List[PersonOrganizationLinkResponse]:
        """Convertir les liens en réponses enrichies avec le nom de l'organisation."""
        if not links:
            return []

        investor_ids = {
            link.organization_id
            for link in links
            if link.organization_type == OrganizationType.INVESTOR
        }
        fournisseur_ids = {
            link.organization_id
            for link in links
            if link.organization_type == OrganizationType.FOURNISSEUR
        }

        investor_map = {}
        if investor_ids:
            investor_map = dict(
                self.db.query(Investor.id, Investor.name)
                .filter(Investor.id.in_(investor_ids))
                .all()
            )

        fournisseur_map = {}
        if fournisseur_ids:
            fournisseur_map = dict(
                self.db.query(Fournisseur.id, Fournisseur.name)
                .filter(Fournisseur.id.in_(fournisseur_ids))
                .all()
            )

        responses: List[PersonOrganizationLinkResponse] = []
        for link in links:
            if link.organization_type == OrganizationType.INVESTOR:
                org_name = investor_map.get(link.organization_id)
            else:
                org_name = fournisseur_map.get(link.organization_id)

            payload = {
                "id": link.id,
                "created_at": link.created_at,
                "updated_at": link.updated_at,
                "person_id": link.person_id,
                "organization_type": link.organization_type,
                "organization_id": link.organization_id,
                "job_title": link.job_title,
                "work_email": link.work_email,
                "work_phone": link.work_phone,
                "is_primary": link.is_primary,
                "notes": link.notes,
                "organization_name": org_name,
                "person": link.person,
            }
            responses.append(PersonOrganizationLinkResponse.model_validate(payload))

        return responses
