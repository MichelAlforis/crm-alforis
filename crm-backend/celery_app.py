"""
Configuration Celery pour synchronisation email automatique.

Celery permet d'exécuter des tâches en arrière-plan de manière distribuée.
Utilisé pour synchroniser les comptes email IMAP toutes les X minutes.
"""

import os
import sys
from pathlib import Path

from celery import Celery
from celery.schedules import crontab

# S'assurer que le dossier backend est dans le PYTHONPATH pour l'autodiscovery
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))
PARENT_ROOT = PROJECT_ROOT.parent
if str(PARENT_ROOT) not in sys.path:
    sys.path.append(str(PARENT_ROOT))

# Récupérer l'URL Redis depuis l'environnement
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Créer l'application Celery
app = Celery(
    "crm_email_sync",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

# Configuration Celery
app.conf.update(
    # Timezone
    timezone="Europe/Paris",
    enable_utc=True,

    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes max par task
    task_soft_time_limit=25 * 60,  # Warning après 25 minutes

    # Worker settings
    worker_prefetch_multiplier=1,  # Une task à la fois par worker
    worker_max_tasks_per_child=100,  # Redémarrer worker après 100 tasks

    # Result backend
    result_expires=3600,  # Résultats expirent après 1h

    # Retry settings
    task_acks_late=True,  # Acknowledge après exécution (pas avant)
    task_reject_on_worker_lost=True,  # Rejeter si worker crash
)

# Autodiscover tasks dans le module 'tasks'
app.autodiscover_tasks(['tasks'])

# Configuration des tâches périodiques (Celery Beat)
app.conf.beat_schedule = {
    # Synchroniser tous les comptes actifs toutes les 10 minutes
    'sync-all-email-accounts': {
        'task': 'tasks.email_sync.sync_all_active_accounts_task',
        'schedule': crontab(minute='*/10'),  # Toutes les 10 minutes
        'options': {
            'expires': 600,  # Expire après 10 minutes si pas exécutée
        }
    },

    # Nettoyer les anciennes interactions email (optionnel)
    'cleanup-old-emails': {
        'task': 'tasks.email_sync.cleanup_old_emails_task',
        'schedule': crontab(hour=3, minute=0),  # Tous les jours à 3h du matin
        'options': {
            'expires': 3600,
        }
    },
}

if __name__ == '__main__':
    app.start()
