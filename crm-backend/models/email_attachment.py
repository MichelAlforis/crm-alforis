"""
Modèle SQLAlchemy pour les pièces jointes email (MULTI-TENANT + AFTPM Compliance)

Fonctionnalités:
- Stocke métadonnées des pièces jointes (pas le contenu par défaut)
- Calcul hash SHA256 pour tracking compliance
- Isolation par team_id (RGPD)
- Support S3/MinIO pour stockage optionnel
- Détection type MIME pour sécurité
"""

from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, BigInteger, Index
)
from sqlalchemy.orm import relationship
import hashlib

from models.base import Base


class EmailAttachment(Base):
    """Pièce jointe email (metadata + optional storage)"""

    __tablename__ = "email_attachments"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # MULTI-TENANT: Isolation
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Lien vers message parent
    email_message_id = Column(Integer, ForeignKey("email_messages.id", ondelete="CASCADE"), nullable=False, index=True)

    # =========================================================================
    # Métadonnées fichier
    # =========================================================================
    filename = Column(String(500), nullable=False)
    content_type = Column(String(200), nullable=True)  # MIME type
    size_bytes = Column(BigInteger, nullable=False)  # Taille fichier

    # =========================================================================
    # Sécurité & Deduplication
    # =========================================================================
    content_hash_sha256 = Column(String(64), nullable=True, index=True)  # Hash du contenu
    is_inline = Column(Boolean, default=False, nullable=False)  # Inline vs attachment
    content_id = Column(String(255), nullable=True)  # CID pour inline images

    # =========================================================================
    # Stockage optionnel (S3/MinIO)
    # =========================================================================
    storage_path = Column(String(1000), nullable=True)  # s3://bucket/team_1/emails/...
    is_stored = Column(Boolean, default=False, nullable=False)

    # =========================================================================
    # Compliance AFTPM
    # =========================================================================
    is_compliance_document = Column(Boolean, default=False, nullable=False)  # Document réglementaire
    compliance_category = Column(String(100), nullable=True)  # 'contract', 'mandate', 'report'

    # =========================================================================
    # Timestamps
    # =========================================================================
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # =========================================================================
    # Relations
    # =========================================================================
    team = relationship("Team", backref="email_attachments")
    email_message = relationship("EmailMessage", backref="attachments")

    # =========================================================================
    # Indexes
    # =========================================================================
    __table_args__ = (
        Index('ix_email_attachments_team_hash', 'team_id', 'content_hash_sha256'),
        Index('ix_email_attachments_compliance', 'team_id', 'is_compliance_document'),
    )

    @property
    def size_mb(self) -> float:
        """Taille en MB"""
        return round(self.size_bytes / (1024 * 1024), 2)

    def __repr__(self):
        return f"<EmailAttachment(id={self.id}, filename='{self.filename}', size={self.size_mb}MB)>"
