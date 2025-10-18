from pydantic import Field, field_validator
from typing import Optional
from datetime import date, timedelta
from schemas.base import TimestampedSchema, BaseSchema
from models.task import TaskPriority, TaskStatus
# TaskCategory n'existe pas dans models.task


# =====================================================
# TASK SCHEMAS
# =====================================================

class TaskCreate(BaseSchema):
    """Création d'une tâche"""
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: date = Field(..., description="Date d'échéance (YYYY-MM-DD)")
    priority: TaskPriority = TaskPriority.NORMAL  # Corrigé: MOYENNE → NORMAL
    status: TaskStatus = TaskStatus.TODO
    # # category: TaskCategory = TaskCategory.AUTRE  # TaskCategory n'existe pas

    # Liens optionnels (peut en avoir plusieurs ou aucun)
    investor_id: Optional[int] = None
    fournisseur_id: Optional[int] = None
    organisation_id: Optional[int] = None
    person_id: Optional[int] = None

    # Métadonnées auto-création
    is_auto_created: bool = False
    auto_creation_rule: Optional[str] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        """Convertir string en date si nécessaire"""
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class TaskUpdate(BaseSchema):
    """Mise à jour d'une tâche"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    due_date: Optional[date] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    # category: Optional[str]  # TaskCategory = None
    investor_id: Optional[int] = None
    fournisseur_id: Optional[int] = None
    organisation_id: Optional[int] = None
    person_id: Optional[int] = None

    @field_validator("due_date", mode="before")
    @classmethod
    def validate_due_date(cls, v):
        if v is None:
            return v
        if isinstance(v, str):
            return date.fromisoformat(v)
        return v


class TaskResponse(TimestampedSchema):
    """Réponse tâche simple"""
    title: str
    description: Optional[str]
    due_date: date
    snoozed_until: Optional[date]
    completed_at: Optional[date]
    priority: TaskPriority
    status: TaskStatus
    # category: TaskCategory
    investor_id: Optional[int]
    fournisseur_id: Optional[int]
    organisation_id: Optional[int]
    person_id: Optional[int]
    is_auto_created: bool
    auto_creation_rule: Optional[str]

    # Propriétés calculées
    is_overdue: bool = False
    is_today: bool = False
    is_next_7_days: bool = False
    days_until_due: int = 0

    class Config:
        from_attributes = True


class TaskWithRelations(TaskResponse):
    """Réponse tâche avec informations des entités liées"""
    investor_name: Optional[str] = None
    fournisseur_name: Optional[str] = None
    person_name: Optional[str] = None
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
    # category: Optional[str]  # TaskCategory = None
    investor_id: Optional[int] = None
    fournisseur_id: Optional[int] = None
    person_id: Optional[int] = None
    view: Optional[str] = None  # 'today', 'overdue', 'next7', 'all'
    is_auto_created: Optional[bool] = None


# =====================================================
# QUICK ACTIONS
# =====================================================

class TaskQuickActionRequest(BaseSchema):
    """Actions rapides sur une tâche"""
    action: str = Field(..., description="Action: 'snooze_1d', 'snooze_1w', 'mark_done', 'next_day'")


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
    # "TaskCategory",
]
