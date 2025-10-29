"""
Smart Mail Adapter - Essaie EWS puis IMAP automatiquement
"""
import logging
from datetime import datetime
from typing import List, Dict

from .providers.base import MailProviderBase

logger = logging.getLogger(__name__)


class SmartMailAdapter:
    """
    Adapter qui essaie plusieurs providers dans l'ordre

    Ordre d'essai:
    1. EWS (plus complet, accès natif Exchange)
    2. IMAP (fallback universel)
    """

    def __init__(self, providers: List[MailProviderBase]):
        """
        Args:
            providers: Liste de providers à essayer (ordre d'essai)
        """
        if not providers:
            raise ValueError("Au moins un provider requis")

        self.providers = providers
        self.active_provider: MailProviderBase = None

    async def list_folders(self) -> List[Dict]:
        """Liste les dossiers via le premier provider fonctionnel"""
        last_error = None

        for provider in self.providers:
            try:
                logger.info(f"Trying {provider.__class__.__name__} for list_folders")
                folders = await provider.list_folders()
                self.active_provider = provider
                logger.info(
                    f"✅ {provider.__class__.__name__} worked: {len(folders)} folders"
                )
                return folders

            except Exception as e:
                logger.warning(f"❌ {provider.__class__.__name__} failed: {e}")
                last_error = e
                continue

        # Tous ont échoué
        raise RuntimeError(f"No provider available for list_folders. Last error: {last_error}")

    async def sync_messages_since(
        self, since: datetime, limit: int = 500
    ) -> List[Dict]:
        """Récupère messages via le premier provider fonctionnel"""
        last_error = None

        for provider in self.providers:
            try:
                logger.info(
                    f"Trying {provider.__class__.__name__} for sync_messages_since"
                )
                messages = await provider.sync_messages_since(since, limit=limit)
                self.active_provider = provider
                logger.info(
                    f"✅ {provider.__class__.__name__} worked: {len(messages)} messages"
                )
                return messages

            except Exception as e:
                logger.warning(f"❌ {provider.__class__.__name__} failed: {e}")
                last_error = e
                continue

        # Tous ont échoué
        raise RuntimeError(
            f"No provider available for sync_messages_since. Last error: {last_error}"
        )

    async def test_all_providers(self) -> List[Dict]:
        """Teste tous les providers et retourne leurs statuts"""
        results = []

        for provider in self.providers:
            try:
                result = await provider.test_connection()
                results.append(result)
            except Exception as e:
                results.append(
                    {
                        "success": False,
                        "provider": provider.__class__.__name__,
                        "error": str(e),
                    }
                )

        return results

    def get_active_provider_name(self) -> str:
        """Retourne le nom du provider actif"""
        if self.active_provider:
            return self.active_provider.__class__.__name__
        return "None"
