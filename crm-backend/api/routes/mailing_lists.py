"""Routes API pour les listes de diffusion."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from schemas.mailing_list import (
    MailingListCreate,
    MailingListListResponse,
    MailingListResponse,
    MailingListUpdate,
)
from services.mailing_list_service import MailingListService

router = APIRouter(prefix="/mailing-lists", tags=["mailing-lists"])


def _extract_user_id(current_user: dict) -> int | None:
    if not current_user:
        return None
    user_id = current_user.get("user_id")
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


@router.post("", response_model=MailingListResponse, status_code=status.HTTP_201_CREATED)
async def create_mailing_list(
    data: MailingListCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer une nouvelle liste de diffusion."""
    service = MailingListService(db)
    user_id = _extract_user_id(current_user)
    mailing_list = service.create(data, user_id=user_id)
    return mailing_list


@router.get("", response_model=MailingListListResponse)
async def list_mailing_lists(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    only_active: bool = Query(True),
    only_mine: bool = Query(False, description="Afficher seulement mes listes"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lister les listes de diffusion."""
    service = MailingListService(db)
    user_id = _extract_user_id(current_user) if only_mine else None

    items, total = service.get_all(
        skip=skip,
        limit=limit,
        only_active=only_active,
        user_id=user_id,
    )

    page = (skip // limit) + 1 if limit > 0 else 1

    return MailingListListResponse(
        items=items,
        total=total,
        page=page,
        page_size=limit,
    )


@router.get("/stats")
async def get_mailing_list_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir des statistiques sur les listes."""
    service = MailingListService(db)
    return service.get_stats()


@router.get("/{list_id}", response_model=MailingListResponse)
async def get_mailing_list(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer une liste par ID."""
    service = MailingListService(db)
    mailing_list = service.get_by_id(list_id)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liste de diffusion introuvable"
        )

    return mailing_list


@router.put("/{list_id}", response_model=MailingListResponse)
async def update_mailing_list(
    list_id: int,
    data: MailingListUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour une liste."""
    service = MailingListService(db)
    mailing_list = service.update(list_id, data)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liste de diffusion introuvable"
        )

    return mailing_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mailing_list(
    list_id: int,
    hard: bool = Query(False, description="Suppression définitive"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une liste (soft delete par défaut)."""
    service = MailingListService(db)

    if hard:
        success = service.hard_delete(list_id)
    else:
        success = service.delete(list_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liste de diffusion introuvable"
        )

    return None


@router.post("/{list_id}/mark-used", response_model=MailingListResponse)
async def mark_list_as_used(
    list_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Marquer une liste comme utilisée (met à jour last_used_at)."""
    service = MailingListService(db)
    mailing_list = service.mark_as_used(list_id)

    if not mailing_list:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Liste de diffusion introuvable"
        )

    return mailing_list
