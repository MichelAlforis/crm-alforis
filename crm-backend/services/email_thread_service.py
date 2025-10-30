"""
Service de détection et gestion des threads email (conversations).

Groupe les emails en conversations basées sur:
- Headers email: Message-ID, References, In-Reply-To
- Sujet normalisé (sans Re:, Fwd:)
- Participants communs
"""

import logging
import re
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from models.email_thread import EmailThread
from models.interaction import Interaction

logger = logging.getLogger(__name__)


class EmailThreadService:
    """Service pour détecter et gérer les threads email."""

    def __init__(self, db: Session):
        self.db = db

    def normalize_subject(self, subject: str) -> str:
        """
        Normalise un sujet d'email en retirant les préfixes.

        Retire: Re:, RE:, Fwd:, FW:, [Tag], etc.

        Args:
            subject: Sujet brut

        Returns:
            Sujet normalisé
        """
        if not subject:
            return ""

        # Retirer les préfixes courants (répétitif)
        normalized = subject
        while True:
            before = normalized
            normalized = re.sub(r'^(Re|RE|Fwd|FWD|Fw|FW):\s*', '', normalized, flags=re.IGNORECASE)
            normalized = re.sub(r'^\[.*?\]\s*', '', normalized)  # [Tag]
            normalized = normalized.strip()

            # Stop si plus de changements
            if normalized == before:
                break

        return normalized

    def generate_thread_id(self, normalized_subject: str, participants: List[str]) -> str:
        """
        Génère un thread_id unique basé sur le sujet et participants.

        Args:
            normalized_subject: Sujet normalisé
            participants: Liste d'emails participants

        Returns:
            Thread ID (hash SHA256)
        """
        # Trier les participants pour cohérence
        sorted_participants = sorted([p.lower() for p in participants if p])

        # Créer une clé unique
        key = f"{normalized_subject.lower()}|{','.join(sorted_participants)}"

        # Hash SHA256 (32 chars hex)
        thread_id = hashlib.sha256(key.encode()).hexdigest()[:32]

        return thread_id

    def extract_message_ids(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Extrait les Message-ID, References, In-Reply-To depuis les headers.

        Args:
            headers: Dict des headers email

        Returns:
            Dict avec message_id, references, in_reply_to
        """
        message_id = headers.get('Message-ID') or headers.get('Message-Id')
        references = headers.get('References')
        in_reply_to = headers.get('In-Reply-To')

        # Parser les references (peuvent être multiples, séparés par espaces)
        references_list = []
        if references:
            references_list = re.findall(r'<([^>]+)>', references)

        in_reply_to_id = None
        if in_reply_to:
            match = re.search(r'<([^>]+)>', in_reply_to)
            if match:
                in_reply_to_id = match.group(1)

        return {
            "message_id": message_id,
            "references": references_list,
            "in_reply_to": in_reply_to_id,
        }

    def find_or_create_thread(
        self,
        team_id: int,
        subject: str,
        from_email: str,
        to_email: str,
        headers: Optional[Dict[str, str]] = None,
        cc_emails: Optional[List[str]] = None,
    ) -> EmailThread:
        """
        Trouve ou crée un thread email pour une conversation.

        Args:
            team_id: ID de l'équipe
            subject: Sujet de l'email
            from_email: Expéditeur
            to_email: Destinataire
            headers: Headers email (optionnel, pour Message-ID/References)
            cc_emails: CC (optionnel)

        Returns:
            EmailThread trouvé ou créé
        """
        # Normaliser le sujet
        normalized_subject = self.normalize_subject(subject)

        if not normalized_subject:
            normalized_subject = "(Pas de sujet)"

        # Construire la liste des participants
        participants = [from_email, to_email]
        if cc_emails:
            participants.extend(cc_emails)

        # Dédupliquer et nettoyer
        participants = list(set([p.strip().lower() for p in participants if p]))

        # Essayer de trouver via Message-ID/References (si headers fournis)
        if headers:
            msg_ids = self.extract_message_ids(headers)

            # Chercher un thread existant via References
            if msg_ids['references'] or msg_ids['in_reply_to']:
                existing = self._find_thread_by_message_ids(
                    team_id,
                    msg_ids['references'],
                    msg_ids['in_reply_to'],
                )

                if existing:
                    # Mettre à jour les métadonnées
                    self._update_thread_metadata(existing, msg_ids)
                    return existing

        # Chercher un thread via sujet + participants
        thread_id = self.generate_thread_id(normalized_subject, participants)

        existing = (
            self.db.query(EmailThread)
            .filter(
                EmailThread.team_id == team_id,
                EmailThread.thread_id == thread_id,
            )
            .first()
        )

        if existing:
            logger.debug(f"Thread existant trouvé: {existing.subject}")
            return existing

        # Créer un nouveau thread
        new_thread = EmailThread(
            team_id=team_id,
            thread_id=thread_id,
            subject=normalized_subject,
            original_subject=subject,
            participants=participants,
            email_count=0,
            metadata={
                "message_ids": [],
                "created_from": "subject_matching",
            },
        )

        self.db.add(new_thread)
        self.db.commit()
        self.db.refresh(new_thread)

        logger.info(f"✅ Nouveau thread créé: {new_thread.subject}")

        return new_thread

    def _find_thread_by_message_ids(
        self,
        team_id: int,
        references: List[str],
        in_reply_to: Optional[str],
    ) -> Optional[EmailThread]:
        """
        Trouve un thread via Message-ID/References.

        Args:
            team_id: ID de l'équipe
            references: Liste de Message-IDs référencés
            in_reply_to: Message-ID du message parent

        Returns:
            EmailThread ou None
        """
        # Construire la liste de tous les Message-IDs à chercher
        all_message_ids = []
        if references:
            all_message_ids.extend(references)
        if in_reply_to:
            all_message_ids.append(in_reply_to)

        if not all_message_ids:
            return None

        # Chercher un thread qui contient un de ces Message-IDs
        # dans ses métadonnées
        threads = (
            self.db.query(EmailThread)
            .filter(EmailThread.team_id == team_id)
            .all()
        )

        for thread in threads:
            metadata_message_ids = thread.metadata.get("message_ids", [])

            # Vérifier si un des Message-IDs correspond
            for msg_id in all_message_ids:
                if msg_id in metadata_message_ids:
                    logger.debug(f"Thread trouvé via Message-ID: {msg_id}")
                    return thread

        return None

    def _update_thread_metadata(
        self,
        thread: EmailThread,
        msg_ids: Dict[str, Any],
    ):
        """
        Met à jour les métadonnées d'un thread avec nouveaux Message-IDs.

        Args:
            thread: EmailThread
            msg_ids: Dict avec message_id, references, in_reply_to
        """
        if not thread.metadata:
            thread.metadata = {"message_ids": []}

        message_ids = thread.metadata.get("message_ids", [])

        # Ajouter le nouveau Message-ID
        if msg_ids['message_id'] and msg_ids['message_id'] not in message_ids:
            message_ids.append(msg_ids['message_id'])

        # Ajouter les References
        if msg_ids['references']:
            for ref in msg_ids['references']:
                if ref not in message_ids:
                    message_ids.append(ref)

        thread.metadata["message_ids"] = message_ids
        self.db.commit()

    def add_email_to_thread(
        self,
        thread: EmailThread,
        interaction: Interaction,
    ):
        """
        Ajoute un email à un thread.

        Met à jour les compteurs et les références.

        Args:
            thread: EmailThread
            interaction: Interaction (email)
        """
        # Lier l'interaction au thread
        interaction.email_thread_id = thread.id

        # Mettre à jour les compteurs
        thread.email_count += 1

        # Mettre à jour premier/dernier email
        email_date = interaction.interaction_date or interaction.created_at

        if not thread.first_email_at or email_date < thread.first_email_at:
            thread.first_email_at = email_date
            thread.first_interaction_id = interaction.id

        if not thread.last_email_at or email_date > thread.last_email_at:
            thread.last_email_at = email_date
            thread.last_interaction_id = interaction.id

        thread.updated_at = datetime.now()

        self.db.commit()

        logger.debug(
            f"Email ajouté au thread '{thread.subject}' "
            f"({thread.email_count} emails)"
        )

    def get_thread_emails(
        self,
        thread_id: int,
        limit: int = 50,
        order_by: str = "asc",
    ) -> List[Interaction]:
        """
        Récupère les emails d'un thread.

        Args:
            thread_id: ID du thread
            limit: Nombre max d'emails
            order_by: Ordre (asc ou desc)

        Returns:
            Liste d'Interactions (emails)
        """
        query = (
            self.db.query(Interaction)
            .filter(Interaction.email_thread_id == thread_id)
        )

        if order_by == "asc":
            query = query.order_by(Interaction.interaction_date.asc())
        else:
            query = query.order_by(Interaction.interaction_date.desc())

        return query.limit(limit).all()

    def get_active_threads(
        self,
        team_id: int,
        limit: int = 50,
    ) -> List[EmailThread]:
        """
        Récupère les threads actifs (dernière activité < 30 jours).

        Args:
            team_id: ID de l'équipe
            limit: Nombre max de threads

        Returns:
            Liste d'EmailThreads
        """
        from datetime import timedelta

        cutoff_date = datetime.now() - timedelta(days=30)

        threads = (
            self.db.query(EmailThread)
            .filter(
                EmailThread.team_id == team_id,
                EmailThread.last_email_at >= cutoff_date,
            )
            .order_by(EmailThread.last_email_at.desc())
            .limit(limit)
            .all()
        )

        return threads

    def rebuild_thread_from_emails(self, thread_id: int):
        """
        Reconstruit un thread à partir de ses emails.

        Utile pour corriger les compteurs ou réindexer.

        Args:
            thread_id: ID du thread
        """
        thread = self.db.query(EmailThread).get(thread_id)

        if not thread:
            raise ValueError(f"Thread {thread_id} introuvable")

        # Récupérer tous les emails du thread
        emails = (
            self.db.query(Interaction)
            .filter(Interaction.email_thread_id == thread_id)
            .order_by(Interaction.interaction_date.asc())
            .all()
        )

        if not emails:
            logger.warning(f"Thread {thread_id} sans emails")
            return

        # Recalculer les stats
        thread.email_count = len(emails)

        first_email = emails[0]
        last_email = emails[-1]

        thread.first_email_at = first_email.interaction_date or first_email.created_at
        thread.first_interaction_id = first_email.id

        thread.last_email_at = last_email.interaction_date or last_email.created_at
        thread.last_interaction_id = last_email.id

        # Reconstruire la liste des participants
        all_participants = set()
        for email in emails:
            # Extraire from/to depuis external_participants ou title
            # (dépend de comment les emails sont stockés)
            if email.external_participants:
                for participant in email.external_participants:
                    if participant.get('email'):
                        all_participants.add(participant['email'].lower())

        thread.participants = list(all_participants)

        self.db.commit()

        logger.info(
            f"✅ Thread {thread_id} reconstruit: "
            f"{thread.email_count} emails, {len(thread.participants)} participants"
        )
