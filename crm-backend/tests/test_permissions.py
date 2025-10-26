"""
Tests - Système de Permissions RBAC

Tests pour:
- Modèles Role et Permission
- Décorateurs @require_permission, @require_role
- Filtrage des données par équipe
- Vérification des permissions
"""

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from core.permissions import (
    can_access_organisation,
    check_role_level,
    filter_query_by_team,
    has_any_permission,
    has_permission,
    init_default_permissions,
)
from models.permission import Permission, PermissionAction, PermissionResource
from models.role import Role, UserRole
from models.team import Team
from models.user import User

# ============================================
# Tests Modèles
# ============================================

def test_create_role(test_db: Session):
    """Test création d'un rôle"""
    role = Role(
        name=UserRole.MANAGER,
        display_name="Manager",
        description="Gestionnaire d'équipe",
        level=2,
    )
    test_db.add(role)
    test_db.commit()

    assert role.id is not None
    assert role.name == UserRole.MANAGER
    assert role.level == 2


def test_create_permission(test_db: Session):
    """Test création d'une permission"""
    permission = Permission(
        resource=PermissionResource.ORGANISATIONS,
        action=PermissionAction.CREATE,
        name="organisations:create",
        display_name="Créer des organisations",
    )
    test_db.add(permission)
    test_db.commit()

    assert permission.id is not None
    assert permission.resource == PermissionResource.ORGANISATIONS
    assert permission.action == PermissionAction.CREATE


def test_role_permissions_relationship(test_db: Session):
    """Test relation Role <-> Permission"""
    # Créer un rôle
    role = Role(
        name=UserRole.USER,
        display_name="Utilisateur",
        level=1,
    )
    test_db.add(role)
    test_db.flush()

    # Créer des permissions
    perm1 = Permission(
        resource=PermissionResource.ORGANISATIONS,
        action=PermissionAction.READ,
        name="organisations:read",
        display_name="Lire organisations",
    )
    perm2 = Permission(
        resource=PermissionResource.ORGANISATIONS,
        action=PermissionAction.UPDATE,
        name="organisations:update",
        display_name="Modifier organisations",
    )
    test_db.add_all([perm1, perm2])
    test_db.flush()

    # Associer les permissions au rôle
    role.permissions.append(perm1)
    role.permissions.append(perm2)
    test_db.commit()

    # Vérifier
    assert len(role.permissions) == 2
    assert perm1 in role.permissions
    assert perm2 in role.permissions


def test_role_has_permission(test_db: Session):
    """Test méthode has_permission() du rôle"""
    # Créer rôle avec permission
    role = Role(name=UserRole.MANAGER, display_name="Manager", level=2)
    perm = Permission(
        resource=PermissionResource.ORGANISATIONS,
        action=PermissionAction.DELETE,
        name="organisations:delete",
        display_name="Supprimer organisations",
    )
    test_db.add_all([role, perm])
    test_db.flush()

    role.permissions.append(perm)
    test_db.commit()

    # Vérifier has_permission
    assert role.has_permission("organisations", "delete") is True
    assert role.has_permission("organisations", "create") is False
    assert role.has_permission("people", "delete") is False


def test_role_get_permissions_for_resource(test_db: Session):
    """Test récupération des permissions par ressource"""
    role = Role(name=UserRole.USER, display_name="User", level=1)

    perms = [
        Permission(resource=PermissionResource.ORGANISATIONS, action=PermissionAction.READ, name="organisations:read", display_name="Read orgs"),
        Permission(resource=PermissionResource.ORGANISATIONS, action=PermissionAction.UPDATE, name="organisations:update", display_name="Update orgs"),
        Permission(resource=PermissionResource.PEOPLE, action=PermissionAction.READ, name="people:read", display_name="Read people"),
    ]

    test_db.add(role)
    test_db.add_all(perms)
    test_db.flush()

    for perm in perms:
        role.permissions.append(perm)
    test_db.commit()

    # Récupérer permissions pour organisations
    org_perms = role.get_permissions_for_resource("organisations")
    assert len(org_perms) == 2
    assert "read" in org_perms
    assert "update" in org_perms

    # Récupérer permissions pour people
    people_perms = role.get_permissions_for_resource("people")
    assert len(people_perms) == 1
    assert "read" in people_perms


# ============================================
# Tests Vérification Permissions
# ============================================

def test_has_permission_admin(test_db: Session, admin_user: User):
    """Test: Admin a toutes les permissions"""
    # Admin devrait avoir toutes les permissions
    assert has_permission(admin_user, "organisations", "create", test_db) is True
    assert has_permission(admin_user, "organisations", "delete", test_db) is True
    assert has_permission(admin_user, "users", "delete", test_db) is True


def test_has_permission_user_with_permission(test_db: Session):
    """Test: Utilisateur avec permission"""
    # Créer utilisateur avec permission
    role = Role(name=UserRole.USER, display_name="User", level=1)
    perm = Permission(
        resource=PermissionResource.ORGANISATIONS,
        action=PermissionAction.READ,
        name="organisations:read",
        display_name="Read orgs",
    )
    user = User(
        email="user@test.com",
        username="testuser",
        hashed_password="hashed",
        role=role,
    )

    test_db.add_all([role, perm, user])
    test_db.flush()

    role.permissions.append(perm)
    test_db.commit()

    # Vérifier permission
    assert has_permission(user, "organisations", "read", test_db) is True
    assert has_permission(user, "organisations", "delete", test_db) is False


def test_has_permission_user_without_permission(test_db: Session):
    """Test: Utilisateur sans permission"""
    role = Role(name=UserRole.VIEWER, display_name="Viewer", level=0)
    user = User(
        email="viewer@test.com",
        username="viewer",
        hashed_password="hashed",
        role=role,
    )

    test_db.add_all([role, user])
    test_db.commit()

    # Viewer sans permissions
    assert has_permission(user, "organisations", "delete", test_db) is False


def test_check_role_level(test_db: Session):
    """Test vérification niveau de rôle"""
    # Créer utilisateurs avec différents niveaux
    admin_role = Role(name=UserRole.ADMIN, display_name="Admin", level=3)
    manager_role = Role(name=UserRole.MANAGER, display_name="Manager", level=2)
    user_role = Role(name=UserRole.USER, display_name="User", level=1)

    admin = User(email="admin@test.com", username="admin", hashed_password="hash", role=admin_role)
    manager = User(email="manager@test.com", username="manager", hashed_password="hash", role=manager_role)
    user = User(email="user@test.com", username="user", hashed_password="hash", role=user_role)

    test_db.add_all([admin_role, manager_role, user_role, admin, manager, user])
    test_db.commit()

    # Admin (level 3) >= 2 = True
    assert check_role_level(admin, 2) is True

    # Manager (level 2) >= 2 = True
    assert check_role_level(manager, 2) is True

    # User (level 1) >= 2 = False
    assert check_role_level(user, 2) is False


# ============================================
# Tests Filtrage par Équipe
# ============================================

def test_filter_query_by_team_admin(test_db: Session, admin_user: User, sample_organisations):
    """Test: Admin voit toutes les organisations"""
    from models.organisation import Organisation

    query = test_db.query(Organisation)
    filtered_query = filter_query_by_team(query, admin_user, Organisation)

    results = filtered_query.all()

    # Admin voit tout
    assert len(results) == len(sample_organisations)


def test_filter_query_by_team_manager(test_db: Session):
    """Test: Manager voit son équipe"""
    from models.organisation import Organisation

    # Créer équipe
    team = Team(name="Team A")
    test_db.add(team)
    test_db.flush()

    # Créer manager de l'équipe
    manager_role = Role(name=UserRole.MANAGER, display_name="Manager", level=2)
    manager = User(
        email="manager@test.com",
        username="manager",
        hashed_password="hash",
        role=manager_role,
        team_id=team.id,
    )
    test_db.add_all([manager_role, manager])
    test_db.flush()

    # Créer organisations de l'équipe
    org1 = Organisation(name="Org 1", owner_id=manager.id)
    org2 = Organisation(name="Org 2", owner_id=manager.id)

    # Créer organisation d'une autre équipe
    other_user = User(email="other@test.com", username="other", hashed_password="hash", role=manager_role)
    org3 = Organisation(name="Org 3", owner_id=other_user.id)

    test_db.add_all([org1, org2, org3, other_user])
    test_db.commit()

    # Filtrer par équipe
    query = test_db.query(Organisation)
    filtered_query = filter_query_by_team(query, manager, Organisation)
    results = filtered_query.all()

    # Manager voit seulement son équipe
    assert len(results) == 2
    assert org1 in results
    assert org2 in results
    assert org3 not in results


def test_filter_query_by_team_user(test_db: Session):
    """Test: User voit seulement ses données"""
    from models.organisation import Organisation

    # Créer utilisateurs
    user_role = Role(name=UserRole.USER, display_name="User", level=1)
    user1 = User(email="user1@test.com", username="user1", hashed_password="hash", role=user_role)
    user2 = User(email="user2@test.com", username="user2", hashed_password="hash", role=user_role)

    test_db.add_all([user_role, user1, user2])
    test_db.flush()

    # Créer organisations
    org1 = Organisation(name="Org 1", owner_id=user1.id)
    org2 = Organisation(name="Org 2", owner_id=user2.id)

    test_db.add_all([org1, org2])
    test_db.commit()

    # User1 voit seulement ses organisations
    query = test_db.query(Organisation)
    filtered_query = filter_query_by_team(query, user1, Organisation)
    results = filtered_query.all()

    assert len(results) == 1
    assert org1 in results
    assert org2 not in results


# ============================================
# Tests Initialisation
# ============================================

def test_init_default_permissions(test_db: Session):
    """Test initialisation des permissions par défaut"""
    # Initialiser
    init_default_permissions(test_db)

    # Vérifier que les rôles ont été créés
    roles = test_db.query(Role).all()
    assert len(roles) == 4  # Admin, Manager, User, Viewer

    # Vérifier que les permissions ont été créées
    permissions = test_db.query(Permission).all()
    assert len(permissions) > 0

    # Vérifier que Admin a toutes les permissions
    admin_role = test_db.query(Role).filter(Role.name == UserRole.ADMIN).first()
    assert admin_role is not None
    assert len(admin_role.permissions) > 0

    # Vérifier que Viewer a moins de permissions que Manager
    viewer_role = test_db.query(Role).filter(Role.name == UserRole.VIEWER).first()
    manager_role = test_db.query(Role).filter(Role.name == UserRole.MANAGER).first()

    assert len(viewer_role.permissions) < len(manager_role.permissions)


# ============================================
# Tests Edge Cases
# ============================================

def test_permission_on_user_without_role(test_db: Session):
    """Test: Utilisateur sans rôle n'a aucune permission"""
    user = User(
        email="norole@test.com",
        username="norole",
        hashed_password="hash",
        role=None,  # Pas de rôle
    )
    test_db.add(user)
    test_db.commit()

    assert has_permission(user, "organisations", "read", test_db) is False
    assert check_role_level(user, 0) is False


def test_permission_create_name_format(test_db: Session):
    """Test: Format du nom de permission"""
    name = Permission.create_permission_name("organisations", "create")
    assert name == "organisations:create"

    name2 = Permission.create_permission_name("people", "delete")
    assert name2 == "people:delete"


def test_role_level_hierarchy():
    """Test: Hiérarchie des niveaux de rôles"""
    assert Role.get_role_level(UserRole.ADMIN) == 3
    assert Role.get_role_level(UserRole.MANAGER) == 2
    assert Role.get_role_level(UserRole.USER) == 1
    assert Role.get_role_level(UserRole.VIEWER) == 0


# ============================================
# Tests Performance
# ============================================

def test_bulk_permission_check(test_db: Session, admin_user: User):
    """Test: Vérification de permissions en masse"""
    resources = ["organisations", "people", "mandats", "tasks"]
    actions = ["create", "read", "update", "delete"]

    # Admin devrait passer tous les checks rapidement
    for resource in resources:
        for action in actions:
            assert has_permission(admin_user, resource, action, test_db) is True
