"""
Modèle EmailThread pour regrouper les emails en conversations.

Un thread regroupe plusieurs Interactions (emails) qui font partie
de la même conversation (basé sur headers References, In-Reply-To, Message-ID).
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Index
from sqlalchemy.orm import relationship
from datetime import datetime

from models.base import Base


class EmailThread(Base):
    """
    Thread d'emails (conversation groupée).

    Un thread contient plusieurs emails liés par:
    - Message-ID / References / In-Reply-To headers
    - Même sujet (avec variations Re:, Fwd:)
    - Mêmes participants
    """

    __tablename__ = "email_threads"

    id = Column(Integer, primary_key=True, index=True)

    # Identifiant unique du thread (généré ou extrait de Message-ID)
    thread_id = Column(String(255), unique=True, nullable=False, index=True)

    # Équipe propriétaire du thread
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    # Sujet du thread (normalisé, sans Re:, Fwd:, etc.)
    subject = Column(String(500), nullable=False, index=True)

    # Sujet original (avec Re:, Fwd:)
    original_subject = Column(String(500))

    # Participants du thread (JSON array d'emails)
    # Exemple: ["john@example.com", "jane@example.com", "bob@company.com"]
    participants = Column(JSON, nullable=False, default=list)

    # Premier email du thread (interaction_id)
    first_interaction_id = Column(
        Integer,
        ForeignKey("crm_interactions.id"),
        nullable=True,
        index=True,
    )

    # Dernier email du thread (interaction_id)
    last_interaction_id = Column(
        Integer,
        ForeignKey("crm_interactions.id"),
        nullable=True,
        index=True,
    )

    # Nombre d'emails dans le thread
    email_count = Column(Integer, default=0, nullable=False)

    # Métadonnées du thread (JSON)
    # Contient: message_ids, in_reply_to_ids, references, etc.
    thread_metadata = Column(JSON, default=dict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now, nullable=False)

    # Date du premier email du thread
    first_email_at = Column(DateTime, nullable=True, index=True)

    # Date du dernier email du thread
    last_email_at = Column(DateTime, nullable=True, index=True)

    # Relations
    team = relationship("Team", back_populates="email_threads")

    # Relation avec les interactions (emails du thread)
    # Note: Ajouté via Interaction.email_thread_id FK
    interactions = relationship(
        "Interaction",
        foreign_keys="Interaction.email_thread_id",
        back_populates="thread",
        lazy="dynamic",
    )

    # Relations vers premier/dernier email
    first_interaction = relationship(
        "Interaction",
        foreign_keys=[first_interaction_id],
        lazy="joined",
    )

    last_interaction = relationship(
        "Interaction",
        foreign_keys=[last_interaction_id],
        lazy="joined",
    )

    def __repr__(self):
        return (
            f"<EmailThread(id={self.id}, "
            f"thread_id='{self.thread_id}', "
            f"subject='{self.subject[:50]}...', "
            f"email_count={self.email_count})>"
        )

    @property
    def is_active(self) -> bool:
        """Thread actif si dernier email < 30 jours."""
        if not self.last_email_at:
            return False

        delta = datetime.now() - self.last_email_at
        return delta.days < 30

    @property
    def participant_count(self) -> int:
        """Nombre de participants uniques."""
        return len(self.participants) if self.participants else 0

    def add_participant(self, email: str):
        """Ajoute un participant au thread (si pas déjà présent)."""
        if not self.participants:
            self.participants = []

        if email and email not in self.participants:
            self.participants.append(email)

    def normalize_subject(self) -> str:
        """
        Normalise le sujet en retirant les préfixes Re:, Fwd:, etc.

        Returns:
            Sujet normalisé
        """
        import re

        if not self.subject:
            return ""

        # Retirer les préfixes courants
        subject = self.subject
        subject = re.sub(r'^(Re|RE|Fwd|FWD|Fw|FW):\s*', '', subject, flags=re.IGNORECASE)
        subject = re.sub(r'^\[.*?\]\s*', '', subject)  # [Tag] au début
        subject = subject.strip()

        return subject


# Index composites pour performance
Index(
    "ix_email_threads_team_subject",
    EmailThread.team_id,
    EmailThread.subject,
)

Index(
    "ix_email_threads_team_updated",
    EmailThread.team_id,
    EmailThread.updated_at.desc(),
)

Index(
    "ix_email_threads_team_last_email",
    EmailThread.team_id,
    EmailThread.last_email_at.desc(),
)
