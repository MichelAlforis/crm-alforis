"""Routes API pour la gestion des utilisateurs."""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import JSONResponse
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


# ============================================================================
# RGPD COMPLIANCE ENDPOINTS (Articles 15, 17, 20 RGPD)
# ============================================================================


@router.get("/me/export")
async def export_my_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Export toutes les données personnelles de l'utilisateur connecté (RGPD Article 15 + 20).

    Droit d'accès (Article 15) + Droit à la portabilité (Article 20).
    Retourne un export JSON complet des données personnelles.
    """
    user_id = int(current_user.get("sub"))

    # Récupérer l'utilisateur
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    # Construire l'export complet
    export_data = {
        "metadata": {
            "export_date": datetime.now(timezone.utc).isoformat(),
            "user_id": user.id,
            "gdpr_article": "Article 15 (Droit d'accès) + Article 20 (Portabilité)",
            "format": "JSON",
        },
        "user_account": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
        },
        "role_and_team": {
            "role_id": user.role_id,
            "role_name": user.role.name.value if user.role else None,
            "team_id": user.team_id,
            "team_name": user.team.name if user.team else None,
        },
        "cgu_acceptance": {
            "cgu_accepted": user.cgu_accepted,
            "cgu_accepted_at": user.cgu_accepted_at.isoformat() if user.cgu_accepted_at else None,
            "cgu_version": user.cgu_version,
            "cgu_acceptance_ip": user.cgu_acceptance_ip,
        },
        "outlook_integration": {
            "outlook_connected": user.outlook_connected,
            "outlook_token_expires_at": (
                user.outlook_token_expires_at.isoformat() if user.outlook_token_expires_at else None
            ),
        },
        "related_data": {
            "organisations_owned_count": len(user.organisations_owned) if user.organisations_owned else 0,
            "organisations_created_count": (
                len(user.organisations_created) if user.organisations_created else 0
            ),
            "organisations_assigned_count": (
                len(user.organisations_assigned) if user.organisations_assigned else 0
            ),
            "notifications_count": len(user.notifications) if user.notifications else 0,
            "mailing_lists_count": len(user.mailing_lists) if user.mailing_lists else 0,
            "push_subscriptions_count": (
                len(user.push_subscriptions) if user.push_subscriptions else 0
            ),
        },
        "data_protection": {
            "data_controller": "ALFORIS FINANCE - SIREN 943 007 229",
            "data_location": "Union Européenne (Hetzner - Allemagne)",
            "privacy_policy": "https://crm.alforis.fr/legal/privacy",
            "contact_dpo": "rgpd@alforis.fr",
            "cnil_complaint": "https://www.cnil.fr/fr/plaintes",
        },
    }

    return export_data


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(
    request: Request,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> None:
    """
    Supprimer/Anonymiser le compte de l'utilisateur connecté (RGPD Article 17).

    Droit à l'effacement ("droit à l'oubli").

    IMPORTANT: Cette action est IRRÉVERSIBLE.
    - Anonymise les données personnelles (nom, email remplacés par "ANONYMIZED_XXX")
    - Désactive le compte (is_active = False)
    - Conserve les logs pour conformité (obligation légale)
    - Supprime les tokens d'accès
    """
    user_id = int(current_user.get("sub"))

    # Récupérer l'utilisateur
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    # Empêcher la suppression des superusers (protection)
    if user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Les comptes super-administrateurs ne peuvent pas être supprimés via cette API. Contactez rgpd@alforis.fr",
        )

    # Anonymisation des données personnelles
    anonymized_suffix = f"ANONYMIZED_{user.id}_{int(datetime.now(timezone.utc).timestamp())}"

    user.email = f"anonymized_{anonymized_suffix}@deleted.local"
    user.username = f"user_{anonymized_suffix}" if user.username else None
    user.full_name = "Utilisateur Anonymisé"
    user.hashed_password = "ANONYMIZED"  # Invalide le mot de passe
    user.is_active = False

    # Supprimer les tokens sensibles
    user.encrypted_outlook_access_token = None
    user.encrypted_outlook_refresh_token = None
    user.outlook_token_expires_at = None
    user.outlook_connected = False

    # Marquer comme anonymisé (si champs RGPD existent sur User)
    # Note: Ces champs n'existent pas encore sur User, mais on les ajoute pour Person/Organisation
    user.updated_at = datetime.now(timezone.utc)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'anonymisation: {str(e)}",
        )

    # Note: Le frontend doit déconnecter l'utilisateur après cette action
    return None


@router.get("/me/privacy")
async def get_my_privacy_settings(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    """
    Récupérer les paramètres de confidentialité et droits RGPD de l'utilisateur.

    Informations sur les données collectées, durées de conservation, droits exercés.
    """
    user_id = int(current_user.get("sub"))

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Utilisateur non trouvé")

    return {
        "user_id": user.id,
        "email": user.email,
        "data_protection": {
            "cgu_accepted": user.cgu_accepted,
            "cgu_accepted_at": user.cgu_accepted_at.isoformat() if user.cgu_accepted_at else None,
            "cgu_version": user.cgu_version,
            "account_created_at": user.created_at.isoformat() if user.created_at else None,
            "last_login": user.last_login_at.isoformat() if user.last_login_at else None,
        },
        "your_rights": {
            "access": {
                "description": "Obtenir une copie de vos données (Article 15 RGPD)",
                "action": "GET /api/v1/users/me/export",
            },
            "rectification": {
                "description": "Corriger vos données inexactes (Article 16 RGPD)",
                "action": "PUT /api/v1/users/me",
            },
            "erasure": {
                "description": "Supprimer votre compte (Article 17 RGPD)",
                "action": "DELETE /api/v1/users/me",
                "warning": "Action irréversible - anonymisation définitive",
            },
            "portability": {
                "description": "Récupérer vos données en format structuré (Article 20 RGPD)",
                "action": "GET /api/v1/users/me/export",
            },
            "complaint": {
                "description": "Réclamation auprès de la CNIL",
                "contact": "https://www.cnil.fr/fr/plaintes",
            },
        },
        "data_retention": {
            "account_data": "Durée du contrat + 1 an",
            "logs_connexion": "12 mois",
            "logs_audit_rgpd": "3 ans",
        },
        "contact": {
            "dpo_email": "rgpd@alforis.fr",
            "privacy_policy": "/legal/privacy",
            "cgu": "/legal/cgu",
        },
    }
