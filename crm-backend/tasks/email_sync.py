"""
Tâches Celery pour synchronisation email automatique.

Ces tâches sont exécutées en arrière-plan par Celery Worker et planifiées
par Celery Beat selon la configuration dans celery_app.py.
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta

# Permet import relatif depuis package tasks
from .celery_app import celery_app
from database import SessionLocal
from services.email_sync_service import EmailSyncService
from models.user_email_account import UserEmailAccount
from models.interaction import Interaction

logger = logging.getLogger(__name__)


@celery_app.task(name="tasks.email_sync.sync_all_active_accounts_task", bind=True)
def sync_all_active_accounts_task(self, team_id: int = None, since_days: int = 7) -> Dict[str, Any]:
    """
    Tâche Celery pour synchroniser tous les comptes email actifs.

    Cette tâche est exécutée automatiquement toutes les 10 minutes par Celery Beat.

    Args:
        team_id: ID de l'équipe (optionnel, None = toutes les équipes)
        since_days: Nombre de jours en arrière pour la sync (défaut: 7)

    Returns:
        Dict avec statistiques globales de synchronisation
    """
    logger.info(f"🔄 Début synchronisation automatique (since_days={since_days})")

    db = SessionLocal()
    summary = {
        "task_id": self.request.id,
        "started_at": datetime.now().isoformat(),
        "team_id": team_id,
        "since_days": since_days,
        "accounts_processed": 0,
        "accounts_success": 0,
        "accounts_failed": 0,
        "total_emails_created": 0,
        "total_emails_skipped": 0,
        "total_errors": 0,
        "results": [],
    }

    try:
        # Récupérer tous les comptes actifs
        query = db.query(UserEmailAccount).filter(
            UserEmailAccount.is_active == True,
            UserEmailAccount.provider.in_(["ionos", "ovh", "generic"]),
        )

        if team_id:
            query = query.filter(UserEmailAccount.team_id == team_id)

        accounts = query.all()

        logger.info(f"📧 {len(accounts)} comptes à synchroniser")

        # Synchroniser chaque compte
        for account in accounts:
            summary["accounts_processed"] += 1

            try:
                logger.info(f"Sync compte {account.email} (ID: {account.id})")

                sync_service = EmailSyncService(db)
                stats = sync_service.sync_account(account, since_days=since_days, limit=200)

                summary["total_emails_created"] += stats["created"]
                summary["total_emails_skipped"] += stats["skipped"]
                summary["total_errors"] += stats["errors"]
                summary["accounts_success"] += 1
                summary["results"].append(stats)

                logger.info(
                    f"✅ Compte {account.email}: "
                    f"{stats['created']} créés, {stats['skipped']} ignorés"
                )

            except Exception as e:
                summary["accounts_failed"] += 1
                summary["total_errors"] += 1
                error_detail = {
                    "account_id": account.id,
                    "account_email": account.email,
                    "error": str(e),
                }
                summary["results"].append(error_detail)

                logger.error(
                    f"❌ Erreur sync compte {account.email}: {e}",
                    exc_info=True,
                )

        summary["completed_at"] = datetime.now().isoformat()

        logger.info(
            f"✅ Synchronisation terminée: "
            f"{summary['accounts_success']}/{summary['accounts_processed']} comptes OK, "
            f"{summary['total_emails_created']} emails créés"
        )

        return summary

    except Exception as e:
        logger.error(f"❌ Erreur critique dans sync_all_active_accounts_task: {e}", exc_info=True)
        summary["error"] = str(e)
        summary["completed_at"] = datetime.now().isoformat()
        raise

    finally:
        db.close()


@celery_app.task(name="tasks.email_sync.sync_account_task", bind=True)
def sync_account_task(
    self,
    account_id: int,
    since_days: int = 7,
    limit: int = None,
) -> Dict[str, Any]:
    """
    Tâche Celery pour synchroniser un seul compte email.

    Utilisée pour les synchronisations manuelles déclenchées par l'utilisateur.

    Args:
        account_id: ID du compte email à synchroniser
        since_days: Nombre de jours en arrière (défaut: 7)
        limit: Limite du nombre d'emails (optionnel)

    Returns:
        Dict avec statistiques de synchronisation
    """
    logger.info(f"🔄 Début sync manuelle compte ID={account_id}")

    db = SessionLocal()

    try:
        # Récupérer le compte
        account = db.query(UserEmailAccount).filter(
            UserEmailAccount.id == account_id
        ).first()

        if not account:
            raise ValueError(f"Compte email ID={account_id} introuvable")

        if not account.is_active:
            raise ValueError(f"Compte {account.email} est désactivé")

        # Synchroniser
        sync_service = EmailSyncService(db)
        stats = sync_service.sync_account(
            account,
            since_days=since_days,
            limit=limit,
        )

        stats["task_id"] = self.request.id
        stats["completed_at"] = datetime.now().isoformat()

        logger.info(
            f"✅ Sync manuelle terminée pour {account.email}: "
            f"{stats['created']} créés, {stats['skipped']} ignorés"
        )

        return stats

    except Exception as e:
        logger.error(f"❌ Erreur sync_account_task (ID={account_id}): {e}", exc_info=True)
        raise

    finally:
        db.close()


@celery_app.task(name="tasks.email_sync.cleanup_old_emails_task", bind=True)
def cleanup_old_emails_task(self, days_to_keep: int = 365) -> Dict[str, Any]:
    """
    Tâche Celery pour nettoyer les anciennes interactions email.

    Exécutée quotidiennement à 3h du matin par Celery Beat.
    Supprime les emails de plus de X jours (défaut: 365 jours = 1 an).

    Args:
        days_to_keep: Nombre de jours à conserver (défaut: 365)

    Returns:
        Dict avec statistiques de nettoyage
    """
    logger.info(f"🧹 Début nettoyage emails anciens (days_to_keep={days_to_keep})")

    db = SessionLocal()
    summary = {
        "task_id": self.request.id,
        "started_at": datetime.now().isoformat(),
        "days_to_keep": days_to_keep,
        "deleted_count": 0,
    }

    try:
        # Calculer la date limite
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)

        # Compter les emails à supprimer
        count_query = db.query(Interaction).filter(
            Interaction.type == "email",
            Interaction.occurred_at < cutoff_date,
        )

        count = count_query.count()

        logger.info(f"📧 {count} emails à supprimer (avant {cutoff_date.date()})")

        if count > 0:
            # Supprimer par batch de 1000 pour éviter les timeouts
            batch_size = 1000
            deleted_total = 0

            while True:
                batch = count_query.limit(batch_size).all()

                if not batch:
                    break

                for interaction in batch:
                    db.delete(interaction)

                db.commit()
                deleted_total += len(batch)

                logger.info(f"🗑️  Supprimé {deleted_total}/{count} emails...")

                if len(batch) < batch_size:
                    break

            summary["deleted_count"] = deleted_total

        summary["completed_at"] = datetime.now().isoformat()

        logger.info(f"✅ Nettoyage terminé: {summary['deleted_count']} emails supprimés")

        return summary

    except Exception as e:
        logger.error(f"❌ Erreur cleanup_old_emails_task: {e}", exc_info=True)
        summary["error"] = str(e)
        summary["completed_at"] = datetime.now().isoformat()
        raise

    finally:
        db.close()


@celery_app.task(name="tasks.email_sync.test_celery_task")
def test_celery_task(message: str = "Hello from Celery!") -> Dict[str, Any]:
    """
    Tâche de test pour vérifier que Celery fonctionne correctement.

    Utilisez:
        from tasks.email_sync import test_celery_task
        result = test_celery_task.delay("Test message")
        print(result.get())

    Args:
        message: Message à retourner

    Returns:
        Dict avec le message et un timestamp
    """
    logger.info(f"🧪 Test Celery: {message}")

    return {
        "message": message,
        "timestamp": datetime.now().isoformat(),
        "status": "success",
    }
