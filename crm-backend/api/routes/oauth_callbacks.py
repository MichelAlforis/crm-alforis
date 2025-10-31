"""
Routes OAuth2 pour callbacks Gmail et Outlook.

Ces routes gèrent les redirects OAuth2 après autorisation utilisateur
sur Google ou Microsoft.
"""

import logging
import base64
from typing import Optional
from fastapi import APIRouter, Request, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from sqlalchemy.orm import Session

from core import get_db, get_current_user
from models.user import User
from services.oauth_gmail import GmailOAuthService
from services.oauth_outlook import OutlookOAuthService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/oauth", tags=["OAuth"])


# ==============================================================================
# GMAIL OAUTH
# ==============================================================================

@router.get("/gmail/authorize")
async def gmail_authorize(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Démarre le flow OAuth2 Gmail.

    Redirige l'utilisateur vers la page d'autorisation Google.

    Query params:
        - redirect_to: URL de redirection après succès (frontend)
    """
    gmail_service = GmailOAuthService(db)

    if not gmail_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="OAuth Gmail non configuré (GOOGLE_CLIENT_ID manquant)"
        )

    # Construire le state token (team_id:user_id:redirect_url encodé)
    redirect_to = request.query_params.get("redirect_to", "http://localhost:3010/dashboard/settings/integrations?tab=email")
    state_data = f"{current_user.team_id}:{current_user.id}:{redirect_to}"
    state = base64.urlsafe_b64encode(state_data.encode()).decode()

    # Générer l'URL d'autorisation
    auth_url = gmail_service.get_authorization_url(state)

    logger.info(f"🔗 Redirect Gmail OAuth pour user {current_user.email}")

    return RedirectResponse(url=auth_url)


@router.get("/gmail/callback")
async def gmail_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Callback OAuth2 Gmail.

    Google redirige ici après autorisation avec le code d'autorisation.
    """
    gmail_service = GmailOAuthService(db)

    # Gérer les erreurs OAuth
    if error:
        logger.error(f"❌ Erreur OAuth Gmail: {error}")
        return HTMLResponse(
            content=f"""
            <html>
                <head><title>Erreur OAuth</title></head>
                <body>
                    <h1>❌ Erreur d'autorisation Gmail</h1>
                    <p>Erreur: {error}</p>
                    <p><a href="http://localhost:3010/dashboard/settings/integrations?tab=email">Retour aux paramètres</a></p>
                </body>
            </html>
            """,
            status_code=400,
        )

    try:
        # Décoder le state token
        state_data = base64.urlsafe_b64decode(state.encode()).decode()
        parts = state_data.split(':')

        if len(parts) < 3:
            raise ValueError("State token invalide")

        team_id = int(parts[0])
        user_id = int(parts[1])
        redirect_to = ':'.join(parts[2:])  # Reconstruire l'URL (peut contenir des :)

        # Échanger le code contre les tokens
        logger.info(f"🔄 Exchange code Gmail pour user_id={user_id}")
        tokens = gmail_service.exchange_code_for_tokens(code)

        # Sauvegarder le compte
        account = gmail_service.save_account(
            team_id=team_id,
            user_id=user_id,
            email=tokens["email"],
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_expiry=tokens.get("token_expiry"),
        )

        logger.info(f"✅ Compte Gmail OAuth connecté: {account.email}")

        # Rediriger vers le frontend avec succès
        success_url = f"{redirect_to}{'&' if '?' in redirect_to else '?'}oauth=success&provider=gmail&email={account.email}"

        return HTMLResponse(
            content=f"""
            <html>
                <head>
                    <title>Gmail connecté</title>
                    <meta http-equiv="refresh" content="3;url={success_url}">
                </head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>✅ Compte Gmail connecté avec succès!</h1>
                    <p>Email: <strong>{account.email}</strong></p>
                    <p>Redirection automatique dans 3 secondes...</p>
                    <p><a href="{success_url}">Cliquez ici si la redirection ne fonctionne pas</a></p>
                </body>
            </html>
            """,
            status_code=200,
        )

    except Exception as e:
        logger.error(f"❌ Erreur callback Gmail: {e}", exc_info=True)
        return HTMLResponse(
            content=f"""
            <html>
                <head><title>Erreur</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ Erreur lors de la connexion Gmail</h1>
                    <p>Erreur: {str(e)}</p>
                    <p><a href="http://localhost:3010/dashboard/settings/integrations?tab=email">Retour aux paramètres</a></p>
                </body>
            </html>
            """,
            status_code=500,
        )


# ==============================================================================
# OUTLOOK OAUTH
# ==============================================================================

@router.get("/outlook/authorize")
async def outlook_authorize(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Démarre le flow OAuth2 Outlook.

    Redirige l'utilisateur vers la page d'autorisation Microsoft.

    Query params:
        - redirect_to: URL de redirection après succès (frontend)
    """
    outlook_service = OutlookOAuthService(db)

    if not outlook_service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="OAuth Outlook non configuré (MICROSOFT_CLIENT_ID manquant)"
        )

    # Construire le state token
    redirect_to = request.query_params.get("redirect_to", "http://localhost:3010/dashboard/settings/integrations?tab=email")
    state_data = f"{current_user.team_id}:{current_user.id}:{redirect_to}"
    state = base64.urlsafe_b64encode(state_data.encode()).decode()

    # Générer l'URL d'autorisation
    auth_url = outlook_service.get_authorization_url(state)

    logger.info(f"🔗 Redirect Outlook OAuth pour user {current_user.email}")

    return RedirectResponse(url=auth_url)


@router.get("/outlook/callback")
async def outlook_callback(
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    error: Optional[str] = Query(None),
    error_description: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """
    Callback OAuth2 Outlook.

    Microsoft redirige ici après autorisation avec le code d'autorisation.
    """
    outlook_service = OutlookOAuthService(db)

    # Gérer les erreurs OAuth
    if error:
        logger.error(f"❌ Erreur OAuth Outlook: {error} - {error_description}")
        return HTMLResponse(
            content=f"""
            <html>
                <head><title>Erreur OAuth</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ Erreur d'autorisation Outlook</h1>
                    <p>Erreur: {error}</p>
                    <p>Description: {error_description}</p>
                    <p><a href="http://localhost:3010/dashboard/settings/integrations?tab=email">Retour aux paramètres</a></p>
                </body>
            </html>
            """,
            status_code=400,
        )

    try:
        # Décoder le state token
        state_data = base64.urlsafe_b64decode(state.encode()).decode()
        parts = state_data.split(':')

        if len(parts) < 3:
            raise ValueError("State token invalide")

        team_id = int(parts[0])
        user_id = int(parts[1])
        redirect_to = ':'.join(parts[2:])

        # Échanger le code contre les tokens
        logger.info(f"🔄 Exchange code Outlook pour user_id={user_id}")
        tokens = outlook_service.exchange_code_for_tokens(code)

        # Sauvegarder le compte
        account = outlook_service.save_account(
            team_id=team_id,
            user_id=user_id,
            email=tokens["email"],
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"],
            token_expiry=tokens.get("token_expiry"),
        )

        logger.info(f"✅ Compte Outlook OAuth connecté: {account.email}")

        # Rediriger vers le frontend avec succès
        success_url = f"{redirect_to}{'&' if '?' in redirect_to else '?'}oauth=success&provider=outlook&email={account.email}"

        return HTMLResponse(
            content=f"""
            <html>
                <head>
                    <title>Outlook connecté</title>
                    <meta http-equiv="refresh" content="3;url={success_url}">
                </head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>✅ Compte Outlook connecté avec succès!</h1>
                    <p>Email: <strong>{account.email}</strong></p>
                    <p>Redirection automatique dans 3 secondes...</p>
                    <p><a href="{success_url}">Cliquez ici si la redirection ne fonctionne pas</a></p>
                </body>
            </html>
            """,
            status_code=200,
        )

    except Exception as e:
        logger.error(f"❌ Erreur callback Outlook: {e}", exc_info=True)
        return HTMLResponse(
            content=f"""
            <html>
                <head><title>Erreur</title></head>
                <body style="font-family: system-ui; text-align: center; padding: 50px;">
                    <h1>❌ Erreur lors de la connexion Outlook</h1>
                    <p>Erreur: {str(e)}</p>
                    <p><a href="http://localhost:3010/dashboard/settings/integrations?tab=email">Retour aux paramètres</a></p>
                </body>
            </html>
            """,
            status_code=500,
        )


# ==============================================================================
# UTILS
# ==============================================================================

@router.get("/status")
async def oauth_status(db: Session = Depends(get_db)):
    """
    Vérifie la configuration OAuth pour Gmail et Outlook.

    Retourne un JSON indiquant quels providers sont disponibles.
    """
    gmail_service = GmailOAuthService(db)
    outlook_service = OutlookOAuthService(db)

    return {
        "gmail": {
            "configured": gmail_service.is_configured(),
            "available": gmail_service.is_configured(),
        },
        "outlook": {
            "configured": outlook_service.is_configured(),
            "available": outlook_service.is_configured(),
        },
    }
