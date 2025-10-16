from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from core import get_db, get_current_user
from schemas.base import PaginatedResponse
from schemas.fournisseur import (
    FournisseurCreate,
    FournisseurUpdate,
    FournisseurResponse,
    FournisseurDetailResponse,
    FournisseurStatsResponse,
    FournisseurFilterParams,
)
from services.fournisseur import FournisseurService

router = APIRouter(prefix="/fournisseurs", tags=["fournisseurs"])

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[FournisseurResponse])
async def list_fournisseurs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    stage: str = Query(None),
    type_fournisseur: str = Query(None),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister tous les fournisseurs avec pagination"""
    service = FournisseurService(db)

    filters = {"is_active": is_active}
    if stage:
        filters["stage"] = stage
    if type_fournisseur:
        filters["type_fournisseur"] = type_fournisseur

    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[FournisseurResponse.model_validate(item) for item in items]
    )


@router.get("/search", response_model=PaginatedResponse[FournisseurResponse])
async def search_fournisseurs(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des fournisseurs"""
    service = FournisseurService(db)
    items, total = await service.search(q, skip=skip, limit=limit)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[FournisseurResponse.model_validate(item) for item in items]
    )


@router.get("/stats", response_model=FournisseurStatsResponse)
async def get_fournisseur_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir les statistiques sur les fournisseurs"""
    service = FournisseurService(db)
    stats = await service.get_statistics()
    return FournisseurStatsResponse(**stats)


@router.get("/{fournisseur_id}")
async def get_fournisseur(
    fournisseur_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer un fournisseur avec tous ses détails"""
    service = FournisseurService(db)
    details = await service.get_fournisseur_with_details(fournisseur_id)

    return {
        "fournisseur": FournisseurDetailResponse.model_validate(details["fournisseur"]),
        "contacts": details["contacts"],
        "interaction_count": len(details["interactions"]),
        "kpi_count": len(details["kpis"]),
    }


# ============= POST ROUTES =============

@router.post("", response_model=FournisseurResponse, status_code=status.HTTP_201_CREATED)
async def create_fournisseur(
    fournisseur_create: FournisseurCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer un nouveau fournisseur"""
    service = FournisseurService(db)
    fournisseur = await service.create(fournisseur_create)
    return FournisseurResponse.model_validate(fournisseur)


# ============= PUT ROUTES =============

@router.put("/{fournisseur_id}", response_model=FournisseurResponse)
async def update_fournisseur(
    fournisseur_id: int,
    fournisseur_update: FournisseurUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour un fournisseur"""
    service = FournisseurService(db)
    fournisseur = await service.update(fournisseur_id, fournisseur_update)
    return FournisseurResponse.model_validate(fournisseur)


@router.put("/{fournisseur_id}/move-to-next-stage")
async def move_fournisseur_to_next_stage(
    fournisseur_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Déplacer un fournisseur à l'étape suivante du pipeline"""
    service = FournisseurService(db)
    fournisseur = await service.move_to_next_stage(fournisseur_id)
    return {"message": "Fournisseur moved", "new_stage": fournisseur.stage}


# ============= DELETE ROUTES =============

@router.delete("/{fournisseur_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fournisseur(
    fournisseur_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer un fournisseur"""
    service = FournisseurService(db)
    await service.delete(fournisseur_id)
    return None
