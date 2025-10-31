from datetime import date, datetime, timedelta
from typing import Optional

from pydantic import Field, field_validator

from models.task import TaskCategory, TaskPriority, TaskStatus
from schemas.base import BaseSchema, TimestampedSchema

# =====================================================
# TASK SCHEMAS
# =====================================================


class TaskCreate(BaseSchema):
    """Création d'une tâche"""

    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = Field(None, description="Date d'échéance (ISO format)")
    priority: TaskPriority = TaskPriority.MOYENNE
    status: TaskStatus = TaskStatus.TODO
    category: TaskCategory = TaskCategory.AUTRE

    # Liens optionnels
    organisation_id: Optional[int] = None
    person_id: Optional[int] = None
    assigned_to: Optional[int] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        """Convertir string en datetime si nécessaire"""
        if v is None:
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v


class TaskUpdate(BaseSchema):
    """Mise à jour d'une tâche"""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    category: Optional[TaskCategory] = None
    organisation_id: Optional[int] = None
    person_id: Optional[int] = None
    assigned_to: Optional[int] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        return v


class TaskResponse(TimestampedSchema):
    """Réponse tâche simple"""

    title: str
    description: Optional[str]
    due_date: Optional[datetime]  # Changed from date to datetime to match model
    completed_at: Optional[datetime]  # Changed from date to datetime
    priority: TaskPriority
    status: TaskStatus
    category: TaskCategory
    organisation_id: Optional[int]
    person_id: Optional[int]
    assigned_to: Optional[int]  # Added to match model
    created_by: Optional[int]  # Added to match model

    # Propriétés calculées
    is_overdue: bool = False
    is_today: bool = False
    is_next_7_days: bool = False
    days_until_due: int = 0


class TaskWithRelations(TaskResponse):
    """Réponse tâche avec informations des entités liées"""

    person_name: Optional[str] = None
    organisation_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    linked_entity_display: Optional[str] = None  # Ex: "📊 Acme Corp"


class TaskSnoozeRequest(BaseSchema):
    """Requête pour snoozer une tâche"""

    days: int = Field(..., ge=1, le=365, description="Nombre de jours à snoozer")


class TaskStatsResponse(BaseSchema):
    """Statistiques des tâches"""

    total: int = 0
    overdue: int = 0
    today: int = 0
    next_7_days: int = 0
    by_status: dict = Field(default_factory=dict)  # {todo: 10, doing: 5, done: 50}
    by_priority: dict = Field(default_factory=dict)  # {critique: 2, haute: 5, ...}


class TaskFilterParams(BaseSchema):
    """Paramètres de filtrage pour les tâches"""

    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    category: Optional[TaskCategory] = None
    person_id: Optional[int] = None
    organisation_id: Optional[int] = None
    assigned_to: Optional[int] = None
    view: Optional[str] = None  # 'today', 'overdue', 'next7', 'all'


# =====================================================
# QUICK ACTIONS
# =====================================================


class TaskQuickActionRequest(BaseSchema):
    """Actions rapides sur une tâche"""

    action: str = Field(
        ..., description="Action: 'snooze_1d', 'snooze_1w', 'mark_done', 'next_day'"
    )


# Export des enums pour le frontend
__all__ = [
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskWithRelations",
    "TaskSnoozeRequest",
    "TaskStatsResponse",
    "TaskFilterParams",
    "TaskQuickActionRequest",
    "TaskPriority",
    "TaskStatus",
    "TaskCategory",
]
