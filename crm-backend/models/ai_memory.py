"""
Modèle AIMemory - Cache et logs des appels AI

Phase 2: AI Semantic Parsing
- Cache responses par prompt_hash (déduplication)
- Logs de performance (processing_time)
- Audit trail pour RGPD
"""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB

from models.base import Base


class AIMemory(Base):
    """Cache et logs des appels AI (pour performance + audit)"""

    __tablename__ = "ai_memory"

    id = Column(Integer, primary_key=True, autoincrement=True)

    # MULTI-TENANT: Isolation par team
    team_id = Column(Integer, ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)

    # Model info
    model_used = Column(String(100), nullable=False, index=True)  # "ollama_mistral:7b-instruct"
    provider = Column(String(50), nullable=False)  # "ollama", "mistral_api", "openai", "claude"

    # Prompt cache (pour déduplication)
    prompt_hash = Column(String(64), nullable=False, index=True)  # SHA256(prompt_text)
    prompt_text = Column(Text, nullable=False)

    # Response
    response_json = Column(JSONB, nullable=False)
    confidence_score = Column(Float, nullable=True)  # Si disponible dans la response

    # Performance metrics
    processing_time_ms = Column(Integer, nullable=True)
    tokens_used = Column(Integer, nullable=True)
    cost_usd = Column(Float, nullable=True)  # Estimation du coût

    # Status
    success = Column(Boolean, default=True, nullable=False)
    error_message = Column(Text, nullable=True)

    # Metadata
    task_type = Column(String(50), nullable=False, index=True)  # "signature_parse", "intent_detection"
    source_email_id = Column(Integer, ForeignKey("email_messages.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Indexes composites
    __table_args__ = (
        # Cache lookup: (team_id, prompt_hash)
        Index('ix_ai_memory_cache', 'team_id', 'prompt_hash'),

        # Performance analytics
        Index('ix_ai_memory_model_created', 'model_used', 'created_at'),
        Index('ix_ai_memory_task_created', 'task_type', 'created_at'),
    )

    def __repr__(self):
        return f"<AIMemory {self.model_used} task={self.task_type} time={self.processing_time_ms}ms>"
