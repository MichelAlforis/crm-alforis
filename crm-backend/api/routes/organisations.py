from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.cache import cache_response, invalidate_organisation_cache
from core.events import EventType, emit_event
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from schemas.base import PaginatedResponse
from schemas.organisation import (
    OrganisationCreate,
    OrganisationDetailResponse,
    OrganisationResponse,
    OrganisationUpdate,
)
from schemas.organisation_activity import OrganisationActivityResponse
from services.organisation import OrganisationService
from services.organisation_activity import OrganisationActivityService
from services.person import PersonOrganizationLinkService

router = APIRouter(prefix="/organisations", tags=["organisations"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    """Convertit l'identifiant utilisateur en int si possible."""
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


# ============= GET ROUTES =============


@router.get("", response_model=PaginatedResponse[OrganisationResponse])
@cache_response(ttl=300, key_prefix="organisations:list")
async def list_organisations(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à sauter"),
    limit: int = Query(50, ge=1, le=200, description="Nombre d'éléments par page"),
    category: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    country_code: Optional[str] = Query(None, min_length=2, max_length=2),
    language: Optional[str] = Query(None, min_length=2, max_length=5),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister toutes les organisations avec pagination et filtres

    Filtres disponibles:
    - category: Institution, Wholesale, SDG, CGPI, Autres
    - is_active: true/false
    - country_code: Code pays ISO 2 lettres
    - language: Code langue (FR, EN, ES, etc.)
    """
    service = OrganisationService(db)

    filters: Dict[str, Any] = {}
    if is_active is not None:
        filters["is_active"] = is_active
    if category:
        filters["category"] = category
    if country_code:
        filters["country_code"] = country_code.upper()
    if language:
        filters["language"] = language.upper()

    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)

    return {
        "items": [OrganisationResponse.model_validate(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/search", response_model=PaginatedResponse[OrganisationResponse])
@cache_response(ttl=300, key_prefix="organisations:search")
async def search_organisations(
    q: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Rechercher des organisations par nom, website ou notes"""
    service = OrganisationService(db)
    items, total = await service.search(q, skip=skip, limit=limit)

    return {
        "items": [OrganisationResponse.model_validate(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/stats")
@cache_response(ttl=600, key_prefix="organisations:stats")
async def get_organisation_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtenir les statistiques sur les organisations

    Retourne:
    - total: nombre total d'organisations
    - by_category: répartition par catégorie
    - by_language: répartition par langue
    """
    service = OrganisationService(db)
    stats = await service.get_statistics()
    return stats


@router.get("/countries")
@cache_response(ttl=3600, key_prefix="organisations:countries")
async def get_available_countries(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtenir la liste des pays disponibles dans la base de données

    Retourne une liste de codes pays (country_code) distincts
    """
    service = OrganisationService(db)
    countries = await service.get_available_countries()
    return countries


@router.get("/by-language/{language}", response_model=PaginatedResponse[OrganisationResponse])
@cache_response(ttl=300, key_prefix="organisations:language")
async def get_organisations_by_language(
    language: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupérer toutes les organisations d'une langue spécifique
    Utile pour la segmentation des newsletters
    """
    service = OrganisationService(db)
    items, total = await service.get_by_language(language.upper(), skip=skip, limit=limit)

    return {
        "items": [OrganisationResponse.model_validate(item) for item in items],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/{organisation_id}", response_model=OrganisationDetailResponse)
@cache_response(ttl=600, key_prefix="organisations:detail")
async def get_organisation(
    organisation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer une organisation avec tous ses détails (mandats, contacts)"""
    service = OrganisationService(db)
    organisation = await service.get_with_mandats(organisation_id)

    return OrganisationDetailResponse.model_validate(organisation)


@router.get(
    "/{organisation_id}/activity",
    response_model=PaginatedResponse[OrganisationActivityResponse],
)
@cache_response(ttl=60, key_prefix="organisations:activity")
async def get_organisation_activity(
    organisation_id: int,
    limit: int = Query(20, ge=1, le=100),
    before_id: Optional[int] = Query(
        None,
        description="Cursor basé sur l'identifiant de l'activité précédente",
    ),
    types: Optional[List[str]] = Query(
        None,
        description="Filtrer par type d'activité (ex: interaction_created, task_completed)",
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Timeline des activités pour une organisation."""
    service = OrganisationActivityService(db)

    type_filters: Optional[List[OrganisationActivityType]] = None
    if types:
        mapped_types = []
        for raw_type in types:
            try:
                mapped_types.append(OrganisationActivityType(raw_type))
            except ValueError:
                continue
        type_filters = mapped_types or None

    items = await service.get_timeline(
        organisation_id,
        limit=limit,
        before_id=before_id,
        types=type_filters,
    )
    total = await service.count_for_organisation(
        organisation_id,
        types=type_filters,
    )

    return PaginatedResponse(
        total=total,
        skip=0,
        limit=limit,
        items=[OrganisationActivityResponse.model_validate(item) for item in items],
    )


# ============= POST ROUTES =============


@router.post("", response_model=OrganisationResponse, status_code=status.HTTP_201_CREATED)
async def create_organisation(
    organisation: OrganisationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer une nouvelle organisation

    Champs requis:
    - name: Nom de l'organisation
    - category: Institution, Wholesale, SDG, CGPI, Autres

    Champs optionnels:
    - aum: Assets Under Management
    - aum_date: Date de l'AUM
    - strategies: Liste de stratégies d'investissement
    - website: Site web
    - country_code: Code pays
    - domicile: Domiciliation juridique
    - language: Langue principale (défaut: FR)
    - notes: Notes
    """
    service = OrganisationService(db)
    new_organisation = await service.create(organisation, actor=current_user)
    invalidate_organisation_cache()

    await emit_event(
        EventType.ORGANISATION_CREATED,
        data={
            "organisation_id": new_organisation.id,
            "name": new_organisation.name,
            "category": getattr(new_organisation, "category", None),
            "country_code": getattr(new_organisation, "country_code", None),
        },
        user_id=_extract_user_id(current_user),
    )

    return OrganisationResponse.model_validate(new_organisation)


# ============= PUT ROUTES =============


@router.put("/{organisation_id}", response_model=OrganisationResponse)
async def update_organisation(
    organisation_id: int,
    organisation: OrganisationUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour une organisation"""
    service = OrganisationService(db)
    updated_organisation = await service.update(organisation_id, organisation, actor=current_user)
    invalidate_organisation_cache()

    await emit_event(
        EventType.ORGANISATION_UPDATED,
        data={
            "organisation_id": updated_organisation.id,
            "name": updated_organisation.name,
            "category": getattr(updated_organisation, "category", None),
            "country_code": getattr(updated_organisation, "country_code", None),
        },
        user_id=_extract_user_id(current_user),
    )

    return OrganisationResponse.model_validate(updated_organisation)


# ============= DELETE ROUTES =============


@router.delete("/{organisation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organisation(
    organisation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer une organisation

    Note: Supprimera également tous les contacts, mandats et interactions associés
    (cascade delete)
    """
    service = OrganisationService(db)
    await service.delete(organisation_id)
    invalidate_organisation_cache()

    await emit_event(
        EventType.ORGANISATION_DELETED,
        data={"organisation_id": organisation_id},
        user_id=_extract_user_id(current_user),
    )
    return None


# ============= ACTIVITY ROUTES =============


@router.get("/{organisation_id}/activity", response_model=List[OrganisationActivityResponse])
async def get_organisation_activities(
    organisation_id: int,
    limit: int = Query(20, ge=1, le=100),
    before_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupérer l'historique d'activité d'une organisation

    Paramètres:
    - limit: Nombre d'activités à retourner (défaut: 20)
    - before_id: Pour la pagination, récupérer les activités avant cet ID
    """
    activity_service = OrganisationActivityService(db)
    activities = await activity_service.get_timeline(
        organisation_id=organisation_id, limit=limit, before_id=before_id
    )
    return [OrganisationActivityResponse.model_validate(a) for a in activities]


@router.delete("/{organisation_id}/activity/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_organisation_activity(
    organisation_id: int,
    activity_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer une activité spécifique d'une organisation

    Paramètres:
    - organisation_id: ID de l'organisation
    - activity_id: ID de l'activité à supprimer
    """
    # Query activity directly instead of using service (which doesn't have get method)
    activity = db.query(OrganisationActivity).filter(OrganisationActivity.id == activity_id).first()

    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Activity {activity_id} not found"
        )

    if activity.organisation_id != organisation_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Activity {activity_id} does not belong to organisation {organisation_id}",
        )

    db.delete(activity)
    db.commit()
    return None
