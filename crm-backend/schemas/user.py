"""Schemas Pydantic pour User."""

from datetime import datetime
from typing import Optional

from pydantic import EmailStr, Field, field_validator

from models.role import UserRole
from schemas.base import BaseSchema, TimestampedSchema


class UserBase(BaseSchema):
    """Schema de base pour un utilisateur."""

    email: EmailStr = Field(..., description="Email unique de l'utilisateur")
    username: Optional[str] = Field(None, max_length=150, description="Nom d'utilisateur unique")
    full_name: Optional[str] = Field(None, max_length=255, description="Nom complet")
    is_active: bool = Field(default=True, description="Utilisateur actif")
    is_superuser: bool = Field(default=False, description="Super utilisateur")


class UserCreate(UserBase):
    """Création d'un utilisateur."""

    password: str = Field(
        ..., min_length=6, max_length=100, description="Mot de passe (min 6 caractères)"
    )
    role_id: Optional[int] = Field(None, description="ID du rôle à assigner")
    team_id: Optional[int] = Field(None, description="ID de l'équipe")

    # CGU Acceptance (Legal Compliance)
    cgu_accepted: bool = Field(default=False, description="Acceptation des CGU (requis)")
    cgu_version: Optional[str] = Field(default="1.0", description="Version des CGU acceptées")

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v

    @field_validator("cgu_accepted")
    @classmethod
    def validate_cgu_accepted(cls, v: bool) -> bool:
        if not v:
            raise ValueError("L'acceptation des CGU est obligatoire")
        return v


class UserUpdate(BaseSchema):
    """Mise à jour d'un utilisateur."""

    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, max_length=150)
    full_name: Optional[str] = Field(None, max_length=255)
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    password: Optional[str] = Field(
        None, min_length=6, max_length=100, description="Nouveau mot de passe (optionnel)"
    )
    role_id: Optional[int] = None
    team_id: Optional[int] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 6:
            raise ValueError("Le mot de passe doit contenir au moins 6 caractères")
        return v


class UserResponse(UserBase, TimestampedSchema):
    """Réponse API avec informations utilisateur."""

    id: int
    role_id: Optional[int] = None
    team_id: Optional[int] = None
    role_name: Optional[str] = Field(None, description="Nom du rôle")
    team_name: Optional[str] = Field(None, description="Nom de l'équipe")

    # CGU Acceptance Info
    cgu_accepted: bool = Field(default=False, description="CGU acceptées")
    cgu_accepted_at: Optional[datetime] = Field(None, description="Date acceptation CGU")
    cgu_version: Optional[str] = Field(None, description="Version CGU acceptée")


class UserListResponse(BaseSchema):
    """Liste paginée d'utilisateurs."""

    items: list[UserResponse]
    total: int
    skip: int
    limit: int
