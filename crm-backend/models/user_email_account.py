"""
Modèle SQLAlchemy pour les comptes email (MULTI-TENANT)

IMPORTANT: Les comptes email sont liés à une TEAM (tenant), pas directement à un user!
Un user peut être admin de plusieurs teams, donc ses comptes email sont contextualisés
par team pour isoler les données (RGPD, sécurité).

Exemple:
- Team Alforis → email michel.marques@alforis.fr, contact@alforis.fr
- Team Autre Boîte → email michel@autreboite.com

user_id = qui a configuré le compte (audit trail)
team_id = à quelle team/tenant appartient ce compte (isolation des données)
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import Base


class UserEmailAccount(Base):
    """Compte email externe connecté par un utilisateur"""

    __tablename__ = "user_email_accounts"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # MULTI-TENANT: team_id = contexte d'isolation (OBLIGATOIRE)
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # user_id = qui a configuré le compte (audit trail, peut être NULL si config par admin)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Informations du compte
    email = Column(String(255), nullable=False, index=True)
    provider = Column(String(50), nullable=False, index=True)  # 'ionos', 'outlook', 'gmail', etc.
    display_name = Column(String(255), nullable=True)
    is_primary = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Configuration serveur (pour IONOS, Exchange on-premise, etc.)
    server = Column(String(255), nullable=True)  # ex: exchange.ionos.eu
    protocol = Column(String(20), nullable=True)  # 'ews', 'imap', 'graph'

    # Credentials (chiffrés avec Fernet AES-256)
    # OAuth (Microsoft, Google)
    encrypted_access_token = Column(Text, nullable=True)
    encrypted_refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    # Basic Auth (IONOS, Exchange on-premise)
    encrypted_password = Column(Text, nullable=True)
    
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
    team = relationship("Team", backref="email_accounts")
    user = relationship("User", backref="configured_email_accounts")

    def __repr__(self):
        return f"<UserEmailAccount(id={self.id}, team_id={self.team_id}, email='{self.email}', provider='{self.provider}')>"
