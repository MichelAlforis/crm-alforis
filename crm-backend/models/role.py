"""
Modèle Role - Gestion des rôles utilisateurs

Hiérarchie des rôles:
- ADMIN: Tous les droits (gestion système, utilisateurs, données)
- MANAGER: Gestion d'équipe (voir/modifier son équipe)
- USER: Utilisateur standard (voir/modifier ses propres données)
- VIEWER: Lecture seule (voir les données de son équipe)
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from models.base import Base


class UserRole(str, enum.Enum):
    """Énumération des rôles disponibles"""
    ADMIN = "admin"           # Administrateur système
    MANAGER = "manager"       # Manager d'équipe
    USER = "user"             # Utilisateur standard
    VIEWER = "viewer"         # Lecture seule


# Table d'association Role <-> Permission (many-to-many)
role_permissions = Table(
    'role_permissions',
    Base.metadata,
    Column('role_id', Integer, ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
    Column('permission_id', Integer, ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
    Column('created_at', DateTime, default=datetime.utcnow)
)


class Role(Base):
    """
    Modèle Role - Définit les rôles et leurs permissions

    Chaque rôle a un ensemble de permissions qui définissent
    ce que les utilisateurs avec ce rôle peuvent faire.
    """
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Hiérarchie (niveau de permission, plus élevé = plus de droits)
    level = Column(Integer, nullable=False, default=0, index=True)
    # VIEWER: 0, USER: 1, MANAGER: 2, ADMIN: 3

    # Système
    is_active = Column(Boolean, default=True, index=True)
    is_system = Column(Boolean, default=False)  # Rôle système (non modifiable)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relations
    permissions = relationship(
        "Permission",
        secondary=role_permissions,
        back_populates="roles",
        lazy="joined"
    )
    users = relationship("User", back_populates="role")

    def __repr__(self):
        return f"<Role {self.name} (level={self.level})>"

    def has_permission(self, resource: str, action: str) -> bool:
        """
        Vérifie si ce rôle a une permission spécifique

        Args:
            resource: La ressource (ex: "organisations", "people")
            action: L'action (ex: "create", "read", "update", "delete")

        Returns:
            bool: True si le rôle a la permission
        """
        for permission in self.permissions:
            if permission.resource == resource and permission.action == action:
                return True
        return False

    def has_any_permission(self, resource: str) -> bool:
        """
        Vérifie si ce rôle a n'importe quelle permission sur une ressource

        Args:
            resource: La ressource (ex: "organisations")

        Returns:
            bool: True si le rôle a au moins une permission
        """
        return any(p.resource == resource for p in self.permissions)

    def get_permissions_for_resource(self, resource: str) -> list:
        """
        Retourne toutes les permissions pour une ressource donnée

        Args:
            resource: La ressource

        Returns:
            list: Liste des actions permises ["create", "read", ...]
        """
        return [
            p.action for p in self.permissions
            if p.resource == resource
        ]

    @classmethod
    def get_role_level(cls, role_name: str) -> int:
        """
        Retourne le niveau hiérarchique d'un rôle

        Args:
            role_name: Nom du rôle

        Returns:
            int: Niveau (0-3)
        """
        levels = {
            UserRole.VIEWER: 0,
            UserRole.USER: 1,
            UserRole.MANAGER: 2,
            UserRole.ADMIN: 3,
        }
        return levels.get(role_name, 0)

    def to_dict(self):
        """Convertit le rôle en dictionnaire"""
        return {
            "id": self.id,
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "level": self.level,
            "is_active": self.is_active,
            "is_system": self.is_system,
            "permissions": [p.to_dict() for p in self.permissions],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
