"""Service pour gérer les listes de diffusion."""
from datetime import UTC, datetime
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.mailing_list import MailingList
from schemas.mailing_list import MailingListCreate, MailingListUpdate


class MailingListService:
    """Service pour les opérations CRUD sur les listes de diffusion."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, data: MailingListCreate, user_id: Optional[int] = None) -> MailingList:
        """Créer une nouvelle liste de diffusion."""
        mailing_list = MailingList(
            name=data.name,
            description=data.description,
            target_type=data.target_type,
            filters=data.filters,
            recipient_count=data.recipient_count,
            created_by=user_id,
        )
        self.db.add(mailing_list)
        self.db.commit()
        self.db.refresh(mailing_list)
        return mailing_list

    def get_by_id(self, list_id: int) -> Optional[MailingList]:
        """Récupérer une liste par ID."""
        return self.db.query(MailingList).filter(MailingList.id == list_id).first()

    def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        only_active: bool = True,
        user_id: Optional[int] = None,
    ) -> tuple[List[MailingList], int]:
        """Récupérer toutes les listes (paginées)."""
        query = self.db.query(MailingList)

        if only_active:
            query = query.filter(MailingList.is_active == True)

        if user_id:
            query = query.filter(MailingList.created_by == user_id)

        total = query.count()
        items = query.order_by(MailingList.created_at.desc()).offset(skip).limit(limit).all()

        return items, total

    def update(self, list_id: int, data: MailingListUpdate) -> Optional[MailingList]:
        """Mettre à jour une liste."""
        mailing_list = self.get_by_id(list_id)
        if not mailing_list:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(mailing_list, key, value)

        mailing_list.updated_at = datetime.now(UTC)
        self.db.commit()
        self.db.refresh(mailing_list)
        return mailing_list

    def delete(self, list_id: int) -> bool:
        """Supprimer une liste (soft delete)."""
        mailing_list = self.get_by_id(list_id)
        if not mailing_list:
            return False

        mailing_list.is_active = False
        mailing_list.updated_at = datetime.now(UTC)
        self.db.commit()
        return True

    def hard_delete(self, list_id: int) -> bool:
        """Supprimer définitivement une liste."""
        mailing_list = self.get_by_id(list_id)
        if not mailing_list:
            return False

        self.db.delete(mailing_list)
        self.db.commit()
        return True

    def mark_as_used(self, list_id: int) -> Optional[MailingList]:
        """Marquer une liste comme utilisée."""
        mailing_list = self.get_by_id(list_id)
        if not mailing_list:
            return None

        mailing_list.mark_used()
        self.db.commit()
        self.db.refresh(mailing_list)
        return mailing_list

    def get_stats(self) -> dict:
        """Obtenir des statistiques sur les listes."""
        total = self.db.query(func.count(MailingList.id)).scalar()
        active = (
            self.db.query(func.count(MailingList.id))
            .filter(MailingList.is_active == True)
            .scalar()
        )
        total_recipients = self.db.query(func.sum(MailingList.recipient_count)).scalar() or 0

        return {
            "total_lists": total,
            "active_lists": active,
            "total_recipients": total_recipients,
        }
