"""
AI User Preference Model - Apprentissage des préférences utilisateur (Phase 3)

Stocke les choix utilisateurs pour améliorer les suggestions au fil du temps.
Conforme RGPD avec retention policy 90 jours.
"""

from datetime import datetime, timedelta

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from models.base import Base


class AIUserPreference(Base):
    """
    Apprentissage IA des préférences utilisateur (Phase 3 - AI Memory & Learning)

    Trace les choix users sur suggestions IA du Context Menu:
    - Accept: user a appliqué la suggestion
    - Reject: user a ignoré/refusé la suggestion
    - Manual: user a saisi manuellement une autre valeur

    Permet de:
    - Améliorer le scoring des suggestions (boost fréquence + récence)
    - Détecter des patterns personnalisés (ex: toujours +33 pour France)
    - Learning personnalisé par utilisateur
    """

    __tablename__ = "ai_user_preferences"

    id = Column(Integer, primary_key=True, index=True)

    # Utilisateur
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    # Contexte de la suggestion
    field_name = Column(String(100), nullable=False, index=True)  # "role", "personal_email", "phone", etc.
    context_type = Column(String(50), nullable=False)  # "person", "organisation"
    entity_id = Column(Integer, nullable=True)  # ID de l'entité concernée (si applicable)

    # Suggestion proposée par l'IA
    suggested_value = Column(Text, nullable=True)  # Valeur suggérée
    suggestion_source = Column(String(50), nullable=True)  # "frequency", "web_enrichment", "email_signature", "nlp"
    suggestion_confidence = Column(Float, nullable=True)  # Score de confiance initial (0-1)
    suggestion_rank = Column(Integer, nullable=True)  # Position dans la liste (1=first, 2=second, etc.)

    # Choix utilisateur
    action = Column(String(20), nullable=False, index=True)  # "accept", "reject", "manual", "ignore"
    final_value = Column(Text, nullable=True)  # Valeur finale choisie par l'user (si accept ou manual)

    # Metadata additionnelle
    extra_metadata = Column(JSONB, nullable=True)  # JSON avec contexte additionnel (renamed from 'metadata' to avoid SQLAlchemy conflict)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # RGPD: Auto-suppression après 90 jours
    expires_at = Column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=90),
        nullable=False,
        index=True
    )

    # Relations
    user = relationship("User", foreign_keys=[user_id])
    team = relationship("Team", foreign_keys=[team_id])

    # Indexes composites pour queries fréquentes
    __table_args__ = (
        # Learning patterns par user + field
        Index("idx_ai_pref_user_field", "user_id", "field_name", "action"),

        # Learning patterns par team + field (patterns d'équipe)
        Index("idx_ai_pref_team_field", "team_id", "field_name", "action"),

        # Cleanup RGPD automatique
        Index("idx_ai_pref_expires", "expires_at"),

        # Analytics temporels
        Index("idx_ai_pref_created", "created_at", "action"),

        # Performance: user recent preferences
        Index("idx_ai_pref_user_recent", "user_id", "created_at"),
    )

    def __repr__(self):
        return (
            f"<AIUserPreference(id={self.id}, user_id={self.user_id}, field={self.field_name}, "
            f"action={self.action}, value={self.final_value[:20] if self.final_value else None})>"
        )

    def is_expired(self) -> bool:
        """Check si la préférence a expiré (RGPD 90 jours)"""
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        """Serialization pour API"""
        return {
            "id": self.id,
            "field_name": self.field_name,
            "context_type": self.context_type,
            "suggested_value": self.suggested_value,
            "action": self.action,
            "final_value": self.final_value,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
