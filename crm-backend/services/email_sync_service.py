"""
Service de synchronisation IMAP pour comptes email multi-mail.

Utilise imap-tools pour récupérer les emails depuis les serveurs IMAP
et les stocker comme interactions dans la base de données.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from email.utils import parseaddr
import re

from imap_tools import MailBox, AND, OR, NOT
from sqlalchemy.orm import Session

from models.user_email_account import UserEmailAccount
from models.interaction import Interaction
from models.person import Person
from models.organisation import Organisation
from services.email_encryption import decrypt_password

logger = logging.getLogger(__name__)


class EmailSyncService:
    """Service pour synchroniser les emails IMAP vers la base de données."""

    def __init__(self, db: Session):
        self.db = db

    def sync_account(
        self,
        account: UserEmailAccount,
        since_days: int = 7,
        limit: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Synchronise un compte email IMAP.

        Args:
            account: Le compte email à synchroniser
            since_days: Nombre de jours en arrière pour la sync
            limit: Limite optionnelle du nombre d'emails à récupérer

        Returns:
            Dict avec les statistiques de synchronisation
        """
        if account.provider not in ["ionos", "ovh", "generic"]:
            raise ValueError(
                f"Provider {account.provider} ne supporte pas IMAP direct. "
                f"Utilisez OAuth ou EWS."
            )

        if not account.server or not account.encrypted_password:
            raise ValueError(
                f"Serveur ou mot de passe manquant pour le compte {account.email}"
            )

        stats = {
            "account_id": account.id,
            "account_email": account.email,
            "fetched": 0,
            "created": 0,
            "skipped": 0,
            "errors": 0,
            "error_details": [],
        }

        try:
            # Déchiffrer le mot de passe
            password = decrypt_password(account.encrypted_password)

            # Calculer la date depuis laquelle récupérer
            since_date = datetime.now() - timedelta(days=since_days)

            logger.info(
                f"Connexion IMAP à {account.server} pour {account.email} "
                f"(depuis {since_date.date()})"
            )

            # Connexion IMAP
            with MailBox(account.server).login(account.email, password) as mailbox:
                # Récupérer les emails depuis la date
                criteria = AND(date_gte=since_date.date())

                # Itérer sur les emails
                for msg in mailbox.fetch(criteria, limit=limit, mark_seen=False):
                    stats["fetched"] += 1

                    try:
                        # Vérifier si l'email existe déjà
                        existing = (
                            self.db.query(Interaction)
                            .filter(
                                Interaction.team_id == account.team_id,
                                Interaction.external_id == msg.uid,
                                Interaction.source == f"email_imap_{account.provider}",
                            )
                            .first()
                        )

                        if existing:
                            stats["skipped"] += 1
                            continue

                        # Créer l'interaction
                        interaction = self._create_interaction_from_email(
                            msg, account
                        )

                        if interaction:
                            self.db.add(interaction)
                            self.db.commit()
                            stats["created"] += 1
                            logger.debug(
                                f"Email créé: {msg.subject} (de: {msg.from_})"
                            )
                        else:
                            stats["skipped"] += 1

                    except Exception as e:
                        stats["errors"] += 1
                        stats["error_details"].append(
                            {"uid": msg.uid, "subject": msg.subject, "error": str(e)}
                        )
                        logger.error(
                            f"Erreur lors du traitement de l'email {msg.uid}: {e}"
                        )
                        continue

            logger.info(
                f"Synchronisation terminée pour {account.email}: "
                f"{stats['created']} créés, {stats['skipped']} ignorés, "
                f"{stats['errors']} erreurs"
            )

        except Exception as e:
            logger.error(
                f"Erreur lors de la synchronisation IMAP pour {account.email}: {e}"
            )
            stats["errors"] += 1
            stats["error_details"].append({"error": str(e)})

        return stats

    def _create_interaction_from_email(
        self, msg: Any, account: UserEmailAccount
    ) -> Optional[Interaction]:
        """
        Crée une interaction à partir d'un email IMAP.

        Args:
            msg: Message IMAP (imap_tools.MailMessage)
            account: Compte email source

        Returns:
            Interaction créée ou None si échec
        """
        try:
            # Parser l'expéditeur
            from_name, from_email = parseaddr(msg.from_)
            from_email = from_email.lower() if from_email else None

            if not from_email:
                logger.warning(f"Email sans expéditeur valide: {msg.uid}")
                return None

            # Déterminer la direction (entrant ou sortant)
            direction = (
                "outbound"
                if from_email == account.email.lower()
                else "inbound"
            )

            # Extraire le destinataire principal
            to_email = None
            to_name = None
            if msg.to:
                to_name, to_email = parseaddr(msg.to[0] if isinstance(msg.to, list) else msg.to)
                to_email = to_email.lower() if to_email else None

            # Tenter de trouver la personne associée
            person_id = self._find_or_create_person(
                from_email if direction == "inbound" else to_email,
                from_name if direction == "inbound" else to_name,
                account.team_id,
            )

            # Extraire le corps (texte ou HTML)
            body = msg.text or msg.html or ""

            # Nettoyer le corps (retirer les signatures si possible)
            body_cleaned = self._clean_email_body(body)

            # Créer l'interaction
            interaction = Interaction(
                team_id=account.team_id,
                person_id=person_id,
                organisation_id=None,  # TODO: lier à l'organisation si trouvée
                type="email",
                direction=direction,
                source=f"email_imap_{account.provider}",
                external_id=msg.uid,
                subject=msg.subject or "(sans objet)",
                body=body_cleaned[:5000],  # Limiter à 5000 caractères
                raw_data={
                    "from": msg.from_,
                    "to": msg.to,
                    "cc": msg.cc,
                    "bcc": msg.bcc,
                    "date": msg.date.isoformat() if msg.date else None,
                    "message_id": msg.message_id,
                    "in_reply_to": msg.headers.get("in-reply-to"),
                    "references": msg.headers.get("references"),
                    "has_attachments": len(msg.attachments) > 0,
                    "attachments_count": len(msg.attachments),
                },
                occurred_at=msg.date or datetime.now(),
                created_by_id=account.user_id,  # Utilisateur propriétaire du compte
            )

            return interaction

        except Exception as e:
            logger.error(
                f"Erreur lors de la création de l'interaction depuis email {msg.uid}: {e}"
            )
            return None

    def _find_or_create_person(
        self, email: Optional[str], name: Optional[str], team_id: int
    ) -> Optional[int]:
        """
        Trouve ou crée une personne à partir d'un email.

        Args:
            email: Adresse email
            name: Nom (optionnel)
            team_id: ID de l'équipe

        Returns:
            ID de la personne ou None si échec
        """
        if not email:
            return None

        try:
            # Chercher une personne existante
            person = (
                self.db.query(Person)
                .filter(
                    Person.team_id == team_id,
                    Person.email == email,
                )
                .first()
            )

            if person:
                return person.id

            # Créer une nouvelle personne
            first_name, last_name = self._split_name(name)

            new_person = Person(
                team_id=team_id,
                email=email,
                first_name=first_name or email.split("@")[0],
                last_name=last_name or "",
                source="email_sync",
                raw_data={"auto_created": True, "from_email_sync": True},
            )

            self.db.add(new_person)
            self.db.flush()  # Pour obtenir l'ID sans commit

            logger.info(f"Personne créée automatiquement: {email} ({new_person.id})")

            return new_person.id

        except Exception as e:
            logger.error(f"Erreur lors de la recherche/création de personne: {e}")
            return None

    def _split_name(self, full_name: Optional[str]) -> tuple[str, str]:
        """
        Divise un nom complet en prénom et nom.

        Args:
            full_name: Nom complet

        Returns:
            Tuple (prénom, nom)
        """
        if not full_name:
            return "", ""

        parts = full_name.strip().split()
        if len(parts) == 0:
            return "", ""
        elif len(parts) == 1:
            return parts[0], ""
        else:
            return parts[0], " ".join(parts[1:])

    def _clean_email_body(self, body: str) -> str:
        """
        Nettoie le corps d'un email (retire signatures, citations).

        Args:
            body: Corps de l'email

        Returns:
            Corps nettoyé
        """
        # Implémenter un nettoyage basique ici
        # TODO: Utiliser talon pour un meilleur nettoyage

        # Supprimer les citations Gmail/Outlook (lignes commençant par >)
        lines = body.split("\n")
        cleaned_lines = [line for line in lines if not line.strip().startswith(">")]

        # Supprimer les signatures communes
        body_cleaned = "\n".join(cleaned_lines)

        # Patterns de signatures communes
        signature_patterns = [
            r"--\s*\n",  # Signature delimiter
            r"Cordialement,?\s*\n",
            r"Bien à vous,?\s*\n",
            r"Sent from my .*",
        ]

        for pattern in signature_patterns:
            match = re.search(pattern, body_cleaned, re.IGNORECASE)
            if match:
                body_cleaned = body_cleaned[: match.start()]
                break

        return body_cleaned.strip()

    def sync_all_active_accounts(
        self, team_id: Optional[int] = None, since_days: int = 7
    ) -> List[Dict[str, Any]]:
        """
        Synchronise tous les comptes actifs (optionnellement pour une équipe).

        Args:
            team_id: ID de l'équipe (optionnel)
            since_days: Nombre de jours en arrière

        Returns:
            Liste des statistiques de synchronisation par compte
        """
        query = self.db.query(UserEmailAccount).filter(
            UserEmailAccount.is_active == True,
            UserEmailAccount.provider.in_(["ionos", "ovh", "generic"]),
        )

        if team_id:
            query = query.filter(UserEmailAccount.team_id == team_id)

        accounts = query.all()

        results = []
        for account in accounts:
            try:
                stats = self.sync_account(account, since_days=since_days)
                results.append(stats)
            except Exception as e:
                logger.error(
                    f"Erreur lors de la synchronisation du compte {account.email}: {e}"
                )
                results.append(
                    {
                        "account_id": account.id,
                        "account_email": account.email,
                        "fetched": 0,
                        "created": 0,
                        "skipped": 0,
                        "errors": 1,
                        "error_details": [{"error": str(e)}],
                    }
                )

        return results
