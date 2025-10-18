"""
Schemas Pydantic pour les workflows

Gère la validation des données entrantes/sortantes pour l'API workflows
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

from schemas.base import BaseSchema, TimestampedSchema
from models.workflow import (
    WorkflowTriggerType,
    WorkflowActionType,
    WorkflowStatus,
    WorkflowExecutionStatus
)


# =======================
# Schemas d'entrée (création/mise à jour)
# =======================

class WorkflowActionConfig(BaseModel):
    """Configuration d'une action de workflow"""
    type: WorkflowActionType
    config: Dict[str, Any] = Field(..., description="Configuration spécifique à l'action")

    model_config = {"from_attributes": True}

    class ConfigDict:
        use_enum_values = True


class WorkflowConditionRule(BaseModel):
    """Règle de condition individuelle"""
    field: str = Field(..., description="Chemin du champ (ex: organisation.pipeline_stage)")
    operator: str = Field(..., description="Opérateur (==, !=, >, <, >=, <=, contains, in)")
    value: Any = Field(..., description="Valeur à comparer")


class WorkflowConditions(BaseModel):
    """Conditions d'un workflow (logique AND/OR)"""
    operator: str = Field(default="AND", description="Opérateur logique (AND ou OR)")
    rules: List[WorkflowConditionRule] = Field(default=[], description="Liste des règles")

    @field_validator("operator")
    @classmethod
    def validate_operator(cls, v):
        if v not in ["AND", "OR"]:
            raise ValueError("operator doit être 'AND' ou 'OR'")
        return v


class WorkflowCreate(BaseSchema):
    """Création d'un workflow"""
    name: str = Field(..., min_length=3, max_length=200, description="Nom du workflow")
    description: Optional[str] = Field(None, description="Description du workflow")
    status: WorkflowStatus = Field(default=WorkflowStatus.DRAFT, description="Statut du workflow")

    # Trigger
    trigger_type: WorkflowTriggerType = Field(..., description="Type de déclencheur")
    trigger_config: Optional[Dict[str, Any]] = Field(None, description="Configuration du déclencheur")

    # Conditions
    conditions: Optional[WorkflowConditions] = Field(None, description="Conditions à vérifier")

    # Actions
    actions: List[WorkflowActionConfig] = Field(..., min_length=1, description="Actions à exécuter")

    # Métadonnées
    is_template: bool = Field(default=False, description="Est un template prêt à l'emploi")

    @field_validator("actions")
    @classmethod
    def validate_actions(cls, v):
        if len(v) == 0:
            raise ValueError("Au moins une action est requise")
        return v


class WorkflowUpdate(BaseSchema):
    """Mise à jour d'un workflow"""
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = None
    status: Optional[WorkflowStatus] = None
    trigger_type: Optional[WorkflowTriggerType] = None
    trigger_config: Optional[Dict[str, Any]] = None
    conditions: Optional[WorkflowConditions] = None
    actions: Optional[List[WorkflowActionConfig]] = None
    is_template: Optional[bool] = None


class WorkflowActivate(BaseSchema):
    """Activer/désactiver un workflow"""
    status: WorkflowStatus = Field(..., description="Nouveau statut (ACTIVE ou INACTIVE)")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        if v not in [WorkflowStatus.ACTIVE, WorkflowStatus.INACTIVE]:
            raise ValueError("status doit être ACTIVE ou INACTIVE")
        return v


# =======================
# Schemas de sortie (réponses API)
# =======================

class WorkflowResponse(TimestampedSchema):
    """Réponse workflow complet"""
    id: int
    name: str
    description: Optional[str]
    status: WorkflowStatus

    # Trigger
    trigger_type: WorkflowTriggerType
    trigger_config: Optional[Dict[str, Any]]

    # Conditions
    conditions: Optional[Dict[str, Any]]

    # Actions
    actions: List[Dict[str, Any]]

    # Métadonnées
    created_by: Optional[int]
    is_template: bool
    execution_count: int
    last_executed_at: Optional[datetime]

    # Timestamps
    created_at: datetime
    updated_at: datetime


class WorkflowListItem(BaseSchema):
    """Item de workflow pour liste (version légère)"""
    id: int
    name: str
    description: Optional[str]
    status: WorkflowStatus
    trigger_type: WorkflowTriggerType
    execution_count: int
    last_executed_at: Optional[datetime]
    created_at: datetime


class WorkflowExecutionResponse(TimestampedSchema):
    """Réponse exécution de workflow"""
    id: int
    workflow_id: int
    status: WorkflowExecutionStatus

    # Contexte
    trigger_entity_type: Optional[str]
    trigger_entity_id: Optional[int]

    # Résultats
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    execution_logs: Optional[List[Dict[str, Any]]]
    error_message: Optional[str]
    actions_executed: Optional[List[Dict[str, Any]]]

    # Timestamps
    created_at: datetime


class WorkflowExecutionListItem(BaseSchema):
    """Item d'exécution pour liste (version légère)"""
    id: int
    workflow_id: int
    status: WorkflowExecutionStatus
    trigger_entity_type: Optional[str]
    trigger_entity_id: Optional[int]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]
    created_at: datetime


class WorkflowStats(BaseSchema):
    """Statistiques d'un workflow"""
    total_executions: int
    success_count: int
    failed_count: int
    skipped_count: int
    success_rate: float
    avg_duration_seconds: float
    last_execution: Optional[str]


# =======================
# Schemas pour exécution manuelle
# =======================

class WorkflowExecuteRequest(BaseSchema):
    """Exécution manuelle d'un workflow"""
    trigger_entity_type: str = Field(..., description="Type d'entité (organisation, deal, etc.)")
    trigger_entity_id: int = Field(..., description="ID de l'entité")
    trigger_data: Optional[Dict[str, Any]] = Field(None, description="Données additionnelles")


class WorkflowExecuteResponse(BaseSchema):
    """Réponse d'exécution manuelle"""
    workflow_id: int
    execution_id: int
    task_id: str
    message: str


# =======================
# Templates de workflows prédéfinis
# =======================

class WorkflowTemplate(BaseSchema):
    """Template de workflow prêt à l'emploi"""
    id: str = Field(..., description="ID unique du template")
    name: str
    description: str
    category: str = Field(..., description="Catégorie (sales, support, marketing, etc.)")
    workflow_data: WorkflowCreate = Field(..., description="Données du workflow")


# Templates disponibles
WORKFLOW_TEMPLATES: List[WorkflowTemplate] = [
    # Template 1: Relance deal inactif
    WorkflowTemplate(
        id="relance-deal-inactif",
        name="Relance automatique deal inactif",
        description="Envoie un email et crée une tâche pour les deals inactifs > 30 jours",
        category="sales",
        workflow_data=WorkflowCreate(
            name="Relance deal inactif",
            description="Workflow automatique pour relancer les deals en PROPOSITION sans activité depuis 30 jours",
            status=WorkflowStatus.DRAFT,
            trigger_type=WorkflowTriggerType.INACTIVITY_DELAY,
            trigger_config={
                "inactivity_days": 30,
                "entity_type": "organisation",
                "pipeline_stages": ["PROPOSITION", "QUALIFICATION"]
            },
            conditions=WorkflowConditions(
                operator="AND",
                rules=[
                    WorkflowConditionRule(
                        field="organisation.pipeline_stage",
                        operator="in",
                        value=["PROPOSITION", "QUALIFICATION"]
                    )
                ]
            ),
            actions=[
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_EMAIL,
                    config={
                        "to": "commercial@alforis.com",
                        "subject": "Relancer le deal {{organisation.nom}}",
                        "template": "relance_deal",
                        "body": "Le deal {{organisation.nom}} est inactif depuis 30 jours. Merci de relancer le client."
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.CREATE_TASK,
                    config={
                        "title": "Relancer client {{organisation.nom}}",
                        "description": "Deal inactif depuis 30 jours - contacter le client",
                        "assigned_to": 1,  # À remplacer par l'ID du commercial
                        "due_date": "+7 days",
                        "priority": "high"
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_NOTIFICATION,
                    config={
                        "user_id": 1,  # À remplacer
                        "message": "Deal {{organisation.nom}} inactif depuis 30 jours",
                        "type": "warning"
                    }
                )
            ],
            is_template=True
        )
    ),

    # Template 2: Onboarding nouveau client
    WorkflowTemplate(
        id="onboarding-client",
        name="Onboarding nouveau client",
        description="Processus automatisé d'accueil pour les nouveaux clients signés",
        category="sales",
        workflow_data=WorkflowCreate(
            name="Onboarding nouveau client",
            description="Workflow déclenché quand un deal passe en statut SIGNÉ",
            status=WorkflowStatus.DRAFT,
            trigger_type=WorkflowTriggerType.DEAL_STAGE_CHANGED,
            trigger_config={
                "from_stage": "PROPOSITION",
                "to_stage": "SIGNE"
            },
            conditions=None,
            actions=[
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_EMAIL,
                    config={
                        "to": "{{organisation.email}}",
                        "subject": "Bienvenue chez Alforis Finance !",
                        "template": "bienvenue_client",
                        "body": "Bienvenue {{organisation.nom}}, nous sommes ravis de vous compter parmi nos clients."
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.CREATE_TASK,
                    config={
                        "title": "Appel de bienvenue {{organisation.nom}}",
                        "description": "Contacter le nouveau client pour confirmer la signature",
                        "assigned_to": 1,
                        "due_date": "+3 days",
                        "priority": "high"
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.CREATE_TASK,
                    config={
                        "title": "Envoyer documents contractuels à {{organisation.nom}}",
                        "description": "Préparer et envoyer tous les documents signés",
                        "assigned_to": 1,
                        "due_date": "+1 day",
                        "priority": "urgent"
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_NOTIFICATION,
                    config={
                        "user_id": 1,
                        "message": "Nouveau client signé: {{organisation.nom}}",
                        "type": "success"
                    }
                )
            ],
            is_template=True
        )
    ),

    # Template 3: Alerte manager deal important
    WorkflowTemplate(
        id="alerte-deal-important",
        name="Alerte manager - Deal > 50k€",
        description="Notifie automatiquement le manager pour les deals importants",
        category="sales",
        workflow_data=WorkflowCreate(
            name="Alerte manager - Deal > 50k€",
            description="Workflow déclenché à la création d'un deal > 50 000€",
            status=WorkflowStatus.DRAFT,
            trigger_type=WorkflowTriggerType.ORGANISATION_CREATED,
            trigger_config=None,
            conditions=WorkflowConditions(
                operator="AND",
                rules=[
                    WorkflowConditionRule(
                        field="organisation.montant_potentiel",
                        operator=">",
                        value=50000
                    )
                ]
            ),
            actions=[
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_EMAIL,
                    config={
                        "to": "manager@alforis.com",
                        "subject": "Nouveau deal important: {{organisation.nom}} - {{organisation.montant_potentiel}}€",
                        "template": "alerte_manager_deal",
                        "body": "Un nouveau deal > 50k€ vient d'être créé et nécessite votre attention."
                    }
                ),
                WorkflowActionConfig(
                    type=WorkflowActionType.SEND_NOTIFICATION,
                    config={
                        "user_id": 1,  # ID du manager
                        "message": "Nouveau deal > 50k€: {{organisation.nom}} ({{organisation.montant_potentiel}}€)",
                        "type": "info"
                    }
                )
            ],
            is_template=True
        )
    )
]
