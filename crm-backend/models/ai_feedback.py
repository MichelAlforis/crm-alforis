"""
AI Feedback Model
User corrections and feedback for AI predictions to improve accuracy
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum

from models.base import Base


class AIFeedback(Base):
    """
    User feedback on AI predictions for continuous improvement

    Workflow:
    1. AI makes prediction (signature parsing, intent detection)
    2. User reviews and corrects if needed
    3. Feedback is logged with original vs corrected data
    4. Feedback is used to:
       - Fine-tune prompts
       - Identify common errors
       - Track model accuracy over time
       - Re-train or adjust confidence thresholds
    """
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Reference to original AI prediction
    prediction_type = Column(String(50), nullable=False, index=True, comment="Type: signature_parsing, intent_detection, etc.")
    reference_id = Column(Integer, nullable=True, comment="ID of AutofillSuggestion, AIMemory, etc.")
    model_used = Column(String(50), nullable=True, comment="Model that made the prediction")

    # Original prediction
    original_prediction = Column(JSON, nullable=False, comment="What AI predicted")
    original_confidence = Column(Float, nullable=True, comment="Original confidence score")

    # User correction
    corrected_data = Column(JSON, nullable=False, comment="User's corrected version")
    feedback_type = Column(String(20), nullable=False, index=True, comment="Type: accepted, corrected, rejected")
    # feedback_type values:
    # - "accepted": User confirmed AI was correct
    # - "corrected": User fixed errors in AI prediction
    # - "rejected": User rejected AI prediction entirely

    # User's notes
    user_notes = Column(Text, nullable=True, comment="Optional feedback from user")

    # What was wrong?
    error_categories = Column(JSON, nullable=True, comment="Categories of errors: [field_missing, wrong_value, formatting]")

    # Metadata
    context = Column(JSON, nullable=True, comment="Additional context: input text, email_id, etc.")

    # Audit
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    team = relationship("Team", foreign_keys=[team_id])
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<AIFeedback(id={self.id}, type={self.prediction_type}, feedback={self.feedback_type})>"


class AIAccuracyMetrics(Base):
    """
    Aggregated accuracy metrics by model and prediction type

    Automatically calculated from AIFeedback table
    """
    __tablename__ = "ai_accuracy_metrics"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)

    # Scope
    prediction_type = Column(String(50), nullable=False, index=True)
    model_name = Column(String(50), nullable=False, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True, comment="Date of metrics (daily aggregation)")

    # Metrics
    total_predictions = Column(Integer, default=0, nullable=False)
    accepted_count = Column(Integer, default=0, nullable=False)
    corrected_count = Column(Integer, default=0, nullable=False)
    rejected_count = Column(Integer, default=0, nullable=False)

    # Calculated rates
    accuracy_rate = Column(Float, nullable=True, comment="% accepted / total")
    correction_rate = Column(Float, nullable=True, comment="% corrected / total")
    rejection_rate = Column(Float, nullable=True, comment="% rejected / total")

    # Average confidence
    avg_confidence_accepted = Column(Float, nullable=True)
    avg_confidence_corrected = Column(Float, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    team = relationship("Team", foreign_keys=[team_id])

    def __repr__(self):
        return f"<AIAccuracyMetrics(model={self.model_name}, accuracy={self.accuracy_rate:.1%})>"
