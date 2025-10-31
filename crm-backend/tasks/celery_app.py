"""
Configuration Celery pour le CRM Alforis

Celery est utilisé pour:
- Exécution asynchrone des workflows
- Tâches planifiées (Celery Beat)
- Envoi d'emails en masse
- Synchronisations externes
"""

import os
import sys
from pathlib import Path
import sys
from pathlib import Path

try:
    from celery import Celery
    from celery.schedules import crontab
except ImportError:  # Fallback lightweight stub for tests

    class _DummyAsyncResult:
        def __init__(self, result=None):
            self.result = result
            self.id = "dummy-task"

    class Celery:  # type: ignore
        def __init__(self, *args, **kwargs):
            self.conf = type("Conf", (), {"update": lambda self, **kw: None})()

        def task(self, *args, **kwargs):
            def decorator(fn):
                def delay(*a, **kw):
                    return _DummyAsyncResult(fn(*a, **kw))

                fn.delay = delay  # type: ignore[attr-defined]
                fn.apply_async = delay  # type: ignore[attr-defined]
                return fn

            return decorator

        def autodiscover_tasks(self, *args, **kwargs):  # pragma: no cover - noop
            pass

        def start(self):  # pragma: no cover - noop
            pass

    def crontab(*args, **kwargs):  # type: ignore
        return None


# S'assurer que le dossier parent est dans le PYTHONPATH pour import `tasks`
TASKS_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = TASKS_DIR.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.append(str(PROJECT_ROOT))

# Configuration Redis (broker + backend)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Créer l'application Celery
# S'assurer que le dossier backend est dans le PYTHONPATH quand tasks est importé
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

celery_app = Celery(
    "crm_alforis",
    broker=CELERY_BROKER_URL,
    backend=CELERY_RESULT_BACKEND,
    include=[
        "tasks.workflow_tasks",
        "tasks.email_tasks",
        "tasks.reminder_tasks",
        "tasks.rgpd_tasks",
    ],
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
            "kwargs": {"frequency": "daily"},
        },
        # Vérification workflows hebdomadaires (lundi à 9h)
        "run-weekly-workflows": {
            "task": "tasks.workflow_tasks.run_scheduled_workflows",
            "schedule": crontab(hour=9, minute=0, day_of_week=1),
            "kwargs": {"frequency": "weekly"},
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
        # Campagnes email (toutes les minutes)
        "dispatch-email-campaigns": {
            "task": "tasks.email_tasks.process_pending_sends",
            "schedule": 60.0,
        },
        # RGPD: Anonymisation auto des comptes inactifs (tous les lundis à 1h)
        "anonymize-inactive-users": {
            "task": "tasks.rgpd_tasks.anonymize_inactive_users",
            "schedule": crontab(hour=1, minute=0, day_of_week=1),
            "kwargs": {"inactive_days": 730},  # 2 years
        },
        # RGPD: Nettoyage des logs d'accès anciens (1er de chaque mois à 2h)
        "cleanup-access-logs": {
            "task": "tasks.rgpd_tasks.cleanup_old_access_logs",
            "schedule": crontab(hour=2, minute=0, day_of_month=1),
            "kwargs": {"retention_days": 1095},  # 3 years
        },
        # RGPD: Rapport de conformité mensuel (1er de chaque mois à 3h)
        "generate-compliance-report": {
            "task": "tasks.rgpd_tasks.generate_compliance_report",
            "schedule": crontab(hour=3, minute=0, day_of_month=1),
        },
        # RGPD: Cleanup AI user preferences expirées (tous les dimanches à 4h)
        "cleanup-ai-preferences": {
            "task": "tasks.email_tasks.cleanup_ai_preferences_task",
            "schedule": crontab(hour=4, minute=0, day_of_week=0),
        },
    },
)

# Autodiscover tasks
celery_app.autodiscover_tasks(["tasks"])

if __name__ == "__main__":
    celery_app.start()
