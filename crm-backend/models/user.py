"""
User & Team models aligned with the unified architecture.

These lightweight models provide the minimal surface required by the
RBAC, notifications and export modules as well as the existing tests.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy.orm import relationship

from models.base import BaseModel
from models.role import Role, UserRole
from models.team import Team


class User(BaseModel):
    """
    Utilisateur de l'application.

    Les champs couvrent les besoins actuels:
    - authentification (email, hashed_password)
    - informations d'affichage (full_name, username)
    - rattachement au rôle (RBAC) et à une équipe
    - liens vers les organisations possédées (owner)
    """

    __tablename__ = "users"

    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(150), unique=True, nullable=True, index=True)
    full_name = Column(String(255), nullable=True)
    hashed_password = Column(String(255), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_superuser = Column(Boolean, default=False, nullable=False, index=True)

    last_login_at = Column(DateTime(timezone=True), nullable=True)

    role_id = Column(Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True, index=True)
    role = relationship(Role, back_populates="users")

    team_id = Column(Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)
    team = relationship(Team, back_populates="members")

    organisations_owned = relationship(
        "Organisation",
        back_populates="owner",
        foreign_keys="Organisation.owner_id",
    )
    organisations_created = relationship(
        "Organisation",
        back_populates="created_by_user",
        foreign_keys="Organisation.created_by",
    )
    organisations_assigned = relationship(
        "Organisation",
        back_populates="assigned_user",
        foreign_keys="Organisation.assigned_to",
    )

    legacy_mandats = relationship("Mandat", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    mailing_lists = relationship("MailingList", back_populates="creator", foreign_keys="MailingList.created_by")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}')>"

    @property
    def display_name(self) -> str:
        """Convenience accessor for UI."""
        return self.full_name or self.username or self.email

    @property
    def role_level(self) -> int:
        """Retourne le niveau hiérarchique du rôle associé."""
        if self.role and self.role.name:
            return self.role.get_role_level(self.role.name)
        return 0

    def to_token_payload(self) -> dict:
        """Payload minimal utilisé lors de la génération de JWT."""
        return {
            "sub": str(self.id),
            "email": self.email,
            "is_admin": self.role.name == UserRole.ADMIN if self.role else False,
        }
