"""
Routes API pour la gestion des workflows

Endpoints:
- GET /workflows - Liste des workflows
- POST /workflows - Créer un workflow
- GET /workflows/{id} - Détails d'un workflow
- PUT /workflows/{id} - Mettre à jour un workflow
- DELETE /workflows/{id} - Supprimer un workflow
- POST /workflows/{id}/activate - Activer/désactiver un workflow
- POST /workflows/{id}/execute - Exécuter manuellement un workflow
- GET /workflows/{id}/executions - Historique des exécutions
- GET /workflows/{id}/stats - Statistiques d'un workflow
- GET /workflows/templates - Templates prédéfinis
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.database import get_db
from models.workflow import (
    Workflow,
    WorkflowExecution,
    WorkflowExecutionStatus,
    WorkflowStatus,
    WorkflowTriggerType,
)
from schemas.base import PaginatedResponse
from schemas.workflow import (
    WORKFLOW_TEMPLATES,
    WorkflowActivate,
    WorkflowCreate,
    WorkflowExecuteRequest,
    WorkflowExecuteResponse,
    WorkflowExecutionListItem,
    WorkflowExecutionResponse,
    WorkflowListItem,
    WorkflowResponse,
    WorkflowStats,
    WorkflowTemplate,
    WorkflowUpdate,
)
from services.workflow_engine import WorkflowEngine
from tasks.workflow_tasks import execute_workflow_async

router = APIRouter(prefix="/workflows", tags=["workflows"])


# =======================
# CRUD Workflows
# =======================

@router.get("", response_model=PaginatedResponse[WorkflowListItem])
async def list_workflows(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[WorkflowStatus] = None,
    trigger_type: Optional[WorkflowTriggerType] = None,
    is_template: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """
    Liste tous les workflows avec pagination et filtres

    Filtres disponibles:
    - status: ACTIVE, INACTIVE, DRAFT
    - trigger_type: ORGANISATION_CREATED, DEAL_UPDATED, etc.
    - is_template: true/false (templates prêts à l'emploi)
    """
    query = db.query(Workflow)

    # Appliquer les filtres
    if status:
        query = query.filter(Workflow.status == status)
    if trigger_type:
        query = query.filter(Workflow.trigger_type == trigger_type)
    if is_template is not None:
        query = query.filter(Workflow.is_template == is_template)

    # Compter le total
    total = query.count()

    # Récupérer les items paginés
    workflows = query.order_by(Workflow.created_at.desc()).offset(skip).limit(limit).all()

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[WorkflowListItem.model_validate(w) for w in workflows]
    )


@router.post("", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(
    workflow_data: WorkflowCreate,
    db: Session = Depends(get_db)
):
    """
    Crée un nouveau workflow

    Le workflow est créé en statut DRAFT par défaut.
    Utilisez l'endpoint /workflows/{id}/activate pour l'activer.
    """
    # Convertir les conditions en dict
    conditions_dict = None
    if workflow_data.conditions:
        conditions_dict = {
            "operator": workflow_data.conditions.operator,
            "rules": [rule.model_dump() for rule in workflow_data.conditions.rules]
        }

    # Convertir les actions en dict
    actions_dict = [action.model_dump() for action in workflow_data.actions]

    # Créer le workflow
    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        status=workflow_data.status,
        trigger_type=workflow_data.trigger_type,
        trigger_config=workflow_data.trigger_config,
        conditions=conditions_dict,
        actions=actions_dict,
        is_template=workflow_data.is_template,
        execution_count=0
    )

    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return WorkflowResponse.model_validate(workflow)


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère les détails complets d'un workflow
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    return WorkflowResponse.model_validate(workflow)


@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    workflow_data: WorkflowUpdate,
    db: Session = Depends(get_db)
):
    """
    Met à jour un workflow existant

    Seuls les champs fournis sont mis à jour.
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    # Mettre à jour les champs fournis
    update_data = workflow_data.model_dump(exclude_unset=True)

    # Convertir les conditions si fournies
    if "conditions" in update_data and update_data["conditions"]:
        update_data["conditions"] = {
            "operator": update_data["conditions"].operator,
            "rules": [rule.model_dump() for rule in update_data["conditions"].rules]
        }

    # Convertir les actions si fournies
    if "actions" in update_data and update_data["actions"]:
        update_data["actions"] = [action.model_dump() for action in update_data["actions"]]

    for key, value in update_data.items():
        setattr(workflow, key, value)

    db.commit()
    db.refresh(workflow)

    return WorkflowResponse.model_validate(workflow)


@router.delete("/{workflow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workflow(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Supprime un workflow

    ⚠️ Supprime également toutes les exécutions associées (CASCADE)
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    db.delete(workflow)
    db.commit()

    return None


# =======================
# Activation / Exécution
# =======================

@router.post("/{workflow_id}/activate", response_model=WorkflowResponse)
async def activate_workflow(
    workflow_id: int,
    activation_data: WorkflowActivate,
    db: Session = Depends(get_db)
):
    """
    Active ou désactive un workflow

    Status possibles:
    - ACTIVE: Le workflow s'exécute automatiquement
    - INACTIVE: Le workflow est désactivé
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    workflow.status = activation_data.status
    db.commit()
    db.refresh(workflow)

    return WorkflowResponse.model_validate(workflow)


@router.post("/{workflow_id}/execute", response_model=WorkflowExecuteResponse)
async def execute_workflow_manually(
    workflow_id: int,
    execution_request: WorkflowExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    Exécute manuellement un workflow

    Utile pour:
    - Tester un workflow avant activation
    - Exécuter un workflow ponctuel
    - Re-exécuter un workflow pour une entité spécifique

    L'exécution se fait de manière asynchrone via Celery.
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()

    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    # Lancer l'exécution asynchrone
    task = execute_workflow_async.delay(
        workflow_id=workflow_id,
        trigger_entity_type=execution_request.trigger_entity_type,
        trigger_entity_id=execution_request.trigger_entity_id,
        trigger_data=execution_request.trigger_data
    )

    # Créer une exécution en attente
    execution = WorkflowExecution(
        workflow_id=workflow_id,
        status=WorkflowExecutionStatus.PENDING,
        trigger_entity_type=execution_request.trigger_entity_type,
        trigger_entity_id=execution_request.trigger_entity_id,
        execution_logs=[]
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    return WorkflowExecuteResponse(
        workflow_id=workflow_id,
        execution_id=execution.id,
        task_id=task.id,
        message=f"Workflow en cours d'exécution (task: {task.id})"
    )


# =======================
# Exécutions (historique)
# =======================

@router.get("/{workflow_id}/executions", response_model=PaginatedResponse[WorkflowExecutionListItem])
async def list_workflow_executions(
    workflow_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[WorkflowExecutionStatus] = None,
    db: Session = Depends(get_db)
):
    """
    Liste l'historique des exécutions d'un workflow

    Filtres:
    - status: SUCCESS, FAILED, PENDING, RUNNING, SKIPPED
    """
    # Vérifier que le workflow existe
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    query = db.query(WorkflowExecution).filter(WorkflowExecution.workflow_id == workflow_id)

    if status:
        query = query.filter(WorkflowExecution.status == status)

    total = query.count()
    executions = query.order_by(WorkflowExecution.created_at.desc()).offset(skip).limit(limit).all()

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=[WorkflowExecutionListItem.model_validate(e) for e in executions]
    )


@router.get("/{workflow_id}/executions/{execution_id}", response_model=WorkflowExecutionResponse)
async def get_workflow_execution(
    workflow_id: int,
    execution_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère les détails complets d'une exécution

    Inclut les logs détaillés et les actions exécutées
    """
    execution = (
        db.query(WorkflowExecution)
        .filter(
            WorkflowExecution.id == execution_id,
            WorkflowExecution.workflow_id == workflow_id
        )
        .first()
    )

    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exécution #{execution_id} introuvable pour workflow #{workflow_id}"
        )

    return WorkflowExecutionResponse.model_validate(execution)


# =======================
# Statistiques
# =======================

@router.get("/{workflow_id}/stats", response_model=WorkflowStats)
async def get_workflow_stats(
    workflow_id: int,
    db: Session = Depends(get_db)
):
    """
    Récupère les statistiques d'un workflow

    Métriques:
    - Nombre total d'exécutions
    - Taux de succès
    - Durée moyenne d'exécution
    - Compteurs par statut (success, failed, skipped)
    """
    workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workflow #{workflow_id} introuvable"
        )

    engine = WorkflowEngine(db)
    stats = engine.get_workflow_stats(workflow_id)

    return WorkflowStats(**stats)


# =======================
# Templates
# =======================

@router.get("/templates/list", response_model=List[WorkflowTemplate])
async def list_workflow_templates():
    """
    Liste les templates de workflows prédéfinis

    Templates disponibles:
    1. Relance automatique deal inactif
    2. Onboarding nouveau client
    3. Alerte manager deal important

    Ces templates peuvent être utilisés pour créer rapidement des workflows.
    """
    return WORKFLOW_TEMPLATES


@router.post("/templates/{template_id}/create", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow_from_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """
    Crée un workflow à partir d'un template prédéfini

    Le workflow est créé en statut DRAFT.
    Vous pouvez ensuite le modifier et l'activer.
    """
    # Trouver le template
    template = next((t for t in WORKFLOW_TEMPLATES if t.id == template_id), None)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{template_id}' introuvable"
        )

    # Créer le workflow depuis le template
    workflow_data = template.workflow_data

    # Convertir les conditions en dict
    conditions_dict = None
    if workflow_data.conditions:
        conditions_dict = {
            "operator": workflow_data.conditions.operator,
            "rules": [rule.model_dump() for rule in workflow_data.conditions.rules]
        }

    # Convertir les actions en dict
    actions_dict = [action.model_dump() for action in workflow_data.actions]

    workflow = Workflow(
        name=workflow_data.name,
        description=workflow_data.description,
        status=WorkflowStatus.DRAFT,  # Toujours DRAFT au départ
        trigger_type=workflow_data.trigger_type,
        trigger_config=workflow_data.trigger_config,
        conditions=conditions_dict,
        actions=actions_dict,
        is_template=False,  # Ce n'est plus un template, c'est une instance
        execution_count=0
    )

    db.add(workflow)
    db.commit()
    db.refresh(workflow)

    return WorkflowResponse.model_validate(workflow)
