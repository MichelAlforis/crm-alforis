"""
Module Permissions - Système RBAC (Role-Based Access Control)

Ce module fournit:
- Décorateurs pour protéger les routes FastAPI
- Vérification des permissions
- Filtrage des données par équipe/utilisateur
- Helpers pour gérer les permissions

Usage:
    from core.permissions import require_permission, has_permission

    @router.delete("/organisations/{id}")
    @require_permission("organisations", "delete")
    async def delete_organisation(id: int, current_user: User = Depends(get_current_user)):
        ...
"""

from functools import wraps
from typing import Optional, List, Callable
from fastapi import HTTPException, Depends, status
from sqlalchemy.orm import Session

from core.database import get_db
from models.user import User
from models.role import Role, UserRole
from models.permission import Permission, PermissionAction, PermissionResource


# ============================================
# Vérification des Permissions
# ============================================

def has_permission(
    user: User,
    resource: str,
    action: str,
    db: Session
) -> bool:
    """
    Vérifie si un utilisateur a une permission spécifique

    Args:
        user: L'utilisateur
        resource: La ressource (ex: "organisations")
        action: L'action (ex: "create", "read")
        db: Session database

    Returns:
        bool: True si l'utilisateur a la permission
    """
    if not user or not user.role:
        return False

    # Les admins ont tous les droits
    if user.role.name == UserRole.ADMIN:
        return True

    # Vérifier les permissions du rôle
    return user.role.has_permission(resource, action)


def has_any_permission(
    user: User,
    resource: str,
    db: Session
) -> bool:
    """
    Vérifie si un utilisateur a n'importe quelle permission sur une ressource

    Args:
        user: L'utilisateur
        resource: La ressource
        db: Session database

    Returns:
        bool: True si l'utilisateur a au moins une permission
    """
    if not user or not user.role:
        return False

    if user.role.name == UserRole.ADMIN:
        return True

    return user.role.has_any_permission(resource)


def get_user_permissions(user: User, db: Session) -> List[dict]:
    """
    Retourne toutes les permissions d'un utilisateur

    Args:
        user: L'utilisateur
        db: Session database

    Returns:
        List[dict]: Liste des permissions [{resource, action, display_name}]
    """
    if not user or not user.role:
        return []

    return [p.to_dict() for p in user.role.permissions]


def check_role_level(
    user: User,
    min_level: int
) -> bool:
    """
    Vérifie si l'utilisateur a un niveau de rôle suffisant

    Args:
        user: L'utilisateur
        min_level: Niveau minimum requis (0=viewer, 1=user, 2=manager, 3=admin)

    Returns:
        bool: True si le niveau est suffisant
    """
    if not user or not user.role:
        return False

    return user.role.level >= min_level


# ============================================
# Décorateurs FastAPI
# ============================================

def require_permission(resource: str, action: str):
    """
    Décorateur pour exiger une permission spécifique sur une route

    Usage:
        @router.delete("/organisations/{id}")
        @require_permission("organisations", "delete")
        async def delete_organisation(id: int, current_user: User = Depends(get_current_user)):
            ...

    Args:
        resource: La ressource (ex: "organisations")
        action: L'action (ex: "create", "read", "update", "delete")

    Raises:
        HTTPException: 403 si l'utilisateur n'a pas la permission
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user: User, db: Session = Depends(get_db), **kwargs):
            # Vérifier la permission
            if not has_permission(current_user, resource, action, db):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission requise: {resource}:{action}"
                )

            # Exécuter la fonction
            return await func(*args, current_user=current_user, db=db, **kwargs)

        return wrapper
    return decorator


def require_role(min_role: UserRole):
    """
    Décorateur pour exiger un rôle minimum sur une route

    Usage:
        @router.get("/admin/settings")
        @require_role(UserRole.MANAGER)
        async def get_settings(current_user: User = Depends(get_current_user)):
            ...

    Args:
        min_role: Rôle minimum requis

    Raises:
        HTTPException: 403 si l'utilisateur n'a pas le bon rôle
    """
    min_level = Role.get_role_level(min_role)

    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, current_user: User, **kwargs):
            # Vérifier le niveau de rôle
            if not check_role_level(current_user, min_level):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Rôle requis: {min_role.value} ou supérieur"
                )

            # Exécuter la fonction
            return await func(*args, current_user=current_user, **kwargs)

        return wrapper
    return decorator


def require_admin():
    """
    Décorateur pour exiger le rôle ADMIN

    Usage:
        @router.delete("/users/{id}")
        @require_admin()
        async def delete_user(id: int, current_user: User = Depends(get_current_user)):
            ...

    Raises:
        HTTPException: 403 si l'utilisateur n'est pas admin
    """
    return require_role(UserRole.ADMIN)


# ============================================
# Filtrage des Données par Équipe
# ============================================

def can_access_organisation(
    user: User,
    organisation_id: int,
    db: Session
) -> bool:
    """
    Vérifie si un utilisateur peut accéder à une organisation

    Règles:
    - ADMIN: Accès à tout
    - MANAGER: Accès à son équipe
    - USER: Accès à ses propres organisations
    - VIEWER: Accès à son équipe (lecture seule)

    Args:
        user: L'utilisateur
        organisation_id: ID de l'organisation
        db: Session database

    Returns:
        bool: True si l'utilisateur peut accéder
    """
    from models.organisation import Organisation

    # Admin a accès à tout
    if user.role.name == UserRole.ADMIN:
        return True

    # Récupérer l'organisation
    org = db.query(Organisation).filter(Organisation.id == organisation_id).first()
    if not org:
        return False

    # Manager et Viewer: accès à leur équipe
    if user.role.name in [UserRole.MANAGER, UserRole.VIEWER]:
        if user.team_id and org.owner:
            return org.owner.team_id == user.team_id
        return False

    # USER: accès seulement à ses propres données
    if user.role.name == UserRole.USER:
        return org.owner_id == user.id

    return False


def filter_query_by_team(query, user: User, model_class):
    """
    Filtre une requête SQLAlchemy selon l'équipe de l'utilisateur

    Usage:
        query = db.query(Organisation)
        query = filter_query_by_team(query, current_user, Organisation)
        results = query.all()

    Args:
        query: Requête SQLAlchemy
        user: L'utilisateur
        model_class: La classe du modèle (Organisation, Person, etc.)

    Returns:
        Query filtrée
    """
    # Gérer user comme dict ou objet
    if isinstance(user, dict):
        user_role = user.get('role', {}).get('name') if isinstance(user.get('role'), dict) else user.get('role')
        user_id = user.get('id')
        user_team_id = user.get('team_id')
    else:
        user_role = user.role.name if hasattr(user.role, 'name') else user.role
        user_id = user.id
        user_team_id = user.team_id

    # Admin voit tout
    if user_role == UserRole.ADMIN:
        return query

    # Manager et Viewer: voir leur équipe
    if user_role in [UserRole.MANAGER, UserRole.VIEWER]:
        if user_team_id:
            # Filtrer par team_id du owner
            from models.user import User as UserModel
            query = query.join(UserModel, model_class.owner_id == UserModel.id)
            query = query.filter(UserModel.team_id == user_team_id)
        else:
            # Pas d'équipe = pas de données
            query = query.filter(False)

    # USER: voir seulement ses propres données
    elif user_role == UserRole.USER:
        query = query.filter(model_class.owner_id == user_id)

    else:
        # Rôle inconnu = pas de données
        query = query.filter(False)

    return query


# ============================================
# Initialisation des Permissions par Défaut
# ============================================

def init_default_permissions(db: Session):
    """
    Initialise les permissions par défaut dans la base de données

    Cette fonction doit être appelée au démarrage de l'application
    pour créer les permissions et rôles de base.

    Args:
        db: Session database
    """
    from models.permission import DEFAULT_PERMISSIONS, ROLE_PERMISSIONS_MAP

    # 1. Créer les permissions
    created_permissions = {}

    for resource, action, display_name in DEFAULT_PERMISSIONS:
        permission_name = Permission.create_permission_name(resource, action)

        # Vérifier si existe déjà
        existing = db.query(Permission).filter(Permission.name == permission_name).first()
        if existing:
            created_permissions[permission_name] = existing
            continue

        # Créer la permission
        permission = Permission(
            resource=resource,
            action=action,
            name=permission_name,
            display_name=display_name,
            is_system=True  # Permission système
        )
        db.add(permission)
        db.flush()
        created_permissions[permission_name] = permission

    db.commit()

    # 2. Créer les rôles
    roles_config = [
        (UserRole.ADMIN, "Administrateur", "Accès complet au système", 3),
        (UserRole.MANAGER, "Manager", "Gestion d'équipe et données complètes", 2),
        (UserRole.USER, "Utilisateur", "Accès standard aux données", 1),
        (UserRole.VIEWER, "Lecteur", "Accès en lecture seule", 0),
    ]

    for role_name, display_name, description, level in roles_config:
        # Vérifier si existe
        existing_role = db.query(Role).filter(Role.name == role_name).first()
        if existing_role:
            role = existing_role
        else:
            # Créer le rôle
            role = Role(
                name=role_name,
                display_name=display_name,
                description=description,
                level=level,
                is_system=True
            )
            db.add(role)
            db.flush()

        # 3. Assigner les permissions au rôle
        role_perms = ROLE_PERMISSIONS_MAP.get(role_name, [])

        for perm_pattern in role_perms:
            # Support wildcard "organisations:*" = toutes les actions
            if perm_pattern.endswith(":*"):
                resource_prefix = perm_pattern[:-2]
                # Ajouter toutes les permissions de cette ressource
                matching_perms = [
                    p for name, p in created_permissions.items()
                    if name.startswith(f"{resource_prefix}:")
                ]
            else:
                # Permission exacte
                matching_perms = [created_permissions.get(perm_pattern)]
                matching_perms = [p for p in matching_perms if p is not None]

            # Ajouter les permissions au rôle (si pas déjà présentes)
            for perm in matching_perms:
                if perm not in role.permissions:
                    role.permissions.append(perm)

    db.commit()

    print(f"✅ Permissions initialisées: {len(created_permissions)} permissions, 4 rôles")


# ============================================
# Helpers Utilitaires
# ============================================

def get_accessible_resource_ids(
    user: User,
    resource_type: str,
    db: Session
) -> List[int]:
    """
    Retourne les IDs des ressources accessibles par l'utilisateur

    Args:
        user: L'utilisateur
        resource_type: Type de ressource ("organisations", "people", etc.)
        db: Session database

    Returns:
        List[int]: Liste des IDs accessibles
    """
    from models.organisation import Organisation
    from models.person import Person

    model_map = {
        "organisations": Organisation,
        "people": Person,
        # Ajouter d'autres modèles selon besoin
    }

    model_class = model_map.get(resource_type)
    if not model_class:
        return []

    # Construire la requête filtrée
    query = db.query(model_class.id)
    query = filter_query_by_team(query, user, model_class)

    # Retourner les IDs
    return [row[0] for row in query.all()]


def can_user_modify(user: User, resource_owner_id: int) -> bool:
    """
    Vérifie si un utilisateur peut modifier une ressource

    Args:
        user: L'utilisateur
        resource_owner_id: ID du propriétaire de la ressource

    Returns:
        bool: True si l'utilisateur peut modifier
    """
    # Admin peut tout modifier
    if user.role.name == UserRole.ADMIN:
        return True

    # Manager peut modifier les données de son équipe
    if user.role.name == UserRole.MANAGER:
        # Vérifier si le owner est dans la même équipe
        # (nécessite une requête DB, simplification ici)
        return True  # À implémenter selon besoin

    # User peut modifier seulement ses propres données
    if user.role.name == UserRole.USER:
        return resource_owner_id == user.id

    # Viewer ne peut rien modifier
    return False
