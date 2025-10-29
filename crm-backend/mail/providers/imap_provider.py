"""
IMAP Provider - via imap-tools (fallback si EWS bloqué)
"""
import asyncio
import logging
from datetime import datetime, timezone, date
from typing import List, Dict, Optional
from email.utils import parsedate_to_datetime

from imap_tools import MailBox, AND

from .base import MailProviderBase

logger = logging.getLogger(__name__)


class IMAPProvider(MailProviderBase):
    """
    Provider IMAP pour Outlook/M365

    Supporte:
    - OAuth2 (XOAUTH2) avec token
    - App Password (si MFA activé)
    """

    def __init__(
        self,
        host: str,
        username: str,
        access_token: Optional[str] = None,
        app_password: Optional[str] = None,
    ):
        """
        Args:
            host: Serveur IMAP (ex: outlook.office365.com)
            username: Email de l'utilisateur
            access_token: Token OAuth2 (optionnel)
            app_password: Mot de passe d'application (optionnel)
        """
        self.host = host
        self.username = username
        self.access_token = access_token
        self.app_password = app_password

        if not access_token and not app_password:
            raise ValueError("IMAP: access_token ou app_password requis")

    def _connect(self) -> MailBox:
        """Établit la connexion IMAP"""
        try:
            if self.access_token:
                # OAuth2 (XOAUTH2) - Utilise imaplib directement
                import imaplib
                import base64

                logger.info(f"IMAP: Connecting with OAuth2 to {self.host}")

                # Format XOAUTH2
                auth_string = f"user={self.username}\x01auth=Bearer {self.access_token}\x01\x01"
                auth_b64 = base64.b64encode(auth_string.encode()).decode()

                # Connexion avec imaplib (plus bas niveau)
                M = imaplib.IMAP4_SSL(self.host, 993)
                M.authenticate("XOAUTH2", lambda _: auth_b64)

                # Wrap dans MailBox pour compatibilité
                mailbox = MailBox(self.host)
                mailbox.client = M  # Inject le client déjà authentifié
                return mailbox

            else:
                # App password (standard)
                logger.info(f"IMAP: Connecting with app password to {self.host}")
                mailbox = MailBox(self.host)
                mailbox.login(self.username, self.app_password)
                return mailbox

        except Exception as e:
            logger.error(f"IMAP connection failed for {self.username}: {e}")
            raise Exception(f"IMAP authentication failed: {e}")

    async def list_folders(self) -> List[Dict]:
        """Liste tous les dossiers IMAP"""
        def _sync_list():
            with self._connect() as mailbox:
                folders = []
                for folder_info in mailbox.folder.list():
                    folders.append(
                        {
                            "name": folder_info.name,
                            "total_items": 0,  # IMAP ne donne pas facilement le count
                        }
                    )

                logger.info(f"IMAP: Found {len(folders)} folders for {self.username}")
                return folders

        try:
            return await asyncio.to_thread(_sync_list)
        except Exception as e:
            logger.error(f"IMAP list_folders failed: {e}")
            raise

    async def sync_messages_since(
        self, since: datetime, limit: int = 500
    ) -> List[Dict]:
        """
        Récupère messages depuis une date

        Stratégie:
        1. Interroge INBOX
        2. Interroge Sent / Sent Items / Éléments envoyés (variantes)
        3. Déduplique par Message-ID
        """
        def _sync_fetch():
            with self._connect() as mailbox:
                messages = []
                seen_ids = set()

                # Convertir datetime en date pour filtre IMAP
                since_date = since.date()

                # 1. INBOX
                logger.info(f"IMAP: Fetching INBOX since {since_date}")
                try:
                    mailbox.folder.set("INBOX")
                    for msg in mailbox.fetch(
                        AND(date_gte=since_date),
                        limit=limit,
                        reverse=True,  # Plus récents d'abord
                    ):
                        msg_dict = self._normalize_message(msg, "INBOX")
                        msg_id = msg_dict.get("id")
                        if msg_id and msg_id not in seen_ids:
                            seen_ids.add(msg_id)
                            messages.append(msg_dict)

                except Exception as e:
                    logger.warning(f"IMAP: Could not fetch INBOX: {e}")

                # 2. Sent Items (variantes)
                for sent_folder in ["Sent", "Sent Items", "Éléments envoyés", "[Gmail]/Messages envoyés"]:
                    logger.info(f"IMAP: Trying folder {sent_folder}")
                    try:
                        mailbox.folder.set(sent_folder)
                        for msg in mailbox.fetch(
                            AND(date_gte=since_date),
                            limit=limit,
                            reverse=True,
                        ):
                            msg_dict = self._normalize_message(msg, sent_folder)
                            msg_id = msg_dict.get("id")
                            if msg_id and msg_id not in seen_ids:
                                seen_ids.add(msg_id)
                                messages.append(msg_dict)

                        break  # Dès qu'un dossier Sent marche, on sort

                    except Exception as e:
                        logger.debug(f"IMAP: Folder {sent_folder} not found or error: {e}")
                        continue

                logger.info(f"IMAP: Collected {len(messages)} unique messages for {self.username}")
                return messages

        try:
            return await asyncio.to_thread(_sync_fetch)
        except Exception as e:
            logger.error(f"IMAP sync_messages_since failed: {e}")
            raise

    def _normalize_message(self, msg, folder_name: str) -> Dict:
        """Normalise un message IMAP vers le format standard"""
        try:
            # From
            sender = msg.from_ if msg.from_ else None

            # To
            recipients = msg.to if msg.to else []
            if isinstance(recipients, str):
                recipients = [recipients]

            # DateTime
            received_dt = None
            if msg.date_str:
                try:
                    dt = parsedate_to_datetime(msg.date_str)
                    # Assurer UTC
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    received_dt = dt.isoformat()
                except Exception as e:
                    logger.warning(f"IMAP: Could not parse date '{msg.date_str}': {e}")

            # Body (HTML ou text)
            body_content = msg.html or msg.text or ""

            # UID unique par dossier
            unique_id = f"imap:{folder_name}:{msg.uid}"

            return {
                "id": unique_id,
                "subject": msg.subject or "(No subject)",
                "from": sender,
                "to": recipients,
                "receivedDateTime": received_dt,
                "body": body_content,
                "folder": folder_name,
                "hasAttachments": bool(msg.attachments),
            }

        except Exception as e:
            logger.warning(f"IMAP: Failed to normalize message: {e}")
            return {
                "id": f"imap:error:{msg.uid}",
                "subject": "(Error parsing message)",
                "from": None,
                "to": [],
                "receivedDateTime": None,
                "body": "",
                "folder": folder_name,
                "hasAttachments": False,
            }

    async def test_connection(self) -> Dict:
        """Test la connexion IMAP"""
        def _sync_test():
            with self._connect() as mailbox:
                return {
                    "success": True,
                    "provider": "imap",
                    "email": self.username,
                    "host": self.host,
                }

        try:
            result = await asyncio.to_thread(_sync_test)
            folders = await self.list_folders()
            result["folders_count"] = len(folders)
            return result

        except Exception as e:
            logger.error(f"IMAP connection test failed: {e}")
            return {
                "success": False,
                "provider": "imap",
                "email": self.username,
                "host": self.host,
                "error": str(e),
            }
