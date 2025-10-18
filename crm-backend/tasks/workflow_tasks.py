"""
Tâches Celery pour l'exécution de workflows

Ces tâches sont exécutées de manière asynchrone par Celery workers
"""
import logging

try:
    from celery import Task
    from celery.utils.log import get_task_logger
except ImportError:  # pragma: no cover
    class Task:  # Minimal stub
        def __init__(self, *args, **kwargs):
            pass

        def retry(self, exc=None, countdown=0):
            raise exc or RuntimeError("Task retry")

        def after_return(self, *args, **kwargs):
            pass

    def get_task_logger(name):
        return logging.getLogger(name)
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from tasks.celery_app import celery_app
from core.database import get_db
from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowStatus,
    WorkflowTriggerType,
    WorkflowExecutionStatus
)
from services.workflow_engine import WorkflowEngine

logger = get_task_logger(__name__)


class DatabaseTask(Task):
    """
    Classe de base pour les tâches utilisant la base de données
    Gère automatiquement la session DB
    """
    _db: Session = None

    @property
    def db(self) -> Session:
        if self._db is None:
            self._db = next(get_db())
        return self._db

    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.execute_workflow_async",
    max_retries=3,
    default_retry_delay=60
)
def execute_workflow_async(
    self,
    workflow_id: int,
    trigger_entity_type: str,
    trigger_entity_id: int,
    trigger_data: Optional[Dict[str, Any]] = None
):
    """
    Exécute un workflow de manière asynchrone

    Args:
        workflow_id: ID du workflow à exécuter
        trigger_entity_type: Type d'entité (organisation, deal, etc.)
        trigger_entity_id: ID de l'entité
        trigger_data: Données additionnelles du trigger

    Cette tâche est appelée par les hooks d'événements (organisation créée, deal modifié, etc.)
    """
    try:
        logger.info(f"Exécution workflow #{workflow_id} pour {trigger_entity_type}#{trigger_entity_id}")

        # Charger le workflow
        workflow = self.db.query(Workflow).filter(Workflow.id == workflow_id).first()
        if not workflow:
            logger.error(f"Workflow #{workflow_id} introuvable")
            return {"error": "Workflow not found"}

        if workflow.status != WorkflowStatus.ACTIVE:
            logger.warning(f"Workflow #{workflow_id} non actif (status: {workflow.status})")
            return {"error": "Workflow not active"}

        # Exécuter le workflow
        engine = WorkflowEngine(self.db)
        execution = engine.execute_workflow(
            workflow=workflow,
            trigger_entity_type=trigger_entity_type,
            trigger_entity_id=trigger_entity_id,
            trigger_data=trigger_data
        )

        logger.info(f"Workflow #{workflow_id} exécuté: {execution.status}")

        return {
            "workflow_id": workflow_id,
            "execution_id": execution.id,
            "status": execution.status.value,
            "duration_seconds": execution.duration_seconds
        }

    except Exception as exc:
        logger.error(f"Erreur exécution workflow #{workflow_id}: {str(exc)}")
        # Retry avec backoff exponentiel
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.trigger_workflows_for_event"
)
def trigger_workflows_for_event(
    self,
    event_type: str,
    entity_type: str,
    entity_id: int,
    event_data: Optional[Dict[str, Any]] = None
):
    """
    Déclenche tous les workflows correspondant à un événement

    Args:
        event_type: Type d'événement (organisation_created, deal_updated, etc.)
        entity_type: Type d'entité concernée
        entity_id: ID de l'entité
        event_data: Données de l'événement

    Exemples:
        trigger_workflows_for_event("organisation_created", "organisation", 123)
        trigger_workflows_for_event("deal_stage_changed", "organisation", 456, {"from": "PROSPECT", "to": "QUALIFICATION"})
    """
    try:
        logger.info(f"Recherche workflows pour événement: {event_type}")

        # Mapper event_type vers WorkflowTriggerType
        trigger_type_map = {
            "organisation_created": WorkflowTriggerType.ORGANISATION_CREATED,
            "organisation_updated": WorkflowTriggerType.ORGANISATION_UPDATED,
            "deal_created": WorkflowTriggerType.DEAL_CREATED,
            "deal_updated": WorkflowTriggerType.DEAL_UPDATED,
            "deal_stage_changed": WorkflowTriggerType.DEAL_STAGE_CHANGED,
        }

        trigger_type = trigger_type_map.get(event_type)
        if not trigger_type:
            logger.warning(f"Type d'événement inconnu: {event_type}")
            return {"error": "Unknown event type"}

        # Trouver les workflows actifs pour ce trigger
        engine = WorkflowEngine(self.db)
        workflows = engine.find_workflows_by_trigger(trigger_type)

        logger.info(f"Trouvé {len(workflows)} workflow(s) pour {event_type}")

        # Déclencher chaque workflow de manière asynchrone
        results = []
        for workflow in workflows:
            # Vérifier la config du trigger (ex: stage_changed de X vers Y)
            if workflow.trigger_config:
                # TODO: Vérifier les conditions du trigger
                pass

            # Lancer l'exécution async
            task = execute_workflow_async.delay(
                workflow_id=workflow.id,
                trigger_entity_type=entity_type,
                trigger_entity_id=entity_id,
                trigger_data=event_data
            )

            results.append({
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "task_id": task.id
            })

        return {
            "event_type": event_type,
            "workflows_triggered": len(results),
            "results": results
        }

    except Exception as exc:
        logger.error(f"Erreur déclenchement workflows pour {event_type}: {str(exc)}")
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.check_inactivity_workflows"
)
def check_inactivity_workflows(self):
    """
    Vérifie et exécute les workflows d'inactivité

    Exécutée quotidiennement par Celery Beat (2h du matin)
    Détecte les organisations/deals inactifs et déclenche les workflows correspondants
    """
    try:
        logger.info("Vérification workflows d'inactivité")

        # Trouver les workflows d'inactivité actifs
        engine = WorkflowEngine(self.db)
        workflows = engine.find_workflows_by_trigger(WorkflowTriggerType.INACTIVITY_DELAY)

        logger.info(f"Trouvé {len(workflows)} workflow(s) d'inactivité")

        total_triggered = 0

        for workflow in workflows:
            # Récupérer la config du trigger
            trigger_config = workflow.trigger_config or {}
            inactivity_days = trigger_config.get("inactivity_days", 30)
            entity_type = trigger_config.get("entity_type", "organisation")

            # Chercher les entités inactives
            if entity_type == "organisation":
                # Trouver organisations sans activité depuis X jours
                from models.organisation import Organisation
                from models.organisation_activity import OrganisationActivity

                cutoff_date = datetime.utcnow() - timedelta(days=inactivity_days)

                # Sous-requête pour trouver la dernière activité par organisation
                from sqlalchemy import func, and_
                from sqlalchemy.orm import aliased

                last_activity = (
                    self.db.query(
                        OrganisationActivity.organisation_id,
                        func.max(OrganisationActivity.created_at).label("last_activity_date")
                    )
                    .group_by(OrganisationActivity.organisation_id)
                    .subquery()
                )

                # Organisations avec dernière activité > inactivity_days
                inactive_orgs = (
                    self.db.query(Organisation)
                    .outerjoin(last_activity, Organisation.id == last_activity.c.organisation_id)
                    .filter(
                        and_(
                            last_activity.c.last_activity_date < cutoff_date,
                            Organisation.pipeline_stage.in_(trigger_config.get("pipeline_stages", ["PROPOSITION", "QUALIFICATION"]))
                        )
                    )
                    .all()
                )

                logger.info(f"Trouvé {len(inactive_orgs)} organisations inactives depuis {inactivity_days} jours")

                # Déclencher le workflow pour chaque organisation inactive
                for org in inactive_orgs:
                    execute_workflow_async.delay(
                        workflow_id=workflow.id,
                        trigger_entity_type="organisation",
                        trigger_entity_id=org.id,
                        trigger_data={"inactivity_days": inactivity_days}
                    )
                    total_triggered += 1

        logger.info(f"Workflows d'inactivité déclenchés: {total_triggered}")

        return {
            "workflows_checked": len(workflows),
            "total_triggered": total_triggered
        }

    except Exception as exc:
        logger.error(f"Erreur vérification workflows d'inactivité: {str(exc)}")
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.run_scheduled_workflows"
)
def run_scheduled_workflows(self, frequency: str = "daily"):
    """
    Exécute les workflows planifiés

    Args:
        frequency: Fréquence (daily, weekly, monthly)

    Exécutée par Celery Beat selon la fréquence configurée
    """
    try:
        logger.info(f"Exécution workflows planifiés ({frequency})")

        # Trouver les workflows planifiés
        engine = WorkflowEngine(self.db)
        workflows = engine.find_workflows_by_trigger(WorkflowTriggerType.SCHEDULED)

        # Filtrer par fréquence
        matching_workflows = [
            w for w in workflows
            if w.trigger_config and w.trigger_config.get("schedule") == frequency
        ]

        logger.info(f"Trouvé {len(matching_workflows)} workflow(s) planifié(s) {frequency}")

        results = []
        for workflow in matching_workflows:
            # Les workflows planifiés s'exécutent sans entité trigger spécifique
            task = execute_workflow_async.delay(
                workflow_id=workflow.id,
                trigger_entity_type="system",
                trigger_entity_id=0,
                trigger_data={"scheduled": True, "frequency": frequency}
            )

            results.append({
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "task_id": task.id
            })

        return {
            "frequency": frequency,
            "workflows_executed": len(results),
            "results": results
        }

    except Exception as exc:
        logger.error(f"Erreur exécution workflows planifiés ({frequency}): {str(exc)}")
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.cleanup_old_executions"
)
def cleanup_old_executions(self, days_to_keep: int = 90):
    """
    Nettoie les anciennes exécutions de workflows

    Args:
        days_to_keep: Nombre de jours à conserver (défaut: 90)

    Exécutée hebdomadairement par Celery Beat (dimanche 3h)
    """
    try:
        logger.info(f"Nettoyage exécutions > {days_to_keep} jours")

        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)

        # Compter les exécutions à supprimer
        count = (
            self.db.query(WorkflowExecution)
            .filter(WorkflowExecution.created_at < cutoff_date)
            .count()
        )

        # Supprimer les anciennes exécutions
        self.db.query(WorkflowExecution).filter(
            WorkflowExecution.created_at < cutoff_date
        ).delete()

        self.db.commit()

        logger.info(f"Nettoyage terminé: {count} exécutions supprimées")

        return {
            "cutoff_date": cutoff_date.isoformat(),
            "deleted_count": count
        }

    except Exception as exc:
        logger.error(f"Erreur nettoyage exécutions: {str(exc)}")
        self.db.rollback()
        raise


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    name="tasks.workflow_tasks.get_workflow_stats"
)
def get_workflow_stats(self, workflow_id: int):
    """
    Récupère les statistiques d'un workflow

    Args:
        workflow_id: ID du workflow

    Returns:
        Statistiques détaillées
    """
    try:
        engine = WorkflowEngine(self.db)
        stats = engine.get_workflow_stats(workflow_id)
        return stats

    except Exception as exc:
        logger.error(f"Erreur récupération stats workflow #{workflow_id}: {str(exc)}")
        raise
