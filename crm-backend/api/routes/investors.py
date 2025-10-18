from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core import get_db, get_current_user
# from schemas.investor import (
    InvestorCreate,
    InvestorUpdate,
    InvestorResponse,
    InvestorDetailResponse,
    InvestorStatsResponse,
    InvestorFilterParams,
)
from schemas.base import PaginatedResponse
# from services.investor import InvestorService
from services.person import PersonOrganizationLinkService

router = APIRouter(prefix="/investors", tags=["investors"])

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[InvestorResponse])
async def list_investors(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    pipeline_stage: str = Query(None),
    is_active: bool = Query(True),
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    language: Optional[str] = Query(None, min_length=2, max_length=5),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister tous les investisseurs avec pagination"""
    service = InvestorService(db)
    
    filters = {"is_active": is_active}
    if pipeline_stage:
        filters["pipeline_stage"] = pipeline_stage
    if country_code:
        filters["country_code"] = country_code.upper()
    if language:
        filters["language"] = language.lower()
    
    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)
    
    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[InvestorResponse.model_validate(item) for item in items]
    )

@router.get("/search")
async def search_investors(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des investisseurs"""
    service = InvestorService(db)
    items, total = await service.search(q, skip=skip, limit=limit)
    
    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[InvestorResponse.model_validate(item) for item in items]
    )

@router.get("/stats")
async def get_investor_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir les statistiques sur les investisseurs"""
    service = InvestorService(db)
    stats = await service.get_statistics()
    return InvestorStatsResponse(**stats)

@router.get("/{investor_id}")
async def get_investor(
    investor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer un investisseur avec tous ses détails"""
    service = InvestorService(db)
    link_service = PersonOrganizationLinkService(db)
    details = await service.get_investor_with_details(investor_id)
    people = link_service.serialize_links(details.get("people_links", []))
    
    return {
        "investor": InvestorDetailResponse.model_validate(details["investor"]),
        "contacts": details["contacts"],
        "interaction_count": len(details["interactions"]),
        "kpi_count": len(details["kpis"]),
        "people": people,
    }

# ============= POST ROUTES =============

@router.post("", response_model=InvestorResponse, status_code=status.HTTP_201_CREATED)
async def create_investor(
    investor_create: InvestorCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer un nouvel investisseur"""
    service = InvestorService(db)
    investor = await service.create(investor_create)
    return InvestorResponse.model_validate(investor)

# ============= PUT ROUTES =============

@router.put("/{investor_id}", response_model=InvestorResponse)
async def update_investor(
    investor_id: int,
    investor_update: InvestorUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour un investisseur"""
    service = InvestorService(db)
    investor = await service.update(investor_id, investor_update)
    return InvestorResponse.model_validate(investor)

@router.put("/{investor_id}/move-to-next-stage")
async def move_to_next_stage(
    investor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Déplacer un investisseur à l'étape suivante du pipeline"""
    service = InvestorService(db)
    investor = await service.move_to_next_stage(investor_id)
    return {"message": "Investor moved", "new_stage": investor.pipeline_stage}

# ============= DELETE ROUTES =============

@router.delete("/{investor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_investor(
    investor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer un investisseur"""
    service = InvestorService(db)
    await service.delete(investor_id)
    return None
