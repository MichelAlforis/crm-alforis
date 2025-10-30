"""
EmailBlacklist Model - Blacklist pour filtrer les emails indésirables

Permet de bloquer automatiquement les suggestions autofill pour:
- Emails spécifiques: noreply@example.com
- Domaines complets: @mailchimp.com
- Patterns wildcard: noreply@*
"""
from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Index, CheckConstraint
from sqlalchemy.orm import relationship

from models.base import Base


class EmailBlacklist(Base):
    """
    Blacklist pour filtrer les expéditeurs indésirables dans l'autofill

    Exemples:
    - pattern="noreply@microsoft.com", pattern_type="email"
    - pattern="@mailchimp.com", pattern_type="domain"
    - pattern="noreply@*", pattern_type="wildcard"
    """

    __tablename__ = "email_blacklist"
    __table_args__ = (
        Index('idx_email_blacklist_team_pattern', 'team_id', 'pattern'),
        Index('idx_email_blacklist_pattern_type', 'pattern_type'),
        CheckConstraint(
            "pattern_type IN ('email', 'domain', 'wildcard')",
            name="ck_email_blacklist_pattern_type"
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Multi-tenant
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Pattern à bloquer
    pattern = Column(String(255), nullable=False)
    pattern_type = Column(String(20), nullable=False)  # "email", "domain", "wildcard"

    # Métadonnées
    reason = Column(Text, nullable=True)  # Pourquoi ce pattern est bloqué
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relations
    team = relationship("Team", backref="email_blacklist")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<EmailBlacklist {self.pattern_type}:{self.pattern}>"

    def matches(self, email: str) -> bool:
        """
        Vérifie si un email correspond à ce pattern

        Args:
            email: Email à vérifier (ex: "test@example.com")

        Returns:
            True si l'email doit être bloqué
        """
        email_lower = email.lower()
        pattern_lower = self.pattern.lower()

        if self.pattern_type == "email":
            # Correspondance exacte
            return email_lower == pattern_lower

        elif self.pattern_type == "domain":
            # Correspondance sur le domaine (pattern doit commencer par @)
            if not pattern_lower.startswith('@'):
                pattern_lower = '@' + pattern_lower
            return email_lower.endswith(pattern_lower)

        elif self.pattern_type == "wildcard":
            # Wildcard simple: "noreply@*" → match tout email commençant par "noreply@"
            pattern_clean = pattern_lower.replace('*', '')
            return email_lower.startswith(pattern_clean)

        return False
