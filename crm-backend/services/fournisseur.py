from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from models.fournisseur import Fournisseur
from models.person import PersonOrganizationLink, OrganizationType
from schemas.fournisseur import FournisseurCreate, FournisseurUpdate
from services.base import BaseService
from core.exceptions import ResourceNotFound
import logging

logger = logging.getLogger(__name__)

class FournisseurService(BaseService[Fournisseur, FournisseurCreate, FournisseurUpdate]):
    def __init__(self, db: Session):
        super().__init__(Fournisseur, db)

    def get_by_email(self, db: Session, email: str) -> Optional[Fournisseur]:
        """Récupère un fournisseur par son email."""
        return db.query(self.model).filter(self.model.email == email).first()

    async def search(
        self,
        search_term: str,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "created_at",
        order: str = "desc",
    ) -> tuple[List[Fournisseur], int]:
        """Recherche des fournisseurs avec pagination et tri."""
        query = self.db.query(self.model)

        if search_term:
            needle = f"%{search_term.lower()}%"
            query = query.filter(
                or_(
                    func.lower(self.model.name).like(needle),
                    func.lower(self.model.email).like(needle),
                    func.lower(self.model.description).like(needle),
                )
            )

        total = query.count()

        if hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            if order.lower() == "desc":
                order_column = order_column.desc()
            query = query.order_by(order_column)

        items = query.offset(skip).limit(limit).all()
        return items, total

    def get_stats(self, db: Session) -> dict:
        """Récupère des statistiques sur les fournisseurs."""
        total = db.query(func.count(self.model.id)).scalar()
        active = db.query(func.count(self.model.id)).filter(self.model.is_active == True).scalar()
        inactive = total - active

        return {
            "total": total,
            "active": active,
            "inactive": inactive
        }

    def move_to_next_stage(self, db: Session, fournisseur_id: int) -> Fournisseur:
        """Fait passer un fournisseur à l'étape suivante."""
        fournisseur = self.get(db, id=fournisseur_id)
        if not fournisseur:
            raise ResourceNotFound("Fournisseur", fournisseur_id)

        # TODO: Implémenter la logique de changement d'étape selon vos besoins
        # Par exemple :
        # if fournisseur.stage == "contact":
        #     fournisseur.stage = "negotiation"
        # elif fournisseur.stage == "negotiation":
        #     fournisseur.stage = "signed"

        db.add(fournisseur)
        db.commit()
        db.refresh(fournisseur)
        return fournisseur

    async def get_fournisseur_with_details(self, fournisseur_id: int) -> dict:
        """Récupérer un fournisseur avec ses relations (contacts, KPIs, personnes)."""
        try:
            fournisseur = await self.get_by_id(fournisseur_id)

            people_links = (
                self.db.query(PersonOrganizationLink)
                .options(joinedload(PersonOrganizationLink.person))
                .filter(
                    PersonOrganizationLink.organization_type == OrganizationType.FOURNISSEUR,
                    PersonOrganizationLink.organization_id == fournisseur_id,
                )
                .all()
            )

            return {
                "fournisseur": fournisseur,
                "contacts": fournisseur.contacts,
                "interactions": fournisseur.interactions,
                "kpis": fournisseur.kpis,
                "people_links": people_links,
            }
        except Exception as exc:
            logger.error(f"Error fetching fournisseur details {fournisseur_id}: {exc}")
            raise
