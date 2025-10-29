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
from datetime import datetime, timedelta
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.encryption import decrypt_value, encrypt_value
from models.autofill_decision_log import AutofillDecisionLog
from models.user import User
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
    user_id = current_user.get("user_id") or current_user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="User ID manquant dans le token")
    user = db.query(User).filter(User.id == int(user_id)).first()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Stocker tokens chiffrés (legacy - pour compatibilité)
    user.encrypted_outlook_access_token = encrypt_value(token_data["access_token"])
    user.encrypted_outlook_refresh_token = encrypt_value(token_data["refresh_token"])
    user.outlook_token_expires_at = datetime.utcnow() + timedelta(
        seconds=token_data.get("expires_in", 3600)
    )
    user.outlook_connected = True

    # Enregistrer le consentement RGPD (implicite via le flow OAuth)
    from datetime import timezone
    user.outlook_consent_given = True
    user.outlook_consent_date = datetime.now(timezone.utc)

    db.commit()

    # Récupérer le profil Microsoft pour avoir l'email exact (après commit - optionnel)
    # Si ça échoue, on le fera à la première synchro
    microsoft_email = None
    try:
        microsoft_profile = await outlook_service.get_user_profile(token_data["access_token"])
        microsoft_email = microsoft_profile.get("mail") or microsoft_profile.get("userPrincipalName")

        # Créer/mettre à jour l'entrée dans user_email_accounts (multi-adresse)
        from models.user_email_account import UserEmailAccount

        email_account = (
            db.query(UserEmailAccount)
            .filter(
                UserEmailAccount.user_id == user.id,
                UserEmailAccount.email == microsoft_email,
                UserEmailAccount.provider == "outlook"
            )
            .first()
        )

        if not email_account:
            # Créer nouvelle entrée
            email_account = UserEmailAccount(
                user_id=user.id,
                email=microsoft_email,
                provider="outlook",
                display_name=microsoft_profile.get("displayName"),
                is_primary=True,  # Premier compte Outlook = primary
                is_active=True,
                encrypted_access_token=encrypt_value(token_data["access_token"]),
                encrypted_refresh_token=encrypt_value(token_data["refresh_token"]),
                token_expires_at=datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600)),
                consent_given=True,
                consent_date=datetime.now(timezone.utc),
                microsoft_user_id=microsoft_profile.get("id"),
                user_principal_name=microsoft_profile.get("userPrincipalName"),
                job_title=microsoft_profile.get("jobTitle"),
                office_location=microsoft_profile.get("officeLocation"),
            )
            db.add(email_account)
            db.commit()
        else:
            # Mettre à jour tokens
            email_account.encrypted_access_token = encrypt_value(token_data["access_token"])
            email_account.encrypted_refresh_token = encrypt_value(token_data["refresh_token"])
            email_account.token_expires_at = datetime.utcnow() + timedelta(seconds=token_data.get("expires_in", 3600))
            email_account.is_active = True
            email_account.display_name = microsoft_profile.get("displayName")
            email_account.job_title = microsoft_profile.get("jobTitle")
            email_account.office_location = microsoft_profile.get("officeLocation")
            db.commit()
    except Exception as e:
        # Ne pas bloquer la connexion si l'appel Graph API échoue
        print(f"[WARNING] Impossible de récupérer le profil Microsoft: {e}")

    return {
        "status": "connected",
        "message": "Outlook connecté avec succès",
        "microsoft_email": microsoft_email,
        "expires_in": token_data.get("expires_in"),
    }


@router.get("/outlook/search")
async def outlook_search(
    query: str = Query(..., min_length=2, description="Nom, email ou entreprise à rechercher"),
    limit: int = Query(10, le=20),
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

    access_token = decrypt_value(user.encrypted_outlook_access_token)

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


@router.get("/outlook/sync", response_model=OutlookSyncResponse)
async def outlook_sync(
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    MODE 3 : Synchronisation passive (aspirateur)

    Récupère les messages récents et extrait les signatures
    ⚠️ Les signatures vont en salle d'attente pour validation manuelle
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

    # Déchiffrer token
    access_token = decrypt_value(user.encrypted_outlook_access_token)

    # TODO: Vérifier expiration et refresh si nécessaire

    # Récupérer messages
    messages = await outlook_service.get_recent_messages(access_token, limit=limit)

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

    # Déchiffrer token
    access_token = decrypt_value(user.encrypted_outlook_access_token)

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
