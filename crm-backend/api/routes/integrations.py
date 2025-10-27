"""
Routes API pour les intégrations externes

Endpoints:
- POST /integrations/outlook/authorize - Démarrer OAuth Outlook
- GET /integrations/outlook/callback - Callback OAuth
- GET /integrations/outlook/sync - Synchroniser emails
- GET /integrations/outlook/signatures - Liste signatures extraites
- POST /ai/autofill/v2 - Autofill V2 avec multi-sources
"""

import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.encryption import decrypt_value, encrypt_value
from models.user import User
from schemas.integrations import (
    AutofillV2Request,
    AutofillV2Response,
    OutlookAuthorizeResponse,
    OutlookCallbackRequest,
    OutlookCallbackResponse,
    OutlookSignaturesResponse,
    OutlookSyncResponse,
)
from services.autofill_service_v2 import AutofillServiceV2
from services.outlook_integration import OutlookIntegration

router = APIRouter(prefix="/integrations", tags=["Integrations"])


# ==========================================
# Outlook OAuth
# ==========================================


@router.post("/outlook/authorize", response_model=OutlookAuthorizeResponse)
async def outlook_authorize(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Démarre le flow OAuth Outlook

    Génère l'URL d'autorisation Microsoft et un state CSRF
    """
    outlook_service = OutlookIntegration(db)

    # Générer state CSRF
    state = secrets.token_urlsafe(32)

    # Stocker state temporairement (TODO: Redis ou session)
    # Pour l'instant, on retourne juste l'URL

    authorization_url = outlook_service.get_authorization_url(state)

    return {
        "authorization_url": authorization_url,
        "state": state,
    }


@router.post("/outlook/callback", response_model=OutlookCallbackResponse)
async def outlook_callback(
    request: OutlookCallbackRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Callback OAuth Outlook

    Échange le code contre un access token et le stocke chiffré
    """
    outlook_service = OutlookIntegration(db)

    # TODO: Vérifier state CSRF

    # Échanger code contre token
    token_data = await outlook_service.exchange_code_for_token(request.code)

    # Récupérer user
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Stocker tokens chiffrés
    user.encrypted_outlook_access_token = encrypt_value(token_data["access_token"])
    user.encrypted_outlook_refresh_token = encrypt_value(token_data["refresh_token"])
    user.outlook_token_expires_at = datetime.utcnow() + timedelta(
        seconds=token_data.get("expires_in", 3600)
    )
    user.outlook_connected = True

    db.commit()

    return {
        "status": "connected",
        "message": "Outlook connecté avec succès",
        "expires_in": token_data.get("expires_in"),
    }


@router.get("/outlook/sync", response_model=OutlookSyncResponse)
async def outlook_sync(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Synchronise les emails Outlook

    Récupère les messages récents et extrait les signatures
    """
    outlook_service = OutlookIntegration(db)

    # Récupérer user
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    # Déchiffrer token
    access_token = decrypt_value(user.encrypted_outlook_access_token)

    # TODO: Vérifier expiration et refresh si nécessaire

    # Récupérer messages
    messages = await outlook_service.get_recent_messages(access_token, limit=limit)

    # Extraire signatures
    signatures = outlook_service.extract_signatures_from_messages(messages)

    return {
        "messages_count": len(messages),
        "signatures_count": len(signatures),
        "signatures": signatures,
    }


@router.get("/outlook/signatures", response_model=OutlookSignaturesResponse)
async def outlook_get_signatures(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère les signatures Outlook stockées

    TODO: Implémenter table outlook_signatures pour persistance
    """
    # Pour l'instant, renvoyer empty
    return {"signatures": []}


# ==========================================
# Autofill V2
# ==========================================


@router.post("/ai/autofill/v2", response_model=AutofillV2Response)
async def autofill_v2(
    request: AutofillV2Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Autofill prédictif V2 avec pipeline multi-sources

    Pipeline:
    1. Rules (10ms) - Pays/langue/téléphone
    2. DB Patterns (20ms) - Patterns email existants
    3. Outlook (50ms) - Signatures emails
    4. LLM Fallback (300ms) - Si incertitude et budget

    Seuils:
    - auto_apply si confidence ≥ 0.85
    - Pattern email auto si ≥2 contacts confirmés
    """
    autofill_service = AutofillServiceV2(db)

    # Récupérer user pour Outlook
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    # Préparer context
    context = request.context or {}

    # Ajouter Outlook si connecté
    if user and user.outlook_connected:
        context["outlook_enabled"] = True
        context["outlook_access_token"] = decrypt_value(
            user.encrypted_outlook_access_token
        )
    else:
        context["outlook_enabled"] = False

    # Budget mode par défaut
    if "budget_mode" not in context:
        context["budget_mode"] = "normal"

    # Exécuter autofill
    result = await autofill_service.autofill(
        entity_type=request.entity_type,
        draft=request.draft,
        context=context,
    )

    return result
