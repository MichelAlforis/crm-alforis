# routers/help.py
# API endpoints pour le système d'aide et analytics

from datetime import datetime, timedelta
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from models import User

router = APIRouter(prefix="/help", tags=["help"])


# ===============================
# SCHEMAS
# ===============================


class HelpAnalyticsEvent(BaseModel):
    """Événement d'interaction avec le système d'aide"""

    event_type: Literal[
        "faq_view",
        "faq_search",
        "guide_view",
        "tooltip_hover",
        "tooltip_learn_more_click",
        "article_rating",
        "support_contact",
    ]
    target_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    timestamp: str


class HelpAnalyticsStats(BaseModel):
    """Statistiques agrégées du système d'aide"""

    total_events: int
    top_faq: List[Dict[str, Any]]
    top_guides: List[Dict[str, Any]]
    top_tooltips: List[Dict[str, Any]]
    ratings_summary: Dict[str, Any]
    period: str


# ===============================
# ENDPOINTS
# ===============================


@router.post("/analytics", status_code=201)
async def track_help_event(
    event: HelpAnalyticsEvent,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Track une interaction avec le système d'aide

    Événements supportés :
    - faq_view : Vue d'une question FAQ
    - faq_search : Recherche dans la FAQ
    - guide_view : Consultation d'un guide
    - tooltip_hover : Survol d'un tooltip
    - tooltip_learn_more_click : Clic "En savoir plus" dans tooltip
    - article_rating : Rating d'un article (positif/négatif)
    - support_contact : Contact du support
    """
    try:
        # Import model ici pour éviter circular imports
        from models import HelpAnalyticsEvent

        # Créer l'événement
        db_event = HelpAnalyticsEvent(
            user_id=current_user.id,
            event_type=event.event_type,
            target_id=event.target_id,
            event_metadata=event.metadata,
            timestamp=datetime.fromisoformat(event.timestamp.replace("Z", "+00:00")),
        )

        db.add(db_event)
        db.commit()
        db.refresh(db_event)

        return {"status": "tracked", "event_id": db_event.id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to track event: {str(e)}")


@router.get("/analytics/stats", response_model=HelpAnalyticsStats)
async def get_help_analytics_stats(
    period: Literal["7d", "30d", "90d", "all"] = "30d",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Récupère les statistiques agrégées du système d'aide

    Params:
    - period: Période d'analyse (7d, 30d, 90d, all)

    Returns:
    - Statistiques complètes : top FAQ, guides, tooltips, ratings
    """
    try:
        from sqlalchemy import desc, func

        from models import HelpAnalyticsEvent

        # Calculer date de début selon période
        if period == "7d":
            start_date = datetime.now() - timedelta(days=7)
        elif period == "30d":
            start_date = datetime.now() - timedelta(days=30)
        elif period == "90d":
            start_date = datetime.now() - timedelta(days=90)
        else:  # all
            start_date = datetime.min

        # Query de base avec filtre période
        base_query = db.query(HelpAnalyticsEvent).filter(HelpAnalyticsEvent.timestamp >= start_date)

        # Total événements
        total_events = base_query.count()

        # Top 10 FAQ vues
        top_faq = (
            base_query.filter(HelpAnalyticsEvent.event_type == "faq_view")
            .with_entities(HelpAnalyticsEvent.target_id, func.count().label("count"))
            .group_by(HelpAnalyticsEvent.target_id)
            .order_by(desc("count"))
            .limit(10)
            .all()
        )

        # Top 10 Guides consultés
        top_guides = (
            base_query.filter(HelpAnalyticsEvent.event_type == "guide_view")
            .with_entities(HelpAnalyticsEvent.target_id, func.count().label("count"))
            .group_by(HelpAnalyticsEvent.target_id)
            .order_by(desc("count"))
            .limit(10)
            .all()
        )

        # Top 10 Tooltips survolés
        top_tooltips = (
            base_query.filter(HelpAnalyticsEvent.event_type == "tooltip_hover")
            .with_entities(HelpAnalyticsEvent.target_id, func.count().label("count"))
            .group_by(HelpAnalyticsEvent.target_id)
            .order_by(desc("count"))
            .limit(10)
            .all()
        )

        # Ratings summary
        ratings_events = base_query.filter(HelpAnalyticsEvent.event_type == "article_rating").all()

        positive_ratings = sum(
            1
            for e in ratings_events
            if e.event_metadata and e.event_metadata.get("rating") == "positive"
        )
        negative_ratings = sum(
            1
            for e in ratings_events
            if e.event_metadata and e.event_metadata.get("rating") == "negative"
        )
        total_ratings = positive_ratings + negative_ratings
        satisfaction_rate = (positive_ratings / total_ratings * 100) if total_ratings > 0 else 0

        ratings_summary = {
            "total": total_ratings,
            "positive": positive_ratings,
            "negative": negative_ratings,
            "satisfaction_rate": round(satisfaction_rate, 1),
        }

        return HelpAnalyticsStats(
            total_events=total_events,
            top_faq=[{"id": item[0], "views": item[1]} for item in top_faq],
            top_guides=[{"id": item[0], "views": item[1]} for item in top_guides],
            top_tooltips=[{"id": item[0], "hovers": item[1]} for item in top_tooltips],
            ratings_summary=ratings_summary,
            period=period,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/analytics/export")
async def export_help_analytics(
    period: Literal["7d", "30d", "90d", "all"] = "30d",
    format: Literal["csv", "json"] = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Exporte les données analytics en CSV ou JSON

    Params:
    - period: Période d'analyse
    - format: Format export (csv/json)

    Returns:
    - Fichier CSV ou JSON des événements
    """
    try:
        import csv
        import io

        from fastapi.responses import StreamingResponse

        from models import HelpAnalyticsEvent

        # Calculer date de début
        if period == "7d":
            start_date = datetime.now() - timedelta(days=7)
        elif period == "30d":
            start_date = datetime.now() - timedelta(days=30)
        elif period == "90d":
            start_date = datetime.now() - timedelta(days=90)
        else:
            start_date = datetime.min

        # Query événements
        events = (
            db.query(HelpAnalyticsEvent)
            .filter(HelpAnalyticsEvent.timestamp >= start_date)
            .order_by(HelpAnalyticsEvent.timestamp.desc())
            .all()
        )

        if format == "csv":
            # Export CSV
            output = io.StringIO()
            writer = csv.writer(output)

            # Headers
            writer.writerow(["ID", "User ID", "Event Type", "Target ID", "Metadata", "Timestamp"])

            # Data
            for event in events:
                writer.writerow(
                    [
                        event.id,
                        event.user_id,
                        event.event_type,
                        event.target_id or "",
                        str(event.event_metadata) if event.event_metadata else "",
                        event.timestamp.isoformat(),
                    ]
                )

            output.seek(0)

            return StreamingResponse(
                iter([output.getvalue()]),
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=help_analytics_{period}.csv"
                },
            )

        else:  # JSON
            return {
                "period": period,
                "count": len(events),
                "events": [
                    {
                        "id": e.id,
                        "user_id": e.user_id,
                        "event_type": e.event_type,
                        "target_id": e.target_id,
                        "metadata": e.event_metadata,
                        "timestamp": e.timestamp.isoformat(),
                    }
                    for e in events
                ],
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")
