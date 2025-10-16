from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from models.fournisseur import Fournisseur
from schemas.fournisseur import FournisseurCreate, FournisseurUpdate
from services.base import BaseService
from core.exceptions import ResourceNotFound

class FournisseurService(BaseService[Fournisseur, FournisseurCreate, FournisseurUpdate]):
    def __init__(self, db: Session):
        super().__init__(Fournisseur, db)

    def get_by_email(self, db: Session, email: str) -> Optional[Fournisseur]:
        """Récupère un fournisseur par son email."""
        return db.query(self.model).filter(self.model.email == email).first()

    def search(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        search: str = "",
        order_by: str = "created_at",
        order: str = "desc"
    ) -> tuple[List[Fournisseur], int]:
        """Recherche des fournisseurs avec pagination et filtres."""
        query = db.query(self.model)

        # Recherche textuelle
        if search:
            search_filter = (
                (func.lower(self.model.name).contains(search.lower())) |
                (func.lower(self.model.email).contains(search.lower())) |
                (func.lower(self.model.description).contains(search.lower()))
            )
            query = query.filter(search_filter)

        # Count total avant pagination
        total = query.count()

        # Tri
        if hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            if order.lower() == "desc":
                order_column = order_column.desc()
            query = query.order_by(order_column)

        # Pagination
        query = query.offset(skip).limit(limit)

        return query.all(), total

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