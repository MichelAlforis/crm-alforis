import enum
from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.constants import (
    ENUM_WORKFLOW_STATUS,
    ENUM_WORKFLOW_TRIGGER,
    FK_USERS_ID,
    FK_WORKFLOWS_ID,
    ONDELETE_CASCADE,
)

# =======================
# Enums
# =======================


class WorkflowTriggerType(str, enum.Enum):
    """Types de déclencheurs de workflow"""

    ORGANISATION_CREATED = "organisation_created"
    ORGANISATION_UPDATED = "organisation_updated"
    DEAL_CREATED = "deal_created"
    DEAL_UPDATED = "deal_updated"
    DEAL_STAGE_CHANGED = "deal_stage_changed"
    SCHEDULED = "scheduled"  # Exécution planifiée (quotidien, hebdo, etc.)
    INACTIVITY_DELAY = "inactivity_delay"  # Délai sans activité
    WEBHOOK_RECEIVED = "webhook_received"


class WorkflowActionType(str, enum.Enum):
    """Types d'actions de workflow"""

    SEND_EMAIL = "send_email"
    CREATE_TASK = "create_task"
    UPDATE_FIELD = "update_field"
    SEND_NOTIFICATION = "send_notification"
    ASSIGN_USER = "assign_user"
    CALL_WEBHOOK = "call_webhook"
    ADD_TAG = "add_tag"
    CREATE_ACTIVITY = "create_activity"


class WorkflowStatus(str, enum.Enum):
    """Statut du workflow"""

    ACTIVE = "active"
    INACTIVE = "inactive"
    DRAFT = "draft"


class WorkflowExecutionStatus(str, enum.Enum):
    """Statut d'exécution du workflow"""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"  # Conditions non remplies


# =======================
# Modèles
# =======================


class Workflow(BaseModel):
    """
    Workflow d'automatisation

    Un workflow définit:
    - Un déclencheur (trigger)
    - Des conditions (optionnel)
    - Des actions à exécuter

    Exemple:
        Trigger: Deal en PROPOSITION > 30 jours
        Condition: Aucune activité depuis 30 jours
        Actions:
            - Envoyer email au commercial
            - Créer tâche "Relancer client"
            - Notifier manager si montant > 50k€
    """

    __tablename__ = "workflows"

    # Informations de base
    name = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(Enum(WorkflowStatus), default=WorkflowStatus.DRAFT, nullable=False, index=True)

    # Déclencheur
    trigger_type = Column(Enum(WorkflowTriggerType), nullable=False, index=True)
    trigger_config = Column(
        JSON,
        nullable=True,
        comment="Configuration du déclencheur (ex: {stage: 'PROPOSITION', delay_days: 30})",
    )

    # Conditions (logique IF)
    conditions = Column(
        JSON,
        nullable=True,
        comment="Conditions à vérifier (ex: {field: 'montant', operator: '>', value: 50000})",
    )

    # Actions
    actions = Column(
        JSON,
        nullable=False,
        comment="Liste des actions à exécuter (ex: [{type: 'send_email', config: {...}}])",
    )

    # Métadonnées
    created_by = Column(Integer, ForeignKey(FK_USERS_ID), nullable=True)
    is_template = Column(Boolean, default=False, comment="Workflow template prêt à l'emploi")
    execution_count = Column(Integer, default=0, comment="Nombre d'exécutions")
    last_executed_at = Column(DateTime(timezone=True), nullable=True)

    # Relations
    creator = relationship("User", foreign_keys=[created_by])
    executions = relationship(
        "WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Workflow(id={self.id}, name='{self.name}', status={self.status})>"


class WorkflowExecution(BaseModel):
    """
    Historique d'exécution d'un workflow

    Enregistre chaque exécution avec:
    - Statut (succès/échec)
    - Logs d'exécution
    - Entité déclencheur (organisation, deal, etc.)
    - Durée d'exécution
    """

    __tablename__ = "workflow_executions"

    workflow_id = Column(
        Integer, ForeignKey(FK_WORKFLOWS_ID, ondelete=ONDELETE_CASCADE), nullable=False, index=True
    )
    status = Column(
        Enum(WorkflowExecutionStatus),
        default=WorkflowExecutionStatus.PENDING,
        nullable=False,
        index=True,
    )

    # Contexte d'exécution
    trigger_entity_type = Column(
        String, nullable=True, comment="Type d'entité (organisation, deal, etc.)"
    )
    trigger_entity_id = Column(Integer, nullable=True, comment="ID de l'entité déclencheur")

    # Résultats
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    execution_logs = Column(JSON, nullable=True, comment="Logs détaillés de l'exécution")
    error_message = Column(Text, nullable=True)

    # Actions exécutées
    actions_executed = Column(
        JSON, nullable=True, comment="Détails des actions exécutées avec leurs résultats"
    )

    # Relations
    workflow = relationship("Workflow", back_populates="executions")

    def __repr__(self):
        return f"<WorkflowExecution(id={self.id}, workflow_id={self.workflow_id}, status={self.status})>"

    @property
    def duration_seconds(self):
        """Calcule la durée d'exécution en secondes"""
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return delta.total_seconds()
        return None


# =======================
# Exemples de configuration
# =======================

"""
Exemple 1: Relance automatique deal inactif
{
    "name": "Relance deal inactif",
    "trigger_type": "scheduled",
    "trigger_config": {
        "schedule": "daily",
        "check_inactivity": true,
        "inactivity_days": 30
    },
    "conditions": {
        "operator": "AND",
        "rules": [
            {"field": "pipeline_stage", "operator": "==", "value": "PROPOSITION"},
            {"field": "last_activity_days", "operator": ">", "value": 30}
        ]
    },
    "actions": [
        {
            "type": "send_email",
            "config": {
                "to": "{{deal.assigned_user.email}}",
                "template": "relance_deal",
                "subject": "Relancer le deal {{organisation.nom}}"
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Relancer client {{organisation.nom}}",
                "description": "Deal inactif depuis 30 jours",
                "assigned_to": "{{deal.assigned_user_id}}",
                "due_date": "+7 days"
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": "{{deal.assigned_user_id}}",
                "message": "Deal {{organisation.nom}} inactif depuis 30 jours",
                "type": "warning"
            }
        }
    ]
}

Exemple 2: Onboarding nouveau client
{
    "name": "Onboarding nouveau client",
    "trigger_type": "deal_stage_changed",
    "trigger_config": {
        "from_stage": "PROPOSITION",
        "to_stage": "SIGNE"
    },
    "conditions": null,
    "actions": [
        {
            "type": "send_email",
            "config": {
                "to": "{{organisation.email}}",
                "template": "bienvenue_client",
                "subject": "Bienvenue chez Alforis Finance !"
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Appel de bienvenue {{organisation.nom}}",
                "assigned_to": "{{deal.assigned_user_id}}",
                "due_date": "+3 days"
            }
        },
        {
            "type": "create_task",
            "config": {
                "title": "Envoyer documents contractuels à {{organisation.nom}}",
                "assigned_to": "{{deal.assigned_user_id}}",
                "due_date": "+1 day"
            }
        },
        {
            "type": "add_tag",
            "config": {
                "entity_type": "organisation",
                "entity_id": "{{organisation.id}}",
                "tag": "Nouveau Client 2025"
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": "{{deal.manager_id}}",
                "message": "Nouveau client signé: {{organisation.nom}} ({{deal.montant}}€)",
                "type": "success"
            }
        }
    ]
}

Exemple 3: Alerte manager deal important
{
    "name": "Alerte manager - Deal > 50k€",
    "trigger_type": "deal_created",
    "trigger_config": null,
    "conditions": {
        "operator": "AND",
        "rules": [
            {"field": "montant", "operator": ">", "value": 50000}
        ]
    },
    "actions": [
        {
            "type": "send_email",
            "config": {
                "to": "manager@alforis.com",
                "subject": "Nouveau deal important: {{organisation.nom}} - {{deal.montant}}€",
                "template": "alerte_manager_deal"
            }
        },
        {
            "type": "send_notification",
            "config": {
                "user_id": "{{deal.manager_id}}",
                "message": "Nouveau deal > 50k€: {{organisation.nom}}",
                "type": "info"
            }
        }
    ]
}
"""
