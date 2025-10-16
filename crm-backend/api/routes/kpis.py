from fastapi import APIRouter, Depends, status, Query, Path
from sqlalchemy.orm import Session

from core import get_db, get_current_user
from schemas.kpi import (
    KPICreate,
    KPIUpdate,
    KPIResponse,
)
from schemas.base import PaginatedResponse
from services.kpi import KPIService

router = APIRouter(prefix="/kpis", tags=["kpis"])

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[KPIResponse])
async def list_kpis(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    investor_id: int = Query(None),
    year: int = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister tous les KPIs"""
    service = KPIService(db)
    
    filters = {}
    if investor_id:
        filters["investor_id"] = investor_id
    if year:
        filters["year"] = year
    
    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)
    
    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[KPIResponse.model_validate(item) for item in items]
    )

@router.get("/search", response_model=PaginatedResponse[KPIResponse])
async def search_kpis(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des KPIs"""
    service = KPIService(db)
    items, total = await service.search(q, skip=skip, limit=limit)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[KPIResponse.model_validate(item) for item in items]
    )

@router.get("/investor/{investor_id}")
async def get_investor_kpis(
    investor_id: int,
    year: int = Query(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer tous les KPIs d'un investisseur pour une année"""
    service = KPIService(db)
    kpis = await service.get_by_investor_year(investor_id, year)
    return [KPIResponse.model_validate(kpi) for kpi in kpis]

@router.get("/investor/{investor_id}/month/{year}/{month}")
async def get_investor_kpi_month(
    investor_id: int,
    year: int,
    month: int = Path(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer le KPI d'un investisseur pour un mois spécifique"""
    service = KPIService(db)
    kpi = await service.get_by_investor_and_month(investor_id, year, month)
    return KPIResponse.model_validate(kpi)

@router.get("/summary/month/{year}/{month}")
async def get_monthly_kpi_summary(
    year: int,
    month: int = Path(..., ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir un résumé des KPIs pour tous les investisseurs d'un mois"""
    service = KPIService(db)
    summary = await service.get_summary_by_month(year, month)
    return summary

@router.get("/summary/annual/{investor_id}/{year}")
async def get_annual_kpi_summary(
    investor_id: int,
    year: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir un résumé annuel des KPIs pour un investisseur"""
    service = KPIService(db)
    summary = await service.get_annual_summary(investor_id, year)
    return summary

# ============= POST ROUTES =============

@router.post("/investor/{investor_id}", response_model=KPIResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_kpi(
    investor_id: int,
    year: int = Query(...),
    month: int = Query(..., ge=1, le=12),
    kpi_create: KPICreate = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer ou mettre à jour un KPI (upsert)"""
    service = KPIService(db)
    
    if not kpi_create:
        kpi_create = KPICreate()
    
    kpi = await service.create_or_update(investor_id, year, month, kpi_create)
    return KPIResponse.model_validate(kpi)

# ============= PUT ROUTES =============

@router.put("/{kpi_id}", response_model=KPIResponse)
async def update_kpi(
    kpi_id: int,
    kpi_update: KPIUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour un KPI"""
    service = KPIService(db)
    kpi = await service.update(kpi_id, kpi_update)
    return KPIResponse.model_validate(kpi)

# ============= DELETE ROUTES =============

@router.delete("/{kpi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_kpi(
    kpi_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer un KPI"""
    service = KPIService(db)
    await service.delete(kpi_id)
    return None