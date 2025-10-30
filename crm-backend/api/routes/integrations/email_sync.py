"""
Routes API Email Sync - Orchestration multi-comptes

Endpoints (13 au total):
✅ POST   /sync-all-emails         - Sync tous les comptes email de l'user
✅ POST   /mail/connect-imap       - Connexion IMAP (legacy)
✅ GET    /mail/sync-imap          - Sync IMAP (legacy)
✅ DELETE /mail/disconnect-imap    - Déconnexion IMAP
✅ GET    /mail/test-providers     - Test providers IMAP
✅ POST   /o365/authorize          - OAuth O365
✅ POST   /o365/callback           - Callback OAuth O365
✅ POST   /o365/callback-dev/{user_id} - Callback dev O365
✅ GET    /o365/test-ews           - Test EWS O365
✅ GET    /o365/test-ews-direct/{user_id} - Test EWS direct
✅ GET    /o365/test-imap          - Test IMAP O365
✅ GET    /o365/debug-token/{user_id} - Debug token O365
✅ POST   /ionos/test-ews          - Test EWS IONOS
"""

import hashlib
import imaplib
import json
from datetime import datetime, timezone
from email import policy
from email.parser import BytesParser
from typing import Dict, Optional

from exchangelib import DELEGATE, Account, Configuration, Credentials
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.encryption import decrypt_value, encrypt_value
from models.email_message import EmailMessage
from models.interaction import Interaction
from models.user import User
from models.user_email_account import UserEmailAccount
from services.o365_oauth_service import O365OAuthService
from services.outlook_integration import OutlookIntegration

router = APIRouter()


# ==========================================
# PYDANTIC MODELS
# ==========================================


class IMAPConnectRequest(BaseModel):
    email: str
    imap_host: str
    imap_port: int = 993
    imap_username: str
    imap_password: str


class O365CallbackRequest(BaseModel):
    code: str
    state: str


class IONOSTestRequest(BaseModel):
    email: str
    password: str
    ews_url: str = "https://mail.ionos.fr/ews/exchange.asmx"


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

