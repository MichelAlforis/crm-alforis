from __future__ import annotations

from typing import Optional, Iterable, Tuple, List, Dict, Any
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from services.base import BaseService
from models.organisation_activity import OrganisationActivity, OrganisationActivityType
from schemas.organisation_activity import (
    OrganisationActivityCreate,
    OrganisationActivityUpdate,
)
from core.exceptions import ResourceNotFound, DatabaseError
from core.cache import delete_cache
import logging

logger = logging.getLogger(__name__)


class OrganisationActivityService(
    BaseService[
        OrganisationActivity,
        OrganisationActivityCreate,
        OrganisationActivityUpdate,
    ]
):
    """Service dédié à la timeline des organisations."""

    CACHE_PATTERN = "organisations:activity*"

    def __init__(self, db: Session):
        super().__init__(OrganisationActivity, db)

    async def record(
        self,
        *,
        organisation_id: int,
        activity_type: OrganisationActivityType,
        title: str,
        occurred_at: Optional[datetime] = None,
        preview: Optional[str] = None,
        actor_id: Optional[str] = None,
        actor_name: Optional[str] = None,
        actor_avatar_url: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> OrganisationActivity:
        """
        Enregistre une nouvelle activité (utilisé par les services métiers).
        """
        schema = OrganisationActivityCreate(
            organisation_id=organisation_id,
            occurred_at=occurred_at or datetime.utcnow(),
            type=activity_type,
            title=title,
            preview=preview,
            actor_id=actor_id,
            actor_name=actor_name,
            actor_avatar_url=actor_avatar_url,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
        )

        try:
            activity = await self.create(schema)
            self.invalidate_cache()

            logger.debug(
                "OrganisationActivity recorded (org=%s, type=%s, title=%s)",
                organisation_id,
                activity_type,
                title,
            )
            return activity
        except DatabaseError:
            raise
        except Exception as exc:
            logger.exception("Failed to record organisation activity: %s", exc)
            raise DatabaseError("Failed to record organisation activity") from exc

    async def get_timeline(
        self,
        organisation_id: int,
        *,
        limit: int = 20,
        before_id: Optional[int] = None,
        types: Optional[Iterable[OrganisationActivityType]] = None,
    ) -> List[OrganisationActivity]:
        """Retourne les activités d'une organisation triées par date décroissante."""

        try:
            query = self.db.query(OrganisationActivity).filter(
                OrganisationActivity.organisation_id == organisation_id
            )

            if types:
                query = query.filter(OrganisationActivity.type.in_(list(types)))

            if before_id:
                ref = (
                    self.db.query(OrganisationActivity)
                    .filter(OrganisationActivity.id == before_id)
                    .first()
                )
                if ref:
                    query = query.filter(
                        or_(
                            OrganisationActivity.occurred_at < ref.occurred_at,
                            and_(
                                OrganisationActivity.occurred_at == ref.occurred_at,
                                OrganisationActivity.id < ref.id,
                            ),
                        )
                    )

            items = (
                query.order_by(
                    OrganisationActivity.occurred_at.desc(),
                    OrganisationActivity.id.desc(),
                )
                .limit(limit)
                .all()
            )
            return items
        except Exception as exc:
            logger.exception("Failed to fetch organisation timeline: %s", exc)
            raise DatabaseError("Failed to fetch organisation timeline") from exc

    async def get_recent_for_user(
        self,
        *,
        organisation_ids: Iterable[int],
        limit: int = 50,
    ) -> List[OrganisationActivity]:
        """Retourne les activités récentes sur plusieurs organisations (widget)."""
        try:
            if not organisation_ids:
                return []

            query = (
                self.db.query(OrganisationActivity)
                .filter(OrganisationActivity.organisation_id.in_(list(organisation_ids)))
                .order_by(
                    OrganisationActivity.occurred_at.desc(),
                    OrganisationActivity.id.desc(),
                )
                .limit(limit)
            )
            return query.all()
        except Exception as exc:
            logger.exception("Failed to fetch widget activities: %s", exc)
            raise DatabaseError("Failed to fetch activities for widget") from exc

    async def get_recent(
        self,
        *,
        limit: int = 50,
        organisation_ids: Optional[Iterable[int]] = None,
        types: Optional[Iterable[OrganisationActivityType]] = None,
    ) -> List[OrganisationActivity]:
        """Retourne les activités les plus récentes selon les filtres fournis."""
        try:
            query = self.db.query(OrganisationActivity)

            if organisation_ids:
                query = query.filter(
                    OrganisationActivity.organisation_id.in_(list(organisation_ids))
                )
            if types:
                query = query.filter(OrganisationActivity.type.in_(list(types)))

            return (
                query.order_by(
                    OrganisationActivity.occurred_at.desc(),
                    OrganisationActivity.id.desc(),
                )
                .limit(limit)
                .all()
            )
        except Exception as exc:
            logger.exception("Failed to fetch recent organisation activities: %s", exc)
            raise DatabaseError("Failed to fetch recent organisation activities") from exc

    async def delete_activity(self, activity_id: int) -> bool:
        """Supprime une activité (utilisé pour corrections ponctuelles)."""
        try:
            activity = (
                self.db.query(OrganisationActivity)
                .filter(OrganisationActivity.id == activity_id)
                .first()
            )
            if not activity:
                raise ResourceNotFound("OrganisationActivity", activity_id)

            self.db.delete(activity)
            self.db.commit()
            self.invalidate_cache()
            return True
        except ResourceNotFound:
            raise
        except Exception as exc:
            self.db.rollback()
            logger.exception("Failed to delete organisation activity: %s", exc)
            raise DatabaseError("Failed to delete organisation activity") from exc

    def invalidate_cache(self):
        """Invalide le cache des timelines."""
        delete_cache(self.CACHE_PATTERN)
        delete_cache("dashboards:activity_widget*")

    async def count_for_organisation(
        self,
        organisation_id: int,
        *,
        types: Optional[Iterable[OrganisationActivityType]] = None,
    ) -> int:
        """Retourne le nombre total d'activités pour une organisation."""
        try:
            query = self.db.query(func.count(OrganisationActivity.id)).filter(
                OrganisationActivity.organisation_id == organisation_id
            )
            if types:
                query = query.filter(OrganisationActivity.type.in_(list(types)))
            return query.scalar() or 0
        except Exception as exc:
            logger.exception("Failed to count activities for organisation: %s", exc)
            raise DatabaseError("Failed to count organisation activities") from exc
