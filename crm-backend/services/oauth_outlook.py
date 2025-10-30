"""
Service OAuth2 pour Outlook / Microsoft 365.

Permet aux utilisateurs de connecter leurs comptes Outlook via OAuth2
en utilisant Microsoft Authentication Library (MSAL).

Documentation:
- MSAL Python: https://github.com/AzureAD/microsoft-authentication-library-for-python
- Microsoft Graph: https://learn.microsoft.com/en-us/graph/api/overview
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

import msal
import requests

from sqlalchemy.orm import Session
from models.user_email_account import UserEmailAccount
from models.interaction import Interaction
from models.person import Person
from services.email_encryption import encrypt_password, decrypt_password

logger = logging.getLogger(__name__)


class OutlookOAuthService:
    """Service pour gérer l'authentification OAuth2 Outlook/M365."""

    # Scopes Microsoft Graph nécessaires
    SCOPES = [
        'https://graph.microsoft.com/Mail.Read',
        'https://graph.microsoft.com/Mail.Send',
        'https://graph.microsoft.com/Mail.ReadWrite',
        'https://graph.microsoft.com/User.Read',
        'offline_access',  # Pour refresh_token
    ]

    # URL Microsoft Graph API
    GRAPH_API_ENDPOINT = 'https://graph.microsoft.com/v1.0'

    def __init__(self, db: Session):
        self.db = db
        self.client_id = os.getenv("MICROSOFT_CLIENT_ID")
        self.client_secret = os.getenv("MICROSOFT_CLIENT_SECRET")
        self.redirect_uri = os.getenv(
            "MICROSOFT_REDIRECT_URI",
            "http://localhost:8000/api/v1/oauth/outlook/callback"
        )
        self.authority = "https://login.microsoftonline.com/common"

        if not self.client_id or not self.client_secret:
            logger.warning(
                "⚠️  MICROSOFT_CLIENT_ID ou MICROSOFT_CLIENT_SECRET non configurés. "
                "OAuth Outlook désactivé."
            )

    def is_configured(self) -> bool:
        """Vérifie si OAuth Outlook est configuré."""
        return bool(self.client_id and self.client_secret)

    def _get_msal_app(self) -> msal.ConfidentialClientApplication:
        """Crée une instance MSAL ConfidentialClientApplication."""
        return msal.ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret,
        )

    def get_authorization_url(self, state: str) -> str:
        """
        Génère l'URL d'autorisation OAuth2 Microsoft.

        Args:
            state: State token pour prévenir CSRF (team_id:user_id encodé)

        Returns:
            URL d'autorisation Microsoft
        """
        if not self.is_configured():
            raise ValueError("OAuth Outlook non configuré (MICROSOFT_CLIENT_ID manquant)")

        app = self._get_msal_app()

        auth_url = app.get_authorization_request_url(
            scopes=self.SCOPES,
            state=state,
            redirect_uri=self.redirect_uri,
            prompt='consent',  # Forcer consentement pour refresh_token
        )

        logger.info(f"📧 URL d'autorisation Outlook générée (state={state})")
        return auth_url

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Échange le code d'autorisation contre des tokens OAuth2.

        Args:
            code: Code d'autorisation reçu de Microsoft

        Returns:
            Dict contenant access_token, refresh_token, expiry, email
        """
        if not self.is_configured():
            raise ValueError("OAuth Outlook non configuré")

        app = self._get_msal_app()

        result = app.acquire_token_by_authorization_code(
            code,
            scopes=self.SCOPES,
            redirect_uri=self.redirect_uri,
        )

        if "error" in result:
            error_msg = f"{result.get('error')}: {result.get('error_description')}"
            logger.error(f"Erreur exchange code Outlook: {error_msg}")
            raise ValueError(error_msg)

        # Récupérer l'email de l'utilisateur
        access_token = result.get('access_token')
        email = self._get_user_email(access_token)

        # Calculer expiry
        expires_in = result.get('expires_in', 3600)
        token_expiry = (datetime.now() + timedelta(seconds=expires_in)).isoformat()

        return {
            "access_token": access_token,
            "refresh_token": result.get('refresh_token'),
            "token_expiry": token_expiry,
            "email": email,
            "scopes": result.get('scope', []),
        }

    def _get_user_email(self, access_token: str) -> str:
        """
        Récupère l'adresse email de l'utilisateur via Microsoft Graph.

        Args:
            access_token: Access token OAuth2

        Returns:
            Adresse email
        """
        headers = {
            'Authorization': f'Bearer {access_token}',
        }

        response = requests.get(
            f'{self.GRAPH_API_ENDPOINT}/me',
            headers=headers,
        )

        if response.status_code != 200:
            logger.error(f"Erreur récupération profil Outlook: {response.text}")
            raise ValueError("Impossible de récupérer le profil utilisateur")

        profile = response.json()
        return profile.get('userPrincipalName') or profile.get('mail')

    def save_account(
        self,
        team_id: int,
        user_id: int,
        email: str,
        access_token: str,
        refresh_token: str,
        token_expiry: Optional[str] = None,
    ) -> UserEmailAccount:
        """
        Sauvegarde un compte Outlook OAuth dans la base de données.

        Args:
            team_id: ID de l'équipe
            user_id: ID de l'utilisateur
            email: Adresse Outlook
            access_token: Access token OAuth2
            refresh_token: Refresh token OAuth2
            token_expiry: Date d'expiration du token

        Returns:
            UserEmailAccount créé
        """
        # Vérifier si le compte existe déjà
        existing = (
            self.db.query(UserEmailAccount)
            .filter(
                UserEmailAccount.team_id == team_id,
                UserEmailAccount.email == email,
            )
            .first()
        )

        if existing:
            # Mettre à jour les tokens
            existing.encrypted_password = encrypt_password(refresh_token)
            existing.raw_data = {
                "access_token": access_token,
                "token_expiry": token_expiry,
                "oauth_method": "microsoft",
                "updated_at": datetime.now().isoformat(),
            }
            existing.is_active = True

            self.db.commit()
            self.db.refresh(existing)

            logger.info(f"✅ Compte Outlook mis à jour: {email}")
            return existing

        # Créer un nouveau compte
        new_account = UserEmailAccount(
            team_id=team_id,
            user_id=user_id,
            email=email,
            provider="outlook",
            server="outlook.office365.com",  # Non utilisé pour OAuth, mais requis
            port=993,
            encrypted_password=encrypt_password(refresh_token),  # Stocker refresh_token
            is_active=True,
            raw_data={
                "access_token": access_token,
                "token_expiry": token_expiry,
                "oauth_method": "microsoft",
                "created_at": datetime.now().isoformat(),
            },
        )

        self.db.add(new_account)
        self.db.commit()
        self.db.refresh(new_account)

        logger.info(f"✅ Nouveau compte Outlook OAuth créé: {email}")
        return new_account

    def get_fresh_access_token(self, account: UserEmailAccount) -> str:
        """
        Récupère un access token valide (refresh si nécessaire).

        Args:
            account: UserEmailAccount avec tokens OAuth2

        Returns:
            Access token valide
        """
        if account.provider != "outlook":
            raise ValueError(f"Compte {account.email} n'est pas Outlook")

        # Récupérer les tokens stockés
        refresh_token = decrypt_password(account.encrypted_password)
        access_token = account.raw_data.get("access_token")
        token_expiry_str = account.raw_data.get("token_expiry")

        # Vérifier si le token est expiré
        if token_expiry_str:
            token_expiry = datetime.fromisoformat(token_expiry_str)
            if datetime.now() < token_expiry:
                # Token encore valide
                return access_token

        # Token expiré, refresh
        logger.info(f"🔄 Refresh token Outlook pour {account.email}")

        app = self._get_msal_app()

        result = app.acquire_token_by_refresh_token(
            refresh_token,
            scopes=self.SCOPES,
        )

        if "error" in result:
            error_msg = f"{result.get('error')}: {result.get('error_description')}"
            logger.error(f"Erreur refresh token Outlook: {error_msg}")
            raise ValueError(
                f"Impossible de refresh le token Outlook pour {account.email}: {error_msg}"
            )

        # Mettre à jour les tokens en DB
        new_access_token = result.get('access_token')
        new_refresh_token = result.get('refresh_token', refresh_token)
        expires_in = result.get('expires_in', 3600)
        new_expiry = (datetime.now() + timedelta(seconds=expires_in)).isoformat()

        account.encrypted_password = encrypt_password(new_refresh_token)
        account.raw_data["access_token"] = new_access_token
        account.raw_data["token_expiry"] = new_expiry
        self.db.commit()

        return new_access_token

    def fetch_emails(
        self,
        account: UserEmailAccount,
        since_days: int = 7,
        max_results: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Récupère les emails Outlook via Microsoft Graph API.

        Args:
            account: UserEmailAccount Outlook OAuth2
            since_days: Nombre de jours en arrière
            max_results: Nombre max d'emails à récupérer

        Returns:
            Liste de dicts représentant les emails
        """
        access_token = self.get_fresh_access_token(account)

        headers = {
            'Authorization': f'Bearer {access_token}',
        }

        # Construire le filtre
        filters = []
        if since_days:
            received_after = (datetime.now() - timedelta(days=since_days)).isoformat()
            filters.append(f"receivedDateTime ge {received_after}")

        filter_query = ' and '.join(filters) if filters else None

        # Construire l'URL
        url = f'{self.GRAPH_API_ENDPOINT}/me/messages'
        params = {
            '$top': max_results,
            '$orderby': 'receivedDateTime DESC',
        }
        if filter_query:
            params['$filter'] = filter_query

        try:
            response = requests.get(url, headers=headers, params=params)

            if response.status_code != 200:
                logger.error(f"Erreur API Outlook: {response.text}")
                raise ValueError(f"Erreur API Outlook: {response.status_code}")

            data = response.json()
            messages = data.get('value', [])

            logger.info(f"📧 {len(messages)} emails trouvés pour {account.email}")

            # Convertir au format standardisé
            emails = [self._parse_outlook_message(msg) for msg in messages]

            return emails

        except Exception as e:
            logger.error(f"Erreur fetch emails Outlook pour {account.email}: {e}")
            raise

    def _parse_outlook_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse un message Outlook Graph API en format standardisé.

        Args:
            msg: Message Outlook Graph API

        Returns:
            Dict avec champs standardisés
        """
        # Extraire from
        from_field = msg.get('from', {}).get('emailAddress', {})
        from_email = from_field.get('address')
        from_name = from_field.get('name')

        # Extraire to
        to_recipients = msg.get('toRecipients', [])
        to_list = [r.get('emailAddress', {}).get('address') for r in to_recipients]
        to_email = to_list[0] if to_list else None

        # Extraire cc
        cc_recipients = msg.get('ccRecipients', [])
        cc_list = [r.get('emailAddress', {}).get('address') for r in cc_recipients]

        # Extraire bcc
        bcc_recipients = msg.get('bccRecipients', [])
        bcc_list = [r.get('emailAddress', {}).get('address') for r in bcc_recipients]

        # Body
        body_content = msg.get('body', {}).get('content', '')
        body_type = msg.get('body', {}).get('contentType', 'text')

        return {
            "message_id": msg.get('id'),
            "conversation_id": msg.get('conversationId'),
            "from": f"{from_name} <{from_email}>" if from_name else from_email,
            "to": to_email,
            "cc": ', '.join(cc_list) if cc_list else None,
            "bcc": ', '.join(bcc_list) if bcc_list else None,
            "subject": msg.get('subject'),
            "date": msg.get('receivedDateTime'),
            "body": body_content,
            "body_type": body_type,
            "is_read": msg.get('isRead', False),
            "has_attachments": msg.get('hasAttachments', False),
            "importance": msg.get('importance'),
            "categories": msg.get('categories', []),
        }

    def send_email(
        self,
        account: UserEmailAccount,
        to: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None,
        body_type: str = "text",
    ) -> Dict[str, Any]:
        """
        Envoie un email via Microsoft Graph API.

        Args:
            account: UserEmailAccount Outlook OAuth2
            to: Destinataire
            subject: Sujet
            body: Corps du message
            cc: CC (optionnel)
            bcc: BCC (optionnel)
            body_type: Type de corps (text ou HTML)

        Returns:
            Réponse de l'API
        """
        access_token = self.get_fresh_access_token(account)

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json',
        }

        # Construire le message
        message = {
            "subject": subject,
            "body": {
                "contentType": "HTML" if body_type == "html" else "Text",
                "content": body,
            },
            "toRecipients": [
                {"emailAddress": {"address": to}}
            ],
        }

        if cc:
            message["ccRecipients"] = [
                {"emailAddress": {"address": addr.strip()}} for addr in cc.split(',')
            ]

        if bcc:
            message["bccRecipients"] = [
                {"emailAddress": {"address": addr.strip()}} for addr in bcc.split(',')
            ]

        try:
            url = f'{self.GRAPH_API_ENDPOINT}/me/sendMail'
            payload = {"message": message, "saveToSentItems": "true"}

            response = requests.post(url, headers=headers, json=payload)

            if response.status_code not in [200, 202]:
                logger.error(f"Erreur envoi email Outlook: {response.text}")
                raise ValueError(f"Erreur envoi email: {response.status_code}")

            logger.info(f"✅ Email envoyé via Outlook API: {subject} → {to}")

            return {"status": "sent", "message_id": None}

        except Exception as e:
            logger.error(f"Erreur envoi email Outlook: {e}")
            raise
