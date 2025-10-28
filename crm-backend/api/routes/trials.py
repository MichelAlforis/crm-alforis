"""
Routes API pour Trial Management.

Endpoints:
- GET /api/v1/trials/status - Statut trial utilisateur
- POST /api/v1/trials/extend - Prolonger trial (admin only)
- POST /api/v1/trials/convert - Convertir en payant
- GET /api/v1/trials/stats - Statistiques trials (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import get_current_user
from models.user import User
from services.trial_service import TrialService

router = APIRouter(prefix="/trials", tags=["trials"])


# ============================================================
# Schemas Pydantic
# ============================================================

class TrialStatusResponse(BaseModel):
    """Statut trial utilisateur."""
    user_id: int
    email: str
    subscription_status: str = Field(..., description="trial, active, grace_period, expired, cancelled")
    trial_started_at: str | None
    trial_ends_at: str | None
    days_remaining: int
    is_trial_active: bool
    is_in_grace_period: bool
    trial_converted_at: str | None


class TrialExtendRequest(BaseModel):
    """Requête prolongation trial."""
    user_id: int = Field(..., description="ID utilisateur à prolonger")
    extra_days: int = Field(..., ge=1, le=30, description="Nombre de jours supplémentaires (1-30)")
    reason: str = Field(..., min_length=10, max_length=500, description="Raison de la prolongation")


class TrialStatsResponse(BaseModel):
    """Statistiques trials."""
    active_trials: int
    grace_period: int
    expired: int
    active_subscriptions: int
    cancelled: int
    total_conversions: int
    conversion_rate: float
    expiring_soon_7d: int


# ============================================================
# Endpoints
# ============================================================

@router.get("/status", response_model=TrialStatusResponse)
async def get_trial_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Récupère le statut trial de l'utilisateur connecté.

    Returns:
        TrialStatusResponse: Informations complètes sur le trial
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    # Vérifier expiration (mise à jour statut si nécessaire)
    TrialService.check_expiration(user, db)
    db.refresh(user)

    return TrialStatusResponse(
        user_id=user.id,
        email=user.email,
        subscription_status=user.subscription_status,
        trial_started_at=user.trial_started_at.isoformat() if user.trial_started_at else None,
        trial_ends_at=user.trial_ends_at.isoformat() if user.trial_ends_at else None,
        days_remaining=user.days_remaining_trial,
        is_trial_active=user.is_trial_active,
        is_in_grace_period=user.is_in_grace_period,
        trial_converted_at=user.trial_converted_at.isoformat() if user.trial_converted_at else None,
    )


@router.post("/extend")
async def extend_trial(
    request: TrialExtendRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Prolonge un trial (ADMIN ONLY).

    Use case: Support client demande prolongation car problème technique/découverte produit.

    Args:
        request: User ID + durée + raison

    Returns:
        dict: Confirmation prolongation
    """
    # Vérifier que l'utilisateur connecté est admin
    is_admin = current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs peuvent prolonger les trials"
        )

    # Récupérer utilisateur cible
    target_user = db.query(User).filter(User.id == request.user_id).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if target_user.subscription_status not in ["trial", "grace_period"]:
        raise HTTPException(
            status_code=400,
            detail=f"Impossible de prolonger: statut actuel = {target_user.subscription_status}"
        )

    # Prolonger trial
    old_end = target_user.trial_ends_at
    TrialService.extend_trial(
        user=target_user,
        db=db,
        extra_days=request.extra_days,
        reason=request.reason
    )

    return {
        "success": True,
        "user_id": target_user.id,
        "email": target_user.email,
        "old_trial_end": old_end.isoformat() if old_end else None,
        "new_trial_end": target_user.trial_ends_at.isoformat(),
        "extra_days": request.extra_days,
        "reason": request.reason,
        "message": f"Trial prolongé de {request.extra_days} jour(s)"
    }


@router.post("/convert")
async def convert_trial_to_paid(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Convertit le trial en abonnement payant.

    Appelé après ajout du paiement (Stripe webhook ou manuel).

    Returns:
        dict: Confirmation conversion
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if user.subscription_status == "active":
        return {
            "success": True,
            "already_active": True,
            "message": "Abonnement déjà actif"
        }

    # Convertir
    TrialService.convert_to_paid(user, db)

    return {
        "success": True,
        "user_id": user.id,
        "email": user.email,
        "subscription_status": user.subscription_status,
        "converted_at": user.trial_converted_at.isoformat() if user.trial_converted_at else None,
        "message": "Trial converti en abonnement payant avec succès"
    }


@router.get("/stats", response_model=TrialStatsResponse)
async def get_trial_stats(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Récupère les statistiques sur les trials (ADMIN ONLY).

    Returns:
        TrialStatsResponse: Stats complètes
    """
    # Vérifier admin
    is_admin = current_user.get("is_admin", False)
    if not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Seuls les administrateurs peuvent voir les statistiques"
        )

    stats = TrialService.get_trial_stats(db)

    return TrialStatsResponse(**stats)


@router.post("/cancel")
async def cancel_subscription(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Annule l'abonnement de l'utilisateur connecté.

    Returns:
        dict: Confirmation annulation
    """
    user_id = int(current_user.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if user.subscription_status == "cancelled":
        return {
            "success": True,
            "already_cancelled": True,
            "message": "Abonnement déjà annulé"
        }

    # Annuler
    TrialService.cancel_subscription(user, db, reason="User request")

    return {
        "success": True,
        "user_id": user.id,
        "email": user.email,
        "subscription_status": user.subscription_status,
        "message": "Abonnement annulé. Vous pouvez le réactiver à tout moment."
    }
