"""
Migration Alembic - Initialisation des données RBAC

Cette migration insère les permissions et rôles par défaut
afin que le système RBAC soit immédiatement opérationnel.
"""

from __future__ import annotations

import sys
from pathlib import Path

from alembic import op
import sqlalchemy as sa
from sqlalchemy.orm import Session


revision = "seed_rbac_defaults"
down_revision = "add_notifications_table"
branch_labels = None
depends_on = None

# S'assurer que le répertoire racine est dans PYTHONPATH pour importer les modèles
ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.append(str(ROOT_DIR))

from models.role import Role, UserRole  # noqa: E402
from models.permission import (  # noqa: E402
    Permission,
    PermissionAction,
    PermissionResource,
    DEFAULT_PERMISSIONS,
    ROLE_PERMISSIONS_MAP,
)


def upgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        _seed_permissions(session)
        _seed_roles(session)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def downgrade():
    bind = op.get_bind()
    session = Session(bind=bind)

    try:
        # Supprimer les associations rôle/permission pour les rôles système
        system_roles = (
            session.query(Role)
            .filter(Role.is_system.is_(True))
            .all()
        )
        for role in system_roles:
            role.permissions = []

        session.flush()

        # Supprimer les rôles système créés par la seed
        session.query(Role).filter(Role.is_system.is_(True)).delete(
            synchronize_session=False
        )

        # Supprimer les permissions système créées par la seed
        session.query(Permission).filter(
            Permission.is_system.is_(True)
        ).delete(synchronize_session=False)

        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def _seed_permissions(session: Session):
    """
    Crée les permissions par défaut si elles n'existent pas déjà.
    """
    for resource, action, display_name in DEFAULT_PERMISSIONS:
        try:
            resource_enum = PermissionResource(resource)
        except ValueError:
            # Valeur inattendue, ignorer pour éviter de bloquer la migration
            continue

        try:
            action_enum = PermissionAction(action)
        except ValueError:
            continue

        permission_name = Permission.create_permission_name(
            resource_enum.value,
            action_enum.value,
        )

        existing = (
            session.query(Permission)
            .filter(Permission.name == permission_name)
            .one_or_none()
        )
        if existing:
            # Marquer comme permission système si nécessaire
            if existing.is_system is False:
                existing.is_system = True
            if existing.is_active is False:
                existing.is_active = True
            continue

        permission = Permission(
            resource=resource_enum,
            action=action_enum,
            name=permission_name,
            display_name=display_name,
            is_active=True,
            is_system=True,
        )
        session.add(permission)

    session.flush()


def _seed_roles(session: Session):
    """
    Crée les rôles par défaut et associe les permissions.
    """
    # Précharger les permissions disponibles
    permissions_by_name = {
        perm.name: perm for perm in session.query(Permission).all()
    }

    roles_config = [
        (UserRole.ADMIN, "Administrateur", "Accès complet au système", 3),
        (UserRole.MANAGER, "Manager", "Gestion d'équipe étendue", 2),
        (UserRole.USER, "Utilisateur", "Accès standard aux données", 1),
        (UserRole.VIEWER, "Lecteur", "Accès lecture seule", 0),
    ]

    for role_enum, display_name, description, level in roles_config:
        role = (
            session.query(Role)
            .filter(Role.name == role_enum.value)
            .one_or_none()
        )

        if role is None:
            role = Role(
                name=role_enum.value,
                display_name=display_name,
                description=description,
                level=level,
                is_active=True,
                is_system=True,
            )
            session.add(role)
            session.flush()
        else:
            # Mettre à jour les métadonnées système si besoin
            role.display_name = display_name
            role.description = description
            role.level = level
            role.is_active = True
            role.is_system = True

        # Assigner les permissions au rôle
        role_permissions_patterns = ROLE_PERMISSIONS_MAP.get(
            role_enum.value, []
        )

        for pattern in role_permissions_patterns:
            if pattern.endswith(":*"):
                resource_prefix = pattern[:-2]
                matching_permissions = [
                    perm
                    for name, perm in permissions_by_name.items()
                    if name.startswith(f"{resource_prefix}:")
                ]
            else:
                perm = permissions_by_name.get(pattern)
                matching_permissions = [perm] if perm else []

            for permission in matching_permissions:
                if permission and permission not in role.permissions:
                    role.permissions.append(permission)

    session.flush()
