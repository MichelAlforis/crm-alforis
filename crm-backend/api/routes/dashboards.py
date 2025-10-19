from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Path, Body, HTTPException
from sqlalchemy.orm import Session

from core import get_db, get_current_user
from core.cache import cache_response
from schemas.base import PaginatedResponse
from schemas.organisation_activity import OrganisationActivityResponse
from schemas.dashboard_stats import (
    GlobalDashboardStats,
    OrganisationStatsResponse,
    OrganisationMonthlyKPI,
    MonthlyAggregateStats,
    YearlyAggregateStats,
)
from schemas.kpi import KPICreate, KPIUpdate
from services.organisation_activity import OrganisationActivityService
from services.dashboard_stats import DashboardStatsService
from models.organisation_activity import OrganisationActivityType

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get(
    "/widgets/activity",
    response_model=PaginatedResponse[OrganisationActivityResponse],
)
@cache_response(ttl=30, key_prefix="dashboards:activity_widget")
async def get_activity_widget(
    organisation_ids: Optional[List[int]] = Query(
        None,
        description="Liste d'organisations à inclure dans le widget (toutes par défaut)",
    ),
    types: Optional[List[str]] = Query(
        None,
        description="Types d'activités à inclure (interaction_created, task_completed, ...)",
    ),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Flux d'activités récentes pour le widget dashboard."""
    service = OrganisationActivityService(db)

    type_filters: Optional[List[OrganisationActivityType]] = None
    if types:
        mapped: List[OrganisationActivityType] = []
        for raw_type in types:
            try:
                mapped.append(OrganisationActivityType(raw_type))
            except ValueError:
                continue
        type_filters = mapped or None

    items = await service.get_recent(
        limit=limit,
        organisation_ids=organisation_ids,
        types=type_filters,
    )

    return PaginatedResponse(
        total=len(items),
        skip=0,
        limit=limit,
        items=[OrganisationActivityResponse.model_validate(item) for item in items],
    )


# ============= STATISTIQUES DASHBOARD =============


@router.get("/stats/global", response_model=GlobalDashboardStats)
@cache_response(ttl=60, key_prefix="dashboards:global_stats")
async def get_global_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Statistiques globales pour le dashboard principal.
    Remplace les anciens endpoints KPI agrégés.
    """
    service = DashboardStatsService(db)
    return await service.get_global_stats()


@router.get("/stats/organisation/{organisation_id}", response_model=OrganisationStatsResponse)
@cache_response(ttl=30, key_prefix="dashboards:org_stats")
async def get_organisation_dashboard_stats(
    organisation_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Statistiques pour une organisation spécifique.
    Utile pour les pages de détail d'organisation.
    """
    service = DashboardStatsService(db)
    return await service.get_organisation_stats(organisation_id)


# ============= KPI MENSUELS (COMPATIBILITÉ LEGACY) =============


@router.get(
    "/stats/organisation/{organisation_id}/kpis",
    response_model=List[OrganisationMonthlyKPI]
)
async def get_organisation_monthly_kpis(
    organisation_id: int = Path(..., gt=0),
    year: Optional[int] = Query(None, ge=2020, le=2100),
    month: Optional[int] = Query(None, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    service = DashboardStatsService(db)
    return await service.get_monthly_kpis(organisation_id, year, month)


@router.post(
    "/stats/organisation/{organisation_id}/kpis",
    response_model=OrganisationMonthlyKPI,
    status_code=201,
)
async def upsert_organisation_monthly_kpi(
    organisation_id: int = Path(..., gt=0),
    payload: KPICreate = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Crée (ou remplace) un KPI mensuel pour l'organisation.
    """
    service = DashboardStatsService(db)
    try:
        return await service.create_or_update_monthly_kpi(
            organisation_id=organisation_id,
            year=payload.year,
            month=payload.month,
            data=payload.model_dump(),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.put(
    "/stats/kpis/{kpi_id}",
    response_model=OrganisationMonthlyKPI,
)
async def update_dashboard_kpi(
    kpi_id: int = Path(..., gt=0),
    payload: KPIUpdate = Body(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Met à jour un KPI existant (identifié par son ID).
    """
    service = DashboardStatsService(db)
    try:
        return await service.update_kpi_by_id(
            kpi_id,
            data=payload.model_dump(exclude_unset=True),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete(
    "/stats/kpis/{kpi_id}",
    status_code=204,
)
async def delete_dashboard_kpi(
    kpi_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprime un KPI.
    """
    service = DashboardStatsService(db)
    try:
        await service.delete_kpi(kpi_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

@router.get(
    "/stats/month/{year}/{month}",
    response_model=MonthlyAggregateStats
)
@cache_response(ttl=300, key_prefix="dashboards:monthly_aggregate")
async def get_monthly_aggregate_stats(
    year: int = Path(..., ge=2020, le=2100),
    month: int = Path(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Agrège les KPIs de toutes les organisations pour un mois donné.
    Remplace l'ancien endpoint /kpis/summary/month/{year}/{month}.
    """
    service = DashboardStatsService(db)
    return await service.get_monthly_aggregate(year, month)


@router.get(
    "/stats/organisation/{organisation_id}/year/{year}",
    response_model=YearlyAggregateStats
)
@cache_response(ttl=300, key_prefix="dashboards:yearly_aggregate")
async def get_yearly_aggregate_stats(
    organisation_id: int = Path(..., gt=0),
    year: int = Path(..., ge=2020, le=2100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):

    service = DashboardStatsService(db)
    return await service.get_yearly_aggregate(organisation_id, year)
