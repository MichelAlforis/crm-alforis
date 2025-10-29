"""
Routes API pour les intégrations externes

Endpoints:
- POST /integrations/outlook/authorize - Démarrer OAuth Outlook
- GET /integrations/outlook/callback - Callback OAuth
- GET /integrations/outlook/sync - Synchroniser emails
- GET /integrations/outlook/signatures - Liste signatures extraites
- POST /ai/autofill/v2 - Autofill V2 avec multi-sources
"""

import hashlib
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.encryption import encrypt_value
from models.autofill_decision_log import AutofillDecisionLog
from models.user import User
from models.user_email_account import UserEmailAccount
from schemas.integrations import (
    AutofillApplyRequest,
    AutofillApplyResponse,
    AutofillPreviewRequest,
    AutofillPreviewResponse,
    AutofillV2Request,
    AutofillV2Response,
    InteractionSuggestion,
    MatchAction,
    OutlookAuthorizeResponse,
    OutlookCallbackRequest,
    OutlookCallbackResponse,
    OutlookSignaturesResponse,
    OutlookSyncResponse,
)
from services.autofill_apply_service import AutofillApplyService
from services.autofill_service_v2 import AutofillServiceV2
from services.interaction_suggestion_service import InteractionSuggestionService
from services.matching_scorer import MatchingScorer
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

    user_id = current_user.get("user_id") or current_user.get("sub")
    login_hint = current_user.get("email")

    if user_id:
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
        except (ValueError, TypeError):
            user = db.query(User).filter(User.email == user_id).first()
        if user and user.email:
            login_hint = user.email

    authorization_url = outlook_service.get_authorization_url(
        state,
        login_hint=login_hint,
    )

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

    if not token_data.get("refresh_token"):
        raise HTTPException(
            status_code=400,
            detail="Permission offline_access absente. Veuillez reconnecter Outlook en accordant l'accès hors ligne.",
        )

    identity = await outlook_service.validate_token_identity(token_data)
    microsoft_email = identity.get("email")
    microsoft_profile = identity.get("profile", {})

    # Récupérer user
    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except (ValueError, TypeError):
        user = db.query(User).filter(
            (User.username == user_id) | (User.email == user_id)
        ).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    expires_in_raw = token_data.get("expires_in", 3600)
    try:
        expires_in = int(expires_in_raw)
    except (TypeError, ValueError):
        expires_in = 3600

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Stocker tokens chiffrés (legacy - pour compatibilité)
    user.encrypted_outlook_access_token = encrypt_value(token_data["access_token"])
    user.encrypted_outlook_refresh_token = encrypt_value(token_data["refresh_token"])
    user.outlook_token_expires_at = expires_at
    user.outlook_connected = True

    # Enregistrer le consentement RGPD (implicite via le flow OAuth)
    user.outlook_consent_given = True
    user.outlook_consent_date = datetime.now(timezone.utc)

    db.add(user)
    db.commit()
    db.refresh(user)

    # Créer/mettre à jour l'entrée dans user_email_accounts (multi-adresse)
    from models.user_email_account import UserEmailAccount

    if microsoft_email:
        email_account = (
            db.query(UserEmailAccount)
            .filter(
                UserEmailAccount.user_id == user.id,
                UserEmailAccount.email == microsoft_email,
                UserEmailAccount.provider == "outlook"
            )
            .first()
        )

        try:
            if not email_account:
                email_account = UserEmailAccount(
                    user_id=user.id,
                    email=microsoft_email,
                    provider="outlook",
                    display_name=microsoft_profile.get("displayName"),
                    is_primary=True,
                    is_active=True,
                    encrypted_access_token=encrypt_value(token_data["access_token"]),
                    encrypted_refresh_token=encrypt_value(token_data["refresh_token"]),
                    token_expires_at=expires_at,
                    consent_given=True,
                    consent_date=datetime.now(timezone.utc),
                    microsoft_user_id=microsoft_profile.get("id"),
                    user_principal_name=microsoft_profile.get("userPrincipalName"),
                    job_title=microsoft_profile.get("jobTitle"),
                    office_location=microsoft_profile.get("officeLocation"),
                )
                db.add(email_account)
            else:
                email_account.encrypted_access_token = encrypt_value(token_data["access_token"])
                email_account.encrypted_refresh_token = encrypt_value(token_data["refresh_token"])
                email_account.token_expires_at = expires_at
                email_account.is_active = True
                email_account.display_name = microsoft_profile.get("displayName")
                email_account.job_title = microsoft_profile.get("jobTitle")
                email_account.office_location = microsoft_profile.get("officeLocation")
            db.commit()
        except Exception as e:
            db.rollback()
            print(f"[WARNING] Impossible de mettre à jour user_email_accounts: {e}")
    else:
        print("[WARNING] Impossible de déterminer l'email Microsoft principal")

    return {
        "status": "connected",
        "message": "Outlook connecté avec succès",
        "microsoft_email": microsoft_email,
        "expires_in": token_data.get("expires_in"),
    }


@router.get("/outlook/search")
async def outlook_search(
    query: str = Query(..., min_length=2, description="Nom, email ou entreprise à rechercher"),
    limit: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    MODE 1 : Recherche contextuelle Outlook

    Recherche dans les emails en temps réel (pas de synchro massive)
    Idéal pour l'autofill intelligent : tape "dupont" → récupère email, tél, fonction
    """
    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")

    # DEBUG
    print("\n--- DEBUG OUTLOOK SEARCH ---")
    print(f"JWT claims: {current_user}")
    print(f"user_id extracted: {user_id}")

    # Convertir en int si c'est numérique, sinon chercher par email/username
    try:
        user_id_int = int(user_id)
        user = db.query(User).filter(User.id == user_id_int).first()
        print(f"User lookup by ID={user_id_int}: found={user is not None}")
    except ValueError:
        # user_id est probablement "dev-user" ou un username
        user = db.query(User).filter(
            (User.username == user_id) | (User.email == user_id)
        ).first()
        print(f"User lookup by username/email={user_id}: found={user is not None}")

    if user:
        print(f"User: id={user.id}, email={user.email}, outlook_connected={user.outlook_connected}")
    else:
        print("❌ User NOT FOUND in database!")
    print("--- END DEBUG ---\n")

    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)

    # Recherche contextuelle
    results = await outlook_service.search_messages_by_query(
        access_token, query=query, limit=limit
    )

    return {
        "query": query,
        "signatures_count": len(results["signatures"]),
        "signatures": results["signatures"],
        "last_contact_date": results["last_contact_date"],
        "company_domains": results["company_domains"],
    }


@router.get("/outlook/search/debug")
async def outlook_search_debug(
    query: str = Query(..., min_length=2),
    limit: int = Query(5, le=20),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """DEBUG: Retourne les messages bruts de la recherche (temporaire)"""
    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user_id_int = int(user_id)
        user = db.query(User).filter(User.id == user_id_int).first()
    except ValueError:
        user = db.query(User).filter(
            (User.username == user_id) | (User.email == user_id)
        ).first()

    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)
    results = await outlook_service.search_messages_by_query(access_token, query=query, limit=limit)

    # Return full messages for debugging
    return {
        "query": query,
        "message_count": len(results.get("messages", [])),
        "messages": results.get("messages", []),
        "signatures": results.get("signatures", []),
    }


@router.get("/outlook/debug/me")
async def outlook_debug_me(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """DEBUG: Quel compte Outlook est connecté?"""
    import httpx

    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)

    # Appel Graph API /me
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://graph.microsoft.com/v1.0/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        me_data = response.json()

    return {
        "crm_user_id": user.id,
        "crm_email": user.email,
        "outlook_account": {
            "mail": me_data.get("mail"),
            "userPrincipalName": me_data.get("userPrincipalName"),
            "displayName": me_data.get("displayName"),
            "jobTitle": me_data.get("jobTitle"),
            "officeLocation": me_data.get("officeLocation"),
        },
        "token_expires_at": user.outlook_token_expires_at.isoformat() if user.outlook_token_expires_at else None,
    }


@router.get("/outlook/debug/messages-raw")
async def outlook_debug_messages_raw(
    days: int = Query(30, ge=1, le=365),
    no_filter: bool = Query(False, description="Si True, retire le filtre date pour tout récupérer"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    DEBUG: Appel Graph API brut avec logs détaillés

    Test avec no_filter=true pour voir si le problème vient du filtre date
    """
    import httpx
    from datetime import datetime, timedelta

    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"

    # Appel Graph API brut
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = "https://graph.microsoft.com/v1.0/me/messages"
        params = {
            "$top": 100,
            "$orderby": "sentDateTime desc",
            "$select": "id,subject,from,sentDateTime",
        }

        # Ajouter filtre date seulement si no_filter=False
        if not no_filter:
            params["$filter"] = f"sentDateTime ge {start_date}"

        response = await client.get(url, params=params, headers={"Authorization": f"Bearer {access_token}"})
        response.raise_for_status()
        data = response.json()

        messages = data.get("value", [])
        next_link = data.get("@odata.nextLink")

        return {
            "request_url": str(response.url),
            "status_code": response.status_code,
            "message_count": len(messages),
            "has_next_link": next_link is not None,
            "next_link": next_link,
            "messages": messages[:5],  # Premiers 5 pour éviter gros payload
            "message_dates": [msg.get("sentDateTime") for msg in messages],
            "debug_info": {
                "filter_applied": not no_filter,
                "filter": params.get("$filter", "AUCUN FILTRE (récupère TOUS les messages)"),
                "top": params["$top"],
                "days_requested": days,
                "start_date": start_date if not no_filter else "N/A",
            }
        }


@router.get("/outlook/debug/folders")
async def outlook_debug_folders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """DEBUG: Liste tous les dossiers Outlook (récursif)"""
    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)

    folders = await outlook_service.list_all_primary_folders(access_token)

    return {
        "folder_count": len(folders),
        "folders": [
            {
                "id": f.get("id"),
                "displayName": f.get("displayName"),
                "wellKnownName": f.get("wellKnownName"),
                "parentFolderId": f.get("parentFolderId"),
                "totalItemCount": f.get("totalItemCount", 0),
                "unreadItemCount": f.get("unreadItemCount", 0),
            }
            for f in folders
        ],
    }


@router.get("/outlook/debug/test-all-folders")
async def outlook_debug_test_all_folders(
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(50, ge=0, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """DEBUG: Test récupération messages de TOUS les dossiers"""
    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)

    messages = await outlook_service.get_recent_messages_from_all_folders(
        access_token, days=days, limit=limit
    )

    return {
        "days_requested": days,
        "limit_requested": limit,
        "message_count": len(messages),
        "messages": messages[:5],  # Premiers 5
        "message_dates": [msg.get("receivedDateTime") for msg in messages[:10]],
    }


@router.get("/outlook/sync", response_model=OutlookSyncResponse)
async def outlook_sync(
    limit: int = Query(50, ge=0, le=1000, description="Nombre max de messages (0 = illimité)"),
    days: int = Query(30, ge=1, le=365, description="Nombre de jours dans le passé"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    MODE 3 : Synchronisation passive (aspirateur)

    Récupère les messages récents et extrait les signatures
    ⚠️ Les signatures vont en salle d'attente pour validation manuelle

    Paramètres:
    - limit: 0 = illimité (aspirateur exhaustif), >0 = limité
    - days: Nombre de jours dans le passé (défaut: 30)
    """
    from models.outlook_signature_pending import OutlookSignaturePending
    import json

    outlook_service = OutlookIntegration(db)

    # Récupérer user
    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    access_token = await outlook_service.get_valid_access_token(user)

    # Récupérer messages de TOUS les dossiers (folder-based, with deduplication)
    messages = await outlook_service.get_recent_messages_from_all_folders(access_token, limit=limit, days=days)

    # Extraire signatures (avec filtre anti-marketing)
    signatures = outlook_service.extract_signatures_from_messages(
        messages, filter_marketing=True
    )

    # Stocker dans la salle d'attente
    stored_count = 0
    for sig in signatures:
        # Vérifier si signature déjà en attente
        existing = (
            db.query(OutlookSignaturePending)
            .filter(
                OutlookSignaturePending.user_id == user_id,
                OutlookSignaturePending.email == sig["email"],
            )
            .first()
        )

        if not existing:
            # Détecter si probablement marketing
            is_marketing = outlook_service.is_marketing_email(sig["email"])

            # Créer entrée en salle d'attente
            pending_sig = OutlookSignaturePending(
                user_id=user_id,
                email=sig["email"],
                phone=sig.get("phone"),
                job_title=sig.get("job_title"),
                company=sig.get("company"),
                source_message_id=sig.get("source_message_id"),
                source_date=datetime.fromisoformat(sig["source_date"].replace("Z", "+00:00"))
                if sig.get("source_date")
                else None,
                is_likely_marketing=is_marketing,
                auto_detection_flags=json.dumps(
                    {"filtered_marketing": is_marketing}
                ),
            )
            db.add(pending_sig)
            stored_count += 1

    db.commit()

    return {
        "messages_count": len(messages),
        "signatures_count": len(signatures),
        "signatures": signatures,  # Pour compatibilité frontend
        "stored_in_queue": stored_count,
        "message": f"{stored_count} nouvelles signatures en attente de validation",
    }


@router.get("/outlook/me")
async def outlook_get_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère les informations du compte Microsoft connecté

    Appelle /me sur Microsoft Graph pour vérifier quel compte est vraiment connecté
    """
    outlook_service = OutlookIntegration(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    # Récupérer un token valide (refresh auto si besoin)
    access_token = await outlook_service.get_valid_access_token(user)

    # Appeler Microsoft Graph /me
    profile = await outlook_service.get_user_profile(access_token)

    return {
        "crm_user_email": user.email,
        "microsoft_account": {
            "email": profile.get("mail") or profile.get("userPrincipalName"),
            "display_name": profile.get("displayName"),
            "user_principal_name": profile.get("userPrincipalName"),
            "id": profile.get("id"),
            "job_title": profile.get("jobTitle"),
            "office_location": profile.get("officeLocation")
        },
        "match": (user.email.lower() == (profile.get("mail") or profile.get("userPrincipalName") or "").lower())
    }


@router.get("/outlook/signatures/pending")
async def outlook_get_pending_signatures(
    status: str = Query("pending", regex="^(pending|approved|rejected|all)$"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupère la salle d'attente des signatures Outlook

    Permet de voir toutes les signatures en attente de validation pour éviter la pollution du CRM
    """
    from models.outlook_signature_pending import OutlookSignaturePending

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user_id = int(user_id)

    # Construire query
    query = db.query(OutlookSignaturePending).filter(
        OutlookSignaturePending.user_id == user_id
    )

    # Filtrer par statut
    if status != "all":
        query = query.filter(OutlookSignaturePending.status == status)

    # Ordonner par date (plus récents en premier)
    query = query.order_by(OutlookSignaturePending.created_at.desc())

    # Pagination
    total = query.count()
    signatures = query.offset(offset).limit(limit).all()

    return {
        "total": total,
        "offset": offset,
        "limit": limit,
        "signatures": [
            {
                "id": sig.id,
                "email": sig.email,
                "phone": sig.phone,
                "job_title": sig.job_title,
                "company": sig.company,
                "status": sig.status,
                "is_likely_marketing": sig.is_likely_marketing,
                "source_date": sig.source_date.isoformat() if sig.source_date else None,
                "created_at": sig.created_at.isoformat() if sig.created_at else None,
                "rejection_reason": sig.rejection_reason,
            }
            for sig in signatures
        ],
    }


@router.post("/outlook/signatures/{signature_id}/approve")
async def outlook_approve_signature(
    signature_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Approuve une signature en attente et l'intègre au CRM

    Crée/enrichit le contact avec les données validées
    """
    from models.outlook_signature_pending import OutlookSignaturePending
    from models.person import Person

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user_id = int(user_id)

    # Récupérer signature
    signature = (
        db.query(OutlookSignaturePending)
        .filter(
            OutlookSignaturePending.id == signature_id,
            OutlookSignaturePending.user_id == user_id,
        )
        .first()
    )

    if not signature:
        raise HTTPException(status_code=404, detail="Signature non trouvée")

    if signature.status != "pending":
        raise HTTPException(
            status_code=400, detail=f"Signature déjà traitée ({signature.status})"
        )

    # Marquer comme approuvée
    signature.status = "approved"
    signature.validated_at = datetime.utcnow()
    signature.validated_by = user_id

    # Chercher contact existant
    existing_person = (
        db.query(Person).filter(Person.email == signature.email).first()
    )

    if existing_person:
        # Enrichir contact existant
        if not existing_person.phone and signature.phone:
            existing_person.phone = signature.phone
        if not existing_person.job_title and signature.job_title:
            existing_person.job_title = signature.job_title
        contact_id = existing_person.id
        action = "enriched"
    else:
        # Créer nouveau contact
        new_person = Person(
            email=signature.email,
            phone=signature.phone,
            job_title=signature.job_title,
            created_by=user_id,
        )
        db.add(new_person)
        db.flush()
        contact_id = new_person.id
        action = "created"

    db.commit()

    return {
        "message": f"Signature approuvée et contact {action}",
        "contact_id": contact_id,
        "action": action,
    }


@router.post("/outlook/signatures/{signature_id}/reject")
async def outlook_reject_signature(
    signature_id: int,
    reason: str = Query(..., max_length=255),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Rejette une signature en attente (email marketing, doublon, etc.)
    """
    from models.outlook_signature_pending import OutlookSignaturePending

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user_id = int(user_id)

    # Récupérer signature
    signature = (
        db.query(OutlookSignaturePending)
        .filter(
            OutlookSignaturePending.id == signature_id,
            OutlookSignaturePending.user_id == user_id,
        )
        .first()
    )

    if not signature:
        raise HTTPException(status_code=404, detail="Signature non trouvée")

    if signature.status != "pending":
        raise HTTPException(
            status_code=400, detail=f"Signature déjà traitée ({signature.status})"
        )

    # Marquer comme rejetée
    signature.status = "rejected"
    signature.rejection_reason = reason
    signature.validated_at = datetime.utcnow()
    signature.validated_by = user_id

    db.commit()

    return {"message": "Signature rejetée", "reason": reason}


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


@router.delete("/outlook/disconnect")
async def outlook_disconnect(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Déconnecte Outlook et supprime les tokens OAuth

    RGPD: Révocation de l'accès, tokens supprimés immédiatement
    """
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Supprimer tokens OAuth
    user.encrypted_outlook_access_token = None
    user.encrypted_outlook_refresh_token = None
    user.outlook_token_expires_at = None
    user.outlook_connected = False

    db.commit()

    return {"status": "disconnected", "message": "Outlook déconnecté"}


@router.delete("/outlook/data")
async def outlook_delete_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprime TOUTES les données collectées depuis Outlook (RGPD Article 17 - Droit à l'effacement)

    Actions:
    1. Supprime les tokens OAuth
    2. Supprime les suggestions d'autofill source='outlook'
    3. Révoque le consentement
    4. Log de traçabilité

    ATTENTION: Irréversible
    """
    from models.autofill_log import AutofillLog

    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # 1. Supprimer tokens OAuth
    user.encrypted_outlook_access_token = None
    user.encrypted_outlook_refresh_token = None
    user.outlook_token_expires_at = None
    user.outlook_connected = False

    # 2. Révoquer le consentement
    user.outlook_consent_given = False
    user.outlook_consent_date = None

    # 3. Supprimer les logs d'autofill source='outlook' créés par cet user
    deleted_logs = db.query(AutofillLog).filter(
        AutofillLog.source == "outlook",
        AutofillLog.user_id == user_id
    ).delete()

    # 4. Supprimer les decision logs source='outlook'
    from models.autofill_decision_log import AutofillDecisionLog
    deleted_decisions = db.query(AutofillDecisionLog).filter(
        AutofillDecisionLog.scores_json["source"].astext == "outlook",
        AutofillDecisionLog.applied_by_user_id == user_id
    ).delete(synchronize_session=False)

    db.commit()

    return {
        "status": "deleted",
        "message": "Données Outlook supprimées avec succès",
        "deleted_logs": deleted_logs,
        "deleted_decisions": deleted_decisions
    }


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
    outlook_service = OutlookIntegration(db)

    # Récupérer user pour Outlook
    user_id = current_user.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()

    # Préparer context
    context = request.context or {}

    # Ajouter Outlook si connecté
    if user and user.outlook_connected:
        try:
            context["outlook_access_token"] = await outlook_service.get_valid_access_token(user)
            context["outlook_enabled"] = True
        except HTTPException as exc:
            if exc.status_code in (400, 401):
                context.pop("outlook_access_token", None)
                context["outlook_enabled"] = False
            else:
                raise
    else:
        context.pop("outlook_access_token", None)
        context["outlook_enabled"] = False

    # Budget mode par défaut
    if "budget_mode" not in context:
        context["budget_mode"] = "normal"

    # Exécuter autofill
    result = await autofill_service.autofill(
        entity_type=request.entity_type,
        draft=request.draft,
        context=context,
        user_id=int(user_id) if user_id else None,
    )

    return result


# ==========================================
# Autofill Preview (V1.5 Smart Resolver)
# ==========================================


@router.post("/ai/autofill/preview", response_model=AutofillPreviewResponse)
async def autofill_preview(
    request: AutofillPreviewRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Smart Resolver V1.5 - Preview de matching multi-critères

    Pipeline:
    1. Recherche candidats potentiels (email, nom, téléphone, domaine)
    2. Score chaque candidat selon critères pondérés:
       - Email exact: +100
       - Nom + Société: +75 (exact) / +50 (fuzzy)
       - Domaine email match: +40
       - Téléphone: +50
       - Titre/Poste: +20
       - Ville: +10
    3. Décision automatique:
       - score ≥ 100 → "apply" (auto-match)
       - 60 ≤ score < 100 → "preview" (validation humaine)
       - score < 60 → "create_new"

    Use cases:
    - Détection doublons avant création
    - Enrichissement contacts existants
    - Validation pré-import
    """
    import time

    start_time = time.time()

    # Initialiser scorer
    scorer = MatchingScorer(db)

    # Trouver et scorer candidats
    if request.entity_type == "person":
        matches = scorer.find_person_candidates(request.draft, limit=request.limit)
    elif request.entity_type == "organisation":
        matches = scorer.find_organisation_candidates(request.draft, limit=request.limit)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"entity_type invalide: {request.entity_type}",
        )

    # Déterminer recommandation globale (basée sur le meilleur match)
    if matches and len(matches) > 0:
        best_match = matches[0]
        recommendation = MatchAction(best_match["action"])
    else:
        recommendation = MatchAction.CREATE_NEW

    # Suggérer une interaction si entités résolues
    interaction_suggestion = None
    if matches and len(matches) > 0 and best_match["score"] >= 60:
        # Récupérer IDs des entités pour la suggestion
        person_id = None
        organisation_id = None

        if request.entity_type == "person" and best_match["score"] >= 60:
            person_id = best_match["candidate"]["id"]
            # Tenter de résoudre l'organisation depuis l'email
            if request.draft.get("personal_email"):
                org_matches = scorer.find_organisation_candidates(
                    {"email": request.draft["personal_email"]},
                    limit=1
                )
                if org_matches and org_matches[0]["score"] >= 60:
                    organisation_id = org_matches[0]["candidate"]["id"]
        elif request.entity_type == "organisation":
            organisation_id = best_match["candidate"]["id"]

        # Générer la suggestion d'interaction
        if person_id or organisation_id:
            suggestion_service = InteractionSuggestionService(db)
            user_id = current_user.get("user_id", 1)  # Fallback à 1 si pas d'user_id

            interaction_suggestion = suggestion_service.suggest_interaction(
                draft=request.draft,
                person_id=person_id,
                organisation_id=organisation_id,
                current_user_id=user_id,
                context={}
            )

    # Calculer métadonnées
    execution_time_ms = int((time.time() - start_time) * 1000)

    # Critères utilisés (déduits des détails du meilleur match)
    criteria_used = []
    if matches and len(matches) > 0:
        criteria_used = list(matches[0]["details"].keys())

    meta = {
        "execution_time_ms": execution_time_ms,
        "candidates_searched": len(matches),
        "criteria_used": criteria_used,
        "entity_type": request.entity_type,
        "interaction_suggested": interaction_suggestion is not None,
    }

    # Journaliser la décision de preview pour conformité RGPD
    user_id_raw = current_user.get("user_id") or current_user.get("sub")
    best_candidate = matches[0]["candidate"] if matches else {}

    person_id = None
    organisation_id = None
    if request.entity_type == "person":
        person_id = best_candidate.get("id")
    elif request.entity_type == "organisation":
        organisation_id = best_candidate.get("id")

    # Essayer d'enrichir avec l'interaction suggérée
    if interaction_suggestion:
        person_id = interaction_suggestion.get("person_id") or person_id
        organisation_id = interaction_suggestion.get("organisation_id") or organisation_id

    try:
        request_payload = (
            request.model_dump()  # type: ignore[attr-defined]
            if hasattr(request, "model_dump")
            else request.dict()
        )
        input_hash = hashlib.sha256(
            json.dumps(request_payload, sort_keys=True, default=str).encode()
        ).hexdigest()

        decision_log = AutofillDecisionLog(
            input_id=f"preview:{uuid4().hex}",
            input_hash=input_hash,
            decision=recommendation.value,
            person_id=person_id,
            organisation_id=organisation_id,
            interaction_id=None,
            scores_json={
                "matches": matches,
                "meta": meta,
            },
            reason=f"smart_resolver:{recommendation.value}",
            applied_by_user_id=int(user_id_raw) if user_id_raw else None,
            was_deduped=0,
        )
        db.add(decision_log)
        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[AutofillPreview] Unable to persist decision log: {exc}")

    return {
        "matches": matches,
        "recommendation": recommendation,
        "interaction_suggestion": interaction_suggestion,
        "meta": meta,
    }


# ==========================================
# Autofill Apply (V1.5+ - Création transactionnelle)
# ==========================================


@router.post("/ai/autofill/apply", response_model=AutofillApplyResponse)
async def autofill_apply(
    request: AutofillApplyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Applique les décisions d'autofill de manière transactionnelle

    Crée/lie:
    - Person (si apply=True)
    - Organisation (si apply=True)
    - Interaction avec participants
    - AutofillDecisionLog pour traçabilité

    Fonctionnalités:
    - Idempotence via input_id (rejeu safe)
    - Déduplication d'interactions (même org + titre + heure ±2h)
    - Ajout automatique des participants
    - Journalisation complète avec scores

    Use cases:
    - Après clic "Créer l'interaction & lier" dans le modal
    - Workflow auto-apply (score ≥ 100)
    - Import batch avec suivi décision
    """
    try:
        # Récupérer user_id
        user_id = current_user.get("user_id") or current_user.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="User ID manquant")

        # Initialiser service
        apply_service = AutofillApplyService(db)

        # Appliquer les décisions
        result = apply_service.apply(
            input_id=request.input_id,
            person_decision=request.person.dict(),
            organisation_decision=request.organisation.dict(),
            interaction_data=request.interaction.dict(),
            dedupe=request.dedupe,
            current_user_id=int(user_id),
            context=request.context
        )

        return AutofillApplyResponse(**result)

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de l'application de l'autofill: {str(e)}"
        )


# ==========================================
# IMAP Direct Connection (Simple & Efficace)
# ==========================================

@router.post("/mail/connect-imap")
async def connect_imap(
    email: str = Query(..., description="Adresse email Microsoft 365"),
    app_password: str = Query(..., description="Mot de passe d'application"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    🔌 Connecter boîte mail IMAP + App Password

    Workflow: https://aka.ms/MFASetup → https://account.microsoft.com/security
    """
    from datetime import datetime, timezone
    from core.encryption import encrypt_value
    from mail.providers.imap_provider import IMAPProvider

    user_id = current_user.get("user_id") or current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    try:
        imap = IMAPProvider(host="outlook.office365.com", username=email, app_password=app_password)
        test_result = await imap.test_connection()

        if not test_result["success"]:
            raise HTTPException(status_code=401, detail=f"IMAP failed: {test_result.get('error')}")

        user.imap_connected = True
        user.imap_host = "outlook.office365.com"
        user.imap_email = email
        user.encrypted_imap_password = encrypt_value(app_password)
        user.imap_connected_at = datetime.now(timezone.utc)
        db.commit()

        return {"success": True, "email": email, "folders_count": test_result.get("folders_count", 0)}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mail/sync-imap")
async def sync_imap(
    days: int = Query(90, ge=1, le=365),
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """📧 Sync emails IMAP (ALL folders)"""
    from datetime import datetime, timedelta, timezone
    from time import time
    from core.encryption import decrypt_value
    from mail.providers.imap_provider import IMAPProvider

    user_id = current_user.get("user_id") or current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.imap_connected:
        raise HTTPException(status_code=400, detail="IMAP not connected")

    app_password = decrypt_value(user.encrypted_imap_password)
    imap = IMAPProvider(host=user.imap_host, username=user.imap_email, app_password=app_password)

    start = time()
    since = datetime.now(timezone.utc) - timedelta(days=days)
    messages = await imap.sync_messages_since(since, limit=limit)

    return {
        "success": True,
        "message_count": len(messages),
        "messages": messages[:10],
        "sync_duration_seconds": round(time() - start, 2),
    }


@router.delete("/mail/disconnect-imap")
async def disconnect_imap(db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    """🔌 Disconnect IMAP"""
    user_id = current_user.get("user_id") or current_user.get("sub")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user:
        user.imap_connected = False
        user.imap_host = None
        user.imap_email = None
        user.encrypted_imap_password = None
        user.imap_connected_at = None
        db.commit()
    return {"success": True}


# ==========================================
# EWS/IMAP Mail Connector (test providers)
# ==========================================

@router.get("/mail/test-providers")
async def test_mail_providers(
    days: int = Query(90, ge=1, le=365, description="Jours dans le passé"),
    limit: int = Query(50, ge=1, le=500, description="Limite de messages"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    🧪 TEST: Essaie EWS puis IMAP pour récupérer les messages

    Ce endpoint remplace Graph API par EWS/IMAP pour contourner les restrictions IONOS.

    Ordre d'essai:
    1. EWS (Exchange Web Services) - accès complet Exchange
    2. IMAP (avec XOAUTH2) - fallback universel

    Returns:
        {
            "provider_used": "ews" | "imap",
            "message_count": 42,
            "messages": [...],
            "provider_tests": [...]
        }
    """
    from datetime import datetime, timedelta, timezone
    from core.config import settings
    from mail.adapter import SmartMailAdapter
    from mail.providers.ews_provider import EWSProvider
    from mail.providers.imap_provider import IMAPProvider

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.outlook_connected:
        raise HTTPException(status_code=400, detail="Outlook non connecté")

    # Email de l'utilisateur (UPN)
    user_email = user.email

    # Construire les providers
    providers = []

    # 1. EWS Provider
    try:
        ews = EWSProvider(
            tenant_id=settings.outlook_tenant,
            client_id=settings.outlook_client_id,
            client_secret=settings.outlook_client_secret,
            email=user_email,
        )
        providers.append(ews)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"EWS init failed: {e}")

    # 2. IMAP Provider (optionnel, nécessite token IMAP ou app password)
    # Pour l'instant, on teste juste EWS
    # Si vous avez un token IMAP OAuth2 ou app password, ajoutez:
    # imap = IMAPProvider(
    #     host="outlook.office365.com",
    #     username=user_email,
    #     access_token=imap_token,  # ou app_password=app_pwd
    # )
    # providers.append(imap)

    # Adapter
    adapter = SmartMailAdapter(providers)

    # Test de connexion de tous les providers
    provider_tests = await adapter.test_all_providers()

    # Récupération des messages
    since = datetime.now(timezone.utc) - timedelta(days=days)

    try:
        messages = await adapter.sync_messages_since(since, limit=limit)

        return {
            "success": True,
            "provider_used": adapter.get_active_provider_name(),
            "days_requested": days,
            "limit_requested": limit,
            "message_count": len(messages),
            "messages": messages[:5],  # Premiers 5 pour preview
            "message_dates": [msg.get("receivedDateTime") for msg in messages[:10]],
            "provider_tests": provider_tests,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "provider_tests": provider_tests,
        }


# ==========================================
# IMAP Integration (Fallback + Future-proof)
# ==========================================


@router.post("/mail/connect-imap")
async def connect_imap(
    email: str = Query(..., description="Email address (e.g., michel.marques@alforis.fr)"),
    app_password: str = Query(..., description="Microsoft App Password"),
    host: str = Query("outlook.office365.com", description="IMAP host"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Connecte un compte email via IMAP avec App Password

    Prérequis Microsoft:
    1. Activer MFA sur le compte
    2. Créer App Password: https://account.microsoft.com/security
    3. Utiliser ce password (format: xxxx xxxx xxxx xxxx)

    Cette méthode est universelle et survivra à la dépréciation d'EWS (sept 2026)
    """
    from mail.providers.imap_provider import IMAPProvider

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="User ID invalide")

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Test connexion IMAP
    try:
        imap = IMAPProvider(
            host=host,
            username=email,
            app_password=app_password,
        )

        test_result = await imap.test_connection()

        if not test_result.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Connexion IMAP échouée: {test_result.get('error')}"
            )

        # Stocker credentials (chiffrés)
        user.imap_host = host
        user.imap_email = email
        user.encrypted_imap_password = encrypt_value(app_password)
        user.imap_connected = True
        user.imap_connected_at = datetime.now(timezone.utc)

        db.commit()

        return {
            "success": True,
            "message": f"IMAP connecté avec succès pour {email}",
            "host": host,
            "folders_count": test_result.get("folders_count", 0),
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur IMAP: {str(e)}")


@router.get("/mail/sync-imap")
async def sync_imap(
    days: int = Query(30, ge=1, le=365, description="Nombre de jours à synchroniser"),
    limit: int = Query(200, ge=0, le=1000, description="Limite de messages (0 = tous)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Synchronise les emails via IMAP

    Récupère:
    - INBOX (boîte de réception)
    - Sent Items (éléments envoyés)
    - Déduplique par Message-ID

    Fallback universel si Graph API a des problèmes
    """
    from mail.providers.imap_provider import IMAPProvider
    from core.encryption import decrypt_value

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="User ID invalide")

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user.imap_connected or not user.encrypted_imap_password:
        raise HTTPException(
            status_code=400,
            detail="IMAP non connecté. Utilisez POST /integrations/mail/connect-imap d'abord"
        )

    try:
        app_password = decrypt_value(user.encrypted_imap_password)

        imap = IMAPProvider(
            host=user.imap_host,
            username=user.imap_email,
            app_password=app_password,
        )

        since = datetime.now(timezone.utc) - timedelta(days=days)
        messages = await imap.sync_messages_since(since, limit=limit if limit > 0 else 500)

        return {
            "success": True,
            "message_count": len(messages),
            "messages": messages,
            "sync_params": {
                "days": days,
                "limit": limit,
                "since": since.isoformat(),
                "host": user.imap_host,
                "email": user.imap_email,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur synchro IMAP: {str(e)}")


# ==========================================
# O365 OAuth (EWS/IMAP) - Professional Exchange Online
# ==========================================


@router.post("/o365/authorize")
async def o365_authorize(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Démarre le flow OAuth O365 (EWS/IMAP)

    Compatible Exchange Online uniquement (pas Basic Auth)
    Scopes: EWS.AccessAsUser.All, IMAP.AccessAsUser.All
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)
    state = secrets.token_urlsafe(32)

    user_id = current_user.get("user_id") or current_user.get("sub")
    login_hint = current_user.get("email")

    if user_id:
        try:
            user = db.query(User).filter(User.id == int(user_id)).first()
        except (ValueError, TypeError):
            user = db.query(User).filter(User.email == user_id).first()
        if user and user.email:
            login_hint = user.email

    authorization_url = service.get_authorization_url(
        state=state,
        login_hint=login_hint,
    )

    return {
        "authorization_url": authorization_url,
        "state": state,
    }


@router.post("/o365/callback-dev/{user_id}")
async def o365_callback_dev(
    user_id: int,
    code: str = Query(..., description="Authorization code from Microsoft"),
    state: str = Query(..., description="CSRF state token"),
    db: Session = Depends(get_db),
):
    """
    Callback OAuth O365 (DEV - sans auth)
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)

    # Échanger code → tokens
    token_data = await service.exchange_code_for_token(code)

    if not token_data.get("refresh_token"):
        raise HTTPException(
            status_code=400,
            detail="Permission offline_access absente. Reconnectez O365.",
        )

    # Valider identité
    identity = await service.validate_token_identity(token_data)
    microsoft_email = identity.get("email")

    # Récupérer user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Calculer expiration
    expires_in_raw = token_data.get("expires_in", 3600)
    try:
        expires_in = int(expires_in_raw)
    except (TypeError, ValueError):
        expires_in = 3600

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Stocker tokens chiffrés
    user.encrypted_o365_access_token = encrypt_value(token_data["access_token"])
    user.encrypted_o365_refresh_token = encrypt_value(token_data["refresh_token"])
    user.o365_token_expires_at = expires_at
    user.o365_connected = True
    user.o365_consent_given = True
    user.o365_consent_date = datetime.now(timezone.utc)

    db.commit()

    return {
        "success": True,
        "message": "O365 OAuth connected",
        "email": microsoft_email,
        "expires_at": expires_at.isoformat(),
    }


@router.post("/o365/callback")
async def o365_callback(
    code: str = Query(..., description="Authorization code from Microsoft"),
    state: str = Query(..., description="CSRF state token"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Callback OAuth O365

    Échange le code contre access_token + refresh_token
    Stocke les tokens chiffrés en BDD
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)

    # TODO: Vérifier state CSRF

    # Échanger code → tokens
    token_data = await service.exchange_code_for_token(code)

    if not token_data.get("refresh_token"):
        raise HTTPException(
            status_code=400,
            detail="Permission offline_access absente. Reconnectez O365.",
        )

    # Valider identité
    identity = await service.validate_token_identity(token_data)
    microsoft_email = identity.get("email")

    # Récupérer user
    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user = db.query(User).filter(User.id == int(user_id)).first()
    except (ValueError, TypeError):
        user = db.query(User).filter(User.email == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Calculer expiration
    expires_in_raw = token_data.get("expires_in", 3600)
    try:
        expires_in = int(expires_in_raw)
    except (TypeError, ValueError):
        expires_in = 3600

    expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    # Stocker tokens chiffrés
    user.encrypted_o365_access_token = encrypt_value(token_data["access_token"])
    user.encrypted_o365_refresh_token = encrypt_value(token_data["refresh_token"])
    user.o365_token_expires_at = expires_at
    user.o365_connected = True
    user.o365_consent_given = True
    user.o365_consent_date = datetime.now(timezone.utc)

    db.commit()

    return {
        "success": True,
        "message": "O365 OAuth connecté avec succès",
        "email": microsoft_email,
        "expires_at": expires_at.isoformat(),
    }


@router.get("/o365/test-ews")
async def o365_test_ews(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Teste la connexion EWS (Exchange Web Services) avec OAuth2

    Nécessite O365 OAuth déjà connecté
    Compatible Exchange Online uniquement
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="User ID invalide")

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user.o365_connected:
        raise HTTPException(
            status_code=400,
            detail="O365 non connecté. Utilisez POST /integrations/o365/authorize d'abord",
        )

    # Récupérer token valide (refresh si nécessaire)
    access_token = await service.get_valid_access_token(user)

    # Tester EWS OAuth
    result = await service.test_ews_connection_with_oauth(
        access_token=access_token,
        email=user.email,
    )

    return result


@router.get("/o365/test-ews-direct/{user_id}")
async def o365_test_ews_direct(
    user_id: int,
    db: Session = Depends(get_db),
):
    """
    Teste EWS directement sans auth (DEV ONLY - à supprimer en prod)
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user.o365_connected:
        raise HTTPException(
            status_code=400,
            detail="O365 OAuth non connecté. Appelez d'abord /o365/authorize puis /o365/callback",
        )

    try:
        access_token = await service.get_valid_access_token(user)
        result = await service.test_ews_connection_with_oauth(access_token, user.email)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/o365/test-imap")
async def o365_test_imap(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Teste la connexion IMAP avec OAuth2 token (XOAUTH2)

    Nécessite O365 OAuth déjà connecté
    """
    from services.o365_oauth_service import O365OAuthService

    service = O365OAuthService(db)

    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant")

    try:
        user_id_int = int(user_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=400, detail="User ID invalide")

    user = db.query(User).filter(User.id == user_id_int).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if not user.o365_connected:
        raise HTTPException(
            status_code=400,
            detail="O365 non connecté. Utilisez POST /integrations/o365/authorize d'abord",
        )

    # Récupérer token valide (refresh si nécessaire)
    access_token = await service.get_valid_access_token(user)

    # Tester IMAP OAuth
    result = await service.test_imap_connection_with_oauth(
        access_token=access_token,
        email=user.email,
    )

    return result


# =====================================
# 🔍 DEBUG: Décoder le token O365 stocké
# =====================================
@router.get("/o365/debug-token/{user_id}")
async def debug_o365_token(user_id: int, db: Session = Depends(get_db)):
    from core.encryption import decrypt_value
    import base64
    import json

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.encrypted_o365_access_token:
        return {"error": "No token found"}

    try:
        # Déchiffrer le token stocké
        token = decrypt_value(user.encrypted_o365_access_token)
        parts = token.split(".")
        if len(parts) != 3:
            return {"error": f"Invalid JWT structure ({len(parts)} parts)"}

        payload_b64 = parts[1]
        # Ajuster le padding base64
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.b64decode(payload_b64))

        return {
            "success": True,
            "email": user.email,
            "aud": payload.get("aud"),
            "scp": payload.get("scp"),
            "appid": payload.get("appid"),
            "upn": payload.get("upn"),
            "raw_payload": payload,
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}


# =====================================
# 🔧 TEST: IONOS Exchange avec Basic Auth
# =====================================
class IONOSTestRequest(BaseModel):
    email: str
    password: str
    server: str = "exchange.ionos.eu"


@router.post("/ionos/test-ews")
async def ionos_test_ews(request: IONOSTestRequest):
    """
    Test connexion IONOS Exchange avec Basic Auth
    """
    from mail.providers.ews_provider import EWSProvider

    try:
        ews = EWSProvider(
            email=request.email,
            password=request.password,
            server=request.server,
        )

        result = await ews.test_connection()
        return result

    except Exception as e:
        import traceback
        return {
            "success": False,
            "provider": "ews_ionos",
            "email": request.email,
            "server": request.server,
            "error": str(e),
            "trace": traceback.format_exc(),
        }


# =============================================================================
# EMAIL ACCOUNTS MANAGEMENT (Multi-Provider Multi-Tenant)
# =============================================================================

def _get_user_context_from_token(current_user: dict, db: Session) -> tuple[int, int]:
    """
    Extract (user_id, team_id) from JWT token pour MULTI-TENANT isolation.

    Returns:
        tuple[int, int]: (user_id, team_id)

    Raises:
        HTTPException: Si user/team non trouvé ou team_id manquant
    """
    user_id_raw = current_user.get("user_id") or current_user.get("sub")
    if not user_id_raw:
        raise HTTPException(401, "User ID manquant dans le token")

    # Try converting to int
    try:
        user_id = int(user_id_raw)
    except (ValueError, TypeError):
        # Fallback: lookup user by email if user_id is non-numeric
        user_email = current_user.get("email")
        if not user_email:
            raise HTTPException(401, f"User ID non-numérique et pas d'email: {user_id_raw}")
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            raise HTTPException(404, f"Utilisateur non trouvé: {user_email}")
        user_id = user.id

    # Récupérer le team_id de l'utilisateur (OBLIGATOIRE pour multi-tenant)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, f"User {user_id} non trouvé")

    if not user.team_id:
        raise HTTPException(403, f"User {user_id} n'a pas de team assignée - multi-tenant requis")

    return (user_id, user.team_id)


class AddEmailAccountRequest(BaseModel):
    """Request pour ajouter un compte email"""
    email: str
    protocol: str  # "ews", "imap", "graph"
    server: str | None = None  # "exchange.ionos.eu", "imap.ionos.fr:993"
    password: str | None = None  # Pour EWS/IMAP Basic Auth
    provider: str | None = None  # "ionos", "gmail", "outlook", etc (optionnel, pour référence)


@router.post("/email-accounts")
async def add_email_account(
    request: AddEmailAccountRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Ajouter un compte email pour l'utilisateur connecté.

    Supporte plusieurs protocols:
    - **EWS** (Exchange Web Services): IONOS, Microsoft Exchange on-premise
    - **IMAP**: Gmail, IONOS mail, autres
    - **Graph API**: Microsoft 365 OAuth (à venir)

    Exemples:

    IONOS EWS (Exchange):
    ```json
    {
        "email": "michel.marques@alforis.fr",
        "protocol": "ews",
        "server": "exchange.ionos.eu",
        "password": "...",
        "provider": "ionos"
    }
    ```

    IONOS IMAP:
    ```json
    {
        "email": "contact@alforis.fr",
        "protocol": "imap",
        "server": "imap.ionos.fr:993",
        "password": "...",
        "provider": "ionos"
    }
    ```
    """
    from core.encryption import encrypt_value

    # Validation selon protocol
    if request.protocol in ("ews", "imap"):
        if not request.server:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'server'")
        if not request.password:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'password'")
    elif request.protocol == "graph":
        raise HTTPException(400, "Graph API OAuth pas encore implémenté - utilisez EWS ou IMAP")
    else:
        raise HTTPException(400, f"Protocol inconnu: {request.protocol}. Supportés: ews, imap")

    # MULTI-TENANT: Récupérer user_id ET team_id
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier si compte existe déjà DANS CETTE TEAM (isolation)
    existing = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id,  # ISOLATION PAR TEAM!
        UserEmailAccount.email == request.email,
        UserEmailAccount.protocol == request.protocol,
    ).first()

    if existing:
        raise HTTPException(400, f"Compte {request.email} ({request.protocol}) existe déjà dans votre équipe")

    # Créer le compte avec team_id (ISOLATION MULTI-TENANT)
    account = UserEmailAccount(
        team_id=team_id,  # OBLIGATOIRE - contexte tenant
        user_id=user_id,  # Audit trail - qui a configuré
        email=request.email,
        protocol=request.protocol,
        server=request.server,
        provider=request.provider or request.protocol,
        encrypted_password=encrypt_value(request.password) if request.password else None,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "account": {
            "id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "provider": account.provider,
            "is_active": account.is_active,
            "created_at": account.created_at.isoformat(),
        }
    }


@router.get("/email-accounts")
async def list_email_accounts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Liste tous les comptes email de la TEAM (multi-tenant isolation).
    Retourne TOUS les comptes de l'équipe, pas seulement ceux de l'user.
    """
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # ISOLATION PAR TEAM - tous les comptes de l'équipe
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id  # MULTI-TENANT!
    ).all()

    return {
        "accounts": [
            {
                "id": acc.id,
                "email": acc.email,
                "protocol": acc.protocol,
                "server": acc.server,
                "provider": acc.provider,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ]
    }


@router.post("/email-accounts/{account_id}/test")
async def test_email_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Tester la connexion d'un compte email (avec isolation team).
    """
    from mail.provider_factory import MailProviderFactory

    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier que le compte appartient à la TEAM (sécurité multi-tenant)
    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id,  # ISOLATION!
    ).first()

    if not account:
        raise HTTPException(404, "Account not found or access denied")

    result = await MailProviderFactory.test_connection(account)
    return result


@router.delete("/email-accounts/{account_id}")
async def delete_email_account(
    account_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Supprimer un compte email (avec isolation team).
    """
    user_id, team_id = _get_user_context_from_token(current_user, db)

    # Vérifier que le compte appartient à la TEAM (sécurité multi-tenant)
    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
        UserEmailAccount.team_id == team_id,  # ISOLATION!
    ).first()

    if not account:
        raise HTTPException(404, "Account not found or access denied")

    db.delete(account)
    db.commit()

    return {"success": True, "message": f"Account {account.email} supprimé"}


# =============================================================================
# Email Sync Engine (Phase 1)
# =============================================================================

@router.post("/sync-all-emails")
async def sync_all_emails(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    since_days: int = Query(default=7, description="Nombre de jours à synchroniser"),
    limit_per_account: Optional[int] = Query(default=None, description="Limite d'emails par compte (pour tests)"),
):
    """
    **Phase 1: Email Sync Engine**

    Synchronise tous les emails de tous les comptes actifs de la team:
    1. ✅ Récupération multi-provider (EWS, IMAP, Graph)
    2. ✅ Déduplication SHA256 par content_hash
    3. ✅ Isolation multi-tenant stricte (team_id)
    4. ✅ Auto-linking emails → people (par sender_email)
    5. ⏳ Auto-création crm_interactions (TODO Phase 1.5)
    6. ⏳ AFTPM compliance tagging (TODO Phase 3)

    Returns:
        - total_emails_synced: Nombre d'emails importés
        - duplicates_skipped: Doublons évités grâce au hash
        - auto_linked_people: Emails liés automatiquement à des contacts
        - accounts_processed: Comptes synchronisés avec succès
        - errors: Erreurs rencontrées par compte
    """
    from mail.provider_factory import MailProviderFactory
    from models.email_message import EmailMessage
    from models.person import Person
    import logging

    logger = logging.getLogger("crm-api")

    # 1. CONTEXTE MULTI-TENANT
    user_id, team_id = _get_user_context_from_token(current_user, db)
    logger.info(f"🔄 Sync emails - user_id={user_id}, team_id={team_id}, since_days={since_days}")

    # 2. RÉCUPÉRER TOUS LES COMPTES ACTIFS DE LA TEAM
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.team_id == team_id,
        UserEmailAccount.is_active == True,
    ).all()

    if not accounts:
        return {
            "success": True,
            "message": "Aucun compte email configuré pour cette team",
            "total_emails_synced": 0,
            "duplicates_skipped": 0,
            "auto_linked_people": 0,
            "accounts_processed": 0,
            "errors": [],
        }

    # 3. SYNC CHAQUE COMPTE
    since = datetime.now(timezone.utc) - timedelta(days=since_days)

    total_synced = 0
    total_duplicates = 0
    total_linked = 0
    total_interactions_created = 0
    accounts_ok = 0
    errors = []
    account_details = []

    for account in accounts:
        account_stats = {
            "account_id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "emails_fetched": 0,
            "emails_new": 0,
            "emails_duplicates": 0,
            "auto_linked": 0,
            "interactions_created": 0,
            "error": None,
        }

        try:
            logger.info(f"📧 Syncing {account.email} ({account.protocol}) depuis {since.isoformat()}")

            # 3.1 Créer le provider (EWS/IMAP/Graph)
            provider = MailProviderFactory.create_provider(account)

            # 3.2 Fetch messages depuis le provider
            messages = await provider.sync_messages_since(since)
            account_stats["emails_fetched"] = len(messages)

            # Limiter pour tests
            if limit_per_account and len(messages) > limit_per_account:
                messages = messages[:limit_per_account]
                logger.warning(f"⚠️ Limite {limit_per_account} appliquée (test mode)")

            logger.info(f"   → {len(messages)} emails récupérés")

            # 3.3 Upsert dans email_messages (avec déduplication)
            for msg in messages:
                try:
                    # Calculer content_hash pour déduplication
                    # Handle both EWS format (string) and Graph API format (dict)
                    from_field = msg.get("from")
                    if isinstance(from_field, dict):
                        sender = from_field.get("email", "") or msg.get("sender", "")
                        sender_name = from_field.get("name", "")
                    else:
                        sender = from_field or msg.get("sender", "")
                        sender_name = msg.get("sender_name", "")

                    subject = msg.get("subject", "") or ""

                    # Handle both date formats
                    sent_at = msg.get("sent_at") or msg.get("receivedDateTime") or msg.get("date")
                    if sent_at:
                        # Convert ISO string to datetime if needed
                        if isinstance(sent_at, str):
                            from dateutil import parser as date_parser
                            sent_at = date_parser.parse(sent_at)
                    else:
                        sent_at = datetime.now(timezone.utc)

                    body_preview = (msg.get("body", "") or msg.get("snippet", ""))[:200]

                    content_hash = EmailMessage.compute_content_hash(
                        sender=sender,
                        subject=subject,
                        sent_at=sent_at,
                        body_preview=body_preview
                    )

                    # Vérifier si déjà existant (unique: team_id + account_id + content_hash)
                    existing = db.query(EmailMessage).filter(
                        EmailMessage.team_id == team_id,
                        EmailMessage.account_id == account.id,
                        EmailMessage.content_hash == content_hash,
                    ).first()

                    if existing:
                        account_stats["emails_duplicates"] += 1
                        total_duplicates += 1
                        continue  # Skip doublon

                    # AUTO-LINK: Détecter si sender existe dans people (sans team_id car Person n'a pas ce champ)
                    linked_person_id = None
                    if sender:
                        person = db.query(Person).filter(
                            Person.email == sender,
                        ).first()

                        if person:
                            linked_person_id = person.id
                            account_stats["auto_linked"] += 1
                            total_linked += 1
                            logger.debug(f"   🔗 Auto-linked {sender} → Person#{person.id}")

                    # Handle recipients - convert list of strings to list of dicts if needed
                    recipients_to = msg.get("to", [])
                    if recipients_to and isinstance(recipients_to[0], str):
                        recipients_to = [{"email": email} for email in recipients_to]

                    recipients_cc = msg.get("cc", [])
                    if recipients_cc and isinstance(recipients_cc[0], str):
                        recipients_cc = [{"email": email} for email in recipients_cc]

                    # Créer nouveau EmailMessage
                    email_msg = EmailMessage(
                        team_id=team_id,
                        account_id=account.id,
                        external_message_id=msg.get("id", "") or msg.get("message_id", "") or str(uuid4()),
                        thread_id=msg.get("conversation_id") or msg.get("thread_id"),
                        in_reply_to=msg.get("in_reply_to"),
                        subject=subject,
                        sender_email=sender,
                        sender_name=sender_name,
                        recipients_to=recipients_to or [],
                        recipients_cc=recipients_cc or [],
                        recipients_bcc=msg.get("bcc", []),
                        body_text=msg.get("body_text"),
                        body_html=msg.get("body", "") or msg.get("body_html"),
                        snippet=msg.get("snippet", "")[:500] if msg.get("snippet") else None,
                        sent_at=sent_at,
                        received_at=msg.get("received_at") or sent_at,
                        is_read=msg.get("is_read", False),
                        is_flagged=msg.get("is_flagged", False),
                        labels=msg.get("categories", []) or [],
                        content_hash=content_hash,
                        linked_person_id=linked_person_id,
                        is_compliance_relevant=False,  # TODO Phase 3: AFTPM detection
                        compliance_tags=[],
                    )

                    db.add(email_msg)
                    account_stats["emails_new"] += 1
                    total_synced += 1

                    # ========================================
                    # PHASE 1.5: Auto-create Interaction
                    # ========================================
                    if linked_person_id:
                        from models.interaction import Interaction

                        # Check if interaction already exists (idempotence)
                        existing_interaction = db.query(Interaction).filter(
                            Interaction.external_source == "email_sync",
                            Interaction.external_id == str(email_msg.id if hasattr(email_msg, 'id') else msg.get("id", "")),
                        ).first()

                        if not existing_interaction:
                            # Determine direction
                            direction = "out" if sender == account.email else "in"

                            # Get person's primary org if available
                            org_id = None
                            if linked_person_id:
                                from models.person import Person
                                person_obj = db.query(Person).filter(Person.id == linked_person_id).first()
                                # Person might have organizations via PersonOrganizationLink, but for now set to None
                                # TODO: Get primary org from PersonOrganizationLink

                            # Create interaction
                            interaction = Interaction(
                                type="email",
                                person_id=linked_person_id,
                                org_id=org_id,
                                title=subject[:200] if subject else "(No subject)",
                                description=email_msg.body_html or email_msg.body_text or "",
                                created_by=user_id,
                                external_source="email_sync",
                                external_id=msg.get("id", ""),
                                direction=direction,
                                thread_id=email_msg.thread_id,
                                interaction_date=email_msg.sent_at,
                                external_participants={
                                    "from": sender,
                                    "to": recipients_to or [],
                                    "cc": recipients_cc or [],
                                },
                                status="done",  # Email already happened, not a todo
                            )

                            db.add(interaction)
                            account_stats["interactions_created"] += 1
                            total_interactions_created += 1
                            logger.debug(f"   📝 Auto-created interaction for email from {sender}")

                except Exception as e_msg:
                    logger.error(f"   ❌ Erreur traitement message: {e_msg}", exc_info=True)
                    # Continue avec les autres messages
                    continue

            # Commit pour ce compte
            db.commit()
            accounts_ok += 1
            logger.info(f"   ✅ {account_stats['emails_new']} nouveaux, {account_stats['emails_duplicates']} doublons, {account_stats['auto_linked']} linked, {account_stats['interactions_created']} interactions")

        except Exception as e:
            db.rollback()
            logger.error(f"   ❌ Erreur sync {account.email}: {e}", exc_info=True)
            account_stats["error"] = str(e)
            errors.append({
                "account_id": account.id,
                "email": account.email,
                "error": str(e),
            })

        account_details.append(account_stats)

    # 4. RÉSULTAT FINAL
    result = {
        "success": True,
        "message": f"Synchronisation terminée: {total_synced} emails importés, {total_interactions_created} interactions créées",
        "total_emails_synced": total_synced,
        "duplicates_skipped": total_duplicates,
        "auto_linked_people": total_linked,
        "interactions_created": total_interactions_created,
        "accounts_processed": accounts_ok,
        "accounts_total": len(accounts),
        "errors": errors,
        "details": account_details,
        "sync_period": {
            "since": since.isoformat(),
            "days": since_days,
        },
    }

    logger.info(f"✅ Sync complete: {total_synced} emails, {total_duplicates} duplicates, {total_linked} linked, {total_interactions_created} interactions")
    return result


# =============================================================================
# TEMP: Debug endpoint sans auth
# =============================================================================

@router.post("/debug/email-accounts/{user_id}")
async def debug_add_email_account(
    user_id: int,
    request: AddEmailAccountRequest,
    db: Session = Depends(get_db),
):
    """
    TEMP: Ajouter un compte email SANS AUTH pour debug.
    """
    from core.encryption import encrypt_value

    # Validation
    if request.protocol in ("ews", "imap"):
        if not request.server:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'server'")
        if not request.password:
            raise HTTPException(400, f"{request.protocol.upper()} nécessite un 'password'")

    # Vérifier si compte existe déjà
    existing = db.query(UserEmailAccount).filter(
        UserEmailAccount.user_id == user_id,
        UserEmailAccount.email == request.email,
        UserEmailAccount.protocol == request.protocol,
    ).first()

    if existing:
        raise HTTPException(400, f"Compte {request.email} ({request.protocol}) existe déjà")

    # Créer le compte
    account = UserEmailAccount(
        user_id=user_id,
        email=request.email,
        protocol=request.protocol,
        server=request.server,
        provider=request.provider or request.protocol,
        encrypted_password=encrypt_value(request.password) if request.password else None,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    db.add(account)
    db.commit()
    db.refresh(account)

    return {
        "success": True,
        "account": {
            "id": account.id,
            "email": account.email,
            "protocol": account.protocol,
            "server": account.server,
            "provider": account.provider,
            "is_active": account.is_active,
            "created_at": account.created_at.isoformat(),
        }
    }


@router.get("/debug/email-accounts/{user_id}")
async def debug_list_email_accounts(
    user_id: int,
    db: Session = Depends(get_db),
):
    """TEMP: Liste comptes SANS AUTH"""
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.user_id == user_id
    ).all()

    return {
        "accounts": [
            {
                "id": acc.id,
                "email": acc.email,
                "protocol": acc.protocol,
                "server": acc.server,
                "provider": acc.provider,
                "is_active": acc.is_active,
                "created_at": acc.created_at.isoformat(),
            }
            for acc in accounts
        ]
    }


@router.post("/debug/email-accounts/test/{account_id}")
async def debug_test_connection(
    account_id: int,
    db: Session = Depends(get_db),
):
    """TEMP: Test connexion SANS AUTH"""
    from mail.provider_factory import MailProviderFactory

    account = db.query(UserEmailAccount).filter(
        UserEmailAccount.id == account_id,
    ).first()

    if not account:
        raise HTTPException(404, "Account not found")

    result = await MailProviderFactory.test_connection(account)
    return result


# =============================================================================
# MULTI-ACCOUNT EMAIL SYNC FOR AI AUTOFILL
# =============================================================================

@router.post("/debug/email-accounts/sync-all/{user_id}")
async def debug_sync_all_accounts(
    user_id: int,
    db: Session = Depends(get_db),
    since_days: int = Query(default=7),
):
    """
    TEMP: Sync tous les comptes email et parse les signatures SANS AUTH

    Pour chaque compte actif de l'utilisateur:
    1. Récupère les emails depuis N jours
    2. Parse les signatures
    3. Extrait les infos de contact (email, tel, entreprise)
    4. Les prépare pour l'IA d'autofill
    """
    from mail.provider_factory import MailProviderFactory
    from datetime import datetime, timezone, timedelta
    import re

    # Récupérer tous les comptes actifs
    accounts = db.query(UserEmailAccount).filter(
        UserEmailAccount.user_id == user_id,
        UserEmailAccount.is_active == True,
    ).all()

    if not accounts:
        return {
            "success": True,
            "message": "Aucun compte email configuré",
            "accounts_synced": 0,
        }

    since = datetime.now(timezone.utc) - timedelta(days=since_days)

    total_emails = 0
    signatures_found = 0
    accounts_synced = 0
    errors = []
    results = []

    for account in accounts:
        try:
            logger.info(f"Syncing account {account.email} ({account.protocol})")
            provider = MailProviderFactory.create_provider(account)
            messages = await provider.sync_messages_since(since)

            account_result = {
                "account_id": account.id,
                "email": account.email,
                "protocol": account.protocol,
                "server": account.server,
                "emails_count": len(messages),
                "sample_subjects": [m.get("subject", "")[:50] for m in messages[:5]],
            }

            total_emails += len(messages)
            accounts_synced += 1
            results.append(account_result)

            # Parser signatures (pattern simple pour détecter)
            for msg in messages:
                body = msg.get("body", "")
                if body and any(p in body.lower() for p in ["cordialement", "regards", "best regards", "@"]):
                    # Extraire emails et téléphones
                    emails_found = re.findall(r'[\w\.-]+@[\w\.-]+\.\w+', body)
                    phones_found = re.findall(r'[\+\d][\d\s\.\-\(\)]{8,}', body)

                    if emails_found or phones_found:
                        signatures_found += 1
                        logger.info(f"Signature trouvée: {len(emails_found)} emails, {len(phones_found)} tels")

        except Exception as e:
            logger.error(f"Erreur sync {account.email}: {e}", exc_info=True)
            errors.append({
                "account_id": account.id,
                "email": account.email,
                "error": str(e),
            })

    return {
        "success": True,
        "accounts_synced": accounts_synced,
        "total_accounts": len(accounts),
        "total_emails": total_emails,
        "signatures_found": signatures_found,
        "since_days": since_days,
        "since": since.isoformat(),
        "results": results,
        "errors": errors if errors else None,
    }
