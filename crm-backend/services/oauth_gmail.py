"""
Service OAuth2 pour Gmail (Google Workspace).

Permet aux utilisateurs de connecter leurs comptes Gmail via OAuth2
au lieu de stocker les mots de passe.

Documentation:
- Google OAuth2: https://developers.google.com/identity/protocols/oauth2
- Gmail API: https://developers.google.com/gmail/api/guides
"""

import logging
import os
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from sqlalchemy.orm import Session
from models.user_email_account import UserEmailAccount
from models.interaction import Interaction
from models.person import Person
from services.email_encryption import encrypt_password, decrypt_password

logger = logging.getLogger(__name__)


class GmailOAuthService:
    """Service pour gérer l'authentification OAuth2 Gmail."""

    # Scopes Gmail nécessaires
    SCOPES = [
        'https://www.googleapis.com/auth/gmail.readonly',      # Lire emails
        'https://www.googleapis.com/auth/gmail.send',          # Envoyer emails
        'https://www.googleapis.com/auth/gmail.modify',        # Modifier labels
        'https://www.googleapis.com/auth/userinfo.email',      # Lire email user
    ]

    def __init__(self, db: Session):
        self.db = db
        self.client_id = os.getenv("GOOGLE_CLIENT_ID")
        self.client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
        self.redirect_uri = os.getenv(
            "GOOGLE_REDIRECT_URI",
            "http://localhost:8000/api/v1/oauth/gmail/callback"
        )

        if not self.client_id or not self.client_secret:
            logger.warning(
                "⚠️  GOOGLE_CLIENT_ID ou GOOGLE_CLIENT_SECRET non configurés. "
                "OAuth Gmail désactivé."
            )

    def is_configured(self) -> bool:
        """Vérifie si OAuth Gmail est configuré."""
        return bool(self.client_id and self.client_secret)

    def get_authorization_url(self, state: str) -> str:
        """
        Génère l'URL d'autorisation OAuth2 Gmail.

        Args:
            state: State token pour prévenir CSRF (team_id:user_id encodé)

        Returns:
            URL d'autorisation Google
        """
        if not self.is_configured():
            raise ValueError("OAuth Gmail non configuré (GOOGLE_CLIENT_ID manquant)")

        client_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.redirect_uri],
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            redirect_uri=self.redirect_uri,
        )

        authorization_url, _ = flow.authorization_url(
            access_type='offline',  # Pour obtenir refresh_token
            include_granted_scopes='true',
            state=state,
            prompt='consent',  # Forcer consentement pour obtenir refresh_token
        )

        logger.info(f"📧 URL d'autorisation Gmail générée (state={state})")
        return authorization_url

    def exchange_code_for_tokens(self, code: str) -> Dict[str, Any]:
        """
        Échange le code d'autorisation contre des tokens OAuth2.

        Args:
            code: Code d'autorisation reçu de Google

        Returns:
            Dict contenant access_token, refresh_token, expiry, email
        """
        if not self.is_configured():
            raise ValueError("OAuth Gmail non configuré")

        client_config = {
            "web": {
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [self.redirect_uri],
            }
        }

        flow = Flow.from_client_config(
            client_config,
            scopes=self.SCOPES,
            redirect_uri=self.redirect_uri,
        )

        # Échanger le code contre les tokens
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Récupérer l'adresse email de l'utilisateur
        email = self._get_user_email(credentials)

        return {
            "access_token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_expiry": credentials.expiry.isoformat() if credentials.expiry else None,
            "email": email,
            "scopes": credentials.scopes,
        }

    def _get_user_email(self, credentials: Credentials) -> str:
        """
        Récupère l'adresse email de l'utilisateur via l'API Gmail.

        Args:
            credentials: Credentials OAuth2

        Returns:
            Adresse email
        """
        try:
            service = build('gmail', 'v1', credentials=credentials)
            profile = service.users().getProfile(userId='me').execute()
            return profile.get('emailAddress')
        except HttpError as e:
            logger.error(f"Erreur lors de la récupération du profil Gmail: {e}")
            raise

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
        Sauvegarde un compte Gmail OAuth dans la base de données.

        Args:
            team_id: ID de l'équipe
            user_id: ID de l'utilisateur
            email: Adresse Gmail
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
                "oauth_method": "google",
                "updated_at": datetime.now().isoformat(),
            }
            existing.is_active = True

            self.db.commit()
            self.db.refresh(existing)

            logger.info(f"✅ Compte Gmail mis à jour: {email}")
            return existing

        # Créer un nouveau compte
        new_account = UserEmailAccount(
            team_id=team_id,
            user_id=user_id,
            email=email,
            provider="gmail",
            server="imap.gmail.com",  # Non utilisé pour OAuth, mais requis
            port=993,
            encrypted_password=encrypt_password(refresh_token),  # Stocker refresh_token
            is_active=True,
            raw_data={
                "access_token": access_token,
                "token_expiry": token_expiry,
                "oauth_method": "google",
                "created_at": datetime.now().isoformat(),
            },
        )

        self.db.add(new_account)
        self.db.commit()
        self.db.refresh(new_account)

        logger.info(f"✅ Nouveau compte Gmail OAuth créé: {email}")
        return new_account

    def get_fresh_credentials(self, account: UserEmailAccount) -> Credentials:
        """
        Récupère des credentials OAuth2 valides (refresh si nécessaire).

        Args:
            account: UserEmailAccount avec tokens OAuth2

        Returns:
            Credentials Google valides
        """
        if account.provider != "gmail":
            raise ValueError(f"Compte {account.email} n'est pas Gmail")

        # Récupérer les tokens stockés
        refresh_token = decrypt_password(account.encrypted_password)
        access_token = account.raw_data.get("access_token")
        token_expiry_str = account.raw_data.get("token_expiry")

        token_expiry = None
        if token_expiry_str:
            token_expiry = datetime.fromisoformat(token_expiry_str)

        # Créer les credentials
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.SCOPES,
        )

        # Refresh si nécessaire
        if not credentials.valid:
            if credentials.expired and credentials.refresh_token:
                logger.info(f"🔄 Refresh token Gmail pour {account.email}")
                credentials.refresh(Request())

                # Mettre à jour les tokens en DB
                account.raw_data["access_token"] = credentials.token
                account.raw_data["token_expiry"] = (
                    credentials.expiry.isoformat() if credentials.expiry else None
                )
                self.db.commit()

            else:
                raise ValueError(
                    f"Token Gmail expiré sans refresh_token pour {account.email}"
                )

        return credentials

    def fetch_emails(
        self,
        account: UserEmailAccount,
        since_days: int = 7,
        max_results: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Récupère les emails Gmail via l'API Gmail.

        Args:
            account: UserEmailAccount Gmail OAuth2
            since_days: Nombre de jours en arrière
            max_results: Nombre max d'emails à récupérer

        Returns:
            Liste de dicts représentant les emails
        """
        credentials = self.get_fresh_credentials(account)

        try:
            service = build('gmail', 'v1', credentials=credentials)

            # Construire la query
            query_parts = []
            if since_days:
                after_date = (datetime.now() - timedelta(days=since_days)).strftime('%Y/%m/%d')
                query_parts.append(f'after:{after_date}')

            query = ' '.join(query_parts) if query_parts else None

            # Lister les messages
            results = service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results,
            ).execute()

            messages = results.get('messages', [])

            logger.info(f"📧 {len(messages)} emails trouvés pour {account.email}")

            # Récupérer les détails de chaque message
            emails = []
            for msg in messages:
                try:
                    msg_detail = service.users().messages().get(
                        userId='me',
                        id=msg['id'],
                        format='full',
                    ).execute()

                    emails.append(self._parse_gmail_message(msg_detail))

                except HttpError as e:
                    logger.error(f"Erreur récupération message {msg['id']}: {e}")
                    continue

            return emails

        except HttpError as e:
            logger.error(f"Erreur API Gmail pour {account.email}: {e}")
            raise

    def _parse_gmail_message(self, msg: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse un message Gmail API en format standardisé.

        Args:
            msg: Message Gmail API

        Returns:
            Dict avec champs standardisés (from, to, subject, body, date, etc.)
        """
        headers = {h['name']: h['value'] for h in msg['payload']['headers']}

        # Extraire le corps
        body = self._extract_body(msg['payload'])

        return {
            "message_id": msg['id'],
            "thread_id": msg.get('threadId'),
            "from": headers.get('From'),
            "to": headers.get('To'),
            "cc": headers.get('Cc'),
            "bcc": headers.get('Bcc'),
            "subject": headers.get('Subject'),
            "date": headers.get('Date'),
            "body": body,
            "snippet": msg.get('snippet'),
            "labels": msg.get('labelIds', []),
            "headers": headers,
        }

    def _extract_body(self, payload: Dict[str, Any]) -> str:
        """
        Extrait le corps du message depuis le payload Gmail.

        Args:
            payload: Payload du message Gmail

        Returns:
            Corps du message (texte)
        """
        # Si le message a des parts multipart
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    data = part['body'].get('data')
                    if data:
                        return base64.urlsafe_b64decode(data).decode('utf-8')

                # Récursion pour parts imbriquées
                if 'parts' in part:
                    body = self._extract_body(part)
                    if body:
                        return body

        # Si le message est simple
        elif 'body' in payload and 'data' in payload['body']:
            data = payload['body']['data']
            return base64.urlsafe_b64decode(data).decode('utf-8')

        return ""

    def send_email(
        self,
        account: UserEmailAccount,
        to: str,
        subject: str,
        body: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Envoie un email via Gmail API.

        Args:
            account: UserEmailAccount Gmail OAuth2
            to: Destinataire
            subject: Sujet
            body: Corps du message
            cc: CC (optionnel)
            bcc: BCC (optionnel)

        Returns:
            Réponse de l'API Gmail
        """
        credentials = self.get_fresh_credentials(account)

        try:
            service = build('gmail', 'v1', credentials=credentials)

            # Créer le message MIME
            message = MIMEText(body)
            message['to'] = to
            message['from'] = account.email
            message['subject'] = subject

            if cc:
                message['cc'] = cc
            if bcc:
                message['bcc'] = bcc

            # Encoder en base64
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')

            # Envoyer
            result = service.users().messages().send(
                userId='me',
                body={'raw': raw}
            ).execute()

            logger.info(f"✅ Email envoyé via Gmail API: {subject} → {to}")

            return result

        except HttpError as e:
            logger.error(f"Erreur envoi email Gmail: {e}")
            raise
