"""
Outlook Integration Service - Facade Pattern

Maintient l'interface publique OutlookIntegration pour rétrocompatibilité
tout en déléguant aux modules spécialisés.

Usage (inchangé):
    outlook = OutlookIntegration(db)
    url = outlook.get_authorization_url(state)
    token = await outlook.exchange_code_for_token(code)
"""

from sqlalchemy.orm import Session

from .auth import OutlookAuth
from .signatures import (
    is_marketing_email,
    parse_signature,
    extract_signatures_from_messages,
    normalize_phone_from_signature,
    EMAIL_BLOCKLIST_PATTERNS,
)


class OutlookIntegration:
    """
    Service d'intégration Microsoft Outlook via Graph API

    Facade qui délègue aux modules spécialisés:
    - auth: OAuth 2.0 flow
    - signatures: Email signature parsing
    - (autres modules à venir: messages, folders, threads)
    """

    GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"
    MSA_TENANT_ID = "9188040d-6c67-4c5b-b112-36a304b66dad"

    # Export constante pour compatibilité
    EMAIL_BLOCKLIST_PATTERNS = EMAIL_BLOCKLIST_PATTERNS

    def __init__(self, db: Session):
        self.db = db
        self._auth = OutlookAuth(db)

    # ==========================================
    # OAuth Flow (délégation à OutlookAuth)
    # ==========================================

    def get_authorization_url(self, state: str, **kwargs) -> str:
        """Génère URL d'autorisation OAuth"""
        return self._auth.get_authorization_url(state, **kwargs)

    async def exchange_code_for_token(self, code: str):
        """Échange code contre token"""
        return await self._auth.exchange_code_for_token(code)

    async def validate_token_identity(self, token_data):
        """Valide identité du token"""
        return await self._auth.validate_token_identity(token_data)

    async def refresh_access_token(self, refresh_token: str):
        """Refresh access token"""
        return await self._auth.refresh_access_token(refresh_token)

    async def get_valid_access_token(self, user, force_refresh: bool = False):
        """Récupère token valide (auto-refresh)"""
        return await self._auth.get_valid_access_token(user, force_refresh)

    # ==========================================
    # Signatures (délégation au module signatures)
    # ==========================================

    def is_marketing_email(self, email: str) -> bool:
        """Détecte si email est marketing/spam"""
        return is_marketing_email(email)

    def parse_signature(self, html_body: str):
        """Parse signature depuis HTML"""
        return parse_signature(html_body)

    def extract_signatures_from_messages(self, messages, filter_marketing: bool = True):
        """Extrait signatures de plusieurs messages"""
        return extract_signatures_from_messages(messages, filter_marketing)

    def normalize_phone_from_signature(self, phone: str, country_code: str = "FR"):
        """Normalise téléphone"""
        return normalize_phone_from_signature(phone, country_code)

    # ==========================================
    # TODO: Messages, Folders, Threads
    # À migrer depuis outlook_integration.py
    # ==========================================
    # - search_messages_by_query
    # - get_recent_messages
    # - get_user_profile
    # - list_all_primary_folders
    # - get_recent_messages_from_all_folders
    # - get_sent_messages_without_reply


__all__ = ["OutlookIntegration"]
