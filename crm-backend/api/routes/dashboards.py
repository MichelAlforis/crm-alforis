from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core import get_db, get_current_user
from core.cache import cache_response
from schemas.base import PaginatedResponse
from schemas.organisation_activity import OrganisationActivityResponse
from services.organisation_activity import OrganisationActivityService
from models.organisation_activity import OrganisationActivityType

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get(
    "/widgets/activity",
    response_model=PaginatedResponse[OrganisationActivityResponse],
)
@cache_response(ttl=30, key_prefix="dashboards:activity_widget")
async def get_activity_widget(
    organisation_ids: Optional[List[int]] = Query(
        None,
        description="Liste d'organisations à inclure dans le widget (toutes par défaut)",
    ),
    types: Optional[List[str]] = Query(
        None,
        description="Types d'activités à inclure (interaction_created, task_completed, ...)",
    ),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Flux d'activités récentes pour le widget dashboard."""
    service = OrganisationActivityService(db)

    type_filters: Optional[List[OrganisationActivityType]] = None
    if types:
        mapped: List[OrganisationActivityType] = []
        for raw_type in types:
            try:
                mapped.append(OrganisationActivityType(raw_type))
            except ValueError:
                continue
        type_filters = mapped or None

    items = await service.get_recent(
        limit=limit,
        organisation_ids=organisation_ids,
        types=type_filters,
    )

    return PaginatedResponse(
        total=len(items),
        skip=0,
        limit=limit,
        items=[OrganisationActivityResponse.model_validate(item) for item in items],
    )
