"""
EWS Provider - Exchange Web Services via exchangelib
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional

from exchangelib import (
    Account,
    Configuration,
    Credentials,
    DELEGATE,
    EWSDateTime,
    EWSTimeZone,
)
from exchangelib.errors import (
    UnauthorizedError,
    TransportError,
    ErrorAccessDenied,
)

from .base import MailProviderBase

logger = logging.getLogger(__name__)


class EWSProvider(MailProviderBase):
    """
    Provider EWS pour Exchange Online / Microsoft 365

    Utilise OAuth2 avec les permissions EWS.AccessAsUser.All
    """

    def __init__(
        self,
        email: str,
        password: str,
        server: str = "exchange.ionos.eu",
        **kwargs
    ):
        """
        Args:
            email: Email complet (ex: michel.marques@alforis.fr)
            password: Mot de passe de la boîte IONOS
            server: Serveur Exchange (défaut: exchange.ionos.eu pour IONOS)
        """
        self.email = email
        self.password = password
        self.server = server
        self.account: Optional[Account] = None
        self.tz = EWSTimeZone("UTC")

    def _get_account(self) -> Account:
        """Initialise et retourne le compte EWS"""
        if self.account:
            return self.account

        try:
            logger.info(f"EWS: Connecting to {self.server} for {self.email}")

            # Credentials Basic Auth (IONOS Exchange)
            from exchangelib import Credentials
            credentials = Credentials(
                username=self.email,
                password=self.password
            )

            # Configuration EWS pour IONOS (sans autodiscover)
            ews_url = f"https://{self.server}/EWS/Exchange.asmx"
            config = Configuration(
                service_endpoint=ews_url,
                credentials=credentials,
            )

            # Compte EWS sans autodiscover (IONOS ne supporte pas toujours autodiscover)
            account = Account(
                primary_smtp_address=self.email,
                config=config,
                autodiscover=False,
                access_type=DELEGATE,
            )

            logger.info(f"EWS account initialized for {self.email}")
            self.account = account
            return self.account

        except (UnauthorizedError, ErrorAccessDenied) as e:
            logger.error(f"EWS auth failed for {self.email}: {e}")
            raise Exception(f"EWS authentication failed: {e}")
        except TransportError as e:
            logger.error(f"EWS transport error for {self.email}: {e}")
            raise Exception(f"EWS connection failed: {e}")
        except Exception as e:
            import traceback
            logger.error(f"EWS initialization failed for {self.email}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise

    async def list_folders(self) -> List[Dict]:
        """Liste tous les dossiers (récursif)"""
        def _sync_list_folders():
            account = self._get_account()
            folders = []

            for folder in account.root.walk():
                folders.append(
                    {
                        "id": folder.id,
                        "name": folder.name,
                        "total_items": folder.total_count if hasattr(folder, "total_count") else 0,
                        "unread_items": folder.unread_count if hasattr(folder, "unread_count") else 0,
                    }
                )

            logger.info(f"EWS: Found {len(folders)} folders for {self.email}")
            return folders

        try:
            # Run synchronous EWS code in thread pool
            return await asyncio.to_thread(_sync_list_folders)
        except Exception as e:
            logger.error(f"EWS list_folders failed: {e}")
            raise

    async def sync_messages_since(
        self, since: datetime, limit: int = 500
    ) -> List[Dict]:
        """
        Récupère messages depuis une date

        Stratégie:
        1. Interroge Inbox
        2. Interroge Sent Items
        3. Déduplique par message_id
        """
        def _sync_fetch_messages():
            account = self._get_account()
            messages = []

            # Convertir datetime en EWSDateTime (assurer timezone UTC)
            if since.tzinfo is None:
                since_utc = since.replace(tzinfo=timezone.utc)
            else:
                since_utc = since
            ews_since = EWSDateTime.from_datetime(since_utc)

            # 1. Inbox
            logger.info(f"EWS: Fetching Inbox messages since {since}")
            inbox_items = (
                account.inbox.filter(datetime_received__gte=ews_since)
                .order_by("-datetime_received")
                .only(
                    "id",
                    "subject",
                    "sender",
                    "to_recipients",
                    "datetime_received",
                    "body",
                    "has_attachments",
                )[:limit]
            )

            for item in inbox_items:
                messages.append(self._normalize_message(item, "Inbox"))

            # 2. Sent Items
            logger.info(f"EWS: Fetching Sent Items since {since}")
            try:
                sent_items = (
                    account.sent.filter(datetime_received__gte=ews_since)
                    .order_by("-datetime_received")
                    .only(
                        "id",
                        "subject",
                        "sender",
                        "to_recipients",
                        "datetime_received",
                        "body",
                        "has_attachments",
                    )[:limit]
                )

                for item in sent_items:
                    messages.append(self._normalize_message(item, "Sent"))

            except Exception as e:
                logger.warning(f"EWS: Could not fetch Sent Items: {e}")

            logger.info(f"EWS: Collected {len(messages)} messages for {self.email}")
            return messages

        try:
            # Run synchronous EWS code in thread pool
            return await asyncio.to_thread(_sync_fetch_messages)
        except Exception as e:
            logger.error(f"EWS sync_messages_since failed: {e}")
            raise

    def _normalize_message(self, item, folder_name: str) -> Dict:
        """Normalise un message EWS vers le format standard"""
        try:
            # Sender
            sender_email = None
            if hasattr(item, "sender") and item.sender:
                sender_email = getattr(item.sender, "email_address", None)

            # Recipients
            recipients = []
            if hasattr(item, "to_recipients") and item.to_recipients:
                recipients = [getattr(r, "email_address", None) for r in item.to_recipients if hasattr(r, "email_address")]

            # DateTime
            received_dt = None
            if hasattr(item, "datetime_received") and item.datetime_received:
                # Convertir en datetime Python UTC
                try:
                    if hasattr(item.datetime_received, "astimezone"):
                        received_dt = item.datetime_received.astimezone(timezone.utc).isoformat()
                    else:
                        received_dt = str(item.datetime_received)
                except Exception:
                    received_dt = str(item.datetime_received)

            # Body (HTML ou text)
            body_content = ""
            if hasattr(item, "body") and item.body:
                body_content = str(item.body)

            # ID de l'item
            item_id = getattr(item, "id", "unknown")
            if hasattr(item_id, "id"):  # Si c'est un objet ItemId
                item_id = item_id.id

            return {
                "id": f"ews:{item_id}",
                "subject": getattr(item, "subject", None) or "(No subject)",
                "from": sender_email,
                "to": recipients,
                "receivedDateTime": received_dt,
                "body": body_content,
                "folder": folder_name,
                "hasAttachments": getattr(item, "has_attachments", False),
            }

        except Exception as e:
            logger.error(f"EWS: Failed to normalize message: {e}", exc_info=True)
            return {
                "id": "ews:error",
                "subject": "(Error parsing message)",
                "from": None,
                "to": [],
                "receivedDateTime": None,
                "body": "",
                "folder": folder_name,
                "hasAttachments": False,
            }

    async def test_connection(self) -> Dict:
        """Test la connexion EWS"""
        def _sync_test():
            account = self._get_account()
            return {
                "success": True,
                "provider": "ews",
                "email": self.email,
                "primary_smtp": account.primary_smtp_address,
            }

        try:
            result = await asyncio.to_thread(_sync_test)
            folders = await self.list_folders()
            result["folders_count"] = len(folders)
            return result

        except Exception as e:
            logger.error(f"EWS connection test failed: {e}")
            return {
                "success": False,
                "provider": "ews",
                "email": self.email,
                "error": str(e),
            }
