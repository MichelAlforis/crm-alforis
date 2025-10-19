"""
Schémas pour les statistiques Dashboard
Remplace progressivement les endpoints KPI legacy
"""

from pydantic import Field
from typing import List, Optional
from schemas.base import BaseSchema


# ============= STATISTIQUES PAR ORGANISATION =============

class OrganisationStatsResponse(BaseSchema):
    """Statistiques pour une organisation spécifique"""
    organisation_id: int
    organisation_name: str

    # Compteurs d'activité
    total_interactions: int = 0
    total_tasks: int = 0
    completed_tasks: int = 0
    pending_tasks: int = 0

    # Métriques commerciales (si applicable)
    total_mandats: int = 0
    active_mandats: int = 0
    total_revenue: float = 0.0

    # Pipeline
    pipeline_stage: Optional[str] = None

    # Dernière activité
    last_activity_date: Optional[str] = None


class OrganisationMonthlyKPI(BaseSchema):
    """KPI mensuels pour une organisation (compatible avec l'ancien système KPI)"""
    id: Optional[int] = None
    organisation_id: int
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(..., ge=1, le=12)

    # Métriques opérationnelles
    rdv_count: int = Field(default=0, ge=0)
    pitchs: int = Field(default=0, ge=0)
    due_diligences: int = Field(default=0, ge=0)
    closings: int = Field(default=0, ge=0)

    # Métriques financières
    revenue: float = Field(default=0.0, ge=0)
    commission_rate: Optional[float] = Field(None, ge=0, le=100)

    # Métadonnées
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    auto_generated: bool = False
    source: Optional[str] = None


# ============= STATISTIQUES GLOBALES =============

class GlobalDashboardStats(BaseSchema):
    """Statistiques globales pour le dashboard principal"""

    # Organisations
    total_organisations: int = 0
    organisations_by_category: dict = {}  # {"DISTRIBUTEUR": 10, "EMETTEUR": 5, ...}
    organisations_by_pipeline: dict = {}  # {"prospect_froid": 5, "client": 20, ...}

    # Personnes
    total_people: int = 0

    # Tâches
    total_tasks: int = 0
    completed_tasks: int = 0
    overdue_tasks: int = 0
    tasks_due_today: int = 0

    # Mandats
    total_mandats: int = 0
    active_mandats: int = 0
    expiring_soon_mandats: int = 0  # Expire dans les 30 jours

    # Revenue total
    total_revenue: float = 0.0

    # Activités récentes
    activities_last_7_days: int = 0
    activities_last_30_days: int = 0


class MonthlyAggregateStats(BaseSchema):
    """Statistiques agrégées pour un mois donné"""
    year: int
    month: int

    # Agrégations des KPIs
    total_rdv: int = 0
    total_pitchs: int = 0
    total_due_diligences: int = 0
    total_closings: int = 0
    total_revenue: float = 0.0
    average_commission_rate: float = 0.0

    # Compteurs
    organisation_count: int = 0  # Nombre d'organisations avec données ce mois

    # Détails par organisation (optionnel)
    organisations: Optional[List[OrganisationMonthlyKPI]] = None


class YearlyAggregateStats(BaseSchema):
    """Statistiques agrégées pour une année donnée"""
    organisation_id: int
    organisation_name: str
    year: int

    # Totaux annuels
    total_rdv: int = 0
    total_pitchs: int = 0
    total_due_diligences: int = 0
    total_closings: int = 0
    total_revenue: float = 0.0
    average_commission_rate: float = 0.0

    # Données mensuelles
    monthly_data: List[OrganisationMonthlyKPI] = []
    months_recorded: int = 0


# ============= FILTRES ET PARAMÈTRES =============

class DashboardStatsFilters(BaseSchema):
    """Filtres pour requêtes de statistiques"""
    organisation_ids: Optional[List[int]] = None
    categories: Optional[List[str]] = None  # ["DISTRIBUTEUR", "EMETTEUR", ...]
    pipeline_stages: Optional[List[str]] = None
    date_from: Optional[str] = None  # ISO format
    date_to: Optional[str] = None


class TimeRangeStats(BaseSchema):
    """Statistiques sur une période donnée"""
    start_date: str
    end_date: str

    total_interactions: int = 0
    total_tasks_created: int = 0
    total_tasks_completed: int = 0
    total_mandats_signed: int = 0
    total_revenue: float = 0.0

    # Évolution (optionnel)
    daily_breakdown: Optional[List[dict]] = None
