"""
Job background - Vérification expiration trials.

Tâches:
1. Vérifier tous les trials expirés (quotidien)
2. Envoyer emails de rappel (J-7, J-3, J-1)
3. Mettre à jour statuts (grace_period, expired)

Exécution: APScheduler (toutes les heures) ou Cron (quotidien 6h)
"""

import logging
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from core.database import SessionLocal
from models.user import User
from services.trial_service import TrialService

logger = logging.getLogger(__name__)


class TrialExpirationJob:
    """Job de vérification automatique des expirations de trials."""

    @classmethod
    def run(cls):
        """
        Exécution principale du job.

        Appelé par APScheduler ou cron quotidiennement.
        """
        logger.info("=" * 60)
        logger.info("TRIAL EXPIRATION JOB - Start")
        logger.info(f"Timestamp: {datetime.now(timezone.utc).isoformat()}")
        logger.info("=" * 60)

        db = SessionLocal()

        try:
            # 1. Vérifier les expirations
            expired_count = cls.check_all_expirations(db)

            # 2. Envoyer emails de rappel
            reminders_sent = cls.send_expiration_reminders(db)

            # 3. Stats finales
            stats = TrialService.get_trial_stats(db)

            logger.info("=" * 60)
            logger.info("TRIAL EXPIRATION JOB - Summary")
            logger.info(f"Expired/Updated: {expired_count}")
            logger.info(f"Reminders sent: {reminders_sent}")
            logger.info(f"Active trials: {stats['active_trials']}")
            logger.info(f"Grace period: {stats['grace_period']}")
            logger.info(f"Expired: {stats['expired']}")
            logger.info("=" * 60)

        except Exception as e:
            logger.error(f"Error in trial expiration job: {e}", exc_info=True)
            raise
        finally:
            db.close()

    @classmethod
    def check_all_expirations(cls, db: Session) -> int:
        """
        Vérifie tous les trials expirés et met à jour les statuts.

        Args:
            db: Session SQLAlchemy

        Returns:
            int: Nombre d'utilisateurs mis à jour
        """
        logger.info("Checking expired trials...")

        expired_users = TrialService.get_expired_trials(db)
        updated_count = 0

        for user in expired_users:
            try:
                needs_update, new_status = TrialService.check_expiration(user, db)
                if needs_update:
                    updated_count += 1
                    logger.info(
                        f"User {user.id} ({user.email}) → {new_status}"
                    )
            except Exception as e:
                logger.error(
                    f"Error checking expiration for user {user.id}: {e}",
                    exc_info=True
                )

        logger.info(f"Updated {updated_count} expired trials")
        return updated_count

    @classmethod
    def send_expiration_reminders(cls, db: Session) -> int:
        """
        Envoie les emails de rappel pour trials expirant bientôt.

        Vérifie J-7, J-3, J-1.

        Args:
            db: Session SQLAlchemy

        Returns:
            int: Nombre d'emails envoyés
        """
        logger.info("Sending expiration reminders...")

        emails_sent = 0

        # J-7
        users_7d = TrialService.get_users_expiring_soon(db, days_before=7)
        for user in users_7d:
            if cls._send_reminder_email(user, days_remaining=7):
                emails_sent += 1

        # J-3
        users_3d = TrialService.get_users_expiring_soon(db, days_before=3)
        for user in users_3d:
            if cls._send_reminder_email(user, days_remaining=3):
                emails_sent += 1

        # J-1
        users_1d = TrialService.get_users_expiring_soon(db, days_before=1)
        for user in users_1d:
            if cls._send_reminder_email(user, days_remaining=1):
                emails_sent += 1

        logger.info(f"Sent {emails_sent} reminder emails")
        return emails_sent

    @classmethod
    def _send_reminder_email(cls, user: User, days_remaining: int) -> bool:
        """
        Envoie un email de rappel à un utilisateur.

        Args:
            user: Utilisateur
            days_remaining: Jours restants avant expiration

        Returns:
            bool: True si email envoyé avec succès
        """
        try:
            # TODO: Implémenter envoi email via Resend
            # Pour l'instant, juste log

            logger.info(
                f"[EMAIL] Trial reminder to {user.email} - "
                f"{days_remaining} day(s) remaining"
            )

            # Template selon nombre de jours
            if days_remaining == 7:
                subject = "Votre essai gratuit expire dans 7 jours"
                message = f"""
Bonjour {user.display_name},

Votre essai gratuit de CRM Alforis expire dans 7 jours.

Pour continuer à utiliser toutes les fonctionnalités, abonnez-vous dès maintenant :
https://crm.alforis.fr/billing/upgrade

Besoin d'aide ? Répondez à cet email.

L'équipe Alforis Finance
"""
            elif days_remaining == 3:
                subject = "⏰ Plus que 3 jours d'essai gratuit"
                message = f"""
Bonjour {user.display_name},

Votre essai gratuit expire dans 3 jours (le {user.trial_ends_at.strftime('%d/%m/%Y')}).

Ne perdez pas l'accès à vos données ! Abonnez-vous maintenant :
https://crm.alforis.fr/billing/upgrade

Questions ? support@alforis.fr

L'équipe Alforis Finance
"""
            else:  # J-1
                subject = "🚨 Dernière chance ! Votre essai expire demain"
                message = f"""
Bonjour {user.display_name},

Votre essai gratuit expire DEMAIN ({user.trial_ends_at.strftime('%d/%m/%Y')}).

Après expiration, votre compte passera en lecture seule pendant 3 jours.

Abonnez-vous maintenant pour éviter toute interruption :
https://crm.alforis.fr/billing/upgrade

Besoin de plus de temps ? Contactez-nous : support@alforis.fr

L'équipe Alforis Finance
"""

            # TODO: Appeler service email (Resend)
            # send_email(to=user.email, subject=subject, body=message)

            return True

        except Exception as e:
            logger.error(
                f"Error sending reminder email to {user.email}: {e}",
                exc_info=True
            )
            return False


# ============================================================
# Configuration APScheduler (optionnel)
# ============================================================

def setup_trial_job_scheduler():
    """
    Configure APScheduler pour exécuter le job quotidiennement.

    À appeler au démarrage de l'application (main.py).
    """
    from apscheduler.schedulers.background import BackgroundScheduler
    from apscheduler.triggers.cron import CronTrigger

    scheduler = BackgroundScheduler()

    # Job quotidien à 6h du matin (heure serveur)
    scheduler.add_job(
        func=TrialExpirationJob.run,
        trigger=CronTrigger(hour=6, minute=0),
        id="trial_expiration_daily",
        name="Trial Expiration Check - Daily",
        replace_existing=True
    )

    scheduler.start()
    logger.info("Trial expiration job scheduler started (daily at 6:00 AM)")

    return scheduler
