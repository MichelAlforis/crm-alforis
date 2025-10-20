"""
Moteur d'exécution de workflows

Ce module contient la logique métier pour:
- Évaluer les conditions de workflows
- Exécuter les actions (email, tâche, notification, etc.)
- Logger les exécutions
- Gérer les erreurs et retries
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta, UTC
from sqlalchemy.orm import Session
from sqlalchemy import and_
import re
import json

from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowStatus,
    WorkflowExecutionStatus,
    WorkflowTriggerType,
    WorkflowActionType,
)
from models.organisation import Organisation
from models.task import Task, TaskStatus, TaskPriority
from models.notification import Notification, NotificationType
from core.notifications import NotificationManager


class WorkflowEngine:
    """
    Moteur d'exécution de workflows

    Responsabilités:
    1. Vérifier les conditions d'un workflow
    2. Exécuter les actions séquentiellement
    3. Logger chaque étape
    4. Gérer les erreurs (retry, rollback si nécessaire)
    """

    def __init__(self, db: Session):
        self.db = db
        self.notification_manager = NotificationManager(db)

    def execute_workflow(
        self,
        workflow: Workflow,
        trigger_entity_type: str,
        trigger_entity_id: int,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> WorkflowExecution:
        """
        Exécute un workflow complet

        Args:
            workflow: Le workflow à exécuter
            trigger_entity_type: Type d'entité (organisation, deal, etc.)
            trigger_entity_id: ID de l'entité
            trigger_data: Données additionnelles du trigger

        Returns:
            WorkflowExecution: L'exécution créée
        """
        # Créer l'exécution
        execution = WorkflowExecution(
            workflow_id=workflow.id,
            trigger_entity_type=trigger_entity_type,
            trigger_entity_id=trigger_entity_id,
            status=WorkflowExecutionStatus.RUNNING,
            started_at=datetime.now(UTC),
            execution_logs=[],
            actions_executed=[]
        )
        self.db.add(execution)
        self.db.commit()

        try:
            # 1. Récupérer le contexte (entité trigger)
            context = self._build_context(trigger_entity_type, trigger_entity_id, trigger_data)
            self._log(execution, "info", f"Contexte construit: {trigger_entity_type}#{trigger_entity_id}")

            # 2. Vérifier les conditions
            if workflow.conditions:
                conditions_met = self._evaluate_conditions(workflow.conditions, context)
                self._log(execution, "info", f"Conditions évaluées: {conditions_met}")

                if not conditions_met:
                    execution.status = WorkflowExecutionStatus.SKIPPED
                    execution.completed_at = datetime.now(UTC)
                    self._log(execution, "info", "Workflow ignoré (conditions non remplies)")
                    self.db.commit()
                    return execution

            # 3. Exécuter les actions
            actions_results = []
            for idx, action in enumerate(workflow.actions):
                try:
                    result = self._execute_action(action, context)
                    actions_results.append({
                        "index": idx,
                        "type": action.get("type"),
                        "status": "success",
                        "result": result
                    })
                    self._log(execution, "info", f"Action {idx} exécutée: {action.get('type')}")
                except Exception as action_error:
                    actions_results.append({
                        "index": idx,
                        "type": action.get("type"),
                        "status": "failed",
                        "error": str(action_error)
                    })
                    self._log(execution, "error", f"Échec action {idx}: {str(action_error)}")
                    # Continue avec les autres actions (ne pas tout arrêter)

            execution.actions_executed = actions_results
            execution.status = WorkflowExecutionStatus.SUCCESS
            execution.completed_at = datetime.now(UTC)

            # Mettre à jour les stats du workflow
            workflow.execution_count = workflow.execution_count + 1
            workflow.last_executed_at = datetime.now(UTC)

            self.db.commit()
            return execution

        except Exception as e:
            execution.status = WorkflowExecutionStatus.FAILED
            execution.completed_at = datetime.now(UTC)
            execution.error_message = str(e)
            self._log(execution, "error", f"Échec workflow: {str(e)}")
            self.db.commit()
            raise

    def _build_context(
        self,
        entity_type: str,
        entity_id: int,
        trigger_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Construit le contexte d'exécution avec les données de l'entité

        Args:
            entity_type: Type d'entité (organisation, deal, etc.)
            entity_id: ID de l'entité
            trigger_data: Données additionnelles

        Returns:
            Dict contenant toutes les données nécessaires pour l'exécution
        """
        context = {
            "trigger_entity_type": entity_type,
            "trigger_entity_id": entity_id,
            "trigger_data": trigger_data or {},
            "timestamp": datetime.now(UTC).isoformat()
        }

        # Charger l'entité en fonction du type
        if entity_type == "organisation":
            org = self.db.query(Organisation).filter(Organisation.id == entity_id).first()
            if org:
                context["organisation"] = {
                    "id": org.id,
                    "nom": org.nom,
                    "email": org.email,
                    "type": org.type,
                    "pipeline_stage": org.pipeline_stage,
                    "montant_potentiel": org.montant_potentiel,
                    # Ajouter d'autres champs utiles
                }

        # TODO: Ajouter support pour d'autres types (deal, contact, etc.)

        return context

    def _evaluate_conditions(self, conditions: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """
        Évalue les conditions d'un workflow

        Format conditions:
        {
            "operator": "AND" | "OR",
            "rules": [
                {"field": "organisation.pipeline_stage", "operator": "==", "value": "PROPOSITION"},
                {"field": "organisation.montant_potentiel", "operator": ">", "value": 50000}
            ]
        }

        Args:
            conditions: Configuration des conditions
            context: Contexte d'exécution

        Returns:
            bool: True si conditions remplies, False sinon
        """
        if not conditions:
            return True

        operator = conditions.get("operator", "AND")
        rules = conditions.get("rules", [])

        results = []
        for rule in rules:
            field = rule.get("field")
            rule_operator = rule.get("operator")
            expected_value = rule.get("value")

            # Extraire la valeur du contexte (support dot notation: organisation.nom)
            actual_value = self._get_nested_value(context, field)

            # Évaluer la règle
            result = self._compare_values(actual_value, rule_operator, expected_value)
            results.append(result)

        # Combiner les résultats avec AND/OR
        if operator == "AND":
            return all(results)
        elif operator == "OR":
            return any(results)
        else:
            return False

    def _get_nested_value(self, data: Dict[str, Any], path: str) -> Any:
        """
        Extrait une valeur d'un dict avec notation pointée

        Exemple:
            _get_nested_value({"organisation": {"nom": "ACME"}}, "organisation.nom")
            => "ACME"
        """
        keys = path.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value

    def _compare_values(self, actual: Any, operator: str, expected: Any) -> bool:
        """Compare deux valeurs selon un opérateur"""
        try:
            if operator == "==":
                return actual == expected
            elif operator == "!=":
                return actual != expected
            elif operator == ">":
                return actual > expected
            elif operator == ">=":
                return actual >= expected
            elif operator == "<":
                return actual < expected
            elif operator == "<=":
                return actual <= expected
            elif operator == "contains":
                return expected in str(actual)
            elif operator == "not_contains":
                return expected not in str(actual)
            elif operator == "in":
                return actual in expected
            elif operator == "not_in":
                return actual not in expected
            else:
                return False
        except Exception:
            return False

    def _execute_action(self, action: Dict[str, Any], context: Dict[str, Any]) -> Any:
        """
        Exécute une action de workflow

        Args:
            action: Configuration de l'action
            context: Contexte d'exécution

        Returns:
            Résultat de l'action
        """
        action_type = action.get("type")
        config = action.get("config", {})

        # Remplacer les variables dans la config
        config = self._replace_variables(config, context)

        # Dispatcher vers la bonne méthode
        if action_type == WorkflowActionType.SEND_EMAIL:
            return self._action_send_email(config, context)
        elif action_type == WorkflowActionType.CREATE_TASK:
            return self._action_create_task(config, context)
        elif action_type == WorkflowActionType.SEND_NOTIFICATION:
            return self._action_send_notification(config, context)
        elif action_type == WorkflowActionType.UPDATE_FIELD:
            return self._action_update_field(config, context)
        elif action_type == WorkflowActionType.ASSIGN_USER:
            return self._action_assign_user(config, context)
        elif action_type == WorkflowActionType.ADD_TAG:
            return self._action_add_tag(config, context)
        else:
            raise ValueError(f"Type d'action inconnu: {action_type}")

    def _replace_variables(self, config: Any, context: Dict[str, Any]) -> Any:
        """
        Remplace les variables {{variable}} dans la configuration

        Exemple:
            "{{organisation.nom}}" => "ACME Corp"
            "Deal {{organisation.nom}} - {{montant}}€" => "Deal ACME Corp - 50000€"
        """
        if isinstance(config, str):
            # Remplacer toutes les variables {{path.to.value}}
            pattern = r'\{\{([^}]+)\}\}'
            matches = re.findall(pattern, config)
            for match in matches:
                value = self._get_nested_value(context, match.strip())
                if value is not None:
                    config = config.replace(f"{{{{{match}}}}}", str(value))
            return config
        elif isinstance(config, dict):
            return {k: self._replace_variables(v, context) for k, v in config.items()}
        elif isinstance(config, list):
            return [self._replace_variables(item, context) for item in config]
        else:
            return config

    # ======================
    # Actions disponibles
    # ======================

    def _action_send_email(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envoie un email

        Config:
            {
                "to": "email@example.com",
                "subject": "Sujet",
                "template": "nom_template",
                "body": "Corps de l'email" (si pas de template)
            }
        """
        # TODO: Implémenter envoi email réel (SendGrid, SMTP, etc.)
        # Pour l'instant, on simule
        return {
            "action": "send_email",
            "to": config.get("to"),
            "subject": config.get("subject"),
            "sent": True,
            "message": "Email envoyé (simulation)"
        }

    def _action_create_task(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Crée une tâche

        Config:
            {
                "title": "Titre de la tâche",
                "description": "Description",
                "assigned_to": user_id,
                "due_date": "+7 days" | "2025-12-31",
                "priority": "high"
            }
        """
        # Parser due_date
        due_date = None
        due_date_str = config.get("due_date")
        if due_date_str:
            if due_date_str.startswith("+"):
                # Format relatif: "+7 days"
                days = int(due_date_str.replace("+", "").replace("days", "").strip())
                due_date = datetime.now(UTC) + timedelta(days=days)
            else:
                # Format absolu: "2025-12-31"
                due_date = datetime.fromisoformat(due_date_str)

        # Mapper priorité
        priority_map = {
            "urgent": TaskPriority.URGENT,
            "high": TaskPriority.HIGH,
            "normal": TaskPriority.NORMAL,
            "low": TaskPriority.LOW
        }
        priority = priority_map.get(config.get("priority", "normal").lower(), TaskPriority.NORMAL)

        # Créer la tâche
        task = Task(
            title=config.get("title"),
            description=config.get("description"),
            assigned_to=config.get("assigned_to"),
            due_date=due_date,
            priority=priority,
            status=TaskStatus.TODO,
            organisation_id=context.get("trigger_entity_id") if context.get("trigger_entity_type") == "organisation" else None
        )
        self.db.add(task)
        self.db.commit()

        return {
            "action": "create_task",
            "task_id": task.id,
            "title": task.title,
            "created": True
        }

    def _action_send_notification(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Envoie une notification WebSocket

        Config:
            {
                "user_id": 123,
                "message": "Message de notification",
                "type": "info" | "success" | "warning" | "error"
            }
        """
        notification_type_map = {
            "info": NotificationType.TASK_ASSIGNED,
            "success": NotificationType.DEAL_WON,
            "warning": NotificationType.TASK_OVERDUE,
            "error": NotificationType.SYSTEM_ERROR
        }

        notification_type = notification_type_map.get(
            config.get("type", "info"),
            NotificationType.TASK_ASSIGNED
        )

        # Créer la notification
        notification = self.notification_manager.create_notification(
            user_id=config.get("user_id"),
            type=notification_type,
            title="Workflow automatisé",
            message=config.get("message"),
            data={"workflow_execution": True}
        )

        return {
            "action": "send_notification",
            "notification_id": notification.id,
            "sent": True
        }

    def _action_update_field(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Met à jour un champ d'une entité

        Config:
            {
                "entity_type": "organisation",
                "entity_id": 123 | "{{trigger_entity_id}}",
                "field": "pipeline_stage",
                "value": "QUALIFICATION"
            }
        """
        entity_type = config.get("entity_type")
        entity_id = config.get("entity_id")
        field = config.get("field")
        value = config.get("value")

        if entity_type == "organisation":
            org = self.db.query(Organisation).filter(Organisation.id == entity_id).first()
            if org:
                setattr(org, field, value)
                self.db.commit()
                return {
                    "action": "update_field",
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "field": field,
                    "updated": True
                }

        return {"action": "update_field", "updated": False, "error": "Entité non trouvée"}

    def _action_assign_user(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assigne une entité à un utilisateur

        Config:
            {
                "entity_type": "organisation",
                "entity_id": 123,
                "user_id": 456
            }
        """
        # TODO: Implémenter assignment (dépend du modèle Organisation)
        return {
            "action": "assign_user",
            "assigned": True,
            "message": "Assignment simulé"
        }

    def _action_add_tag(self, config: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Ajoute un tag à une entité

        Config:
            {
                "entity_type": "organisation",
                "entity_id": 123,
                "tag": "Nouveau Client 2025"
            }
        """
        # TODO: Implémenter système de tags
        return {
            "action": "add_tag",
            "tag": config.get("tag"),
            "added": True,
            "message": "Tag simulé"
        }

    def _log(self, execution: WorkflowExecution, level: str, message: str):
        """Ajoute un log à l'exécution"""
        if execution.execution_logs is None:
            execution.execution_logs = []

        execution.execution_logs.append({
            "timestamp": datetime.now(UTC).isoformat(),
            "level": level,
            "message": message
        })

    # ======================
    # Méthodes utilitaires
    # ======================

    def find_workflows_by_trigger(
        self,
        trigger_type: WorkflowTriggerType,
        status: WorkflowStatus = WorkflowStatus.ACTIVE
    ) -> List[Workflow]:
        """
        Trouve tous les workflows actifs pour un type de trigger donné

        Args:
            trigger_type: Type de trigger
            status: Statut du workflow (par défaut: ACTIVE)

        Returns:
            Liste des workflows correspondants
        """
        return self.db.query(Workflow).filter(
            and_(
                Workflow.trigger_type == trigger_type,
                Workflow.status == status
            )
        ).all()

    def check_inactivity_workflows(self, inactivity_days: int = 30):
        """
        Vérifie et exécute les workflows d'inactivité

        À appeler quotidiennement par Celery Beat
        """
        workflows = self.find_workflows_by_trigger(WorkflowTriggerType.INACTIVITY_DELAY)

        for workflow in workflows:
            # Vérifier la config du trigger
            trigger_config = workflow.trigger_config or {}
            required_days = trigger_config.get("inactivity_days", 30)

            if required_days != inactivity_days:
                continue

            # Trouver les organisations inactives
            # TODO: Implémenter la logique de détection d'inactivité
            # (organisations sans activité depuis X jours)
            pass

    def get_workflow_stats(self, workflow_id: int) -> Dict[str, Any]:
        """
        Récupère les statistiques d'un workflow

        Returns:
            {
                "total_executions": 150,
                "success_rate": 95.5,
                "avg_duration_seconds": 2.3,
                "last_execution": "2025-10-18T10:30:00",
                "success_count": 143,
                "failed_count": 5,
                "skipped_count": 2
            }
        """
        executions = self.db.query(WorkflowExecution).filter(
            WorkflowExecution.workflow_id == workflow_id
        ).all()

        total = len(executions)
        if total == 0:
            return {
                "total_executions": 0,
                "success_rate": 0,
                "avg_duration_seconds": 0
            }

        success = len([e for e in executions if e.status == WorkflowExecutionStatus.SUCCESS])
        failed = len([e for e in executions if e.status == WorkflowExecutionStatus.FAILED])
        skipped = len([e for e in executions if e.status == WorkflowExecutionStatus.SKIPPED])

        durations = [e.duration_seconds for e in executions if e.duration_seconds is not None]
        avg_duration = sum(durations) / len(durations) if durations else 0

        last_exec = max([e.created_at for e in executions]) if executions else None

        return {
            "total_executions": total,
            "success_count": success,
            "failed_count": failed,
            "skipped_count": skipped,
            "success_rate": (success / total * 100) if total > 0 else 0,
            "avg_duration_seconds": round(avg_duration, 2),
            "last_execution": last_exec.isoformat() if last_exec else None
        }
