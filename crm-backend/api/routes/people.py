from __future__ import annotations  # Permet les annotations lazy (résout circular imports)

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session, Query as SQLAlchemyQuery

from core import get_current_user, get_db
from core.events import EventType, emit_event
from core.permissions import filter_query_by_team
from models.organisation import OrganisationType
from models.person import Person
from schemas.base import PaginatedResponse
from schemas.person import (
    PersonCreate,
    PersonDetailResponse,
    PersonOrganizationLinkResponse,
    PersonResponse,
    PersonUpdate,
)
from services.person import PersonOrganizationLinkService, PersonService

router = APIRouter(prefix="/people", tags=["people"])


# ============= SHARED FILTER LOGIC =============


def apply_people_filters(
    query: SQLAlchemyQuery,
    params: Dict[str, Any],
    current_user: dict,
) -> SQLAlchemyQuery:
    """
    Applique exactement les mêmes filtres que le viewer.
    Utilisé par la route LIST et les exports pour garantir la cohérence.

    Args:
        query: Query SQLAlchemy sur Person
        params: Dictionnaire de paramètres (role, country_code, language, etc.)
        current_user: Utilisateur courant (dict depuis JWT)

    Returns:
        Query filtrée
    """
    # 1) Permissions identiques au viewer
    query = filter_query_by_team(query, current_user, Person)

    # 2) Helper pour convertir les booléens
    def _get_bool(name: str) -> Optional[bool]:
        v = params.get(name)
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("true", "1", "yes", "y")
        return None

    # 3) Extraire les paramètres avec aliases
    country_code = params.get("country_code") or params.get("country")
    language = params.get("language")
    role = params.get("role")
    organisation_id = params.get("organisation_id")
    is_active = _get_bool("is_active")
    search = params.get("search") or params.get("q")

    # 4) Appliquer les mêmes filtres que le service
    if country_code:
        query = query.filter(Person.country_code == country_code.upper())
    if language:
        query = query.filter(Person.language == language.upper())
    if role:
        query = query.filter(Person.role.ilike(f"%{role}%"))
    if organisation_id:
        # Note: filtre par organisation via les liens
        pass  # À implémenter si nécessaire
    if is_active is not None:
        query = query.filter(Person.is_active == is_active)

    # 5) Recherche plein texte
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Person.first_name.ilike(search_pattern))
            | (Person.last_name.ilike(search_pattern))
            | (Person.personal_email.ilike(search_pattern))
        )

    # 6) Tri par défaut
    sort = params.get("sort") or "created_at:desc"
    if sort == "created_at:desc":
        query = query.order_by(Person.created_at.desc())
    elif sort == "created_at:asc":
        query = query.order_by(Person.created_at.asc())
    elif sort == "last_name:asc":
        query = query.order_by(Person.last_name.asc())
    elif sort == "last_name:desc":
        query = query.order_by(Person.last_name.desc())

    return query


def _extract_user_id(current_user: dict) -> Optional[int]:
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


@router.get("", response_model=PaginatedResponse[PersonResponse])
async def list_people(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None, description="Recherche par nom, prénom ou email"),
    organization_type: Optional[OrganisationType] = Query(
        None, description="Filtrer par type d'organisation"
    ),
    organization_id: Optional[int] = Query(
        None, ge=1, description="Filtrer par organisation spécifique"
    ),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    link_service = PersonOrganizationLinkService(db)

    if organization_id is not None:
        links = await link_service.list_for_organisation(
            organization_id,
            organization_type=organization_type,
        )
        seen_people = {}
        for link in links:
            person = getattr(link, "person", None)
            if person is not None and getattr(person, "id", None) is not None:
                seen_people[person.id] = person
        people = list(seen_people.values())
        total = len(people)
        sliced = people[skip : skip + limit] if limit else people
        return {
            "items": [PersonResponse.model_validate(person) for person in sliced],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    if q:
        people, total = await service.search(q, skip=skip, limit=limit)
    else:
        people, total = await service.get_all(skip=skip, limit=limit)

    return {
        "items": [PersonResponse.model_validate(person) for person in people],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.post("", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    person = await service.create(payload)

    await emit_event(
        EventType.PERSON_CREATED,
        data={
            "person_id": person.id,
            "first_name": getattr(person, "first_name", None),
            "last_name": getattr(person, "last_name", None),
            "email": getattr(person, "personal_email", None),
        },
        user_id=_extract_user_id(current_user),
    )

    return PersonResponse.model_validate(person)


@router.get("/search", response_model=List[PersonResponse])
async def search_people_endpoint(
    q: str = Query(..., min_length=1, description="Terme de recherche"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    people, _ = await service.search(q, skip=skip, limit=limit)
    return [PersonResponse.model_validate(person) for person in people]


@router.get("/{person_id}", response_model=PersonDetailResponse)
async def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    person = await service.get_by_id(person_id)
    link_service = PersonOrganizationLinkService(db)
    links = await link_service.list_for_person(person_id)
    person_payload = PersonResponse.model_validate(person).model_dump(by_alias=True)
    person_payload["organizations"] = [
        PersonOrganizationLinkResponse.model_validate(link).model_dump(by_alias=True)
        for link in links
    ]

    return person_payload


@router.get("/{person_id}/organisations", response_model=List[PersonOrganizationLinkResponse])
async def list_person_organisations(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    link_service = PersonOrganizationLinkService(db)
    links = await link_service.list_for_person(person_id)
    return [PersonOrganizationLinkResponse.model_validate(link) for link in links]


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    person = await service.update(person_id, payload)

    await emit_event(
        EventType.PERSON_UPDATED,
        data={
            "person_id": person.id,
            "first_name": getattr(person, "first_name", None),
            "last_name": getattr(person, "last_name", None),
            "email": getattr(person, "personal_email", None),
        },
        user_id=_extract_user_id(current_user),
    )

    return PersonResponse.model_validate(person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    await service.delete(person_id)

    await emit_event(
        EventType.PERSON_DELETED,
        data={"person_id": person_id},
        user_id=_extract_user_id(current_user),
    )
    return None


@router.post("/bulk-delete", status_code=status.HTTP_200_OK)
async def bulk_delete_people(
    person_ids: List[int],
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Delete multiple people in bulk

    Args:
        person_ids: List of person IDs to delete

    Returns:
        {"deleted": count, "failed": count}
    """
    service = PersonService(db)
    deleted_count = 0
    failed_count = 0

    for person_id in person_ids:
        try:
            await service.delete(person_id)
            deleted_count += 1

            await emit_event(
                EventType.PERSON_DELETED,
                data={"person_id": person_id},
                user_id=_extract_user_id(current_user),
            )
        except Exception as e:
            failed_count += 1
            # Log error but continue with other deletions
            print(f"Failed to delete person {person_id}: {e}")

    return {
        "deleted": deleted_count,
        "failed": failed_count,
        "total": len(person_ids)
    }
