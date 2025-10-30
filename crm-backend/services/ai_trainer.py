"""
AI Trainer Service
Collect and analyze feedback to improve AI predictions
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from models.ai_feedback import AIFeedback, AIAccuracyMetrics

logger = logging.getLogger(__name__)


class AITrainer:
    """
    Collect user feedback and calculate accuracy metrics

    Features:
    - Log user corrections
    - Calculate model accuracy rates
    - Identify common error patterns
    - Generate recommendations for prompt improvements
    """

    def __init__(self, db: Session):
        self.db = db

    def log_feedback(
        self,
        team_id: int,
        user_id: int,
        prediction_type: str,
        model_used: str,
        original_prediction: Dict,
        corrected_data: Dict,
        feedback_type: str,
        original_confidence: Optional[float] = None,
        reference_id: Optional[int] = None,
        user_notes: Optional[str] = None,
        context: Optional[Dict] = None
    ) -> Dict:
        """
        Log user feedback on an AI prediction

        Args:
            prediction_type: "signature_parsing", "intent_detection", etc.
            feedback_type: "accepted", "corrected", or "rejected"
        """

        # Detect error categories
        error_categories = self._detect_error_categories(
            original_prediction,
            corrected_data,
            feedback_type
        )

        feedback = AIFeedback(
            team_id=team_id,
            user_id=user_id,
            prediction_type=prediction_type,
            reference_id=reference_id,
            model_used=model_used,
            original_prediction=original_prediction,
            original_confidence=original_confidence,
            corrected_data=corrected_data,
            feedback_type=feedback_type,
            user_notes=user_notes,
            error_categories=error_categories,
            context=context,
            created_at=datetime.now(timezone.utc)
        )

        self.db.add(feedback)
        self.db.commit()

        logger.info(f"✅ Logged AI feedback: {prediction_type} - {feedback_type}")

        return {
            "success": True,
            "feedback_id": feedback.id,
            "error_categories": error_categories
        }

    def get_model_accuracy(
        self,
        team_id: int,
        prediction_type: str,
        model_name: Optional[str] = None,
        days_back: int = 30
    ) -> Dict:
        """
        Calculate accuracy metrics for a model

        Returns:
            Dict with accuracy rates, common errors, recommendations
        """

        since_date = datetime.now(timezone.utc) - timedelta(days=days_back)

        query = self.db.query(AIFeedback).filter(
            AIFeedback.team_id == team_id,
            AIFeedback.prediction_type == prediction_type,
            AIFeedback.created_at >= since_date
        )

        if model_name:
            query = query.filter(AIFeedback.model_used == model_name)

        feedbacks = query.all()

        if not feedbacks:
            return {
                "success": True,
                "message": "No feedback data available",
                "total_feedbacks": 0
            }

        # Calculate metrics
        total = len(feedbacks)
        accepted = sum(1 for f in feedbacks if f.feedback_type == "accepted")
        corrected = sum(1 for f in feedbacks if f.feedback_type == "corrected")
        rejected = sum(1 for f in feedbacks if f.feedback_type == "rejected")

        accuracy_rate = (accepted / total) * 100 if total > 0 else 0
        correction_rate = (corrected / total) * 100 if total > 0 else 0
        rejection_rate = (rejected / total) * 100 if total > 0 else 0

        # Avg confidence by feedback type
        accepted_confidences = [f.original_confidence for f in feedbacks if f.feedback_type == "accepted" and f.original_confidence]
        corrected_confidences = [f.original_confidence for f in feedbacks if f.feedback_type == "corrected" and f.original_confidence]

        avg_confidence_accepted = sum(accepted_confidences) / len(accepted_confidences) if accepted_confidences else None
        avg_confidence_corrected = sum(corrected_confidences) / len(corrected_confidences) if corrected_confidences else None

        # Common error categories
        error_patterns = self._analyze_error_patterns(feedbacks)

        # Recommendations
        recommendations = self._generate_recommendations(
            accuracy_rate,
            correction_rate,
            rejection_rate,
            error_patterns
        )

        return {
            "success": True,
            "prediction_type": prediction_type,
            "model_name": model_name or "all",
            "period_days": days_back,
            "total_feedbacks": total,
            "accuracy_rate": round(accuracy_rate, 1),
            "correction_rate": round(correction_rate, 1),
            "rejection_rate": round(rejection_rate, 1),
            "avg_confidence_when_accepted": round(avg_confidence_accepted, 3) if avg_confidence_accepted else None,
            "avg_confidence_when_corrected": round(avg_confidence_corrected, 3) if avg_confidence_corrected else None,
            "common_errors": error_patterns,
            "recommendations": recommendations
        }

    def get_pending_reviews(
        self,
        team_id: int,
        prediction_type: Optional[str] = None,
        max_confidence: float = 0.7,
        limit: int = 20
    ) -> Dict:
        """
        Get predictions that need human review (low confidence, no feedback yet)

        Useful for the training dashboard UI
        """

        # This would query AutofillSuggestion or AIMemory for predictions
        # that don't have corresponding AIFeedback entries yet

        # For now, return placeholder
        return {
            "success": True,
            "pending_count": 0,
            "items": [],
            "message": "Feature not yet fully implemented"
        }

    def _detect_error_categories(
        self,
        original: Dict,
        corrected: Dict,
        feedback_type: str
    ) -> List[str]:
        """Detect what type of errors occurred"""

        if feedback_type == "accepted":
            return []

        if feedback_type == "rejected":
            return ["total_rejection"]

        categories = []

        # Check for missing fields
        original_keys = set(original.keys())
        corrected_keys = set(corrected.keys())

        if corrected_keys - original_keys:
            categories.append("field_missing")

        # Check for wrong values
        for key in original_keys & corrected_keys:
            if original.get(key) != corrected.get(key):
                categories.append(f"wrong_value_{key}")

        if not categories:
            categories.append("minor_correction")

        return categories

    def _analyze_error_patterns(self, feedbacks: List[AIFeedback]) -> Dict:
        """Analyze common error categories across feedbacks"""

        all_errors = []
        for f in feedbacks:
            if f.error_categories:
                all_errors.extend(f.error_categories)

        if not all_errors:
            return {}

        # Count occurrences
        from collections import Counter
        error_counts = Counter(all_errors)

        # Top 5 errors
        top_errors = dict(error_counts.most_common(5))

        return top_errors

    def _generate_recommendations(
        self,
        accuracy_rate: float,
        correction_rate: float,
        rejection_rate: float,
        error_patterns: Dict
    ) -> List[str]:
        """Generate recommendations based on metrics"""

        recommendations = []

        if accuracy_rate < 70:
            recommendations.append("⚠️ Accuracy below 70% - Consider reviewing AI prompts")

        if rejection_rate > 20:
            recommendations.append("❌ High rejection rate - Model may not be suitable for this task")

        if correction_rate > 30:
            recommendations.append("🔧 High correction rate - Consider fine-tuning confidence threshold")

        if "field_missing" in error_patterns:
            recommendations.append("📝 AI often misses fields - Improve prompt to extract more data")

        if not recommendations:
            recommendations.append("✅ Model performing well - Continue monitoring")

        return recommendations
