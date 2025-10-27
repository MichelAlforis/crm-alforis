"""
Routes API pour les statistiques d'autofill

Endpoints pour métriques et analytics sur l'utilisation de l'autofill V2
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from core import get_current_user, get_db

router = APIRouter(prefix="/ai", tags=["AI Statistics"])


# ============================================
# Statistiques Autofill
# ============================================


@router.get("/statistics")
async def get_autofill_statistics(
    days: int = Query(7, ge=1, le=90, description="Nombre de jours à analyser"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Statistiques d'utilisation de l'autofill V2

    Métriques clés:
    - Taux d'application (apply_rate)
    - Latence moyenne (avg_latency_ms)
    - Mix de sources (% outlook|rules|db|llm)
    - Confiance moyenne par domaine
    """

    # Date de début
    since = datetime.utcnow() - timedelta(days=days)

    # Requête pour les logs
    # NOTE: Cette requête nécessite la table autofill_logs
    # Pour l'instant, on retourne des données mockées

    # TODO: Implémenter les vraies requêtes SQL quand les logs commencent à arriver
    # Exemple de requêtes:
    #
    # # Total suggestions vs appliquées
    # total_suggestions = db.query(func.count(AutofillLog.id))\
    #     .filter(AutofillLog.created_at >= since)\
    #     .scalar()
    #
    # total_applied = db.query(func.count(AutofillLog.id))\
    #     .filter(AutofillLog.created_at >= since, AutofillLog.applied == True)\
    #     .scalar()
    #
    # # Latence moyenne
    # avg_latency = db.query(func.avg(AutofillLog.execution_time_ms))\
    #     .filter(AutofillLog.created_at >= since)\
    #     .scalar()
    #
    # # Mix de sources
    # source_mix = db.query(
    #     AutofillLog.source,
    #     func.count(AutofillLog.id).label('count')
    # ).filter(AutofillLog.created_at >= since)\
    #  .group_by(AutofillLog.source)\
    #  .all()

    # Données mockées pour démo
    return {
        "period": {
            "days": days,
            "since": since.isoformat(),
            "until": datetime.utcnow().isoformat(),
        },
        "apply_rate": {
            "total_suggestions": 0,
            "total_applied": 0,
            "rate": 0.0,
            "note": "Pas encore de données - commencez à utiliser l'autofill",
        },
        "avg_latency_ms": {
            "value": 0,
            "p50": 0,
            "p95": 0,
            "p99": 0,
        },
        "source_mix": {
            "rules": {"count": 0, "percentage": 0.0},
            "db_pattern": {"count": 0, "percentage": 0.0},
            "outlook": {"count": 0, "percentage": 0.0},
            "llm": {"count": 0, "percentage": 0.0},
        },
        "pattern_confidence_by_domain": [],
        "top_fields": [
            {"field": "email", "count": 0, "apply_rate": 0.0},
            {"field": "phone", "count": 0, "apply_rate": 0.0},
            {"field": "country", "count": 0, "apply_rate": 0.0},
        ],
    }


@router.get("/statistics/timeline")
async def get_autofill_timeline(
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Timeline des suggestions et applications par jour

    Retourne un graphique jour par jour avec:
    - Nombre de suggestions
    - Nombre d'applications
    - Taux d'application
    """

    # TODO: Implémenter quand les logs arrivent
    # Requête GROUP BY DATE(created_at)

    return {
        "period": {"days": days},
        "timeline": [
            {
                "date": (datetime.utcnow() - timedelta(days=i)).date().isoformat(),
                "suggestions": 0,
                "applied": 0,
                "apply_rate": 0.0,
            }
            for i in range(days - 1, -1, -1)
        ],
    }


@router.get("/statistics/leaderboard")
async def get_autofill_leaderboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Top utilisateurs de l'autofill (gamification interne)

    Affiche qui utilise le plus l'autofill pour encourager l'adoption
    """

    # TODO: Implémenter avec vraies données
    # GROUP BY user_id avec COUNT et apply_rate

    return {
        "leaderboard": [
            {
                "user_id": current_user["sub"],
                "user_name": current_user.get("name", "Vous"),
                "total_suggestions": 0,
                "total_applied": 0,
                "apply_rate": 0.0,
                "rank": 1,
            }
        ],
        "note": "Utilisez l'autofill pour apparaître dans le classement",
    }
