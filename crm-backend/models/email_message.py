"""
Modèle SQLAlchemy pour le stockage centralisé des emails (MULTI-TENANT)

Architecture Email Intelligence:
- Centralise TOUS les emails de tous les providers (EWS, IMAP, Graph)
- Isolation stricte par team_id (RGPD)
- Déduplication par content_hash
- Auto-linking vers people/organisations/interactions
- Compliance AFTPM (tracking fournisseurs)

Workflow:
1. Sync daemon récupère emails via MailProviderFactory
2. Calcule content_hash pour éviter doublons
3. Upsert dans email_messages
4. Détecte sender → people table
5. Crée automatiquement crm_interaction si match
6. Tag compliance si fournisseur AFTPM détecté
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Index
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
import hashlib

from models.base import Base


class EmailMessage(Base):
    """Message email centralisé (multi-provider, multi-tenant)"""

    __tablename__ = "email_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # MULTI-TENANT: Isolation stricte par team
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Source account (quel compte email a reçu/envoyé ce message)
    account_id = Column(Integer, ForeignKey("user_email_accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # =========================================================================
    # Identifiants externes (provider-specific)
    # =========================================================================
    external_message_id = Column(String(500), nullable=False, index=True)  # Message-ID du provider
    thread_id = Column(String(255), nullable=True, index=True)  # Conversation thread
    in_reply_to = Column(String(500), nullable=True)  # Parent message

    # =========================================================================
    # Headers & Participants
    # =========================================================================
    subject = Column(Text, nullable=True)
    sender_email = Column(String(255), nullable=False, index=True)
    sender_name = Column(String(255), nullable=True)

    # Recipients (format: [{"email": "...", "name": "..."}])
    recipients_to = Column(JSONB, nullable=True, default=list)
    recipients_cc = Column(JSONB, nullable=True, default=list)
    recipients_bcc = Column(JSONB, nullable=True, default=list)

    # =========================================================================
    # Contenu
    # =========================================================================
    body_text = Column(Text, nullable=True)  # Plain text
    body_html = Column(Text, nullable=True)  # HTML
    snippet = Column(String(500), nullable=True)  # Preview court

    # =========================================================================
    # Métadonnées
    # =========================================================================
    sent_at = Column(DateTime(timezone=True), nullable=True, index=True)
    received_at = Column(DateTime(timezone=True), nullable=True, index=True)
    is_read = Column(Boolean, default=False, nullable=False)
    is_flagged = Column(Boolean, default=False, nullable=False)
    labels = Column(JSONB, nullable=True, default=list)  # ['inbox', 'important', 'sent']

    # =========================================================================
    # Deduplication & Security
    # =========================================================================
    content_hash = Column(String(64), nullable=False, index=True)  # SHA256

    # =========================================================================
    # Auto-Linking CRM
    # =========================================================================
    linked_person_id = Column(Integer, ForeignKey("people.id", ondelete="SET NULL"), nullable=True, index=True)
    linked_organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True, index=True)
    linked_interaction_id = Column(Integer, ForeignKey("crm_interactions.id", ondelete="SET NULL"), nullable=True, index=True)

    # =========================================================================
    # Compliance AFTPM
    # =========================================================================
    is_compliance_relevant = Column(Boolean, default=False, nullable=False, index=True)
    compliance_tags = Column(JSONB, nullable=True, default=list)  # ['fournisseur', 'distribution', 'mandate']

    # =========================================================================
    # Timestamps
    # =========================================================================
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # =========================================================================
    # Relations
    # =========================================================================
    team = relationship("Team", backref="email_messages")
    account = relationship("UserEmailAccount", backref="synced_messages")
    linked_person = relationship("Person", backref="email_messages", foreign_keys=[linked_person_id])
    linked_organisation = relationship("Organisation", backref="email_messages", foreign_keys=[linked_organisation_id])
    linked_interaction = relationship("Interaction", backref="source_email", foreign_keys=[linked_interaction_id])

    # =========================================================================
    # Indexes composites
    # =========================================================================
    __table_args__ = (
        # Anti-doublon: même email ne peut pas être importé 2x dans la même team/account
        Index('ix_email_messages_unique_hash', 'team_id', 'account_id', 'content_hash', unique=True),

        # Performance queries
        Index('ix_email_messages_team_sent_at', 'team_id', 'sent_at'),
        Index('ix_email_messages_team_sender', 'team_id', 'sender_email'),
    )

    @staticmethod
    def compute_content_hash(sender: str, subject: str, sent_at: datetime, body_preview: str) -> str:
        """
        Calcule un hash unique pour détecter les doublons.

        Args:
            sender: Email expéditeur
            subject: Sujet
            sent_at: Date d'envoi
            body_preview: Aperçu du corps (premiers 200 chars)

        Returns:
            SHA256 hex string (64 chars)
        """
        content = f"{sender}|{subject}|{sent_at.isoformat()}|{body_preview[:200]}"
        return hashlib.sha256(content.encode('utf-8')).hexdigest()

    def __repr__(self):
        return f"<EmailMessage(id={self.id}, team_id={self.team_id}, subject='{self.subject[:50]}...', sender='{self.sender_email}')>"
