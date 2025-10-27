"""
Service d'intégration Outlook (Microsoft Graph API)

Fonctionnalités:
- OAuth 2.0 avec Microsoft Graph
- Ingestion signatures emails
- Détection threads sans réponse
- Parser contacts Outlook

Scopes requis:
- Mail.Read: Lecture emails
- Contacts.Read: Lecture contacts
"""

import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import quote

import httpx
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session

from core.config import settings
from models.user import User


class OutlookIntegration:
    """Service d'intégration Microsoft Outlook via Graph API"""

    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    AUTH_BASE_URL = "https://login.microsoftonline.com/common/oauth2/v2.0"

    # Scopes nécessaires
    SCOPES = ["Mail.Read", "Contacts.Read", "offline_access"]

    def __init__(self, db: Session):
        self.db = db
        self.client_id = settings.microsoft_client_id
        self.client_secret = settings.microsoft_client_secret
        self.redirect_uri = settings.microsoft_redirect_uri

    # ==========================================
    # OAuth Flow
    # ==========================================

    def get_authorization_url(self, state: str) -> str:
        """
        Génère l'URL d'autorisation OAuth

        Args:
            state: État CSRF pour sécuriser le callback

        Returns:
            URL d'autorisation Microsoft
        """
        scopes_str = " ".join(self.SCOPES)
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "redirect_uri": self.redirect_uri,
            "response_mode": "query",
            "scope": scopes_str,
            "state": state,
        }

        query_string = "&".join([f"{k}={quote(str(v))}" for k, v in params.items()])
        return f"{self.AUTH_BASE_URL}/authorize?{query_string}"

    async def exchange_code_for_token(self, code: str) -> Dict:
        """
        Échange le code d'autorisation contre un access token

        Args:
            code: Code d'autorisation reçu du callback

        Returns:
            {
                "access_token": "...",
                "refresh_token": "...",
                "expires_in": 3600,
                "scope": "Mail.Read Contacts.Read"
            }
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.AUTH_BASE_URL}/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            response.raise_for_status()
            return response.json()

    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """
        Rafraîchit l'access token avec le refresh token

        Args:
            refresh_token: Refresh token stocké

        Returns:
            Nouveau access token
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.AUTH_BASE_URL}/token",
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )

            response.raise_for_status()
            return response.json()

    # ==========================================
    # Graph API Calls
    # ==========================================

    async def get_recent_messages(
        self, access_token: str, limit: int = 50, days: int = 30
    ) -> List[Dict]:
        """
        Récupère les messages récents de l'utilisateur

        Args:
            access_token: Token d'accès Microsoft
            limit: Nombre max de messages (défaut: 50)
            days: Nombre de jours dans le passé (défaut: 30)

        Returns:
            Liste de messages avec signatures
        """
        # Date de début (30 jours dans le passé)
        start_date = (datetime.utcnow() - timedelta(days=days)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.GRAPH_BASE_URL}/me/messages",
                params={
                    "$top": limit,
                    "$select": "id,subject,from,toRecipients,sentDateTime,body,uniqueBody",
                    "$filter": f"sentDateTime ge {start_date}",
                    "$orderby": "sentDateTime desc",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )

            response.raise_for_status()
            data = response.json()
            return data.get("value", [])

    async def get_sent_messages_without_reply(
        self, access_token: str, older_than_days: int = 3
    ) -> List[Dict]:
        """
        Détecte les threads envoyés sans réponse depuis X jours

        Args:
            access_token: Token d'accès Microsoft
            older_than_days: Délai minimum sans réponse (défaut: 3 jours)

        Returns:
            Liste de threads sans réponse
        """
        cutoff_date = (datetime.utcnow() - timedelta(days=older_than_days)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            # Récupérer messages envoyés
            response = await client.get(
                f"{self.GRAPH_BASE_URL}/me/mailFolders/SentItems/messages",
                params={
                    "$top": 100,
                    "$select": "id,conversationId,subject,toRecipients,sentDateTime",
                    "$filter": f"sentDateTime lt {cutoff_date}",
                    "$orderby": "sentDateTime desc",
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )

            response.raise_for_status()
            sent_messages = response.json().get("value", [])

            # Pour chaque message, vérifier s'il y a eu une réponse
            unanswered = []
            for msg in sent_messages:
                conversation_id = msg.get("conversationId")

                # Chercher réponse dans la conversation
                reply_response = await client.get(
                    f"{self.GRAPH_BASE_URL}/me/messages",
                    params={
                        "$top": 5,
                        "$filter": f"conversationId eq '{conversation_id}' and sentDateTime gt {msg['sentDateTime']}",
                        "$select": "id",
                    },
                    headers={"Authorization": f"Bearer {access_token}"},
                )

                replies = reply_response.json().get("value", [])

                # Si aucune réponse, ajouter à la liste
                if not replies:
                    to_email = msg["toRecipients"][0]["emailAddress"]["address"] if msg.get("toRecipients") else None

                    unanswered.append({
                        "thread_id": conversation_id,
                        "message_id": msg["id"],
                        "subject": msg.get("subject", "(Sans sujet)"),
                        "recipient": to_email,
                        "sent_date": msg["sentDateTime"],
                        "older_than_days": (datetime.utcnow() - datetime.fromisoformat(msg["sentDateTime"].replace("Z", "+00:00"))).days,
                    })

            return unanswered

    # ==========================================
    # Parsing Signatures
    # ==========================================

    def parse_signature(self, html_body: str) -> Optional[Dict]:
        """
        Extrait les informations d'une signature email

        Args:
            html_body: Corps HTML de l'email

        Returns:
            {
                "email": "alice.durand@acme.com",
                "phone": "+33184201234",
                "job_title": "Head of Sales",
                "company": "ACME Corp",
                "address": "123 rue de la Paix, 75001 Paris"
            }
        """
        if not html_body:
            return None

        # Parser HTML
        soup = BeautifulSoup(html_body, "html.parser")
        text = soup.get_text()

        # Patterns regex
        email_pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
        phone_pattern = r"(?:Tel|Tél|Phone|Mobile|Mob)[\s:]*([+]?[0-9][\s\-\.\(\)0-9]{7,18})"

        # Extraction
        signature = {}

        # Email
        emails = re.findall(email_pattern, text)
        if emails:
            # Prendre le premier email qui n'est pas microsoft.com
            for email in emails:
                if "microsoft.com" not in email.lower():
                    signature["email"] = email
                    break

        # Téléphone
        phone_match = re.search(phone_pattern, text, re.IGNORECASE)
        if phone_match:
            signature["phone"] = phone_match.group(1).strip()

        # Fonction (patterns courants)
        job_patterns = [
            r"(CEO|CTO|CFO|COO|Directeur|Director|Manager|Head of|VP|Responsable|Président)",
            r"([A-Z][a-z]+\s+(?:de|of)\s+[A-Z][a-z]+)",
        ]
        for pattern in job_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                signature["job_title"] = match.group(0).strip()
                break

        # Entreprise (chercher après fonction ou avant email)
        company_pattern = r"(?:chez|at|@)\s+([A-Z][A-Za-z0-9\s&]+)(?:\n|$|<br)"
        company_match = re.search(company_pattern, text)
        if company_match:
            signature["company"] = company_match.group(1).strip()

        return signature if signature else None

    def extract_signatures_from_messages(self, messages: List[Dict]) -> List[Dict]:
        """
        Extrait les signatures de plusieurs messages

        Args:
            messages: Liste de messages Outlook

        Returns:
            Liste de signatures uniques
        """
        signatures = []
        seen_emails = set()

        for msg in messages:
            body = msg.get("body", {}).get("content", "")
            signature = self.parse_signature(body)

            if signature and signature.get("email"):
                email = signature["email"]

                # Éviter doublons
                if email not in seen_emails:
                    seen_emails.add(email)
                    signature["source_message_id"] = msg.get("id")
                    signature["source_date"] = msg.get("sentDateTime")
                    signatures.append(signature)

        return signatures

    # ==========================================
    # Helpers
    # ==========================================

    def normalize_phone_from_signature(self, phone: str, country_code: str = "FR") -> Optional[str]:
        """
        Normalise un téléphone extrait d'une signature

        Args:
            phone: Numéro brut
            country_code: Code pays (défaut: FR)

        Returns:
            Numéro au format E.164 (+33...)
        """
        try:
            from phonenumbers import parse as pn_parse, format_number, PhoneNumberFormat, is_possible_number

            num = pn_parse(phone, country_code)
            if is_possible_number(num):
                return format_number(num, PhoneNumberFormat.E164)
        except Exception:
            pass

        return None
