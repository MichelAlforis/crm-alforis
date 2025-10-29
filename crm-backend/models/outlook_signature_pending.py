"""
Modèle pour les signatures Outlook en attente de validation

Salle d'attente RGPD pour éviter la pollution du CRM
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from models.base import Base


class OutlookSignaturePending(Base):
    """
    Signatures extraites d'Outlook en attente de validation manuelle

    Évite la pollution du CRM avec des emails marketing (noreply@..., outlook_CCE@...)
    L'utilisateur doit valider/rejeter chaque signature avant import
    """

    __tablename__ = "outlook_signatures_pending"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Données extraites
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=True)
    job_title = Column(String(255), nullable=True)
    company = Column(String(255), nullable=True)

    # Métadonnées source
    source_message_id = Column(String(255), nullable=True)
    source_date = Column(DateTime(timezone=True), nullable=True)

    # Statut validation
    status = Column(
        String(20),
        nullable=False,
        default="pending",
        index=True,
        comment="pending | approved | rejected"
    )

    # Raison du rejet (si applicable)
    rejection_reason = Column(String(255), nullable=True)

    # Détection automatique
    is_likely_marketing = Column(Boolean, default=False, nullable=False)
    auto_detection_flags = Column(Text, nullable=True, comment="JSON: raisons détection auto")

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    validated_at = Column(DateTime(timezone=True), nullable=True)
    validated_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Relations
    user = relationship("User", foreign_keys=[user_id], back_populates="outlook_signatures_pending")
    validator = relationship("User", foreign_keys=[validated_by])

    def __repr__(self):
        return f"<OutlookSignaturePending(id={self.id}, email={self.email}, status={self.status})>"
