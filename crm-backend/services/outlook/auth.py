"""
Outlook OAuth Authentication - Microsoft Graph OAuth 2.0 flow

Fonctionnalités:
- Authorization URL generation
- Token exchange (code → access_token)
- Token refresh (refresh_token → new access_token)
- Token validation & identity extraction
- Domain validation (whitelist)
"""

import base64
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional
from urllib.parse import quote

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.config import settings
from core.encryption import decrypt_value, encrypt_value
from models.user import User


class OutlookAuth:
    """OAuth 2.0 authentication for Microsoft Graph API"""

    def __init__(self, db: Session):
        self.db = db
        self.client_id = settings.outlook_client_id
        self.client_secret = settings.outlook_client_secret
        self.redirect_uri = settings.outlook_redirect_uri
        self.tenant = (settings.outlook_tenant or "organizations").strip() or "organizations"
        self.auth_url = settings.outlook_auth_url or f"https://login.microsoftonline.com/{self.tenant}/oauth2/v2.0/authorize"
        self.token_url = settings.outlook_token_url or f"https://login.microsoftonline.com/{self.tenant}/oauth2/v2.0/token"
        self.scopes = settings.outlook_scopes.split()
        self.allowed_domains = [
            domain.lower() for domain in settings.outlook_allowed_domains
        ] if settings.outlook_allowed_domains else []

    def get_authorization_url(
        self,
        state: str,
        *,
        login_hint: Optional[str] = None,
        force_prompt: bool = True,
        domain_hint: Optional[str] = None,
    ) -> str:
        """
        Génère l'URL d'autorisation OAuth Microsoft

        Args:
            state: État CSRF pour sécuriser le callback
            login_hint: Email suggéré pour pré-remplir
            force_prompt: Force select_account
            domain_hint: Hint Microsoft (organizations, consumers)

        Returns:
            URL d'autorisation complète
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

        if domain_hint:
            params["domain_hint"] = domain_hint

        query_string = "&".join(f"{k}={quote(str(v))}" for k, v in params.items())
        return f"{self.auth_url}?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Échange authorization code contre access_token

        Args:
            code: Authorization code from OAuth callback

        Returns:
            {
                "access_token": "...",
                "refresh_token": "...",
                "expires_in": 3600,
                "token_type": "Bearer"
            }

        Raises:
            HTTPException: Si exchange échoue
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "code": code,
            "redirect_uri": self.redirect_uri,
            "grant_type": "authorization_code",
            "scope": " ".join(self.scopes),
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.token_url, data=data)

            if response.status_code != 200:
                error_data = response.json() if response.text else {}
                raise HTTPException(
                    status_code=400,
                    detail=f"Token exchange failed: {error_data.get('error_description', response.text)}"
                )

            return response.json()

    @staticmethod
    def _decode_jwt_without_verification(token: str) -> Dict:
        """Decode JWT payload sans vérifier la signature"""
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")

        payload = parts[1]
        padding = "=" * (4 - len(payload) % 4)
        decoded = base64.urlsafe_b64decode(payload + padding)
        return json.loads(decoded)

    def _is_domain_allowed(self, email: str) -> bool:
        """Vérifie si le domaine email est dans la whitelist"""
        if not self.allowed_domains:
            return True
        domain = email.split("@")[-1].lower()
        return domain in self.allowed_domains

    async def validate_token_identity(self, token_data: Dict) -> Dict:
        """
        Valide l'identité du token et extrait infos utilisateur

        Args:
            token_data: Response from token exchange

        Returns:
            {
                "email": "user@domain.com",
                "profile": {...}  # Graph API /me response
            }

        Raises:
            HTTPException: Si validation échoue ou domaine non autorisé
        """
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(400, "Missing access_token")

        # 1. Décoder id_token si présent
        id_token = token_data.get("id_token")
        if id_token:
            try:
                claims = self._decode_jwt_without_verification(id_token)
                email = claims.get("preferred_username") or claims.get("email")

                # Vérifier whitelist domaine
                if email and not self._is_domain_allowed(email):
                    raise HTTPException(
                        403,
                        f"Domain not allowed: {email.split('@')[-1]}"
                    )

                # Si email trouvé, retourner rapidement
                if email:
                    return {
                        "email": email,
                        "profile": {
                            "displayName": claims.get("name"),
                            "id": claims.get("oid"),
                        }
                    }
            except Exception as e:
                # Si décodage échoue, on continue avec Graph API
                print(f"Warning: Could not decode id_token: {e}")

        # 2. Fallback: Appeler Graph API /me
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://graph.microsoft.com/v1.0/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                raise HTTPException(
                    400,
                    f"Failed to get user profile: {response.text}"
                )

            profile = response.json()
            email = profile.get("mail") or profile.get("userPrincipalName")

            if not email:
                raise HTTPException(400, "Could not determine user email")

            # Vérifier whitelist
            if not self._is_domain_allowed(email):
                raise HTTPException(
                    403,
                    f"Domain not allowed: {email.split('@')[-1]}"
                )

            return {
                "email": email,
                "profile": profile,
            }

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Refresh access_token avec refresh_token

        Args:
            refresh_token: Refresh token OAuth

        Returns:
            Nouveau token data

        Raises:
            HTTPException: Si refresh échoue
        """
        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
            "scope": " ".join(self.scopes),
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.token_url, data=data)

            if response.status_code != 200:
                raise HTTPException(
                    401,
                    f"Token refresh failed: {response.text}"
                )

            return response.json()

    async def get_valid_access_token(
        self,
        user: User,
        force_refresh: bool = False
    ) -> str:
        """
        Récupère un access_token valide (refresh auto si expiré)

        Args:
            user: User SQLAlchemy model
            force_refresh: Force refresh même si token pas expiré

        Returns:
            Valid access_token

        Raises:
            HTTPException: Si refresh impossible
        """
        if not user.encrypted_outlook_access_token:
            raise HTTPException(401, "No Outlook token stored")

        access_token = decrypt_value(user.encrypted_outlook_access_token)
        expires_at = user.outlook_token_expires_at

        # Check if expired
        now = datetime.now(timezone.utc)
        is_expired = not expires_at or expires_at <= now + timedelta(minutes=5)

        if not is_expired and not force_refresh:
            return access_token

        # Refresh needed
        if not user.encrypted_outlook_refresh_token:
            raise HTTPException(401, "No refresh token available")

        refresh_token = decrypt_value(user.encrypted_outlook_refresh_token)

        try:
            token_data = await self.refresh_access_token(refresh_token)
        except HTTPException:
            # Refresh failed, clear tokens
            user.encrypted_outlook_access_token = None
            user.encrypted_outlook_refresh_token = None
            user.outlook_connected = False
            self.db.commit()
            raise HTTPException(401, "Token refresh failed, please reconnect Outlook")

        # Update stored tokens
        user.encrypted_outlook_access_token = encrypt_value(token_data["access_token"])

        if token_data.get("refresh_token"):
            user.encrypted_outlook_refresh_token = encrypt_value(token_data["refresh_token"])

        expires_in = token_data.get("expires_in", 3600)
        user.outlook_token_expires_at = now + timedelta(seconds=expires_in)

        self.db.commit()
        self.db.refresh(user)

        return token_data["access_token"]
