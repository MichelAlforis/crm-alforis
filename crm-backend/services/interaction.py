import logging
from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from core.exceptions import ResourceNotFound, ValidationError
from services.base import BaseService

logger = logging.getLogger(__name__)


# Import différé pour éviter la dépendance circulaire
def get_automation_service(db):
    from services.task_automation import TaskAutomationService

    return TaskAutomationService(db)


class InteractionService(BaseService[Interaction, InteractionCreate, InteractionUpdate]):
    """Service métier pour les interactions"""

    def __init__(self, db: Session):
        super().__init__(Interaction, db)

    async def create_for_investor(self, investor_id: int, schema: InteractionCreate) -> Interaction:
        """Créer une interaction pour un investisseur + auto-créer une tâche de suivi"""
        try:
            # Vérifier que l'investisseur existe
            investor = self.db.query(Investor).filter(Investor.id == investor_id).first()
            if not investor:
                raise ResourceNotFound("Investor", investor_id)

            interaction = Interaction(**schema.model_dump(), investor_id=investor_id)
            self.db.add(interaction)
            self.db.commit()
            self.db.refresh(interaction)
            logger.info(f"Created interaction for investor {investor_id}")

            # Auto-créer une tâche de suivi
            try:
                automation = get_automation_service(self.db)
                await automation.on_interaction_created(
                    investor_id=investor_id,
                    interaction_type=schema.type.value if schema.type else "autre",
                    notes=schema.notes,
                )
                logger.info(f"Auto-created task for interaction with investor {investor_id}")
            except Exception as e:
                logger.warning(f"Failed to auto-create task for interaction: {e}")
                # Ne pas faire échouer la création de l'interaction

            return interaction
        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating interaction: {e}")
            raise

    async def search(
        self,
        search_term: str,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "date",
        order: str = "desc",
    ) -> Tuple[List[Interaction], int]:
        """Recherche des interactions avec pagination et tri"""
        query = self.db.query(Interaction)

        if search_term:
            needle = f"%{search_term.lower()}%"
            query = query.filter(
                or_(
                    func.lower(Interaction.contact_name).like(needle),
                    func.lower(Interaction.subject).like(needle),
                    func.lower(Interaction.notes).like(needle),
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

    async def get_by_investor(
        self, investor_id: int, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Interaction], int]:
        """Récupérer toutes les interactions d'un investisseur"""
        try:
            query = self.db.query(Interaction).filter(Interaction.investor_id == investor_id)
            total = query.count()
            items = query.order_by(Interaction.date.desc()).offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions for investor {investor_id}: {e}")
            raise

    async def get_by_type(
        self, interaction_type: InteractionType, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Interaction], int]:
        """Récupérer les interactions par type"""
        try:
            query = self.db.query(Interaction).filter(Interaction.type == interaction_type)
            total = query.count()
            items = query.order_by(Interaction.date.desc()).offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions by type: {e}")
            raise

    async def get_by_date_range(
        self, date_from: str, date_to: str, skip: int = 0, limit: int = 100
    ) -> Tuple[List[Interaction], int]:
        """Récupérer les interactions dans une période"""
        try:
            query = self.db.query(Interaction).filter(
                and_(Interaction.date >= date_from, Interaction.date <= date_to)
            )
            total = query.count()
            items = query.order_by(Interaction.date.desc()).offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching interactions by date range: {e}")
            raise

    async def advanced_filter(
        self, filter_params: InteractionFilterParams
    ) -> Tuple[List[Interaction], int]:
        """Filtrage avancé"""
        try:
            query = self.db.query(Interaction)

            if filter_params.investor_id:
                query = query.filter(Interaction.investor_id == filter_params.investor_id)

            if filter_params.type:
                query = query.filter(Interaction.type == filter_params.type)

            if filter_params.date_from:
                query = query.filter(Interaction.date >= filter_params.date_from)

            if filter_params.date_to:
                query = query.filter(Interaction.date <= filter_params.date_to)

            total = query.count()
            items = (
                query.order_by(Interaction.date.desc())
                .offset(filter_params.skip)
                .limit(filter_params.limit)
                .all()
            )
            return items, total
        except Exception as e:
            logger.error(f"Error in interaction advanced filter: {e}")
            raise

    async def get_summary_by_investor(self, investor_id: int) -> dict:
        """Obtenir un résumé des interactions pour un investisseur"""
        try:
            interactions = (
                self.db.query(Interaction).filter(Interaction.investor_id == investor_id).all()
            )

            by_type = {}
            total_duration = 0

            for interaction in interactions:
                # Compter par type
                type_key = interaction.type.value
                by_type[type_key] = by_type.get(type_key, 0) + 1

                # Accumuler la durée
                if interaction.duration_minutes:
                    total_duration += interaction.duration_minutes

            return {
                "total_interactions": len(interactions),
                "by_type": by_type,
                "total_duration_minutes": total_duration,
                "last_interaction": interactions[-1].date if interactions else None,
            }
        except Exception as e:
            logger.error(f"Error getting interaction summary: {e}")
            raise

    async def get_summary_by_month(self, year: int, month: int) -> dict:
        """Obtenir un résumé des interactions pour un mois"""
        try:
            date_from = f"{year:04d}-{month:02d}-01"

            # Déterminer le dernier jour du mois
            if month == 12:
                date_to = f"{year+1:04d}-01-01"
            else:
                date_to = f"{year:04d}-{month+1:02d}-01"

            query = self.db.query(Interaction).filter(
                and_(Interaction.date >= date_from, Interaction.date < date_to)
            )

            interactions = query.all()

            by_type = {}
            total_duration = 0

            for interaction in interactions:
                type_key = interaction.type.value
                by_type[type_key] = by_type.get(type_key, 0) + 1

                if interaction.duration_minutes:
                    total_duration += interaction.duration_minutes

            return {
                "total_interactions": len(interactions),
                "by_type": by_type,
                "total_duration_minutes": total_duration,
                "period": f"{year:04d}-{month:02d}",
            }
        except Exception as e:
            logger.error(f"Error getting monthly interaction summary: {e}")
            raise
