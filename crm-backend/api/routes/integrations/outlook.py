"""
Routes API Outlook OAuth & Sync

Endpoints (15 au total):
✅ POST   /authorize          - Démarrer OAuth
✅ POST   /callback           - Callback OAuth
✅ GET    /search             - Recherche emails
✅ GET    /search/debug       - Debug search
✅ GET    /debug/me           - Profile user
✅ GET    /debug/messages-raw - Messages bruts
✅ GET    /debug/folders      - Liste dossiers
✅ GET    /debug/test-all-folders - Test tous dossiers
✅ GET    /sync               - Sync emails
✅ GET    /me                 - Get profile
✅ GET    /signatures/pending - Signatures en attente
✅ POST   /signatures/{id}/approve - Approuver signature
✅ POST   /signatures/{id}/reject  - Rejeter signature
✅ GET    /signatures         - Liste signatures
✅ DELETE /disconnect         - Déconnexion
✅ DELETE /data               - Suppression données
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.cache import RedisClient
from core.encryption import encrypt_value
from models.user import User
from schemas.integrations import (
    OutlookAuthorizeResponse,
    OutlookCallbackRequest,
    OutlookCallbackResponse,
    OutlookSignaturesResponse,
    OutlookSyncResponse,
)
from services.outlook_integration import OutlookIntegration

router = APIRouter()

@router.post("/authorize", response_model=OutlookAuthorizeResponse)
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

    # Store state in Redis for CSRF validation (5min TTL)
    try:
        redis_client = RedisClient.get_client()
        redis_client.setex(f"oauth:state:{state}", 300, str(user_id))
    except Exception as e:
        # Log but don't fail - degrade gracefully
        import logging
        logging.warning(f"Failed to store OAuth state in Redis: {e}")

    return {
        "authorization_url": authorization_url,
        "state": state,
    }


@router.post("/callback", response_model=OutlookCallbackResponse)
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

    # Validate CSRF state token
    try:
        redis_client = RedisClient.get_client()
        stored_user_id = redis_client.get(f"oauth:state:{request.state}")

        if not stored_user_id:
            raise HTTPException(
                status_code=400,
                detail="Invalid or expired state token. Please restart the OAuth flow."
            )

        # Delete state after validation (one-time use)
        redis_client.delete(f"oauth:state:{request.state}")

        # Verify user_id matches
        user_id = current_user.get("user_id") or current_user.get("sub")
        if str(user_id) != stored_user_id:
            raise HTTPException(
                status_code=403,
                detail="State token does not match current user"
            )
    except HTTPException:
        raise
    except Exception as e:
        # Log but allow if Redis is down (degrade gracefully)
        import logging
        logging.warning(f"CSRF validation failed (Redis error): {e}")

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


@router.get("/search")
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


@router.get("/search/debug")
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


@router.get("/debug/me")
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


@router.get("/debug/messages-raw")
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


@router.get("/debug/folders")
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


@router.get("/debug/test-all-folders")
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


@router.get("/sync", response_model=OutlookSyncResponse)
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


@router.get("/me")
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


@router.get("/signatures/pending")
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


@router.post("/signatures/{signature_id}/approve")
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


@router.post("/signatures/{signature_id}/reject")
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


@router.get("/signatures", response_model=OutlookSignaturesResponse)
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


@router.delete("/disconnect")
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


@router.delete("/data")
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


