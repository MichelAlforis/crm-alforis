"""Routes API pour la gestion des utilisateurs."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from core import get_current_user, get_db
from core.permissions import require_admin, require_permission
from models.user import User
from schemas.user import UserCreate, UserListResponse, UserResponse, UserUpdate
from services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


class UpdateProfileRequest(BaseModel):
    """Requête de mise à jour du profil utilisateur."""

    full_name: Optional[str] = Field(None, max_length=255, description="Nom complet")
    email: Optional[str] = Field(None, description="Adresse email")


@router.put("/me")
async def update_my_profile(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Mettre à jour son propre profil (utilisateur connecté).

    Permet de modifier son nom complet et email.
    """
    user_id = int(current_user.get("sub"))

    # Récupérer l'utilisateur
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    # Mettre à jour les champs fournis
    if payload.full_name is not None:
        user.full_name = payload.full_name

    if payload.email is not None:
        # Vérifier si l'email n'est pas déjà utilisé
        existing = (
            db.query(User).filter(User.email == payload.email.lower(), User.id != user_id).first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Cet email est déjà utilisé"
            )
        user.email = payload.email.lower()

    try:
        db.commit()
        db.refresh(user)
        return {"message": "Profil mis à jour avec succès"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la mise à jour: {str(e)}",
        )


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


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin())],
)
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


@router.delete(
    "/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin())]
)
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
