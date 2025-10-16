from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from core import get_db, get_current_user
from schemas.person import (
    PersonOrganizationLinkCreate,
    PersonOrganizationLinkUpdate,
    PersonOrganizationLinkResponse,
)
from services.person import PersonOrganizationLinkService

router = APIRouter(prefix="/org-links", tags=["people"])


@router.post("", response_model=PersonOrganizationLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_link(
    payload: PersonOrganizationLinkCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    link = await service.create_link(payload)
    responses = service.serialize_links([link])
    return responses[0]


@router.put("/{link_id}", response_model=PersonOrganizationLinkResponse)
async def update_link(
    link_id: int,
    payload: PersonOrganizationLinkUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    link = await service.update_link(link_id, payload)
    responses = service.serialize_links([link])
    return responses[0]


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_link(
    link_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = PersonOrganizationLinkService(db)
    await service.delete_link(link_id)
    return None
