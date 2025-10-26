"""
Routes API - Recherche Globale

Endpoints:
- GET /search : Recherche globale multi-entités
- GET /search/organisations : Recherche organisations
- GET /search/people : Recherche personnes
- GET /search/mandats : Recherche mandats
- GET /search/autocomplete : Suggestions autocomplete
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.search import SearchService, autocomplete, search_all
from models.organisation import OrganisationCategory
from models.user import User

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
async def global_search(
    q: str = Query(..., min_length=2, description="Texte de recherche (min 2 caractères)"),
    types: Optional[str] = Query(None, description="Types d'entités séparés par virgule (organisations,people,mandats)"),
    limit_per_type: int = Query(5, ge=1, le=20, description="Limite par type d'entité"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recherche globale dans toutes les entités

    **Exemples:**
    - `/search?q=finance` : Recherche "finance" partout
    - `/search?q=paris&types=organisations,people` : Recherche "paris" dans orgs et people
    - `/search?q=client&limit_per_type=10` : 10 résultats max par type

    **Returns:**
    {
        "query": "finance",
        "total": 42,
        "results": {
            "organisations": [...],
            "people": [...],
            "mandats": [...]
        }
    }
    """
    # Parser types
    entity_types = None
    if types:
        entity_types = [t.strip() for t in types.split(",")]
        # Valider types
        valid_types = {"organisations", "people", "mandats", "tasks"}
        invalid = set(entity_types) - valid_types
        if invalid:
            raise HTTPException(400, f"Types invalides: {invalid}")

    # Recherche globale
    results = await search_all(
        query=q,
        db=db,
        current_user=current_user,
        entity_types=entity_types,
        limit_per_type=limit_per_type,
    )

    return results


@router.get("/organisations")
async def search_organisations(
    q: str = Query(..., min_length=2, description="Texte de recherche"),
    category: Optional[OrganisationCategory] = Query(None, description="Filtrer par catégorie"),
    city: Optional[str] = Query(None, description="Filtrer par ville"),
    is_active: Optional[bool] = Query(None, description="Filtrer actives/inactives"),
    pipeline_stage: Optional[str] = Query(None, description="Filtrer par stage pipeline"),
    limit: int = Query(20, ge=1, le=100, description="Nombre max de résultats"),
    offset: int = Query(0, ge=0, description="Offset pour pagination"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recherche Full-Text dans les organisations avec PostgreSQL

    **Fonctionnalités:**
    - Full-Text Search (tsvector + ts_rank)
    - Ranking par pertinence
    - Filtres combinables
    - Pagination
    - Permissions RBAC

    **Exemples:**
    - `/search/organisations?q=finance`
    - `/search/organisations?q=banque&category=institution&city=Paris`
    - `/search/organisations?q=startup&is_active=true&limit=50`

    **Returns:**
    {
        "total": 42,
        "items": [...],
        "limit": 20,
        "offset": 0
    }
    """
    # Construire filtres
    filters = {}
    if category:
        filters['category'] = category
    if city:
        filters['city'] = city
    if is_active is not None:
        filters['is_active'] = is_active
    if pipeline_stage:
        filters['pipeline_stage'] = pipeline_stage

    # Recherche
    results = SearchService.search_organisations(
        query=q,
        db=db,
        current_user=current_user,
        filters=filters if filters else None,
        limit=limit,
        offset=offset,
    )

    return results


@router.get("/people")
async def search_people(
    q: str = Query(..., min_length=2, description="Texte de recherche"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recherche dans les personnes (prénom, nom, email)

    **Exemples:**
    - `/search/people?q=john`
    - `/search/people?q=dupont`
    - `/search/people?q=@gmail.com`

    **Returns:**
    {
        "total": 15,
        "items": [...],
        "limit": 20,
        "offset": 0
    }
    """
    results = SearchService.search_people(
        query=q,
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )

    return results


@router.get("/mandats")
async def search_mandats(
    q: str = Query(..., min_length=2, description="Texte de recherche"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Recherche dans les mandats (numéro, type, organisation)

    **Exemples:**
    - `/search/mandats?q=M-2025`
    - `/search/mandats?q=vente`
    - `/search/mandats?q=ACME`

    **Returns:**
    {
        "total": 8,
        "items": [...],
        "limit": 20,
        "offset": 0
    }
    """
    results = SearchService.search_mandats(
        query=q,
        db=db,
        current_user=current_user,
        limit=limit,
        offset=offset,
    )

    return results


@router.get("/autocomplete")
async def autocomplete_endpoint(
    q: str = Query(..., min_length=2, description="Texte pour suggestions (min 2 chars)"),
    type: str = Query("organisations", description="Type d'entité (organisations, people, mandats)"),
    limit: int = Query(10, ge=1, le=50, description="Nombre max de suggestions"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Autocomplete intelligent avec suggestions

    **Exemples:**
    - `/search/autocomplete?q=alf` → ["Alforis Finance", "Alforis Consulting"]
    - `/search/autocomplete?q=jo&type=people` → ["John Doe", "Joseph Smith"]
    - `/search/autocomplete?q=M-&type=mandats` → ["M-2025-001", "M-2025-002"]

    **Returns:**
    [
        {"id": 1, "name": "Alforis Finance"},
        {"id": 2, "name": "Alforis Consulting"}
    ]
    """
    # Valider type
    valid_types = {"organisations", "people", "mandats", "tasks"}
    if type not in valid_types:
        raise HTTPException(400, f"Type invalide. Valeurs: {valid_types}")

    # Autocomplete
    suggestions = await autocomplete(
        query=q,
        db=db,
        current_user=current_user,
        entity_type=type,
        limit=limit,
    )

    return suggestions
