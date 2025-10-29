"""
Mail Provider Factory

Route vers le bon provider (EWS, IMAP, Graph API) selon la config.
Architecture multi-tenant: chaque utilisateur peut avoir plusieurs comptes email
avec différents providers.
"""
import logging
from typing import Union

from models.user_email_account import UserEmailAccount
from core.encryption import decrypt_value

logger = logging.getLogger(__name__)


class MailProviderFactory:
    """
    Factory pour créer le bon provider selon le protocol configuré.

    Supporte:
    - EWS (Exchange Web Services) - IONOS, Microsoft Exchange on-premise
    - IMAP - Gmail, IONOS mail, autres
    - Graph API - Microsoft 365 OAuth
    """

    @staticmethod
    def create_provider(account: UserEmailAccount):
        """
        Crée le provider approprié selon le protocol de l'account.

        Args:
            account: UserEmailAccount avec server, protocol, credentials

        Returns:
            Instance de EWSProvider, IMAPProvider, ou GraphProvider

        Raises:
            ValueError: Si protocol inconnu ou credentials manquants
        """
        protocol = account.protocol

        if not protocol:
            raise ValueError(f"Account {account.email} n'a pas de protocol défini")

        # =============================================================
        # EWS (Exchange Web Services) - Basic Auth
        # =============================================================
        if protocol == "ews":
            if not account.server:
                raise ValueError(f"EWS account {account.email} nécessite un 'server'")
            if not account.encrypted_password:
                raise ValueError(f"EWS account {account.email} nécessite un 'encrypted_password'")

            from mail.providers.ews_provider import EWSProvider

            password = decrypt_value(account.encrypted_password)

            logger.info(f"Creating EWS provider for {account.email} @ {account.server}")
            return EWSProvider(
                email=account.email,
                password=password,
                server=account.server,
            )

        # =============================================================
        # IMAP - Gmail, IONOS mail, etc.
        # =============================================================
        elif protocol == "imap":
            if not account.server:
                raise ValueError(f"IMAP account {account.email} nécessite un 'server'")
            if not account.encrypted_password:
                raise ValueError(f"IMAP account {account.email} nécessite un 'encrypted_password'")

            from mail.providers.imap_provider import IMAPProvider

            password = decrypt_value(account.encrypted_password)

            # Extraire le port du server si présent (ex: "imap.ionos.fr:993")
            if ":" in account.server:
                host, port_str = account.server.split(":", 1)
                port = int(port_str)
            else:
                host = account.server
                port = 993  # Port IMAP SSL par défaut

            logger.info(f"Creating IMAP provider for {account.email} @ {host}:{port}")
            return IMAPProvider(
                host=host,
                port=port,
                username=account.email,
                password=password,
                use_ssl=True,
            )

        # =============================================================
        # Microsoft Graph API - OAuth2
        # =============================================================
        elif protocol == "graph":
            if not account.encrypted_access_token:
                raise ValueError(f"Graph account {account.email} nécessite un 'encrypted_access_token'")

            from mail.providers.graph_provider import GraphProvider

            access_token = decrypt_value(account.encrypted_access_token)

            logger.info(f"Creating Graph provider for {account.email}")
            return GraphProvider(
                access_token=access_token,
                user_email=account.email,
            )

        # =============================================================
        # Protocol inconnu
        # =============================================================
        else:
            raise ValueError(f"Protocol inconnu: {protocol}. Supportés: ews, imap, graph")


    @staticmethod
    async def test_connection(account: UserEmailAccount) -> dict:
        """
        Test rapide de connexion pour un account.

        Returns:
            {
                "success": True/False,
                "provider": "ews"/"imap"/"graph",
                "email": "...",
                "error": "..." (si échec)
            }
        """
        try:
            provider = MailProviderFactory.create_provider(account)

            # Test basique: lister les dossiers
            if hasattr(provider, 'list_folders'):
                folders = await provider.list_folders()
                return {
                    "success": True,
                    "provider": account.protocol,
                    "email": account.email,
                    "server": account.server,
                    "folder_count": len(folders),
                }
            else:
                # Fallback: just creating provider = success
                return {
                    "success": True,
                    "provider": account.protocol,
                    "email": account.email,
                    "server": account.server,
                }

        except Exception as e:
            logger.error(f"Connection test failed for {account.email}: {e}", exc_info=True)
            return {
                "success": False,
                "provider": account.protocol,
                "email": account.email,
                "server": account.server,
                "error": str(e),
            }
