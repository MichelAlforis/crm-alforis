"""
Modèle de configuration Email

Gestion des clés API et configuration des providers d'email avec cryptage
Similaire à AIConfiguration pour la cohérence
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SQLEnum, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from models.base import BaseModel


class EmailProvider(str, enum.Enum):
    """Fournisseurs d'email supportés"""
    RESEND = "resend"
    SENDGRID = "sendgrid"
    MAILGUN = "mailgun"


class EmailConfiguration(BaseModel):
    """
    Configuration des providers email et clés API

    Stocke de manière cryptée les clés API des fournisseurs d'email.
    Une seule configuration peut être active à la fois.
    """
    __tablename__ = "email_configurations"

    # Identification
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False, index=True)

    # Provider et configuration
    provider = Column(SQLEnum(EmailProvider, values_callable=lambda x: [e.value for e in x]), nullable=False, default=EmailProvider.RESEND)

    # Clés API (cryptées)
    api_key_encrypted = Column(Text, nullable=False)  # Clé API cryptée

    # Configuration spécifique au provider
    # Pour Mailgun : domain
    provider_config = Column(Text, nullable=True)  # JSON crypté avec config additionnelle

    # Paramètres d'envoi
    from_name = Column(String(100), nullable=True)
    from_email = Column(String(255), nullable=True)
    reply_to = Column(String(255), nullable=True)

    # Limites et tracking
    rate_limit_per_minute = Column(Integer, default=120, nullable=False)
    batch_size = Column(Integer, default=500, nullable=False)
    track_opens = Column(Boolean, default=True, nullable=False)
    track_clicks = Column(Boolean, default=True, nullable=False)

    # Audit
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    last_tested_at = Column(DateTime, nullable=True)  # Dernier test de connexion
    test_status = Column(String(20), nullable=True)  # success, failed
    test_error = Column(Text, nullable=True)  # Message d'erreur du dernier test

    def __repr__(self):
        return f"<EmailConfiguration(id={self.id}, provider={self.provider}, active={self.is_active})>"
