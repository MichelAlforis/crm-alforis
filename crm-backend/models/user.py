"""
User & Team models aligned with the unified architecture.

These lightweight models provide the minimal surface required by the
RBAC, notifications and export modules as well as the existing tests.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
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

    role_id = Column(
        Integer, ForeignKey("roles.id", ondelete="SET NULL"), nullable=True, index=True
    )
    role = relationship(Role, back_populates="users")

    team_id = Column(
        Integer, ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True
    )
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
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    mailing_lists = relationship(
        "MailingList", back_populates="creator", foreign_keys="MailingList.created_by"
    )
    push_subscriptions = relationship(
        "PushSubscription", back_populates="user", cascade="all, delete-orphan"
    )
    email_accounts = relationship(
        "UserEmailAccount", back_populates="user", cascade="all, delete-orphan"
    )
    outlook_signatures_pending = relationship(
        "OutlookSignaturePending",
        foreign_keys="[OutlookSignaturePending.user_id]",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    # Outlook Integration (Phase 1 - OAuth Graph API)
    outlook_connected = Column(Boolean, default=False, nullable=False)
    encrypted_outlook_access_token = Column(Text, nullable=True)
    encrypted_outlook_refresh_token = Column(Text, nullable=True)
    outlook_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    outlook_consent_given = Column(Boolean, default=False, nullable=False)  # RGPD
    outlook_consent_date = Column(DateTime(timezone=True), nullable=True)  # RGPD

    # O365 OAuth Integration (Phase 2 - EWS/IMAP OAuth)
    o365_connected = Column(Boolean, default=False, nullable=False)
    encrypted_o365_access_token = Column(Text, nullable=True)
    encrypted_o365_refresh_token = Column(Text, nullable=True)
    o365_token_expires_at = Column(DateTime(timezone=True), nullable=True)
    o365_consent_given = Column(Boolean, default=False, nullable=False)
    o365_consent_date = Column(DateTime(timezone=True), nullable=True)

    # IMAP Integration (Phase 3 - Direct IMAP avec App Password - Fallback ultime)
    imap_connected = Column(Boolean, default=False, nullable=False)
    imap_host = Column(String(255), nullable=True)  # ex: outlook.office365.com
    imap_email = Column(String(255), nullable=True)  # ex: michel.marques@alforis.fr
    encrypted_imap_password = Column(Text, nullable=True)  # App Password chiffré
    imap_connected_at = Column(DateTime(timezone=True), nullable=True)

    # CGU/CGV Acceptance (Legal Compliance)
    cgu_accepted = Column(Boolean, default=False, nullable=False, index=True)
    cgu_accepted_at = Column(DateTime(timezone=True), nullable=True)
    cgu_version = Column(String(20), nullable=True)  # e.g., "1.0"
    cgu_acceptance_ip = Column(String(45), nullable=True)  # IPv4/IPv6

    # Two-Factor Authentication (2FA / TOTP)
    totp_secret = Column(String(32), nullable=True)  # Base32-encoded TOTP secret
    totp_enabled = Column(Boolean, default=False, nullable=False, index=True)
    totp_enabled_at = Column(DateTime(timezone=True), nullable=True)
    backup_codes = Column(Text, nullable=True)  # JSON array of hashed backup codes

    # Trial Management (SaaS Free Trial)
    trial_started_at = Column(DateTime(timezone=True), nullable=True, index=True)
    trial_ends_at = Column(DateTime(timezone=True), nullable=True, index=True)
    trial_extended_at = Column(DateTime(timezone=True), nullable=True)  # Si prolongation accordée
    trial_converted_at = Column(DateTime(timezone=True), nullable=True)  # Date conversion payant
    subscription_status = Column(
        String(20),
        default="trial",
        nullable=False,
        index=True
    )  # trial, active, grace_period, expired, cancelled

    # Password Reset
    reset_token = Column(String(255), nullable=True, index=True)  # Hashed token for security
    reset_token_expires_at = Column(DateTime(timezone=True), nullable=True)

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

    @property
    def is_trial_active(self) -> bool:
        """Vérifie si le trial est encore actif."""
        if not self.trial_ends_at:
            return False
        if self.subscription_status in ["active", "cancelled"]:
            return False
        return datetime.now() < self.trial_ends_at

    @property
    def days_remaining_trial(self) -> int:
        """Nombre de jours restants dans le trial (0 si expiré)."""
        if not self.trial_ends_at or self.subscription_status != "trial":
            return 0
        delta = self.trial_ends_at - datetime.now()
        return max(0, delta.days)

    @property
    def is_in_grace_period(self) -> bool:
        """Vérifie si le compte est en période de grâce."""
        return self.subscription_status == "grace_period"
