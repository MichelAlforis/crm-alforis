from sqlalchemy.orm import Session
from sqlalchemy import and_, func, or_
from typing import List, Tuple, Optional
# from models.investor import KPI, Investor
# from schemas.kpi import KPICreate, KPIUpdate
from services.base import BaseService
from core.exceptions import ValidationError, ResourceNotFound
import logging

logger = logging.getLogger(__name__)

class KPIService(BaseService[KPI, KPICreate, KPIUpdate]):
    """Service métier pour les KPIs"""

    def __init__(self, db: Session):
        super().__init__(KPI, db)

    async def search(
        self,
        search_term: str,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "year",
        order: str = "desc",
    ) -> Tuple[List[KPI], int]:
        """Recherche des KPIs en joignant avec les investisseurs"""
        query = self.db.query(KPI).join(Investor, KPI.investor_id == Investor.id)

        if search_term:
            needle = f"%{search_term.lower()}%"
            # Recherche par nom d'investisseur ou par année/mois
            query = query.filter(
                or_(
                    func.lower(Investor.name).like(needle),
                    func.cast(KPI.year, func.TEXT).like(needle),
                )
            )

        total = query.count()

        if hasattr(KPI, order_by):
            order_column = getattr(KPI, order_by)
            if order.lower() == "desc":
                order_column = order_column.desc()
            query = query.order_by(order_column, KPI.month.desc())
        else:
            query = query.order_by(KPI.year.desc(), KPI.month.desc())

        items = query.offset(skip).limit(limit).all()
        return items, total

    async def create_or_update(
        self,
        investor_id: int,
        year: int,
        month: int,
        schema: KPICreate
    ) -> KPI:
        """Créer ou mettre à jour un KPI (upsert)"""
        try:
            # Vérifier que l'investisseur existe
            investor = self.db.query(Investor).filter(Investor.id == investor_id).first()
            if not investor:
                raise ResourceNotFound("Investor", investor_id)

            # Chercher si le KPI existe déjà
            existing_kpi = self.db.query(KPI).filter(
                and_(
                    KPI.investor_id == investor_id,
                    KPI.year == year,
                    KPI.month == month
                )
            ).first()

            if existing_kpi:
                # Mettre à jour
                for key, value in schema.model_dump(exclude_unset=True).items():
                    setattr(existing_kpi, key, value)
                self.db.commit()
                self.db.refresh(existing_kpi)
                logger.info(f"Updated KPI for investor {investor_id}, {year}-{month:02d}")
                return existing_kpi
            else:
                # Créer
                kpi = KPI(**schema.model_dump(), investor_id=investor_id)
                self.db.add(kpi)
                self.db.commit()
                self.db.refresh(kpi)
                logger.info(f"Created KPI for investor {investor_id}, {year}-{month:02d}")
                return kpi
        except ResourceNotFound:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating/updating KPI: {e}")
            raise

    async def get_by_investor_year(
        self,
        investor_id: int,
        year: int
    ) -> List[KPI]:
        """Récupérer tous les KPIs d'un investisseur pour une année"""
        try:
            kpis = self.db.query(KPI).filter(
                and_(
                    KPI.investor_id == investor_id,
                    KPI.year == year
                )
            ).order_by(KPI.month).all()
            return kpis
        except Exception as e:
            logger.error(f"Error fetching KPIs for investor {investor_id}, year {year}: {e}")
            raise

    async def get_by_investor_and_month(
        self,
        investor_id: int,
        year: int,
        month: int
    ) -> KPI:
        """Récupérer le KPI d'un investisseur pour un mois spécifique"""
        try:
            kpi = self.db.query(KPI).filter(
                and_(
                    KPI.investor_id == investor_id,
                    KPI.year == year,
                    KPI.month == month
                )
            ).first()

            if not kpi:
                raise ResourceNotFound("KPI", f"investor_id={investor_id}, year={year}, month={month}")

            return kpi
        except ResourceNotFound:
            raise
        except Exception as e:
            logger.error(f"Error fetching KPI: {e}")
            raise

    async def get_summary_by_month(
        self,
        year: int,
        month: int
    ) -> dict:
        """Obtenir un résumé des KPIs pour tous les investisseurs d'un mois"""
        try:
            kpis = self.db.query(KPI).filter(
                and_(
                    KPI.year == year,
                    KPI.month == month
                )
            ).all()

            total_rdv = sum(kpi.rdv_count for kpi in kpis)
            total_pitchs = sum(kpi.pitchs for kpi in kpis)
            total_due_diligences = sum(kpi.due_diligences for kpi in kpis)
            total_closings = sum(kpi.closings for kpi in kpis)
            total_revenue = sum(kpi.revenue or 0 for kpi in kpis)

            # Calculer la moyenne des taux de commission (en excluant les 0)
            commission_rates = [kpi.commission_rate for kpi in kpis if kpi.commission_rate and kpi.commission_rate > 0]
            avg_commission_rate = sum(commission_rates) / len(commission_rates) if commission_rates else 0

            return {
                "total_rdv": total_rdv,
                "total_pitchs": total_pitchs,
                "total_due_diligences": total_due_diligences,
                "total_closings": total_closings,
                "total_revenue": total_revenue,
                "average_commission_rate": avg_commission_rate,
                "month": f"{year:04d}-{month:02d}",
                "investor_count": len(kpis)
            }
        except Exception as e:
            logger.error(f"Error getting monthly KPI summary: {e}")
            raise

    async def get_annual_summary(
        self,
        investor_id: int,
        year: int
    ) -> dict:
        """Obtenir un résumé annuel des KPIs pour un investisseur"""
        try:
            kpis = await self.get_by_investor_year(investor_id, year)

            total_rdv = sum(kpi.rdv_count for kpi in kpis)
            total_pitchs = sum(kpi.pitchs for kpi in kpis)
            total_due_diligences = sum(kpi.due_diligences for kpi in kpis)
            total_closings = sum(kpi.closings for kpi in kpis)
            total_revenue = sum(kpi.revenue or 0 for kpi in kpis)

            # Calculer la moyenne des taux de commission (en excluant les 0)
            commission_rates = [kpi.commission_rate for kpi in kpis if kpi.commission_rate and kpi.commission_rate > 0]
            avg_commission_rate = sum(commission_rates) / len(commission_rates) if commission_rates else 0

            # Données mensuelles
            monthly_data = [
                {
                    "month": kpi.month,
                    "rdv_count": kpi.rdv_count,
                    "pitchs": kpi.pitchs,
                    "due_diligences": kpi.due_diligences,
                    "closings": kpi.closings,
                    "revenue": kpi.revenue or 0,
                    "commission_rate": kpi.commission_rate or 0
                }
                for kpi in kpis
            ]

            return {
                "investor_id": investor_id,
                "year": year,
                "total_rdv": total_rdv,
                "total_pitchs": total_pitchs,
                "total_due_diligences": total_due_diligences,
                "total_closings": total_closings,
                "total_revenue": total_revenue,
                "average_commission_rate": avg_commission_rate,
                "monthly_data": monthly_data,
                "months_recorded": len(kpis)
            }
        except Exception as e:
            logger.error(f"Error getting annual KPI summary: {e}")
            raise

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        filters: dict = None
    ) -> Tuple[List[KPI], int]:
        """Récupérer tous les KPIs avec filtres optionnels"""
        try:
            query = self.db.query(KPI)

            if filters:
                if filters.get("investor_id"):
                    query = query.filter(KPI.investor_id == filters["investor_id"])
                if filters.get("year"):
                    query = query.filter(KPI.year == filters["year"])
                if filters.get("month"):
                    query = query.filter(KPI.month == filters["month"])

            total = query.count()
            items = query.order_by(KPI.year.desc(), KPI.month.desc()).offset(skip).limit(limit).all()
            return items, total
        except Exception as e:
            logger.error(f"Error fetching all KPIs: {e}")
            raise
