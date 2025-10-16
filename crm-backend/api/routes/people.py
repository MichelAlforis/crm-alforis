from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from core import get_db, get_current_user
from schemas.base import PaginatedResponse
from schemas.person import (
    PersonCreate,
    PersonUpdate,
    PersonResponse,
    PersonDetailResponse,
    PersonOrganizationLinkResponse,
)
from services.person import PersonService, PersonOrganizationLinkService
from models.person import OrganizationType

router = APIRouter(prefix="/people", tags=["people"])


@router.get("", response_model=PaginatedResponse[PersonResponse])
async def list_people(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None, description="Recherche par nom, prénom ou email"),
    organization_type: Optional[OrganizationType] = Query(
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

    if organization_type and organization_id:
        links = await link_service.list_links_for_organization(organization_type, organization_id)
        people = [link.person for link in links]
        total = len(people)
        items = [PersonResponse.model_validate(person) for person in people]
        return PaginatedResponse(
            total=total,
            skip=skip,
            limit=limit,
            items=items,
        )

    if q:
        people, total = await service.search(q, skip=skip, limit=limit)
    else:
        people, total = await service.get_all(skip=skip, limit=limit)

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[PersonResponse.model_validate(person) for person in people],
    )


@router.post("", response_model=PersonResponse, status_code=status.HTTP_201_CREATED)
async def create_person(
    payload: PersonCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    person = await service.create(payload)
    return PersonResponse.model_validate(person)


@router.get("/{person_id}", response_model=PersonDetailResponse)
async def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    link_service = PersonOrganizationLinkService(db)

    details = await service.get_person_with_links(person_id)
    serialized_links = [
        link.model_dump()
        for link in link_service.serialize_links(details["links"])
    ]

    return PersonDetailResponse.model_validate(
        {
            **details["person"].to_dict(),
            "created_at": details["person"].created_at,
            "updated_at": details["person"].updated_at,
            "organizations": serialized_links,
        }
    )


@router.put("/{person_id}", response_model=PersonResponse)
async def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    person = await service.update(person_id, payload)
    return PersonResponse.model_validate(person)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonService(db)
    await service.delete(person_id)
    return None
