"""
Configuration Celery pour le CRM Alforis

Celery est utilisé pour:
- Exécution asynchrone des workflows
- Tâches planifiées (Celery Beat)
- Envoi d'emails en masse
- Synchronisations externes
"""

from celery import Celery
from celery.schedules import crontab
import os

# Configuration Redis (broker + backend)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Créer l'application Celery
celery_app = Celery(
    "crm_alforis",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "tasks.workflow_tasks",
        "tasks.email_tasks",
        "tasks.reminder_tasks",
    ]
)

# Configuration
celery_app.conf.update(
    # Timezone
    timezone="Europe/Paris",
    enable_utc=True,

    # Sérialisation
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Résultats
    result_expires=3600,  # 1 heure
    result_extended=True,

    # Performance
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,

    # Retry policy par défaut
    task_acks_late=True,
    task_reject_on_worker_lost=True,

    # Beat schedule (tâches planifiées)
    beat_schedule={
        # Vérification workflows d'inactivité (quotidien à 2h du matin)
        "check-inactivity-workflows": {
            "task": "tasks.workflow_tasks.check_inactivity_workflows",
            "schedule": crontab(hour=2, minute=0),
        },

        # Vérification workflows planifiés quotidiens (tous les jours à 9h)
        "run-daily-workflows": {
            "task": "tasks.workflow_tasks.run_scheduled_workflows",
            "schedule": crontab(hour=9, minute=0),
            "kwargs": {"frequency": "daily"}
        },

        # Vérification workflows hebdomadaires (lundi à 9h)
        "run-weekly-workflows": {
            "task": "tasks.workflow_tasks.run_scheduled_workflows",
            "schedule": crontab(hour=9, minute=0, day_of_week=1),
            "kwargs": {"frequency": "weekly"}
        },

        # Rappels de tâches (tous les jours à 8h)
        "send-task-reminders": {
            "task": "tasks.reminder_tasks.send_task_reminders",
            "schedule": crontab(hour=8, minute=0),
        },

        # Nettoyage anciennes exécutions (tous les dimanches à 3h)
        "cleanup-old-executions": {
            "task": "tasks.workflow_tasks.cleanup_old_executions",
            "schedule": crontab(hour=3, minute=0, day_of_week=0),
        },
    },
)

# Autodiscover tasks
celery_app.autodiscover_tasks(["tasks"])

if __name__ == "__main__":
    celery_app.start()
