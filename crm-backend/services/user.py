"""Service pour la gestion des utilisateurs."""

from typing import List, Tuple, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_

from services.base import BaseService
from models.user import User
from models.role import Role
from models.team import Team
from schemas.user import UserCreate, UserUpdate
from core.security import get_password_hash
from core.exceptions import ResourceNotFound, ConflictError


class UserService(BaseService[User, UserCreate, UserUpdate]):
    """Service CRUD pour les utilisateurs."""

    def __init__(self, db: Session):
        super().__init__(User, db)

    async def create(self, schema: UserCreate) -> User:
        """Créer un nouvel utilisateur."""
        # Vérifier unicité email
        existing_email = self.db.query(User).filter(User.email == schema.email.lower()).first()
        if existing_email:
            raise ConflictError(f"L'email {schema.email} est déjà utilisé")

        # Vérifier unicité username si fourni
        if schema.username:
            existing_username = self.db.query(User).filter(User.username == schema.username).first()
            if existing_username:
                raise ConflictError(f"Le nom d'utilisateur {schema.username} est déjà utilisé")

        # Vérifier que le rôle existe
        role = None
        if schema.role_id:
            role = self.db.query(Role).filter(Role.id == schema.role_id).first()
            if not role:
                raise ResourceNotFound("Role", schema.role_id)

        # Vérifier que l'équipe existe
        team = None
        if schema.team_id:
            team = self.db.query(Team).filter(Team.id == schema.team_id).first()
            if not team:
                raise ResourceNotFound("Team", schema.team_id)

        # Créer l'utilisateur
        user = User(
            email=schema.email.lower(),
            username=schema.username,
            full_name=schema.full_name,
            hashed_password=get_password_hash(schema.password),
            is_active=schema.is_active,
            is_superuser=schema.is_superuser,
            role_id=schema.role_id,
            team_id=schema.team_id,
        )

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    async def update(self, user_id: int, schema: UserUpdate) -> User:
        """Mettre à jour un utilisateur."""
        user = await self.get_by_id(user_id)

        # Vérifier unicité email si modifié
        if schema.email and schema.email.lower() != user.email:
            existing = self.db.query(User).filter(
                User.email == schema.email.lower(),
                User.id != user_id
            ).first()
            if existing:
                raise ConflictError(f"L'email {schema.email} est déjà utilisé")

        # Vérifier unicité username si modifié
        if schema.username and schema.username != user.username:
            existing = self.db.query(User).filter(
                User.username == schema.username,
                User.id != user_id
            ).first()
            if existing:
                raise ConflictError(f"Le nom d'utilisateur {schema.username} est déjà utilisé")

        # Mettre à jour les champs
        update_data = schema.model_dump(exclude_unset=True, exclude={'password'})

        for field, value in update_data.items():
            if field == 'email' and value:
                setattr(user, field, value.lower())
            else:
                setattr(user, field, value)

        # Mettre à jour le mot de passe si fourni
        if schema.password:
            user.hashed_password = get_password_hash(schema.password)

        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 50,
        include_inactive: bool = False,
        role_id: Optional[int] = None,
        team_id: Optional[int] = None,
    ) -> Tuple[List[User], int]:
        """Liste tous les utilisateurs avec filtres."""
        query = self.db.query(User).options(
            joinedload(User.role),
            joinedload(User.team)
        )

        if not include_inactive:
            query = query.filter(User.is_active == True)

        if role_id:
            query = query.filter(User.role_id == role_id)

        if team_id:
            query = query.filter(User.team_id == team_id)

        total = query.count()
        users = query.offset(skip).limit(limit).all()
        return users, total

    async def search(
        self,
        search_term: str,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[User], int]:
        """Rechercher des utilisateurs par email, username ou nom."""
        pattern = f"%{search_term}%"
        query = self.db.query(User).options(
            joinedload(User.role),
            joinedload(User.team)
        ).filter(
            or_(
                User.email.ilike(pattern),
                User.username.ilike(pattern),
                User.full_name.ilike(pattern),
            )
        )

        total = query.count()
        users = query.offset(skip).limit(limit).all()
        return users, total

    async def get_by_id(self, user_id: int) -> User:
        """Récupérer un utilisateur par ID avec relations."""
        user = self.db.query(User).options(
            joinedload(User.role),
            joinedload(User.team)
        ).filter(User.id == user_id).first()

        if not user:
            raise ResourceNotFound("User", user_id)
        return user

    async def delete(self, user_id: int) -> None:
        """Supprimer un utilisateur (soft delete recommandé)."""
        user = await self.get_by_id(user_id)

        # Soft delete: désactiver plutôt que supprimer
        user.is_active = False
        self.db.add(user)
        self.db.commit()

    async def hard_delete(self, user_id: int) -> None:
        """Suppression définitive d'un utilisateur."""
        user = await self.get_by_id(user_id)
        self.db.delete(user)
        self.db.commit()
