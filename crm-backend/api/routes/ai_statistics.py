"""
Routes API pour les statistiques d'autofill

Endpoints pour métriques et analytics sur l'utilisation de l'autofill V2
"""

import math
from datetime import datetime, timedelta, timezone
from statistics import mean
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from models.autofill_decision_log import AutofillDecisionLog
from models.autofill_log import AutofillLog
from models.user import User

router = APIRouter(prefix="/ai", tags=["AI Statistics"])


# ============================================
# Constants
# ============================================

# Limits for queries and UI display
MAX_DOMAIN_SAMPLES = 500  # Memory limit for domain confidence samples
TOP_FIELDS_LIMIT = 10     # Top fields to display in dashboard
LEADERBOARD_LIMIT = 10    # Top users in leaderboard


# ============================================
# Helpers
# ============================================


def _percentile(values: List[int], percentile: float) -> Optional[int]:
    """Calcule un percentile (0-1) sur une liste d'entiers."""
    if not values:
        return None
    values_sorted = sorted(values)
    if percentile <= 0:
        return values_sorted[0]
    if percentile >= 1:
        return values_sorted[-1]

    k = (len(values_sorted) - 1) * percentile
    lower_index = math.floor(k)
    upper_index = math.ceil(k)

    if lower_index == upper_index:
        return values_sorted[int(k)]

    lower_value = values_sorted[lower_index]
    upper_value = values_sorted[upper_index]
    return int(lower_value + (upper_value - lower_value) * (k - lower_index))


def _safe_divide(numerator: int, denominator: int) -> float:
    """Retourne un ratio arrondi, en évitant la division par zéro."""
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)


# ============================================
# Statistiques Autofill
# ============================================


@router.get("/autofill/stats")
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
    since = datetime.now(timezone.utc) - timedelta(days=days)

    now = datetime.now(timezone.utc)

    total_suggestions = (
        db.query(func.count(AutofillLog.id))
        .filter(AutofillLog.created_at >= since)
        .scalar()
        or 0
    )

    total_applied = (
        db.query(func.count(AutofillLog.id))
        .filter(
            AutofillLog.created_at >= since,
            AutofillLog.applied.is_(True),
        )
        .scalar()
        or 0
    )

    latency_rows = (
        db.query(AutofillLog.execution_time_ms)
        .filter(
            AutofillLog.created_at >= since,
            AutofillLog.execution_time_ms.isnot(None),
        )
        .all()
    )
    latency_values = [row[0] for row in latency_rows if row[0] is not None]

    avg_latency = int(mean(latency_values)) if latency_values else 0
    p50 = _percentile(latency_values, 0.5) or 0
    p95 = _percentile(latency_values, 0.95) or 0
    p99 = _percentile(latency_values, 0.99) or 0

    source_rows = (
        db.query(
            AutofillLog.source,
            func.count(AutofillLog.id).label("count"),
        )
        .filter(AutofillLog.created_at >= since)
        .group_by(AutofillLog.source)
        .all()
    )

    source_totals = {row.source: row.count for row in source_rows}
    source_mix = {}
    for key in ["rules", "db_pattern", "outlook", "llm"]:
        count = source_totals.get(key, 0)
        source_mix[key] = {
            "count": count,
            "percentage": _safe_divide(count, total_suggestions) * 100,
        }

    # Confidences par domaine (top 5)
    domain_confidence: Dict[str, List[float]] = {}
    domain_rows = (
        db.query(AutofillLog.new_value, AutofillLog.confidence)
        .filter(
            AutofillLog.created_at >= since,
            AutofillLog.field == "email",
            AutofillLog.source.in_(["db_pattern"]),
            AutofillLog.new_value.isnot(None),
        )
        .limit(MAX_DOMAIN_SAMPLES)
        .all()
    )
    for email_value, confidence in domain_rows:
        if not email_value or "@" not in email_value:
            continue
        domain = email_value.split("@", 1)[1].lower()
        domain_confidence.setdefault(domain, []).append(confidence)

    pattern_confidence_by_domain = []
    for domain, confidences in sorted(
        domain_confidence.items(), key=lambda item: len(item[1]), reverse=True
    )[:5]:
        pattern_confidence_by_domain.append(
            {
                "domain": domain,
                "samples": len(confidences),
                "avg_confidence": round(sum(confidences) / len(confidences), 3),
            }
        )

    # Top champs
    top_fields_rows = (
        db.query(
            AutofillLog.field.label("field"),
            func.count(AutofillLog.id).label("count"),
            func.sum(
                case((AutofillLog.applied.is_(True), 1), else_=0)
            ).label("applied"),
        )
        .filter(AutofillLog.created_at >= since)
        .group_by(AutofillLog.field)
        .order_by(func.count(AutofillLog.id).desc())
        .limit(TOP_FIELDS_LIMIT)
        .all()
    )

    top_fields = []
    for row in top_fields_rows:
        applied_count = int(row.applied or 0)
        count = int(row.count or 0)
        top_fields.append(
            {
                "field": row.field,
                "count": count,
                "apply_rate": _safe_divide(applied_count, count),
            }
        )

    return {
        "period": {
            "days": days,
            "since": since.isoformat(),
            "until": now.isoformat(),
        },
        "apply_rate": {
            "total_suggestions": total_suggestions,
            "total_applied": total_applied,
            "rate": _safe_divide(total_applied, total_suggestions),
        },
        "avg_latency_ms": {
            "value": avg_latency,
            "p50": p50,
            "p95": p95,
            "p99": p99,
        },
        "source_mix": source_mix,
        "pattern_confidence_by_domain": pattern_confidence_by_domain,
        "top_fields": top_fields,
    }


@router.get("/autofill/stats/timeline")
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

    since = datetime.now(timezone.utc) - timedelta(days=days - 1)

    rows = (
        db.query(
            func.date_trunc("day", AutofillLog.created_at).label("bucket"),
            func.count(AutofillLog.id).label("suggestions"),
            func.sum(
                case((AutofillLog.applied.is_(True), 1), else_=0)
            ).label("applied"),
        )
        .filter(AutofillLog.created_at >= since)
        .group_by("bucket")
        .order_by("bucket")
        .all()
    )

    data_by_day = {
        row.bucket.date(): {
            "suggestions": int(row.suggestions or 0),
            "applied": int(row.applied or 0),
        }
        for row in rows
        if row.bucket is not None
    }

    timeline: List[Dict[str, float]] = []
    for offset in range(days):
        day = (since + timedelta(days=offset)).date()
        entry = data_by_day.get(day, {"suggestions": 0, "applied": 0})
        apply_rate = _safe_divide(entry["applied"], entry["suggestions"])
        timeline.append(
            {
                "date": day.isoformat(),
                "suggestions": entry["suggestions"],
                "applied": entry["applied"],
                "apply_rate": apply_rate,
            }
        )

    return {
        "period": {"days": days},
        "timeline": timeline,
    }


@router.get("/autofill/stats/leaderboard")
async def get_autofill_leaderboard(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Top utilisateurs de l'autofill (gamification interne)

    Affiche qui utilise le plus l'autofill pour encourager l'adoption
    """

    # Par défaut: période glissante de 30 jours
    since = datetime.now(timezone.utc) - timedelta(days=30)

    rows = (
        db.query(
            AutofillLog.user_id.label("user_id"),
            func.count(AutofillLog.id).label("suggestions"),
            func.sum(
                case((AutofillLog.applied.is_(True), 1), else_=0)
            ).label("applied"),
        )
        .filter(AutofillLog.created_at >= since)
        .group_by(AutofillLog.user_id)
        .having(func.count(AutofillLog.id) > 0)
        .order_by(func.count(AutofillLog.id).desc())
        .limit(LEADERBOARD_LIMIT)
        .all()
    )

    user_ids = [row.user_id for row in rows if row.user_id is not None]
    users = (
        db.query(User.id, User.full_name, User.email)
        .filter(User.id.in_(user_ids))
        .all()
        if user_ids
        else []
    )
    user_lookup = {row.id: (row.full_name or row.email or f"User {row.id}") for row in users}

    leaderboard = []
    for idx, row in enumerate(rows, start=1):
        user_id = row.user_id
        suggestions = int(row.suggestions or 0)
        applied = int(row.applied or 0)
        leaderboard.append(
            {
                "rank": idx,
                "user_id": user_id,
                "user_name": user_lookup.get(user_id, f"User {user_id}"),
                "total_suggestions": suggestions,
                "total_applied": applied,
                "apply_rate": _safe_divide(applied, suggestions),
            }
        )

    return {
        "period": {"days": 30},
        "leaderboard": leaderboard,
    }
