"""
Service de gestion des Trials (essais gratuits) - CRM Alforis.

Flow complet:
1. Inscription → Trial 14 jours démarre auto
2. J-7, J-3, J-1 → Emails rappel
3. J-Expiration → Mode lecture seule (grace_period 3 jours)
4. J+3 → Compte désactivé
5. Conversion → Ajout paiement = déblocage

Statuts possibles:
- trial: En période d'essai (14 jours)
- active: Abonnement payant actif
- grace_period: Trial expiré, compte en lecture seule (3 jours)
- expired: Trial expiré + grace period terminée, compte désactivé
- cancelled: Abonnement annulé par le client
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from models.user import User

logger = logging.getLogger(__name__)


class TrialService:
    """Service de gestion des trials SaaS."""

    # Configuration
    TRIAL_DURATION_DAYS = 14  # Durée trial par défaut
    GRACE_PERIOD_DAYS = 3  # Période de grâce après expiration
    REMINDER_DAYS = [7, 3, 1]  # Jours avant expiration pour envoyer rappels

    @classmethod
    def start_trial(cls, user: User, db: Session, duration_days: int = None) -> User:
        """
        Démarre un trial pour un nouvel utilisateur.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy
            duration_days: Durée custom (optionnel, défaut 14 jours)

        Returns:
            User: Utilisateur avec trial démarré
        """
        now = datetime.now(timezone.utc)
        duration = duration_days or cls.TRIAL_DURATION_DAYS

        user.trial_started_at = now
        user.trial_ends_at = now + timedelta(days=duration)
        user.subscription_status = "trial"

        db.commit()
        db.refresh(user)

        logger.info(
            f"Trial started for user {user.id} ({user.email}). "
            f"Expires: {user.trial_ends_at}"
        )

        return user

    @classmethod
    def extend_trial(
        cls,
        user: User,
        db: Session,
        extra_days: int,
        reason: str = "Support extension"
    ) -> User:
        """
        Prolonge un trial (sur demande support).

        Args:
            user: Utilisateur
            db: Session SQLAlchemy
            extra_days: Nombre de jours supplémentaires
            reason: Raison de la prolongation (logs)

        Returns:
            User: Utilisateur avec trial prolongé
        """
        if not user.trial_ends_at:
            raise ValueError("User has no active trial")

        old_end = user.trial_ends_at
        user.trial_ends_at = user.trial_ends_at + timedelta(days=extra_days)
        user.trial_extended_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(user)

        logger.info(
            f"Trial extended for user {user.id} ({user.email}). "
            f"Old end: {old_end}, New end: {user.trial_ends_at}. Reason: {reason}"
        )

        return user

    @classmethod
    def convert_to_paid(cls, user: User, db: Session) -> User:
        """
        Convertit un trial en abonnement payant.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy

        Returns:
            User: Utilisateur avec statut active
        """
        user.subscription_status = "active"
        user.trial_converted_at = datetime.now(timezone.utc)

        # Réactiver compte si désactivé
        if not user.is_active:
            user.is_active = True

        db.commit()
        db.refresh(user)

        logger.info(f"Trial converted to paid for user {user.id} ({user.email})")

        return user

    @classmethod
    def check_expiration(cls, user: User, db: Session) -> Tuple[bool, str]:
        """
        Vérifie si le trial d'un utilisateur a expiré et met à jour le statut.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy

        Returns:
            Tuple[bool, str]: (needs_action, new_status)
                - needs_action: True si statut a changé
                - new_status: Nouveau statut appliqué
        """
        if user.subscription_status != "trial":
            return False, user.subscription_status

        if not user.trial_ends_at:
            return False, user.subscription_status

        now = datetime.now(timezone.utc)

        # Trial encore actif
        if now < user.trial_ends_at:
            return False, "trial"

        # Trial expiré → Grace period
        grace_end = user.trial_ends_at + timedelta(days=cls.GRACE_PERIOD_DAYS)

        if now < grace_end:
            user.subscription_status = "grace_period"
            db.commit()
            logger.info(
                f"User {user.id} ({user.email}) moved to grace_period. "
                f"Grace ends: {grace_end}"
            )
            return True, "grace_period"

        # Grace period terminée → Expired
        user.subscription_status = "expired"
        user.is_active = False
        db.commit()
        logger.info(f"User {user.id} ({user.email}) trial expired and deactivated")
        return True, "expired"

    @classmethod
    def get_users_expiring_soon(
        cls, db: Session, days_before: int = 7
    ) -> List[User]:
        """
        Récupère les utilisateurs dont le trial expire dans X jours.

        Args:
            db: Session SQLAlchemy
            days_before: Nombre de jours avant expiration

        Returns:
            List[User]: Utilisateurs avec trial expirant bientôt
        """
        now = datetime.now(timezone.utc)
        target_date = now + timedelta(days=days_before)

        # Plage de 1 jour autour de la date cible
        date_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        date_end = date_start + timedelta(days=1)

        users = db.query(User).filter(
            and_(
                User.subscription_status == "trial",
                User.trial_ends_at >= date_start,
                User.trial_ends_at < date_end,
                User.is_active == True
            )
        ).all()

        logger.info(
            f"Found {len(users)} users with trial expiring in {days_before} days"
        )

        return users

    @classmethod
    def get_expired_trials(cls, db: Session) -> List[User]:
        """
        Récupère tous les utilisateurs avec trial expiré (statut trial ou grace_period).

        Args:
            db: Session SQLAlchemy

        Returns:
            List[User]: Utilisateurs avec trial expiré
        """
        now = datetime.now(timezone.utc)

        users = db.query(User).filter(
            and_(
                or_(
                    User.subscription_status == "trial",
                    User.subscription_status == "grace_period"
                ),
                User.trial_ends_at < now
            )
        ).all()

        logger.info(f"Found {len(users)} users with expired trial")

        return users

    @classmethod
    def cancel_subscription(cls, user: User, db: Session, reason: str = None) -> User:
        """
        Annule l'abonnement d'un utilisateur.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy
            reason: Raison de l'annulation (optionnel)

        Returns:
            User: Utilisateur avec statut cancelled
        """
        user.subscription_status = "cancelled"
        user.is_active = False

        db.commit()
        db.refresh(user)

        logger.info(
            f"Subscription cancelled for user {user.id} ({user.email}). "
            f"Reason: {reason or 'Not specified'}"
        )

        return user

    @classmethod
    def reactivate_subscription(cls, user: User, db: Session) -> User:
        """
        Réactive un abonnement annulé.

        Args:
            user: Utilisateur
            db: Session SQLAlchemy

        Returns:
            User: Utilisateur avec statut active
        """
        if user.subscription_status == "cancelled":
            user.subscription_status = "active"
            user.is_active = True

            db.commit()
            db.refresh(user)

            logger.info(f"Subscription reactivated for user {user.id} ({user.email})")

        return user

    @classmethod
    def get_trial_stats(cls, db: Session) -> dict:
        """
        Récupère des statistiques sur les trials.

        Args:
            db: Session SQLAlchemy

        Returns:
            dict: Statistiques trials
        """
        now = datetime.now(timezone.utc)

        stats = {
            "active_trials": db.query(User).filter(
                User.subscription_status == "trial"
            ).count(),
            "grace_period": db.query(User).filter(
                User.subscription_status == "grace_period"
            ).count(),
            "expired": db.query(User).filter(
                User.subscription_status == "expired"
            ).count(),
            "active_subscriptions": db.query(User).filter(
                User.subscription_status == "active"
            ).count(),
            "cancelled": db.query(User).filter(
                User.subscription_status == "cancelled"
            ).count(),
        }

        # Conversions (trial → active)
        stats["total_conversions"] = db.query(User).filter(
            User.trial_converted_at.isnot(None)
        ).count()

        # Taux de conversion (%)
        total_trials = db.query(User).filter(
            User.trial_started_at.isnot(None)
        ).count()

        stats["conversion_rate"] = (
            (stats["total_conversions"] / total_trials * 100)
            if total_trials > 0
            else 0.0
        )

        # Trials expirant dans les 7 prochains jours
        week_from_now = now + timedelta(days=7)
        stats["expiring_soon_7d"] = db.query(User).filter(
            and_(
                User.subscription_status == "trial",
                User.trial_ends_at <= week_from_now,
                User.trial_ends_at > now
            )
        ).count()

        logger.info(f"Trial stats: {stats}")

        return stats
