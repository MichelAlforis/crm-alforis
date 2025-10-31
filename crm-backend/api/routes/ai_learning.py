"""
AI Learning API Routes - Phase 3: AI Memory & Learning System

Endpoints pour tracker et exploiter les préférences utilisateur.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

import logging

from core import get_db, get_current_user
from models.user import User
from services.ai_learning_service import AILearningService

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/ai/learning", tags=["AI Learning"])


# ============= SCHEMAS =============

class TrackChoiceRequest(BaseModel):
    """Request pour tracker un choix utilisateur"""
    field_name: str = Field(..., description="Nom du champ (role, personal_email, etc.)")
    context_type: str = Field(..., description="Type de contexte (person, organisation)")
    action: str = Field(..., description="Action user (accept, reject, manual, ignore)")
    suggested_value: Optional[str] = Field(None, description="Valeur suggérée par l'IA")
    final_value: Optional[str] = Field(None, description="Valeur finale choisie")
    suggestion_source: Optional[str] = Field(None, description="Source suggestion")
    suggestion_confidence: Optional[float] = Field(None, description="Score de confiance")
    suggestion_rank: Optional[int] = Field(None, description="Position dans liste")
    entity_id: Optional[int] = Field(None, description="ID entité concernée")
    extra_metadata: Optional[dict] = Field(None, description="Metadata additionnelle")


class TrackChoiceResponse(BaseModel):
    """Response après tracking"""
    success: bool
    preference_id: int
    message: str


class Pattern(BaseModel):
    """Pattern détecté"""
    value: str
    frequency: int
    last_used_days_ago: Optional[int]
    pattern_type: str  # "accepted", "team"


class PatternsResponse(BaseModel):
    """Response patterns détectés"""
    field_name: str
    user_patterns: List[Pattern]
    team_patterns: List[Pattern]
    total_patterns: int


class UserStatsResponse(BaseModel):
    """Statistiques apprentissage utilisateur"""
    total_choices: int
    accepted_count: int
    accept_rate: float
    top_fields: List[dict]


# ============= ENDPOINTS =============

@router.post("/track", response_model=TrackChoiceResponse, status_code=status.HTTP_201_CREATED)
async def track_user_choice(
    request: TrackChoiceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    **Track un choix utilisateur sur une suggestion IA**

    Utilisé par le Context Menu pour apprendre des préférences user.

    **Actions possibles:**
    - `accept`: User a accepté et appliqué la suggestion
    - `reject`: User a refusé la suggestion
    - `manual`: User a saisi manuellement une autre valeur
    - `ignore`: User a fermé le menu sans action

    **Retention RGPD:** 90 jours, puis auto-suppression
    """
    try:
        service = AILearningService(db)

        preference = service.track_choice(
            user_id=current_user.id,
            team_id=current_user.team_id,
            field_name=request.field_name,
            context_type=request.context_type,
            action=request.action,
            suggested_value=request.suggested_value,
            final_value=request.final_value,
            suggestion_source=request.suggestion_source,
            suggestion_confidence=request.suggestion_confidence,
            suggestion_rank=request.suggestion_rank,
            entity_id=request.entity_id,
            extra_metadata=request.extra_metadata,
        )

        return TrackChoiceResponse(
            success=True,
            preference_id=preference.id,
            message=f"Choice tracked successfully (action={request.action})",
        )

    except Exception as e:
        logger.error(f"[AILearning API] Error tracking choice: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error tracking choice: {str(e)}",
        )


@router.get("/patterns", response_model=PatternsResponse)
async def get_learned_patterns(
    field_name: str = Query(..., description="Nom du champ"),
    limit: int = Query(10, ge=1, le=50, description="Nombre max de patterns"),
    days_back: int = Query(90, ge=1, le=365, description="Nombre de jours à analyser"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    **Get patterns appris pour un champ donné**

    Retourne:
    - **User patterns**: Patterns personnels de l'utilisateur
    - **Team patterns**: Patterns de l'équipe (si pas assez de data user)

    Utile pour améliorer les suggestions du Context Menu.
    """
    try:
        service = AILearningService(db)

        user_patterns = service.get_user_patterns(
            user_id=current_user.id,
            field_name=field_name,
            limit=limit,
            days_back=days_back,
        )

        team_patterns = service.get_team_patterns(
            team_id=current_user.team_id,
            field_name=field_name,
            limit=limit,
            days_back=days_back,
        )

        return PatternsResponse(
            field_name=field_name,
            user_patterns=[Pattern(**p) for p in user_patterns],
            team_patterns=[Pattern(**p) for p in team_patterns],
            total_patterns=len(user_patterns) + len(team_patterns),
        )

    except Exception as e:
        logger.error(f"[AILearning API] Error getting patterns: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting patterns: {str(e)}",
        )


@router.get("/stats", response_model=UserStatsResponse)
async def get_user_learning_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    **Statistiques d'apprentissage de l'utilisateur**

    - Total de choix trackés
    - Taux d'acceptation des suggestions
    - Top champs utilisés
    """
    try:
        service = AILearningService(db)
        stats = service.get_user_stats(current_user.id)

        return UserStatsResponse(**stats)

    except Exception as e:
        logger.error(f"[AILearning API] Error getting stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}",
        )


@router.delete("/preferences", status_code=status.HTTP_200_OK)
async def delete_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    **RGPD: Supprimer toutes les préférences utilisateur (Right to be Forgotten)**

    Supprime définitivement toutes les préférences apprises de l'utilisateur.
    """
    try:
        service = AILearningService(db)
        deleted_count = service.delete_user_preferences(current_user.id)

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Deleted {deleted_count} preferences for user {current_user.id}",
        }

    except Exception as e:
        logger.error(f"[AILearning API] Error deleting preferences: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting preferences: {str(e)}",
        )


@router.post("/cleanup", status_code=status.HTTP_200_OK)
async def cleanup_expired_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    **RGPD: Cleanup automatique des préférences expirées (90 jours)**

    Admin only: Nettoie les préférences expirées.
    Normalement appelé par Celery CRON hebdomadaire.
    """
    # TODO: Add admin check
    try:
        service = AILearningService(db)
        deleted_count = service.cleanup_expired_preferences()

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleaned up {deleted_count} expired preferences",
        }

    except Exception as e:
        logger.error(f"[AILearning API] Error cleaning up: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error cleaning up: {str(e)}",
        )
