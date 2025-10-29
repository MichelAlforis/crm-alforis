"""
Base provider interface pour mail sync
"""
from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Optional


class MailProviderBase(ABC):
    """Interface commune pour EWS et IMAP"""

    @abstractmethod
    async def list_folders(self) -> List[Dict]:
        """
        Liste tous les dossiers disponibles

        Returns:
            [{"id": "...", "name": "Inbox", "total_items": 42}, ...]
        """
        pass

    @abstractmethod
    async def sync_messages_since(
        self, since: datetime, limit: int = 500
    ) -> List[Dict]:
        """
        Récupère les messages depuis une date

        Args:
            since: Date de début (UTC)
            limit: Nombre max de messages par dossier

        Returns:
            [
                {
                    "id": "unique_id",
                    "subject": "...",
                    "from": "email@example.com",
                    "to": ["recipient@example.com"],
                    "receivedDateTime": "2025-01-15T10:30:00Z",
                    "body": "...",
                    "folder": "Inbox",
                    "hasAttachments": False
                },
                ...
            ]
        """
        pass

    @abstractmethod
    async def test_connection(self) -> Dict:
        """
        Test la connexion et retourne des infos

        Returns:
            {
                "success": True,
                "provider": "ews",
                "email": "user@domain.com",
                "folders_count": 5
            }
        """
        pass
