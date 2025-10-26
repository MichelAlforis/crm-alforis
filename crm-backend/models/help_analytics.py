"""
Help Analytics Event model for tracking user interactions with the help system.

Tracks FAQ views, guide views, tooltip hovers, article ratings, and support contacts
to provide analytics and improve help content.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from models.base import BaseModel


class HelpAnalyticsEvent(BaseModel):
    """
    Événement d'interaction avec le système d'aide.

    Capture toutes les interactions utilisateur avec le système d'aide :
    - Vues de FAQ (faq_view)
    - Recherches FAQ (faq_search)
    - Consultation de guides (guide_view)
    - Survol de tooltips (tooltip_hover)
    - Clics "En savoir plus" dans tooltips (tooltip_learn_more_click)
    - Ratings d'articles (article_rating)
    - Contacts support (support_contact)

    Ces données permettent d'analyser les contenus les plus consultés,
    identifier les points de friction, et améliorer en continu la documentation.
    """

    __tablename__ = "help_analytics_events"

    # User qui a déclenché l'événement
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user = relationship("User", backref="help_analytics_events")

    # Type d'événement
    event_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Type: faq_view, faq_search, guide_view, tooltip_hover, tooltip_learn_more_click, article_rating, support_contact",
    )

    # ID de la cible (optionnel, dépend du type)
    # Ex: "faq-001", "guide-organisations", "tooltip-aum-field"
    target_id = Column(
        String(255),
        nullable=True,
        index=True,
        comment="Identifiant de l'élément ciblé (FAQ, guide, tooltip, etc.)",
    )

    # Métadonnées JSON (contexte additionnel)
    # Ex: {"category": "Organisations", "search_query": "comment créer", "rating": "positive"}
    event_metadata = Column(
        JSON,
        nullable=True,
        comment="Contexte additionnel: catégorie, recherche, rating, feedback, etc.",
    )

    # Timestamp de l'événement
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        index=True,
        comment="Date/heure de l'événement",
    )

    def __repr__(self) -> str:
        return f"<HelpAnalyticsEvent(id={self.id}, user_id={self.user_id}, event_type='{self.event_type}', target_id='{self.target_id}')>"

    def to_dict(self) -> dict:
        """Serialization pour API/export."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "event_type": self.event_type,
            "target_id": self.target_id,
            "metadata": self.event_metadata,  # Exposé comme 'metadata' en API
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
