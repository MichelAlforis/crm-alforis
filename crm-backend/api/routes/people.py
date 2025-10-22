from __future__ import annotations  # Permet les annotations lazy (résout circular imports)

from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core import get_db, get_current_user
from core.events import emit_event, EventType
from schemas.person import (
    PersonCreate,
    PersonUpdate,
    PersonResponse,
    PersonDetailResponse,
    PersonOrganizationLinkResponse,
)
from schemas.base import PaginatedResponse
from services.person import PersonService, PersonOrganizationLinkService
from models.organisation import OrganisationType

router = APIRouter(prefix="/people", tags=["people"])


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
    return [
        PersonOrganizationLinkResponse.model_validate(link)
        for link in links
    ]


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
