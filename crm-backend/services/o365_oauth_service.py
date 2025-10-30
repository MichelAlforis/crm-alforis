"""
Service OAuth Office 365 - App 2 (EWS/IMAP)

Gère l'authentification OAuth pour accès EWS/IMAP
Séparé de Graph API pour isolation des permissions

Scopes:
- EWS.AccessAsUser.All
- IMAP.AccessAsUser.All
- offline_access
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from urllib.parse import quote

import httpx
from sqlalchemy.orm import Session

from core.config import settings
from core.encryption import decrypt_value, encrypt_value
from models.user import User

logger = logging.getLogger(__name__)


class O365OAuthService:
    """
    Service OAuth pour Office 365 (EWS/IMAP)

    Distinct de OutlookIntegration (Graph API) pour:
    - Isolation permissions
    - Rotation secrets indépendante
    - Audit clair
    """

    def __init__(self, db: Session):
        self.db = db
        self.client_id = settings.o365_client_id
        self.client_secret = settings.o365_client_secret
        self.tenant_id = settings.o365_tenant_id
        self.redirect_uri = settings.o365_redirect_uri
        self.scopes = settings.o365_scopes.split()

        # URLs avec tenant_id spécifique (requis pour EWS/IMAP)
        self.auth_url = (
            settings.o365_auth_url
            or f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/authorize"
        )
        self.token_url = (
            settings.o365_token_url
            or f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        )

    def get_authorization_url(
        self,
        state: str,
        *,
        login_hint: Optional[str] = None,
        force_prompt: bool = True,
    ) -> str:
        """
        Génère l'URL d'autorisation OAuth pour EWS/IMAP

        Args:
            state: État CSRF pour sécuriser le callback
            login_hint: Email suggéré pour pré-remplir
            force_prompt: Force select_account

        Returns:
            URL d'autorisation Microsoft
        """
        scopes_str = " ".join(self.scopes)
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": scopes_str,
            "state": state,
        }

        if force_prompt:
            params["prompt"] = "select_account"

        if login_hint:
            params["login_hint"] = login_hint

        query_string = "&".join([f"{k}={quote(str(v))}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Échange le code OAuth contre un access token

        Args:
            code: Code d'autorisation reçu du callback

        Returns:
            Dict contenant access_token, refresh_token, expires_in
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri,
                "scope": " ".join(self.scopes),
            }

            response = await client.post(self.token_url, data=data)
            response.raise_for_status()
            return response.json()

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Rafraîchit l'access token avec le refresh token

        Args:
            refresh_token: Token de rafraîchissement

        Returns:
            Dict contenant nouveau access_token, refresh_token, expires_in
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            data = {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "scope": " ".join(self.scopes),
            }

            response = await client.post(self.token_url, data=data)
            response.raise_for_status()
            return response.json()

    async def get_valid_access_token(self, user: User) -> str:
        """
        Récupère un access token valide, refresh si nécessaire

        Args:
            user: User object avec tokens stockés

        Returns:
            Access token valide

        Raises:
            Exception si refresh échoue ou tokens manquants
        """
        # Vérifier si user a des tokens O365 stockés
        if not hasattr(user, 'encrypted_o365_access_token') or not user.encrypted_o365_access_token:
            raise Exception("O365 OAuth non connecté pour cet utilisateur")

        # Décrypter tokens
        access_token = decrypt_value(user.encrypted_o365_access_token)
        refresh_token = decrypt_value(user.encrypted_o365_refresh_token)

        # Vérifier expiration
        now = datetime.now(timezone.utc)
        expires_at = user.o365_token_expires_at

        # Si token expire dans moins de 5 min, refresh
        if expires_at and expires_at < now + timedelta(minutes=5):
            logger.info(f"O365 token expires soon, refreshing for user {user.id}")

            try:
                token_data = await self.refresh_access_token(refresh_token)

                # Mettre à jour en BDD
                expires_in = token_data.get("expires_in", 3600)
                user.encrypted_o365_access_token = encrypt_value(token_data["access_token"])
                user.encrypted_o365_refresh_token = encrypt_value(
                    token_data.get("refresh_token", refresh_token)
                )
                user.o365_token_expires_at = now + timedelta(seconds=expires_in)

                self.db.commit()

                return token_data["access_token"]

            except Exception as e:
                logger.error(f"O365 token refresh failed for user {user.id}: {e}")
                raise Exception("Impossible de rafraîchir le token O365. Reconnexion nécessaire.")

        return access_token

    async def validate_token_identity(self, token_data: Dict) -> Dict:
        """
        Valide le token et récupère l'identité de l'utilisateur

        Args:
            token_data: Dict contenant access_token

        Returns:
            Dict avec email et profile info
        """
        access_token = token_data["access_token"]

        # Utiliser Graph API pour récupérer l'identité même si app EWS/IMAP
        # (car /me endpoint n'existe pas en EWS/IMAP)
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            # Si Graph API ne fonctionne pas, essayer avec email du token JWT
            if response.status_code != 200:
                logger.warning("Cannot validate identity via Graph API, using JWT claims")
                # TODO: Décoder JWT pour extraire email
                return {"email": None, "profile": {}}

            data = response.json()
            return {
                "email": data.get("userPrincipalName") or data.get("mail"),
                "profile": {
                    "display_name": data.get("displayName"),
                    "given_name": data.get("givenName"),
                    "surname": data.get("surname"),
                },
            }

    async def test_ews_connection_with_oauth(self, access_token: str, email: str) -> Dict:
        """
        Test connexion EWS avec OAuth token

        Args:
            access_token: Token OAuth O365
            email: Email de l'utilisateur

        Returns:
            Dict avec success et détails
        """
        from mail.providers.ews_provider import EWSProvider

        try:
            ews = EWSProvider(
                tenant_id=self.tenant_id,
                client_id=self.client_id,
                email=email,
                client_secret=self.client_secret,
                access_token=access_token,
            )

            result = await ews.test_connection()
            return result

        except Exception as e:
            logger.error(f"EWS OAuth connection test failed: {e}")
            return {
                "success": False,
                "provider": "ews_oauth",
                "email": email,
                "error": str(e),
            }

    async def test_imap_connection_with_oauth(self, access_token: str, email: str) -> Dict:
        """
        Test connexion IMAP avec OAuth token

        Args:
            access_token: Token OAuth O365
            email: Email de l'utilisateur

        Returns:
            Dict avec success et détails
        """
        from mail.providers.imap_provider import IMAPProvider

        try:
            imap = IMAPProvider(
                host="outlook.office365.com",
                username=email,
                access_token=access_token,
            )

            result = await imap.test_connection()
            return result

        except Exception as e:
            logger.error(f"IMAP OAuth connection test failed: {e}")
            return {
                "success": False,
                "provider": "imap_oauth",
                "email": email,
                "error": str(e),
            }
