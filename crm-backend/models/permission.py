"""
Modèle Permission - Gestion des permissions granulaires

Permissions CRUD par ressource:
- CREATE: Créer une nouvelle entité
- READ: Lire/consulter les données
- UPDATE: Modifier les données
- DELETE: Supprimer les données

Resources:
- organisations, people, mandats, interactions, tasks, users, etc.
"""

import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime
from sqlalchemy import Enum as SQLEnum
from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import relationship

from models.base import Base

# Import de la table d'association depuis role.py (définie là-bas)
# Pour éviter l'import circulaire, on la référence par son nom dans relationship


class PermissionAction(str, enum.Enum):
    """Actions possibles sur les ressources"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    EXPORT = "export"      # Export Excel/PDF
    IMPORT = "import"      # Import CSV/Excel
    MANAGE = "manage"      # Gestion complète (pour admins)


class PermissionResource(str, enum.Enum):
    """Ressources du système"""
    ORGANISATIONS = "organisations"
    PEOPLE = "people"
    MANDATS = "mandats"
    INTERACTIONS = "interactions"
    TASKS = "tasks"
    DOCUMENTS = "documents"
    USERS = "users"
    ROLES = "roles"
    PERMISSIONS = "permissions"
    TEAMS = "teams"
    SETTINGS = "settings"
    REPORTS = "reports"


class Permission(Base):
    """
    Modèle Permission - Définit une permission granulaire

    Une permission est une combinaison de:
    - resource: La ressource concernée (ex: "organisations")
    - action: L'action permise (ex: "create")

    Exemple: Permission(resource="organisations", action="create")
              = Droit de créer des organisations
    """
    __tablename__ = "permissions"

    id = Column(Integer, primary_key=True, index=True)

    # Ressource et action
    resource = Column(
        SQLEnum(PermissionResource),
        nullable=False,
        index=True
    )
    action = Column(
        SQLEnum(PermissionAction),
        nullable=False,
        index=True
    )

    # Métadonnées
    name = Column(String(100), unique=True, nullable=False)
    # Ex: "organisations:create", "people:read"

    display_name = Column(String(200), nullable=False)
    # Ex: "Créer des organisations", "Lire les contacts"

    description = Column(Text, nullable=True)

    # Système
    is_active = Column(Boolean, default=True, index=True)
    is_system = Column(Boolean, default=False)  # Permission système (non modifiable)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    # Utilisation de back_populates pour éviter les imports circulaires
    roles = relationship(
        "Role",
        secondary="role_permissions",
        back_populates="permissions",
        lazy="selectin"
    )

    def __repr__(self):
        return f"<Permission {self.name}>"

    @classmethod
    def create_permission_name(cls, resource: str, action: str) -> str:
        """
        Crée un nom de permission standardisé

        Args:
            resource: La ressource
            action: L'action

        Returns:
            str: Nom formaté "resource:action"
        """
        return f"{resource}:{action}"

    def to_dict(self):
        """Convertit la permission en dictionnaire"""
        return {
            "id": self.id,
            "name": self.name,
            "resource": self.resource,
            "action": self.action,
            "display_name": self.display_name,
            "description": self.description,
            "is_active": self.is_active,
            "is_system": self.is_system,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# Permissions prédéfinies par défaut
DEFAULT_PERMISSIONS = [
    # Organisations
    ("organisations", "create", "Créer des organisations"),
    ("organisations", "read", "Consulter les organisations"),
    ("organisations", "update", "Modifier les organisations"),
    ("organisations", "delete", "Supprimer les organisations"),
    ("organisations", "export", "Exporter les organisations"),
    ("organisations", "import", "Importer les organisations"),

    # People
    ("people", "create", "Créer des contacts"),
    ("people", "read", "Consulter les contacts"),
    ("people", "update", "Modifier les contacts"),
    ("people", "delete", "Supprimer les contacts"),
    ("people", "export", "Exporter les contacts"),
    ("people", "import", "Importer les contacts"),

    # Mandats
    ("mandats", "create", "Créer des mandats"),
    ("mandats", "read", "Consulter les mandats"),
    ("mandats", "update", "Modifier les mandats"),
    ("mandats", "delete", "Supprimer les mandats"),
    ("mandats", "export", "Exporter les mandats"),

    # Interactions
    ("interactions", "create", "Créer des interactions"),
    ("interactions", "read", "Consulter les interactions"),
    ("interactions", "update", "Modifier les interactions"),
    ("interactions", "delete", "Supprimer les interactions"),

    # Tasks
    ("tasks", "create", "Créer des tâches"),
    ("tasks", "read", "Consulter les tâches"),
    ("tasks", "update", "Modifier les tâches"),
    ("tasks", "delete", "Supprimer les tâches"),

    # Documents
    ("documents", "create", "Téléverser des documents"),
    ("documents", "read", "Consulter les documents"),
    ("documents", "update", "Modifier les documents"),
    ("documents", "delete", "Supprimer les documents"),

    # Users
    ("users", "create", "Créer des utilisateurs"),
    ("users", "read", "Consulter les utilisateurs"),
    ("users", "update", "Modifier les utilisateurs"),
    ("users", "delete", "Supprimer les utilisateurs"),
    ("users", "manage", "Gérer les utilisateurs"),

    # Roles & Permissions
    ("roles", "create", "Créer des rôles"),
    ("roles", "read", "Consulter les rôles"),
    ("roles", "update", "Modifier les rôles"),
    ("roles", "delete", "Supprimer les rôles"),
    ("roles", "manage", "Gérer les rôles"),

    ("permissions", "read", "Consulter les permissions"),
    ("permissions", "manage", "Gérer les permissions"),

    # Teams
    ("teams", "create", "Créer des équipes"),
    ("teams", "read", "Consulter les équipes"),
    ("teams", "update", "Modifier les équipes"),
    ("teams", "delete", "Supprimer les équipes"),

    # Settings
    ("settings", "read", "Consulter les paramètres"),
    ("settings", "update", "Modifier les paramètres"),

    # Reports
    ("reports", "read", "Consulter les rapports"),
    ("reports", "export", "Exporter les rapports"),
]


# Permissions par rôle (configuration par défaut)
ROLE_PERMISSIONS_MAP = {
    "admin": [
        # Tous les droits
        "organisations:*", "people:*", "mandats:*", "interactions:*",
        "tasks:*", "documents:*", "users:*", "roles:*", "permissions:*",
        "teams:*", "settings:*", "reports:*"
    ],

    "manager": [
        # Gestion complète des données métier
        "organisations:create", "organisations:read", "organisations:update", "organisations:export",
        "people:create", "people:read", "people:update", "people:export",
        "mandats:create", "mandats:read", "mandats:update", "mandats:export",
        "interactions:create", "interactions:read", "interactions:update",
        "tasks:create", "tasks:read", "tasks:update", "tasks:delete",
        "documents:create", "documents:read", "documents:update", "documents:delete",
        # Lecture des utilisateurs et équipes
        "users:read", "teams:read",
        # Rapports
        "reports:read", "reports:export",
    ],

    "user": [
        # Droits sur ses propres données
        "organisations:read", "organisations:update",
        "people:read", "people:update",
        "mandats:read", "mandats:update",
        "interactions:create", "interactions:read", "interactions:update",
        "tasks:create", "tasks:read", "tasks:update",
        "documents:create", "documents:read",
        # Lecture limitée
        "users:read", "teams:read",
    ],

    "viewer": [
        # Lecture seule
        "organisations:read",
        "people:read",
        "mandats:read",
        "interactions:read",
        "tasks:read",
        "documents:read",
        "reports:read",
    ],
}
