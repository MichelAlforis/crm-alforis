"""Routes API pour la gestion des utilisateurs."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from core import get_db, get_current_user
from core.permissions import require_permission, require_admin
from schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse
from services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=UserListResponse, dependencies=[Depends(require_admin())])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    q: Optional[str] = Query(None, description="Recherche par email, username ou nom"),
    role_id: Optional[int] = Query(None, description="Filtrer par rôle"),
    team_id: Optional[int] = Query(None, description="Filtrer par équipe"),
    include_inactive: bool = Query(False, description="Inclure utilisateurs inactifs"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Liste tous les utilisateurs (ADMIN uniquement).

    Permissions requises: ADMIN
    """
    service = UserService(db)

    if q:
        users, total = await service.search(q, skip=skip, limit=limit)
    else:
        users, total = await service.get_all(
            skip=skip,
            limit=limit,
            include_inactive=include_inactive,
            role_id=role_id,
            team_id=team_id,
        )

    # Enrichir avec role_name et team_name
    items = []
    for user in users:
        user_dict = UserResponse.model_validate(user).model_dump()
        if user.role:
            user_dict["role_name"] = user.role.display_name or user.role.name.value
        if user.team:
            user_dict["team_name"] = user.team.name
        items.append(UserResponse(**user_dict))

    return UserListResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin())])
async def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Créer un nouvel utilisateur (ADMIN uniquement).

    Permissions requises: ADMIN
    """
    service = UserService(db)
    user = await service.create(payload)

    user_dict = UserResponse.model_validate(user).model_dump()
    if user.role:
        user_dict["role_name"] = user.role.display_name or user.role.name.value
    if user.team:
        user_dict["team_name"] = user.team.name

    return UserResponse(**user_dict)


@router.get("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Récupérer un utilisateur par ID (ADMIN uniquement).

    Permissions requises: ADMIN
    """
    service = UserService(db)
    user = await service.get_by_id(user_id)

    user_dict = UserResponse.model_validate(user).model_dump()
    if user.role:
        user_dict["role_name"] = user.role.display_name or user.role.name.value
    if user.team:
        user_dict["team_name"] = user.team.name

    return UserResponse(**user_dict)


@router.put("/{user_id}", response_model=UserResponse, dependencies=[Depends(require_admin())])
async def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mettre à jour un utilisateur (ADMIN uniquement).

    Permissions requises: ADMIN
    """
    service = UserService(db)
    user = await service.update(user_id, payload)

    user_dict = UserResponse.model_validate(user).model_dump()
    if user.role:
        user_dict["role_name"] = user.role.display_name or user.role.name.value
    if user.team:
        user_dict["team_name"] = user.team.name

    return UserResponse(**user_dict)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin())])
async def delete_user(
    user_id: int,
    hard_delete: bool = Query(False, description="Suppression définitive (sinon soft delete)"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Supprimer un utilisateur (ADMIN uniquement).

    Par défaut: soft delete (is_active=False)
    Avec hard_delete=true: suppression définitive

    Permissions requises: ADMIN
    """
    service = UserService(db)

    if hard_delete:
        await service.hard_delete(user_id)
    else:
        await service.delete(user_id)

    return None
