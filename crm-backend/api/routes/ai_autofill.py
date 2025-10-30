"""
Routes API pour suggestions autofill intelligentes (context menu).

Utilisé par le context menu (clic droit) sur les champs de formulaire
pour suggérer des valeurs basées sur l'historique.
"""

import logging
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, desc
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from auth.jwt import get_current_user
from models.user import User
from models.person import Person
from models.organisation import Organisation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/autofill", tags=["AI Autofill"])


# ============================================================================
# SCHEMAS
# ============================================================================

class FieldSuggestion(BaseModel):
    """Suggestion pour un champ."""

    value: str
    score: float  # 0-1, score de pertinence
    usage_count: int  # Nombre de fois utilisé
    last_used: Optional[datetime] = None
    source: str  # "person", "organisation", "ai_memory"


class SuggestionsResponse(BaseModel):
    """Réponse avec liste de suggestions."""

    field_name: str
    suggestions: List[FieldSuggestion]
    total_count: int


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/suggestions", response_model=SuggestionsResponse)
async def get_field_suggestions(
    field_name: str = Query(..., description="Nom du champ (phone, email, company, etc.)"),
    context_type: str = Query("person", description="Type de contexte (person ou organisation)"),
    limit: int = Query(5, ge=1, le=20, description="Nombre max de suggestions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Récupère des suggestions intelligentes pour un champ de formulaire.

    Utilisé par le context menu (clic droit) pour suggérer des valeurs
    basées sur l'historique de l'équipe.

    **Exemples:**
    - `field_name=phone` → Suggère les téléphones les plus utilisés
    - `field_name=email` → Suggère les emails récents
    - `field_name=company` → Suggère les noms d'entreprises

    **Scoring:**
    - Fréquence: Nombre d'occurrences (60%)
    - Récence: Dernière utilisation (40%)
    """
    team_id = current_user.team_id

    # Mapping champs → colonnes DB
    field_mappings = {
        # Person fields
        "phone": ("Person", "phone"),
        "mobile": ("Person", "mobile"),
        "email": ("Person", "email"),
        "company": ("Person", "company"),
        "job_title": ("Person", "job_title"),
        "website": ("Person", "website"),
        "linkedin": ("Person", "linkedin"),

        # Organisation fields
        "org_name": ("Organisation", "name"),
        "org_website": ("Organisation", "website"),
        "org_linkedin": ("Organisation", "linkedin"),
        "org_phone": ("Organisation", "phone"),
    }

    if field_name not in field_mappings:
        return SuggestionsResponse(
            field_name=field_name,
            suggestions=[],
            total_count=0,
        )

    model_name, column_name = field_mappings[field_name]

    # Récupérer les suggestions depuis la DB
    if model_name == "Person":
        suggestions = _get_person_suggestions(
            db, team_id, column_name, limit
        )
    elif model_name == "Organisation":
        suggestions = _get_organisation_suggestions(
            db, team_id, column_name, limit
        )
    else:
        suggestions = []

    return SuggestionsResponse(
        field_name=field_name,
        suggestions=suggestions,
        total_count=len(suggestions),
    )


def _get_person_suggestions(
    db: Session,
    team_id: int,
    column_name: str,
    limit: int,
) -> List[FieldSuggestion]:
    """
    Récupère les suggestions depuis la table Person.

    Groupe par valeur, compte les occurrences, trie par fréquence + récence.
    """
    column = getattr(Person, column_name)

    # Query: GROUP BY valeur, COUNT occurrences, MAX(updated_at)
    results = (
        db.query(
            column.label("value"),
            func.count(Person.id).label("usage_count"),
            func.max(Person.updated_at).label("last_used"),
        )
        .filter(
            Person.team_id == team_id,
            column.isnot(None),
            column != "",
        )
        .group_by(column)
        .order_by(
            desc("usage_count"),  # Trier par fréquence
            desc("last_used"),    # Puis par récence
        )
        .limit(limit)
        .all()
    )

    suggestions = []

    for row in results:
        # Calculer le score (fréquence 60% + récence 40%)
        freq_score = min(row.usage_count / 10.0, 1.0)  # Max 10 = score 1.0

        # Récence: plus récent = meilleur score
        if row.last_used:
            days_ago = (datetime.now() - row.last_used).days
            recency_score = max(1.0 - (days_ago / 365.0), 0.0)  # Dégrade sur 1 an
        else:
            recency_score = 0.0

        # Score final pondéré
        score = (freq_score * 0.6) + (recency_score * 0.4)

        suggestions.append(
            FieldSuggestion(
                value=row.value,
                score=round(score, 3),
                usage_count=row.usage_count,
                last_used=row.last_used,
                source="person",
            )
        )

    return suggestions


def _get_organisation_suggestions(
    db: Session,
    team_id: int,
    column_name: str,
    limit: int,
) -> List[FieldSuggestion]:
    """Récupère les suggestions depuis la table Organisation."""
    column = getattr(Organisation, column_name)

    results = (
        db.query(
            column.label("value"),
            func.count(Organisation.id).label("usage_count"),
            func.max(Organisation.updated_at).label("last_used"),
        )
        .filter(
            Organisation.team_id == team_id,
            column.isnot(None),
            column != "",
        )
        .group_by(column)
        .order_by(
            desc("usage_count"),
            desc("last_used"),
        )
        .limit(limit)
        .all()
    )

    suggestions = []

    for row in results:
        freq_score = min(row.usage_count / 10.0, 1.0)

        if row.last_used:
            days_ago = (datetime.now() - row.last_used).days
            recency_score = max(1.0 - (days_ago / 365.0), 0.0)
        else:
            recency_score = 0.0

        score = (freq_score * 0.6) + (recency_score * 0.4)

        suggestions.append(
            FieldSuggestion(
                value=row.value,
                score=round(score, 3),
                usage_count=row.usage_count,
                last_used=row.last_used,
                source="organisation",
            )
        )

    return suggestions


@router.get("/suggestions/stats")
async def get_suggestions_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Statistiques sur les suggestions disponibles.

    Retourne le nombre de valeurs uniques par champ.
    """
    team_id = current_user.team_id

    stats = {
        "person": {},
        "organisation": {},
    }

    # Stats Person
    for field in ["phone", "mobile", "email", "company", "job_title"]:
        column = getattr(Person, field)
        count = (
            db.query(func.count(func.distinct(column)))
            .filter(
                Person.team_id == team_id,
                column.isnot(None),
                column != "",
            )
            .scalar()
        )
        stats["person"][field] = count or 0

    # Stats Organisation
    for field in ["name", "website", "phone"]:
        column = getattr(Organisation, field)
        count = (
            db.query(func.count(func.distinct(column)))
            .filter(
                Organisation.team_id == team_id,
                column.isnot(None),
                column != "",
            )
            .scalar()
        )
        stats["organisation"][field] = count or 0

    return stats
