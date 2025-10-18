from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from core import get_db, get_current_user
from core.events import emit_event, EventType
# from schemas.interaction import (
    InteractionCreate,
    InteractionUpdate,
    InteractionResponse,
    InteractionFilterParams,
)
from schemas.base import PaginatedResponse
# from services.interaction import InteractionService

router = APIRouter(prefix="/interactions", tags=["interactions"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[InteractionResponse])
async def list_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    investor_id: int = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister toutes les interactions"""
    service = InteractionService(db)

    filters = {}
    if investor_id:
        filters["investor_id"] = investor_id

    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[InteractionResponse.model_validate(item) for item in items]
    )

@router.get("/search", response_model=PaginatedResponse[InteractionResponse])
async def search_interactions(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des interactions"""
    service = InteractionService(db)
    items, total = await service.search(q, skip=skip, limit=limit)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[InteractionResponse.model_validate(item) for item in items]
    )

@router.get("/investor/{investor_id}")
async def get_investor_interactions(
    investor_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer toutes les interactions d'un investisseur"""
    service = InteractionService(db)
    items, total = await service.get_by_investor(investor_id, skip=skip, limit=limit)
    
    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[InteractionResponse.model_validate(item) for item in items]
    )

@router.get("/investor/{investor_id}/summary")
async def get_investor_interaction_summary(
    investor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir un résumé des interactions pour un investisseur"""
    service = InteractionService(db)
    summary = await service.get_summary_by_investor(investor_id)
    return summary

# ============= POST ROUTES =============

@router.post("/investor/{investor_id}", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    investor_id: int,
    interaction_create: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer une nouvelle interaction pour un investisseur"""
    service = InteractionService(db)
    interaction = await service.create_for_investor(investor_id, interaction_create)
    await emit_event(
        EventType.INTERACTION_CREATED,
        data={
            "interaction_id": interaction.id,
            "investor_id": getattr(interaction, "investor_id", investor_id),
            "type": getattr(interaction, "type", None).value if getattr(interaction, "type", None) else None,
            "subject": getattr(interaction, "subject", None),
        },
        user_id=_extract_user_id(current_user),
    )
    return InteractionResponse.model_validate(interaction)

# ============= PUT ROUTES =============

@router.put("/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    interaction_id: int,
    interaction_update: InteractionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour une interaction"""
    service = InteractionService(db)
    interaction = await service.update(interaction_id, interaction_update)
    await emit_event(
        EventType.INTERACTION_UPDATED,
        data={
            "interaction_id": interaction.id,
            "investor_id": getattr(interaction, "investor_id", None),
            "type": getattr(interaction, "type", None).value if getattr(interaction, "type", None) else None,
            "subject": getattr(interaction, "subject", None),
        },
        user_id=_extract_user_id(current_user),
    )
    return InteractionResponse.model_validate(interaction)

# ============= DELETE ROUTES =============

@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une interaction"""
    service = InteractionService(db)
    await service.delete(interaction_id)
    return None
