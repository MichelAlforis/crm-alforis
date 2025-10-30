"""
Modèle AutofillSuggestion - Suggestions AI à valider (HITL workflow)

Phase 2: AI Semantic Parsing
- Parse signatures emails → suggestions de champs
- Intent detection → tags/actions suggérés
- Confidence scoring → auto-apply si ≥ 0.92 + safe field
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from models.base import Base


class AutofillSuggestion(Base):
    """Suggestion AI pour auto-fill CRM (avec validation HITL)"""

    __tablename__ = "autofill_suggestions"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # MULTI-TENANT: Isolation par team
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Target (nullable si suggestion pour NEW person)
    person_id = Column(Integer, ForeignKey("people.id", ondelete="CASCADE"), nullable=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id", ondelete="CASCADE"), nullable=True, index=True)

    # Type de suggestion
    suggestion_type = Column(String(50), nullable=False, index=True)  # "signature_parse", "intent_detection"

    # Champ concerné
    field_name = Column(String(100), nullable=False)  # "phone", "job_title", "company_name"...
    current_value = Column(Text, nullable=True)  # Valeur actuelle (peut être null)
    suggested_value = Column(Text, nullable=False)  # Valeur suggérée par l'IA

    # AI metadata
    confidence_score = Column(Float, nullable=False)  # 0.0 - 1.0
    source_model = Column(String(100), nullable=False)  # "ollama_mistral:7b", "mistral_api", "openai_gpt4"
    reasoning = Column(Text, nullable=True)  # Explication de l'IA (optionnel)

    # Source data
    email_id = Column(Integer, ForeignKey("email_messages.id", ondelete="SET NULL"), nullable=True)
    interaction_id = Column(Integer, ForeignKey("crm_interactions.id", ondelete="SET NULL"), nullable=True)

    # Workflow status
    status = Column(String(20), nullable=False, default="pending", index=True)  # pending, approved, rejected, auto_applied
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Si auto-applied
    auto_applied = Column(Boolean, default=False, nullable=False)
    auto_applied_reason = Column(String(200), nullable=True)  # "confidence>=0.92 + safe_field"

    # Web enrichment (Acte V)
    web_enriched = Column(Boolean, default=False, nullable=False, index=True)
    enrichment_confidence = Column(Float, nullable=True)  # 0.0 - 1.0
    enrichment_source = Column(String(50), nullable=True, index=True)  # "serpapi", "brave", "custom"
    enriched_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)

    # Relations
    team = relationship("Team", backref="autofill_suggestions")
    person = relationship("Person", backref="autofill_suggestions", foreign_keys=[person_id])
    organisation = relationship("Organisation", backref="autofill_suggestions", foreign_keys=[organisation_id])
    email = relationship("EmailMessage", backref="autofill_suggestions", foreign_keys=[email_id])
    interaction = relationship("Interaction", backref="autofill_suggestions", foreign_keys=[interaction_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

    # Indexes composites
    __table_args__ = (
        # Performance queries
        Index('ix_suggestions_team_status', 'team_id', 'status'),
        Index('ix_suggestions_team_created', 'team_id', 'created_at'),
        Index('ix_suggestions_person_status', 'person_id', 'status'),
    )

    def __repr__(self):
        return f"<AutofillSuggestion {self.field_name}={self.suggested_value} conf={self.confidence_score:.2f}>"
