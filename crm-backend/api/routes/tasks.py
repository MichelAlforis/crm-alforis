from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from core import get_db, get_current_user
from schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskWithRelations,
    TaskSnoozeRequest,
    TaskStatsResponse,
    TaskQuickActionRequest,
    TaskStatus,
    TaskPriority,
    TaskCategory,
)
from schemas.base import PaginatedResponse
from services.task import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


# ============= HELPER =============

def enrich_task_response(task) -> dict:
    """Enrichir une tâche avec les noms des entités liées"""
    response = TaskResponse.model_validate(task)
    data = response.model_dump()

    # Ajouter les noms des entités liées
    if task.investor:
        data["investor_name"] = task.investor.name
    if task.fournisseur:
        data["fournisseur_name"] = task.fournisseur.name
    if task.person:
        data["person_name"] = task.person.name

    data["linked_entity_display"] = task.get_linked_entity_name()

    return data


# ============= GET ROUTES =============

@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    category: Optional[TaskCategory] = Query(None),
    view: Optional[str] = Query(None, description="Filter: 'today', 'overdue', 'next7', 'all'"),
    investor_id: Optional[int] = Query(None),
    fournisseur_id: Optional[int] = Query(None),
    person_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lister toutes les tâches avec filtres

    Vues disponibles:
    - overdue: tâches en retard
    - today: tâches du jour
    - next7: tâches des 7 prochains jours
    - all: toutes les tâches
    """
    service = TaskService(db)

    filters = {}
    if status:
        filters["status"] = status
    if priority:
        filters["priority"] = priority
    if category:
        filters["category"] = category
    if view:
        filters["view"] = view
    if investor_id:
        filters["investor_id"] = investor_id
    if fournisseur_id:
        filters["fournisseur_id"] = fournisseur_id
    if person_id:
        filters["person_id"] = person_id

    items, total = await service.get_all(skip=skip, limit=limit, filters=filters)

    # Enrichir avec les relations
    enriched_items = [enrich_task_response(task) for task in items]

    return PaginatedResponse(
        total=total,
        skip=skip,
        limit=limit,
        items=enriched_items,
    )


@router.get("/stats", response_model=TaskStatsResponse)
async def get_task_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtenir les statistiques des tâches"""
    service = TaskService(db)
    stats = await service.get_statistics()
    return TaskStatsResponse(**stats)


@router.get("/{task_id}")
async def get_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Récupérer une tâche avec ses relations"""
    service = TaskService(db)
    task = await service.get_task_with_relations(task_id)
    return enrich_task_response(task)


# ============= POST ROUTES =============

@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_create: TaskCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Créer une nouvelle tâche"""
    service = TaskService(db)
    task = await service.create(task_create)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/snooze")
async def snooze_task(
    task_id: int,
    snooze_request: TaskSnoozeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Snoozer une tâche de X jours"""
    service = TaskService(db)
    task = await service.snooze_task(task_id, snooze_request.days)
    return enrich_task_response(task)


@router.post("/{task_id}/quick-action")
async def task_quick_action(
    task_id: int,
    action_request: TaskQuickActionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Exécuter une action rapide sur une tâche

    Actions disponibles:
    - snooze_1d: Reporter de 1 jour
    - snooze_1w: Reporter de 1 semaine
    - mark_done: Marquer comme terminée
    - next_day: Passer au lendemain
    """
    service = TaskService(db)
    task = await service.quick_action(task_id, action_request.action)
    return enrich_task_response(task)


# ============= PUT ROUTES =============

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Mettre à jour une tâche"""
    service = TaskService(db)
    task = await service.update(task_id, task_update)
    return TaskResponse.model_validate(task)


# ============= DELETE ROUTES =============

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Supprimer une tâche"""
    service = TaskService(db)
    await service.delete(task_id)
    return None
