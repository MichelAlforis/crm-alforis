"""
Service pour les statistiques Dashboard
Remplace progressivement le système KPI legacy
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from models.organisation import Organisation, OrganisationType
from models.task import Task, TaskStatus
from models.organisation_activity import OrganisationActivity
from schemas.dashboard_stats import (
    GlobalDashboardStats,
    OrganisationStatsResponse,
    OrganisationMonthlyKPI,
    MonthlyAggregateStats,
    YearlyAggregateStats,
)

logger = logging.getLogger(__name__)


class DashboardStatsService:
    """Service de calcul des statistiques dashboard"""

    def __init__(self, db: Session):
        self.db = db

    # ============= STATISTIQUES GLOBALES =============

    async def get_global_stats(self) -> GlobalDashboardStats:
        """
        Calcule les statistiques globales pour le dashboard principal
        """
        try:
            # Compter les organisations
            total_orgs = self.db.query(func.count(Organisation.id)).filter(
                Organisation.is_active == True
            ).scalar() or 0

            # Organisations par catégorie
            orgs_by_category_raw = (
                self.db.query(
                    Organisation.category,
                    func.count(Organisation.id)
                )
                .filter(Organisation.is_active == True)
                .group_by(Organisation.category)
                .all()
            )
            orgs_by_category = {
                str(cat): count for cat, count in orgs_by_category_raw if cat
            }

            # Organisations par type (pipeline)
            orgs_by_type_raw = (
                self.db.query(
                    Organisation.type,
                    func.count(Organisation.id)
                )
                .filter(Organisation.is_active == True)
                .group_by(Organisation.type)
                .all()
            )
            orgs_by_pipeline = {
                str(type_): count for type_, count in orgs_by_type_raw if type_
            }

            # Tâches
            total_tasks = self.db.query(func.count(Task.id)).scalar() or 0

            completed_tasks = (
                self.db.query(func.count(Task.id))
                .filter(Task.status == TaskStatus.COMPLETED)
                .scalar() or 0
            )

            today = datetime.now().date()
            overdue_tasks = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.status != TaskStatus.COMPLETED,
                        Task.due_date < today
                    )
                )
                .scalar() or 0
            )

            tasks_due_today = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.status != TaskStatus.COMPLETED,
                        Task.due_date == today
                    )
                )
                .scalar() or 0
            )

            # Activités récentes
            seven_days_ago = datetime.now() - timedelta(days=7)
            thirty_days_ago = datetime.now() - timedelta(days=30)

            activities_7d = (
                self.db.query(func.count(OrganisationActivity.id))
                .filter(OrganisationActivity.occurred_at >= seven_days_ago)
                .scalar() or 0
            )

            activities_30d = (
                self.db.query(func.count(OrganisationActivity.id))
                .filter(OrganisationActivity.occurred_at >= thirty_days_ago)
                .scalar() or 0
            )

            return GlobalDashboardStats(
                total_organisations=total_orgs,
                organisations_by_category=orgs_by_category,
                organisations_by_pipeline=orgs_by_pipeline,
                total_people=0,  # À implémenter si besoin
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                overdue_tasks=overdue_tasks,
                tasks_due_today=tasks_due_today,
                total_mandats=0,  # À implémenter si besoin
                active_mandats=0,
                expiring_soon_mandats=0,
                total_revenue=0.0,  # À implémenter avec KPI
                activities_last_7_days=activities_7d,
                activities_last_30_days=activities_30d,
            )

        except Exception as e:
            logger.error(f"Error calculating global stats: {e}")
            raise

    # ============= STATISTIQUES PAR ORGANISATION =============

    async def get_organisation_stats(
        self, organisation_id: int
    ) -> OrganisationStatsResponse:
        """
        Calcule les statistiques pour une organisation spécifique
        """
        try:
            org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
            if not org:
                raise ValueError(f"Organisation {organisation_id} not found")

            # Compter les tâches
            total_tasks = (
                self.db.query(func.count(Task.id))
                .filter(Task.organisation_id == organisation_id)
                .scalar() or 0
            )

            completed_tasks = (
                self.db.query(func.count(Task.id))
                .filter(
                    and_(
                        Task.organisation_id == organisation_id,
                        Task.status == TaskStatus.COMPLETED
                    )
                )
                .scalar() or 0
            )

            pending_tasks = total_tasks - completed_tasks

            # Dernière activité
            last_activity = (
                self.db.query(OrganisationActivity.occurred_at)
                .filter(OrganisationActivity.organisation_id == organisation_id)
                .order_by(OrganisationActivity.occurred_at.desc())
                .first()
            )

            return OrganisationStatsResponse(
                organisation_id=organisation_id,
                organisation_name=org.name,
                total_interactions=0,  # À calculer depuis activities si besoin
                total_tasks=total_tasks,
                completed_tasks=completed_tasks,
                pending_tasks=pending_tasks,
                total_mandats=0,
                active_mandats=0,
                total_revenue=0.0,
                pipeline_stage=str(org.type) if org.type else None,
                last_activity_date=last_activity[0].isoformat() if last_activity else None,
            )

        except Exception as e:
            logger.error(f"Error calculating org stats for {organisation_id}: {e}")
            raise

    # ============= KPI MENSUELS (COMPATIBILITÉ LEGACY) =============

    async def get_monthly_kpis(
        self,
        organisation_id: int,
        year: Optional[int] = None,
        month: Optional[int] = None
    ) -> List[OrganisationMonthlyKPI]:
        """
        Retourne les KPI mensuels pour une organisation
        Compatible avec l'ancien système KPI (investor_id)

        NOTE: Pour l'instant, retourne des données vides car les KPIs
        ne sont plus stockés dans la base. À terme, ces données pourraient
        venir d'une table dédiée ou être calculées depuis les activités.
        """
        logger.warning(
            f"get_monthly_kpis called for org {organisation_id} - "
            "returning empty data (KPI table not yet migrated)"
        )
        return []

    async def create_or_update_monthly_kpi(
        self,
        organisation_id: int,
        year: int,
        month: int,
        data: Dict[str, Any]
    ) -> OrganisationMonthlyKPI:
        """
        Crée ou met à jour un KPI mensuel pour une organisation

        NOTE: Pour l'instant, cette méthode lève une exception car
        nous n'avons pas encore de table pour stocker ces KPIs.
        """
        raise NotImplementedError(
            "KPI storage not yet implemented in new system. "
            "Consider using dashboard activities or create a dedicated KPI table."
        )

    # ============= AGRÉGATIONS MENSUELLES =============

    async def get_monthly_aggregate(
        self, year: int, month: int
    ) -> MonthlyAggregateStats:
        """
        Agrège les KPIs de toutes les organisations pour un mois donné

        NOTE: Retourne des données vides car le système KPI n'est pas encore migré
        """
        logger.warning(
            f"get_monthly_aggregate called for {year}-{month:02d} - "
            "returning empty data (KPI aggregation not yet implemented)"
        )
        return MonthlyAggregateStats(
            year=year,
            month=month,
            total_rdv=0,
            total_pitchs=0,
            total_due_diligences=0,
            total_closings=0,
            total_revenue=0.0,
            average_commission_rate=0.0,
            organisation_count=0,
        )

    async def get_yearly_aggregate(
        self, organisation_id: int, year: int
    ) -> YearlyAggregateStats:
        """
        Agrège les KPIs d'une organisation pour une année complète

        NOTE: Retourne des données vides car le système KPI n'est pas encore migré
        """
        org = self.db.query(Organisation).filter(Organisation.id == organisation_id).first()
        if not org:
            raise ValueError(f"Organisation {organisation_id} not found")

        logger.warning(
            f"get_yearly_aggregate called for org {organisation_id}, year {year} - "
            "returning empty data (KPI aggregation not yet implemented)"
        )

        return YearlyAggregateStats(
            organisation_id=organisation_id,
            organisation_name=org.name,
            year=year,
            total_rdv=0,
            total_pitchs=0,
            total_due_diligences=0,
            total_closings=0,
            total_revenue=0.0,
            average_commission_rate=0.0,
            monthly_data=[],
            months_recorded=0,
        )
