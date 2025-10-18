"""
Modèle Notification - Gestion des notifications utilisateurs

Types de notifications:
- TASK_DUE: Tâche échue
- TASK_ASSIGNED: Tâche assignée
- INTERACTION_NEW: Nouvelle interaction
- MANDAT_SIGNED: Mandat signé
- MANDAT_EXPIRED: Mandat expiré
- ORGANISATION_UPDATED: Organisation modifiée
- PIPELINE_MOVED: Organisation changée de pipeline
- MENTION: Mention dans un commentaire
- SYSTEM: Notification système
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from core.database import Base


class NotificationType(str, enum.Enum):
    """Types de notifications disponibles"""
    # Tâches
    TASK_DUE = "task_due"
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"

    # Interactions
    INTERACTION_NEW = "interaction_new"
    INTERACTION_ASSIGNED = "interaction_assigned"

    # Mandats
    MANDAT_SIGNED = "mandat_signed"
    MANDAT_EXPIRED = "mandat_expired"
    MANDAT_EXPIRING_SOON = "mandat_expiring_soon"

    # Organisations
    ORGANISATION_CREATED = "organisation_created"
    ORGANISATION_UPDATED = "organisation_updated"
    ORGANISATION_ASSIGNED = "organisation_assigned"

    # Pipeline
    PIPELINE_MOVED = "pipeline_moved"
    PIPELINE_STUCK = "pipeline_stuck"

    # Social
    MENTION = "mention"
    COMMENT_REPLY = "comment_reply"

    # Système
    SYSTEM = "system"
    EXPORT_READY = "export_ready"
    IMPORT_COMPLETED = "import_completed"


class NotificationPriority(str, enum.Enum):
    """Priorités des notifications"""
    LOW = "low"           # Notification info
    NORMAL = "normal"     # Notification standard
    HIGH = "high"         # Notification importante
    URGENT = "urgent"     # Notification urgente


class Notification(Base):
    """
    Modèle Notification - Stocke les notifications utilisateurs

    Une notification contient:
    - Destinataire (user_id)
    - Type et priorité
    - Contenu (title, message)
    - Lien de redirection
    - État (lu/non lu)
    """
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)

    # Destinataire
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Type et priorité
    type = Column(SQLEnum(NotificationType), nullable=False, index=True)
    priority = Column(SQLEnum(NotificationPriority), default=NotificationPriority.NORMAL, index=True)

    # Contenu
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)

    # Lien de redirection (optionnel)
    link = Column(String(500), nullable=True)
    # Ex: "/dashboard/tasks/123", "/dashboard/organisations/456"

    # Resource liée (optionnel)
    resource_type = Column(String(50), nullable=True, index=True)
    # Ex: "task", "organisation", "mandat"

    resource_id = Column(Integer, nullable=True, index=True)
    # ID de la ressource concernée

    # État
    is_read = Column(Boolean, default=False, index=True)
    read_at = Column(DateTime, nullable=True)

    is_archived = Column(Boolean, default=False, index=True)
    archived_at = Column(DateTime, nullable=True)

    # Métadonnées supplémentaires (JSON)
    metadata = Column(Text, nullable=True)
    # Stocke des données additionnelles en JSON

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=True, index=True)
    # Si présent, la notification expire après cette date

    # Relations
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification {self.type} for User#{self.user_id}>"

    def mark_as_read(self):
        """Marque la notification comme lue"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()

    def mark_as_unread(self):
        """Marque la notification comme non lue"""
        self.is_read = False
        self.read_at = None

    def archive(self):
        """Archive la notification"""
        if not self.is_archived:
            self.is_archived = True
            self.archived_at = datetime.utcnow()

    def is_expired(self) -> bool:
        """Vérifie si la notification est expirée"""
        if not self.expires_at:
            return False
        return datetime.utcnow() > self.expires_at

    def to_dict(self):
        """Convertit la notification en dictionnaire"""
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
            "is_read": self.is_read,
            "read_at": self.read_at.isoformat() if self.read_at else None,
            "is_archived": self.is_archived,
            "archived_at": self.archived_at.isoformat() if self.archived_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "metadata": self.metadata,
        }


# Templates de notifications prédéfinis
NOTIFICATION_TEMPLATES = {
    NotificationType.TASK_DUE: {
        "title": "Tâche échue: {task_title}",
        "message": "La tâche '{task_title}' devait être terminée le {due_date}",
        "link": "/dashboard/tasks/{task_id}",
        "priority": NotificationPriority.HIGH,
    },

    NotificationType.TASK_ASSIGNED: {
        "title": "Nouvelle tâche assignée",
        "message": "{assigner_name} vous a assigné la tâche '{task_title}'",
        "link": "/dashboard/tasks/{task_id}",
        "priority": NotificationPriority.NORMAL,
    },

    NotificationType.MANDAT_SIGNED: {
        "title": "Mandat signé: {organisation_name}",
        "message": "Le mandat {mandat_number} a été signé par {organisation_name}",
        "link": "/dashboard/mandats/{mandat_id}",
        "priority": NotificationPriority.HIGH,
    },

    NotificationType.MANDAT_EXPIRING_SOON: {
        "title": "Mandat arrive à expiration",
        "message": "Le mandat {mandat_number} expire dans {days_left} jours",
        "link": "/dashboard/mandats/{mandat_id}",
        "priority": NotificationPriority.HIGH,
    },

    NotificationType.PIPELINE_MOVED: {
        "title": "Organisation déplacée",
        "message": "{organisation_name} est passée de '{old_stage}' à '{new_stage}'",
        "link": "/dashboard/organisations/{organisation_id}",
        "priority": NotificationPriority.NORMAL,
    },

    NotificationType.MENTION: {
        "title": "Vous avez été mentionné",
        "message": "{user_name} vous a mentionné dans un commentaire",
        "link": "{resource_link}",
        "priority": NotificationPriority.NORMAL,
    },

    NotificationType.EXPORT_READY: {
        "title": "Export prêt",
        "message": "Votre export '{export_name}' est prêt à être téléchargé",
        "link": "/dashboard/exports/{export_id}",
        "priority": NotificationPriority.LOW,
    },
}
