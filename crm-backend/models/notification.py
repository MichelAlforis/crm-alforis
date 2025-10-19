"""
Modèle Notification - Architecture unifiée 2025

Notifications principales gérées:
- task_assigned / task_overdue
- deal_won / deal_lost
- new_contact
- system_error / workflow_executed
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import enum
from typing import Dict, Any, TYPE_CHECKING

from models.base import BaseModel
from models.constants import (
    FK_USERS_ID,
    ONDELETE_CASCADE,
    ENUM_NOTIFICATION_TYPE,
    ENUM_NOTIFICATION_PRIORITY,
)

if TYPE_CHECKING:
    from models.user import User


class NotificationType(str, enum.Enum):
    """Types de notifications alignés sur les événements métier."""

    SYSTEM = "system"
    TASK_ASSIGNED = "task_assigned"
    TASK_DUE = "task_due"
    TASK_COMPLETED = "task_completed"
    PIPELINE_MOVED = "pipeline_moved"
    MANDAT_SIGNED = "mandat_signed"
    MANDAT_EXPIRING_SOON = "mandat_expiring_soon"
    EXPORT_READY = "export_ready"
    WORKFLOW_EXECUTED = "workflow_executed"
    DEAL_WON = "deal_won"
    DEAL_LOST = "deal_lost"
    NEW_CONTACT = "new_contact"
    SYSTEM_ERROR = "system_error"
    AUTRE = "autre"


class NotificationPriority(str, enum.Enum):
    """Niveaux de priorité pour l'affichage côté frontend."""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(BaseModel):
    """
    Notification utilisateur.

    Stocke un message, des métadonnées JSON et différents états (lu, archivé, expiré).
    """

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey(FK_USERS_ID, ondelete=ONDELETE_CASCADE), nullable=False, index=True)

    type = Column(SQLEnum(NotificationType, name=ENUM_NOTIFICATION_TYPE), nullable=False, index=True)
    priority = Column(
        SQLEnum(NotificationPriority, name=ENUM_NOTIFICATION_PRIORITY),
        nullable=False,
        default=NotificationPriority.NORMAL,
    )
    title = Column(String(255), nullable=False)
    message = Column(String(1200), nullable=True)
    link = Column(String(500), nullable=True)
    resource_type = Column(String(100), nullable=True)
    resource_id = Column(Integer, nullable=True)
    metadata_json = Column("metadata", JSON, nullable=True)

    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)

    is_archived = Column(Boolean, default=False, index=True)
    archived_at = Column(DateTime(timezone=True), nullable=True)

    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    user = relationship("User", back_populates="notifications")
    def __init__(self, **kwargs):
        metadata = kwargs.pop("metadata", None)
        super().__init__(**kwargs)
        if metadata is not None:
            object.__setattr__(self, "metadata_json", metadata)

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type}, user_id={self.user_id})>"

    # =====================================================
    # BUSINESS METHODS
    # =====================================================

    def mark_as_read(self) -> None:
        """Marque la notification comme lue."""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.now(timezone.utc)

    def mark_as_unread(self) -> None:
        """Marque la notification comme non lue."""
        self.is_read = False
        self.read_at = None

    def archive(self) -> None:
        """Archive la notification."""
        if not self.is_archived:
            self.is_archived = True
            self.archived_at = datetime.now(timezone.utc)

    def restore(self) -> None:
        """Sort la notification des archives."""
        if self.is_archived:
            self.is_archived = False
            self.archived_at = None

    def is_expired(self) -> bool:
        """Indique si la notification est expirée."""
        return self.expires_at is not None and self.expires_at < datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Convertit l'objet en dict sérialisable pour le frontend/WebSocket."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "priority": self.priority,
            "title": self.title,
            "message": self.message,
            "link": self.link,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "metadata": self.metadata,
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "is_archived": self.is_archived,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    # =====================================================
    # ATTRIBUTE SHIMS
    # =====================================================

    def __getattribute__(self, item: str) -> Any:
        if item == "metadata":
            try:
                return super().__getattribute__("metadata_json")
            except AttributeError:
                return None
        return super().__getattribute__(item)

    def __setattr__(self, key: str, value: Any) -> None:
        if key == "metadata":
            key = "metadata_json"
        super().__setattr__(key, value)


NOTIFICATION_TEMPLATES: Dict[NotificationType, Dict[str, Any]] = {
    NotificationType.TASK_ASSIGNED: {
        "title": "Nouvelle tâche : {task_title}",
        "message": "{assigner_name} vous a assigné la tâche \"{task_title}\"",
        "link": "/dashboard/tasks/{task_id}",
        "priority": NotificationPriority.HIGH,
    },
    NotificationType.TASK_DUE: {
        "title": "Tâche en retard : {task_title}",
        "message": "La tâche \"{task_title}\" est échue depuis le {due_date}",
        "link": "/dashboard/tasks/{task_id}",
        "priority": NotificationPriority.HIGH,
    },
    NotificationType.MANDAT_SIGNED: {
        "title": "Mandat signé - {organisation_name}",
        "message": "Le mandat {mandat_number} pour {organisation_name} est signé ✅",
        "link": "/dashboard/mandats/{mandat_id}",
        "priority": NotificationPriority.NORMAL,
    },
    NotificationType.MANDAT_EXPIRING_SOON: {
        "title": "Mandat à renouveler : {organisation_name}",
        "message": "Le mandat {mandat_number} expire dans {days_left} jours",
        "link": "/dashboard/mandats/{mandat_id}",
        "priority": NotificationPriority.HIGH,
    },
    NotificationType.PIPELINE_MOVED: {
        "title": "Pipeline mis à jour",
        "message": "{organisation_name} est passé de {old_stage} à {new_stage}",
        "link": "/dashboard/organisations/{organisation_id}",
        "priority": NotificationPriority.NORMAL,
    },
    NotificationType.EXPORT_READY: {
        "title": "Export prêt au téléchargement",
        "message": "Votre export \"{export_name}\" est prêt.",
        "link": "/dashboard/exports/{export_id}",
        "priority": NotificationPriority.NORMAL,
    },
    NotificationType.SYSTEM: {
        "title": "{title}",
        "message": "{message}",
        "link": "{link}",
        "priority": NotificationPriority.NORMAL,
    },
}
