"""
Modèle AutofillDecisionLog pour la traçabilité des décisions d'autofill

Journalise chaque décision d'autofill (preview/apply) avec scores et raisons
pour audit, debug, et amélioration du système
"""
from sqlalchemy import Column, Integer, String, Text, ForeignKey, JSON, TIMESTAMP
from sqlalchemy.sql import func
from models.base import Base


class AutofillDecisionLog(Base):
    """
    Journal des décisions d'autofill

    Trace chaque application de l'autofill avec:
    - Input original (hash pour déduplication)
    - Entités créées/liées (Person, Organisation, Interaction)
    - Scores de matching et raisons de la décision
    - Métadonnées temporelles et utilisateur
    """

    __tablename__ = "autofill_decision_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # Identifiant unique de l'input pour idempotence
    input_id = Column(String(255), nullable=False, index=True, unique=True)
    input_hash = Column(String(64), nullable=False, index=True)  # SHA256 du payload

    # Décision prise
    decision = Column(String(50), nullable=False)  # 'apply', 'preview', 'create_new', 'skip'

    # Entités créées/liées
    person_id = Column(Integer, ForeignKey("people.id", ondelete="SET NULL"), nullable=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="SET NULL"), nullable=True, index=True)
    interaction_id = Column(Integer, ForeignKey("organisation_interactions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Scores et raisons (JSON)
    scores_json = Column(JSON, nullable=True)  # { person_score: 150, org_score: 120, criteria: {...} }
    reason = Column(Text, nullable=True)  # Explication textuelle de la décision

    # Métadonnées
    applied_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    was_deduped = Column(Integer, default=0, nullable=False)  # Booléen: interaction existante réutilisée

    # Timestamps
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), nullable=False)

    def __repr__(self):
        return f"<AutofillDecisionLog(id={self.id}, decision='{self.decision}', person_id={self.person_id}, org_id={self.organisation_id})>"

    def to_dict(self):
        return {
            "id": self.id,
            "input_id": self.input_id,
            "decision": self.decision,
            "person_id": self.person_id,
            "organisation_id": self.organisation_id,
            "interaction_id": self.interaction_id,
            "scores": self.scores_json,
            "reason": self.reason,
            "was_deduped": bool(self.was_deduped),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
