from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.events import EventType, emit_event
from schemas.base import PaginatedResponse
from schemas.task import (  # TaskCategory  # N'existe pas
    TaskCreate,
    TaskPriority,
    TaskQuickActionRequest,
    TaskResponse,
    TaskSnoozeRequest,
    TaskStatsResponse,
    TaskStatus,
    TaskUpdate,
    TaskWithRelations,
)
from services.task import TaskService

router = APIRouter(prefix="/tasks", tags=["tasks"])


def _extract_user_id(current_user: dict) -> Optional[int]:
    user_id = current_user.get("user_id") if current_user else None
    if user_id is None:
        return None
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


def _enum_value(value):
    return value.value if value is not None else None


# ============= HELPER =============


def enrich_task_response(task) -> dict:
    """Enrichir une tâche avec les noms des entités liées"""
    response = TaskResponse.model_validate(task)
    data = response.model_dump()

    # Ajouter les noms des entités liées
    if task.organisation:
        data["organisation_name"] = task.organisation.name
    if task.person:
        data["person_name"] = task.person.full_name

    data["linked_entity_display"] = task.get_linked_entity_name()

    return data


# ============= GET ROUTES =============


@router.get("", response_model=PaginatedResponse[TaskResponse])
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    # category: Optional[str]  # TaskCategory = Query(None),  # TaskCategory n'existe pas
    view: Optional[str] = Query(None, description="Filter: 'today', 'overdue', 'next7', 'all'"),
    organisation_id: Optional[int] = Query(None),
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
    # if category:  # TaskCategory n'existe pas
    #     filters["category"] = category
    if view:
        filters["view"] = view
    if organisation_id:
        filters["organisation_id"] = organisation_id
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
    task = await service.create(task_create, actor=current_user)
    await emit_event(
        EventType.TASK_CREATED,
        data={
            "task_id": task.id,
            "title": task.title,
            "status": _enum_value(getattr(task, "status", None)),
            "due_date": (
                getattr(task, "due_date", None).isoformat()
                if getattr(task, "due_date", None)
                else None
            ),
            "priority": _enum_value(getattr(task, "priority", None)),
        },
        user_id=_extract_user_id(current_user),
    )
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
    task = await service.snooze_task(task_id, snooze_request.days, actor=current_user)
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
    task = await service.quick_action(task_id, action_request.action, actor=current_user)
    if getattr(task, "status", None) == TaskStatus.DONE:
        await emit_event(
            EventType.TASK_COMPLETED,
            data={
                "task_id": task.id,
                "title": task.title,
                "completed_at": (
                    getattr(task, "completed_at", None).isoformat()
                    if getattr(task, "completed_at", None)
                    else None
                ),
            },
            user_id=_extract_user_id(current_user),
        )
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
    task = await service.update(task_id, task_update, actor=current_user)
    if task_update.status == TaskStatus.DONE or getattr(task, "status", None) == TaskStatus.DONE:
        await emit_event(
            EventType.TASK_COMPLETED,
            data={
                "task_id": task.id,
                "title": task.title,
                "completed_at": (
                    getattr(task, "completed_at", None).isoformat()
                    if getattr(task, "completed_at", None)
                    else None
                ),
            },
            user_id=_extract_user_id(current_user),
        )
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
