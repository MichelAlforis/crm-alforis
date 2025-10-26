"""
Audit Log Model - Traçabilité des modifications sensibles

Trace tous les changements sur:
- People (status, assignee)
- Organisations (status, owner)
- Users (roles, permissions)
- Email campaigns (status)
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from core.database import Base


class AuditLog(Base):
    """
    Journal d'audit pour tracer les modifications sensibles

    Chaque modification crée une entrée avec:
    - Qui a fait le changement (user_id)
    - Quand (created_at)
    - Sur quelle entité (entity_type, entity_id)
    - Quelle action (create, update, delete)
    - Quel champ (field_name)
    - Ancienne vs nouvelle valeur
    - Contexte (IP, user-agent)
    """

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Entité modifiée
    entity_type = Column(String(50), nullable=False, index=True)  # "person", "organisation", "user", "campaign"
    entity_id = Column(Integer, nullable=False, index=True)

    # Action
    action = Column(String(20), nullable=False, index=True)  # "create", "update", "delete", "login", "logout"

    # Champ modifié (pour update)
    field_name = Column(String(100), nullable=True)  # ex: "status", "assigned_to_id", "role_id"

    # Valeurs before/after
    old_value = Column(Text, nullable=True)  # JSON ou texte simple
    new_value = Column(Text, nullable=True)  # JSON ou texte simple

    # Metadata
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relations
    user = relationship("User", foreign_keys=[user_id])

    # Indexes composites pour queries fréquentes
    __table_args__ = (
        Index('idx_audit_entity', 'entity_type', 'entity_id', 'created_at'),
        Index('idx_audit_user_date', 'user_id', 'created_at'),
        Index('idx_audit_action_date', 'action', 'created_at'),
    )

    def __repr__(self):
        return (
            f"<AuditLog(id={self.id}, entity={self.entity_type}:{self.entity_id}, "
            f"action={self.action}, user_id={self.user_id}, created_at={self.created_at})>"
        )
