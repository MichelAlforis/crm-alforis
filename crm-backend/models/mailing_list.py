"""Modèles pour les listes de diffusion."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.constants import FK_USERS_ID, ONDELETE_SET_NULL

if TYPE_CHECKING:
    from models.user import User


class MailingList(BaseModel):
    """Liste de diffusion réutilisable pour les campagnes email."""

    __tablename__ = "mailing_lists"

    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Type de destinataires
    target_type = Column(
        String(50), nullable=False, default="contacts"
    )  # 'contacts' ou 'organisations'

    # Filtres sauvegardés (JSON)
    filters = Column(JSON, nullable=False, default={})
    # Exemple: {
    #   "languages": ["fr", "en"],
    #   "countries": ["FR", "BE"],
    #   "organisation_categories": ["client"],
    #   "specific_ids": [1, 2, 3],
    #   "exclude_ids": [4, 5]
    # }

    # Statistiques
    recipient_count = Column(Integer, nullable=False, default=0)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Métadonnées
    is_active = Column(Boolean, nullable=False, default=True)
    created_by = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True)

    # Relations
    creator = relationship("User", foreign_keys=[created_by], back_populates="mailing_lists")

    def mark_used(self):
        """Marquer la liste comme utilisée."""
        from datetime import UTC

        self.last_used_at = datetime.now(UTC)

    def __repr__(self) -> str:
        return f"<MailingList id={self.id} name='{self.name}' count={self.recipient_count}>"
