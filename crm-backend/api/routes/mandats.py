from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core import get_db, get_current_user
from core.events import emit_event, EventType
from schemas.base import PaginatedResponse
from schemas.organisation import (
    MandatDistributionCreate,
    MandatDistributionUpdate,
    MandatDistributionResponse,
    MandatDistributionDetailResponse,
)
from services.organisation import MandatDistributionService
from models.organisation import MandatStatus

router = APIRouter(prefix="/mandats", tags=["mandats"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None

# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[MandatDistributionResponse])
async def list_mandats(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    organisation_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister tous les mandats de distribution avec pagination et filtres

    Filtres disponibles:
    - organisation_id: ID de l'organisation
    - status: proposé, signé, actif, terminé
    """
    service = MandatDistributionService(db)

    filters = {}
    if organisation_id:
        filters["organisation_id"] = organisation_id
    if status:
        filters["status"] = status

    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[MandatDistributionResponse.model_validate(item) for item in items]
    )


@router.get("/active", response_model=List[MandatDistributionResponse])
async def get_active_mandats(
    organisation_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupérer tous les mandats actifs (signés ou actifs)

    Paramètres optionnels:
    - organisation_id: Filtrer par organisation
    """
    service = MandatDistributionService(db)
    mandats = await service.get_active_mandats(organisation_id=organisation_id)

    return [MandatDistributionResponse.model_validate(mandat) for mandat in mandats]


@router.get("/organisation/{organisation_id}", response_model=List[MandatDistributionResponse])
async def get_mandats_by_organisation(
    organisation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer tous les mandats d'une organisation"""
    service = MandatDistributionService(db)
    mandats = await service.get_by_organisation(organisation_id)

    return [MandatDistributionResponse.model_validate(mandat) for mandat in mandats]


@router.get("/{mandat_id}", response_model=MandatDistributionDetailResponse)
async def get_mandat(
    mandat_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer un mandat avec ses produits associés"""
    service = MandatDistributionService(db)
    mandat = await service.get_with_produits(mandat_id)

    return MandatDistributionDetailResponse.model_validate(mandat)


@router.get("/{mandat_id}/is-actif")
async def check_mandat_actif(
    mandat_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Vérifier si un mandat est actif (signé ou actif)

    Retourne:
    - is_actif: true si le mandat est signé ou actif
    """
    service = MandatDistributionService(db)
    is_actif = await service.is_mandat_actif(mandat_id)

    return {"mandat_id": mandat_id, "is_actif": is_actif}


# ============= POST ROUTES =============

@router.post("", response_model=MandatDistributionResponse, status_code=status.HTTP_201_CREATED)
async def create_mandat(
    mandat: MandatDistributionCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer un nouveau mandat de distribution

    Champs requis:
    - organisation_id: ID de l'organisation

    Champs optionnels:
    - status: proposé (défaut), signé, actif, terminé
    - date_signature: Date de signature du mandat
    - date_debut: Date de début d'activité
    - date_fin: Date de fin (si applicable)
    - notes: Conditions particulières, commentaires

    Note: Un mandat doit être signé ou actif pour permettre l'association de produits
    """
    service = MandatDistributionService(db)
    new_mandat = await service.create(mandat)
    await emit_event(
        EventType.MANDAT_CREATED,
        data={
            "mandat_id": new_mandat.id,
            "organisation_id": new_mandat.organisation_id,
            "status": new_mandat.status.value if getattr(new_mandat, "status", None) else None,
            "date_signature": getattr(new_mandat, "date_signature", None).isoformat() if getattr(new_mandat, "date_signature", None) else None,
        },
        user_id=_extract_user_id(current_user),
    )

    if getattr(new_mandat, "status", None) == MandatStatus.SIGNE:
        await emit_event(
            EventType.MANDAT_SIGNED,
            data={
                "mandat_id": new_mandat.id,
                "organisation_id": new_mandat.organisation_id,
                "date_signature": getattr(new_mandat, "date_signature", None).isoformat() if getattr(new_mandat, "date_signature", None) else None,
            },
            user_id=_extract_user_id(current_user),
        )
    return MandatDistributionResponse.model_validate(new_mandat)


# ============= PUT ROUTES =============

@router.put("/{mandat_id}", response_model=MandatDistributionResponse)
async def update_mandat(
    mandat_id: int,
    mandat: MandatDistributionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mettre à jour un mandat de distribution

    Utilisé notamment pour changer le statut du mandat
    (proposé → signé → actif → terminé)
    """
    service = MandatDistributionService(db)
    existing_mandat = await service.get_by_id(mandat_id)
    previous_status = getattr(existing_mandat, "status", None)
    updated_mandat = await service.update(mandat_id, mandat)
    await emit_event(
        EventType.MANDAT_UPDATED,
        data={
            "mandat_id": updated_mandat.id,
            "organisation_id": updated_mandat.organisation_id,
            "status": updated_mandat.status.value if getattr(updated_mandat, "status", None) else None,
            "date_signature": getattr(updated_mandat, "date_signature", None).isoformat() if getattr(updated_mandat, "date_signature", None) else None,
        },
        user_id=_extract_user_id(current_user),
    )

    if (
        previous_status != MandatStatus.SIGNE
        and getattr(updated_mandat, "status", None) == MandatStatus.SIGNE
    ):
        await emit_event(
            EventType.MANDAT_SIGNED,
            data={
                "mandat_id": updated_mandat.id,
                "organisation_id": updated_mandat.organisation_id,
                "date_signature": getattr(updated_mandat, "date_signature", None).isoformat() if getattr(updated_mandat, "date_signature", None) else None,
            },
            user_id=_extract_user_id(current_user),
        )
    return MandatDistributionResponse.model_validate(updated_mandat)


# ============= DELETE ROUTES =============

@router.delete("/{mandat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mandat(
    mandat_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer un mandat de distribution

    Note: Supprimera également toutes les associations mandat-produit
    (cascade delete)
    """
    service = MandatDistributionService(db)
    await service.delete(mandat_id)
    return None
