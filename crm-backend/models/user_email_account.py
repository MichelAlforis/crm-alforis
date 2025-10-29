"""
Modèle SQLAlchemy pour les comptes email utilisateurs (multi-comptes)

Permet à un utilisateur de connecter plusieurs comptes email:
- Outlook professionnel (michel.marques@alforis.fr)
- Outlook personnel (michel@outlook.com)
- Gmail (michel.marques@gmail.com)
- etc.

Chaque compte stocke ses propres tokens OAuth chiffrés
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from core.database import Base


class UserEmailAccount(Base):
    """Compte email externe connecté par un utilisateur"""

    __tablename__ = "user_email_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Informations du compte
    email = Column(String(255), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)  # 'outlook', 'gmail', etc.
    display_name = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # OAuth tokens (chiffrés avec Fernet AES-256)
    encrypted_access_token = Column(Text, nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # RGPD
    consent_given = Column(Boolean, default=False, nullable=False)
    consent_date = Column(DateTime(timezone=True), nullable=True)
    
    # Métadonnées Microsoft (pour Outlook/Office 365)
    microsoft_user_id = Column(String(255), nullable=True)
    user_principal_name = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=True)
    office_location = Column(String(255), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relations
    user = relationship("User", back_populates="email_accounts")

    def __repr__(self):
        return f"<UserEmailAccount(id={self.id}, user_id={self.user_id}, email='{self.email}', provider='{self.provider}')>"
