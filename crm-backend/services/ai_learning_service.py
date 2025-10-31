"""
AI Learning Service - Phase 3: AI Memory & Learning System

Apprentissage des préférences utilisateur depuis le Context Menu.
Améliore les suggestions au fil du temps basé sur les choix users.
"""

import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc

from models.ai_user_preference import AIUserPreference

logger = logging.getLogger(__name__)


class AILearningService:
    """
    Service d'apprentissage des préférences utilisateur (Phase 3)

    Fonctionnalités:
    - Track user choices (accept/reject suggestions)
    - Detect patterns personnalisés
    - Improve suggestion scoring
    - RGPD cleanup (90 jours)
    """

    def __init__(self, db: Session):
        self.db = db

    def track_choice(
        self,
        user_id: int,
        team_id: int,
        field_name: str,
        context_type: str,
        action: str,
        suggested_value: Optional[str] = None,
        final_value: Optional[str] = None,
        suggestion_source: Optional[str] = None,
        suggestion_confidence: Optional[float] = None,
        suggestion_rank: Optional[int] = None,
        entity_id: Optional[int] = None,
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> AIUserPreference:
        """
        Enregistrer un choix utilisateur

        Args:
            user_id: ID utilisateur
            team_id: ID équipe
            field_name: Nom du champ ("role", "personal_email", etc.)
            context_type: Type de contexte ("person", "organisation")
            action: Action user ("accept", "reject", "manual", "ignore")
            suggested_value: Valeur suggérée par l'IA
            final_value: Valeur finale choisie par l'user
            suggestion_source: Source de la suggestion
            suggestion_confidence: Score de confiance initial
            suggestion_rank: Position dans la liste
            entity_id: ID de l'entité (si applicable)
            extra_metadata: Metadata additionnelle

        Returns:
            AIUserPreference créée
        """
        try:
            preference = AIUserPreference(
                user_id=user_id,
                team_id=team_id,
                field_name=field_name,
                context_type=context_type,
                action=action,
                suggested_value=suggested_value,
                final_value=final_value,
                suggestion_source=suggestion_source,
                suggestion_confidence=suggestion_confidence,
                suggestion_rank=suggestion_rank,
                entity_id=entity_id,
                extra_metadata=extra_metadata,
                created_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=90),  # RGPD 90 jours
            )

            self.db.add(preference)
            self.db.commit()
            self.db.refresh(preference)

            logger.info(
                f"[AILearning] Tracked choice: user={user_id}, field={field_name}, "
                f"action={action}, value={final_value[:20] if final_value else None}"
            )

            return preference

        except Exception as e:
            self.db.rollback()
            logger.error(f"[AILearning] Error tracking choice: {e}")
            raise

    def get_user_patterns(
        self,
        user_id: int,
        field_name: str,
        limit: int = 10,
        days_back: int = 90,
    ) -> List[Dict[str, Any]]:
        """
        Détecter patterns d'un utilisateur pour un champ donné

        Analyse:
        - Valeurs les plus acceptées
        - Valeurs les plus rejetées
        - Préférences par source

        Args:
            user_id: ID utilisateur
            field_name: Nom du champ
            limit: Nombre max de patterns
            days_back: Nombre de jours à analyser

        Returns:
            Liste de patterns détectés
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)

            # Query: Valeurs les plus acceptées
            accepted_values = (
                self.db.query(
                    AIUserPreference.final_value,
                    func.count(AIUserPreference.id).label("count"),
                    func.max(AIUserPreference.created_at).label("last_used"),
                )
                .filter(
                    and_(
                        AIUserPreference.user_id == user_id,
                        AIUserPreference.field_name == field_name,
                        AIUserPreference.action == "accept",
                        AIUserPreference.final_value.isnot(None),
                        AIUserPreference.created_at >= cutoff_date,
                    )
                )
                .group_by(AIUserPreference.final_value)
                .order_by(desc("count"), desc("last_used"))
                .limit(limit)
                .all()
            )

            patterns = []
            for value, count, last_used in accepted_values:
                days_ago = (datetime.utcnow() - last_used).days if last_used else None
                patterns.append({
                    "value": value,
                    "frequency": count,
                    "last_used_days_ago": days_ago,
                    "pattern_type": "accepted",
                })

            logger.info(
                f"[AILearning] Found {len(patterns)} patterns for user={user_id}, field={field_name}"
            )

            return patterns

        except Exception as e:
            logger.error(f"[AILearning] Error getting patterns: {e}")
            return []

    def get_team_patterns(
        self,
        team_id: int,
        field_name: str,
        limit: int = 10,
        days_back: int = 90,
    ) -> List[Dict[str, Any]]:
        """
        Détecter patterns d'équipe pour un champ donné

        Utile pour suggestions génériques quand pas assez de data user.

        Args:
            team_id: ID équipe
            field_name: Nom du champ
            limit: Nombre max de patterns
            days_back: Nombre de jours à analyser

        Returns:
            Liste de patterns d'équipe
        """
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=days_back)

            team_values = (
                self.db.query(
                    AIUserPreference.final_value,
                    func.count(AIUserPreference.id).label("count"),
                    func.max(AIUserPreference.created_at).label("last_used"),
                )
                .filter(
                    and_(
                        AIUserPreference.team_id == team_id,
                        AIUserPreference.field_name == field_name,
                        AIUserPreference.action == "accept",
                        AIUserPreference.final_value.isnot(None),
                        AIUserPreference.created_at >= cutoff_date,
                    )
                )
                .group_by(AIUserPreference.final_value)
                .order_by(desc("count"), desc("last_used"))
                .limit(limit)
                .all()
            )

            patterns = []
            for value, count, last_used in team_values:
                days_ago = (datetime.utcnow() - last_used).days if last_used else None
                patterns.append({
                    "value": value,
                    "frequency": count,
                    "last_used_days_ago": days_ago,
                    "pattern_type": "team",
                })

            return patterns

        except Exception as e:
            logger.error(f"[AILearning] Error getting team patterns: {e}")
            return []

    def boost_suggestion_score(
        self,
        user_id: int,
        field_name: str,
        suggested_value: str,
        base_score: float,
    ) -> float:
        """
        Boost le score d'une suggestion basé sur l'historique user

        Applique un multiplicateur si la valeur a déjà été acceptée.

        Args:
            user_id: ID utilisateur
            field_name: Nom du champ
            suggested_value: Valeur suggérée
            base_score: Score de base (0-1)

        Returns:
            Score boosté (0-1)
        """
        try:
            # Count combien de fois cette valeur a été acceptée
            accept_count = (
                self.db.query(func.count(AIUserPreference.id))
                .filter(
                    and_(
                        AIUserPreference.user_id == user_id,
                        AIUserPreference.field_name == field_name,
                        AIUserPreference.action == "accept",
                        AIUserPreference.final_value == suggested_value,
                        AIUserPreference.created_at >= datetime.utcnow() - timedelta(days=90),
                    )
                )
                .scalar()
            )

            if accept_count > 0:
                # Boost: +10% par accept, max +50%
                boost = min(accept_count * 0.1, 0.5)
                boosted_score = min(base_score + boost, 1.0)

                logger.debug(
                    f"[AILearning] Boosted score for '{suggested_value}': "
                    f"{base_score:.2f} -> {boosted_score:.2f} (accept_count={accept_count})"
                )

                return boosted_score

            return base_score

        except Exception as e:
            logger.error(f"[AILearning] Error boosting score: {e}")
            return base_score

    def cleanup_expired_preferences(self) -> int:
        """
        RGPD: Supprimer les préférences expirées (90 jours)

        Returns:
            Nombre de préférences supprimées
        """
        try:
            deleted_count = (
                self.db.query(AIUserPreference)
                .filter(AIUserPreference.expires_at < datetime.utcnow())
                .delete()
            )

            self.db.commit()

            logger.info(f"[AILearning] RGPD cleanup: deleted {deleted_count} expired preferences")

            return deleted_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"[AILearning] Error cleaning up expired preferences: {e}")
            return 0

    def delete_user_preferences(self, user_id: int) -> int:
        """
        RGPD: Supprimer toutes les préférences d'un utilisateur (right to be forgotten)

        Args:
            user_id: ID utilisateur

        Returns:
            Nombre de préférences supprimées
        """
        try:
            deleted_count = (
                self.db.query(AIUserPreference)
                .filter(AIUserPreference.user_id == user_id)
                .delete()
            )

            self.db.commit()

            logger.info(f"[AILearning] RGPD: deleted {deleted_count} preferences for user={user_id}")

            return deleted_count

        except Exception as e:
            self.db.rollback()
            logger.error(f"[AILearning] Error deleting user preferences: {e}")
            return 0

    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """
        Statistiques d'apprentissage pour un utilisateur

        Returns:
            Stats (total choices, accept rate, top fields, etc.)
        """
        try:
            total = (
                self.db.query(func.count(AIUserPreference.id))
                .filter(AIUserPreference.user_id == user_id)
                .scalar()
            )

            accepted = (
                self.db.query(func.count(AIUserPreference.id))
                .filter(
                    and_(
                        AIUserPreference.user_id == user_id,
                        AIUserPreference.action == "accept",
                    )
                )
                .scalar()
            )

            accept_rate = (accepted / total * 100) if total > 0 else 0

            # Top fields
            top_fields = (
                self.db.query(
                    AIUserPreference.field_name,
                    func.count(AIUserPreference.id).label("count"),
                )
                .filter(AIUserPreference.user_id == user_id)
                .group_by(AIUserPreference.field_name)
                .order_by(desc("count"))
                .limit(5)
                .all()
            )

            return {
                "total_choices": total,
                "accepted_count": accepted,
                "accept_rate": round(accept_rate, 1),
                "top_fields": [{"field": f, "count": c} for f, c in top_fields],
            }

        except Exception as e:
            logger.error(f"[AILearning] Error getting user stats: {e}")
            return {
                "total_choices": 0,
                "accepted_count": 0,
                "accept_rate": 0,
                "top_fields": [],
            }
