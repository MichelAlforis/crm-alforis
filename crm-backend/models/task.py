from sqlalchemy import (
    Column,
    String,
    Integer,
    Text,
    Enum,
    ForeignKey,
    DateTime,
    Index,
)
from sqlalchemy.orm import relationship
from models.base import BaseModel
from models.constants import (
    FK_USERS_ID,
    FK_ORGANISATIONS_ID,
    FK_PEOPLE_ID,
    ONDELETE_SET_NULL,
    ONDELETE_CASCADE,
    ENUM_TASK_STATUS,
    ENUM_TASK_PRIORITY,
)
import enum
from datetime import datetime, timezone


class TaskPriority(str, enum.Enum):
    """Niveaux de priorité alignés sur taskpriority."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    """Statuts de workflow des tâches."""

    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class Task(BaseModel):
    """
    Modèle de tâche unifié (post refonte 2025).

    Une tâche peut être assignée à un utilisateur, liée à une organisation
    et à une personne (contact). Les workflows et automations s'appuient sur ce modèle.
    """

    __tablename__ = "tasks"
    __table_args__ = (
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_assigned", "assigned_to"),
        Index("idx_tasks_due_date", "due_date"),
    )

    title = Column(String(500), nullable=False, index=True)
    description = Column(Text, nullable=True)

    status = Column(
        Enum(TaskStatus, name=ENUM_TASK_STATUS),
        nullable=False,
        default=TaskStatus.TODO,
        index=True,
    )
    priority = Column(
        Enum(TaskPriority, name=ENUM_TASK_PRIORITY),
        nullable=False,
        default=TaskPriority.NORMAL,
        index=True,
    )

    due_date = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    assigned_to = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True, index=True)
    created_by = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_SET_NULL), nullable=True, index=True)

    organisation_id = Column(
        Integer,
        ForeignKey(FK_ORGANISATIONS_ID, ondelete=ONDELETE_CASCADE),
        nullable=True,
        index=True,
    )
    person_id = Column(
        Integer,
        ForeignKey(FK_PEOPLE_ID, ondelete=ONDELETE_SET_NULL),
        nullable=True,
        index=True,
    )

    organisation = relationship("Organisation", back_populates="tasks")
    person = relationship("Person")

    def __repr__(self) -> str:
        return (
            f"<Task(id={self.id}, title='{self.title}', status={self.status}, "
            f"priority={self.priority})>"
        )

    @property
    def is_overdue(self) -> bool:
        """Retourne True si la tâche est en retard."""
        if self.status in (TaskStatus.DONE, TaskStatus.CANCELLED):
            return False
        if not self.due_date:
            return False
        return self.due_date < datetime.now(timezone.utc)
