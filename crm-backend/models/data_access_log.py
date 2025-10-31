"""
Data Access Log Model - Traçabilité RGPD des accès aux données personnelles

Conforme CNIL:
- Trace tous les accès en lecture aux données sensibles
- Trace toutes les suppressions/anonymisations
- Conserve les logs pendant 3 ans minimum
"""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import Base


class DataAccessLog(Base):
    """
    Journal d'accès aux données personnelles (RGPD/CNIL)

    Trace:
    - Qui a accédé aux données (user_id)
    - Quand (accessed_at)
    - Quelle donnée (entity_type, entity_id)
    - Quelle action (read, export, delete, anonymize)
    - Quel endpoint (access_type)
    - Contexte technique (IP, user-agent)
    - Raison légale (purpose)
    """

    __tablename__ = "data_access_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Entité accédée
    entity_type = Column(
        String(50), nullable=False, index=True
    )  # "person", "organisation", "user", "email_message"
    entity_id = Column(Integer, nullable=False, index=True)

    # Action RGPD
    access_type = Column(
        String(20), nullable=False, index=True
    )  # "read", "export", "delete", "anonymize"

    # Endpoint/Source
    endpoint = Column(String(200), nullable=True)  # "/api/v1/people/123"

    # Raison légale (justification métier)
    purpose = Column(
        String(200), nullable=True
    )  # "Consultation fiche client", "Export RGPD sur demande", "Anonymisation 2 ans"

    # Metadata utilisateur
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)

    # Données supplémentaires (JSON)
    extra_data = Column(Text, nullable=True)  # JSON avec détails spécifiques

    # Timestamp
    accessed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # Relations
    user = relationship("User", foreign_keys=[user_id])

    # Indexes composites pour compliance CNIL
    __table_args__ = (
        Index("idx_data_access_entity", "entity_type", "entity_id", "accessed_at"),
        Index("idx_data_access_user_date", "user_id", "accessed_at"),
        Index("idx_data_access_type_date", "access_type", "accessed_at"),
    )

    def __repr__(self):
        return (
            f"<DataAccessLog(id={self.id}, entity={self.entity_type}:{self.entity_id}, "
            f"access_type={self.access_type}, user_id={self.user_id}, accessed_at={self.accessed_at})>"
        )
