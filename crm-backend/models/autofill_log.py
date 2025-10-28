"""
Modèle AutofillLog pour le suivi RGPD des suggestions d'autofill

Chaque entrée trace qui a suggéré quoi, avec quel niveau de confiance
et si la suggestion a été appliquée, afin d'alimenter les métriques
et audits.
"""

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.sql import func

from models.base import Base


class AutofillLog(Base):
    """Journal des suggestions d'autofill (champ par champ)."""

    __tablename__ = "autofill_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=True)
    field = Column(String(100), nullable=False, index=True)

    old_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)

    confidence = Column(Float, nullable=False)
    source = Column(String(50), nullable=False, index=True)
    applied = Column(Boolean, nullable=False, default=False, index=True)

    evidence_hash = Column(String(64), nullable=True)
    execution_time_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "confidence": self.confidence,
            "source": self.source,
            "applied": self.applied,
            "evidence_hash": self.evidence_hash,
            "execution_time_ms": self.execution_time_ms,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
