from __future__ import annotations

from typing import List, Optional
import secrets

from sqlalchemy.orm import Session

from models.webhook import Webhook
from schemas.webhook import WebhookCreate, WebhookUpdate
from services.base import BaseService
from core.exceptions import DatabaseError


class WebhookService(BaseService[Webhook, WebhookCreate, WebhookUpdate]):
    """Service chargé de gérer les webhooks sortants."""

    DEFAULT_SECRET_BYTES = 32  # => 64 caractères hexadécimaux

    def __init__(self, db: Session):
        super().__init__(Webhook, db)

    # ------------------------------------------------------------------ #
    # Helper
    # ------------------------------------------------------------------ #
    @classmethod
    def generate_secret(cls, num_bytes: int = DEFAULT_SECRET_BYTES) -> str:
        """Génère un secret HMAC sécurisé."""
        return secrets.token_hex(num_bytes)

    # ------------------------------------------------------------------ #
    # CRUD overrides
    # ------------------------------------------------------------------ #
    async def create(self, schema: WebhookCreate) -> Webhook:
        """Créer un webhook avec génération automatique du secret si manquant."""
        try:
            payload = schema.model_dump(exclude_unset=True)
            if not payload.get("secret"):
                payload["secret"] = self.generate_secret()

            webhook = Webhook(**payload)
            self.db.add(webhook)
            self.db.commit()
            self.db.refresh(webhook)
            return webhook
        except Exception as exc:
            self.db.rollback()
            raise DatabaseError(f"Failed to create {self.model_name}") from exc

    async def update(self, id: int, schema: WebhookUpdate) -> Webhook:
        """Mettre à jour un webhook et conserver le secret existant si absent."""
        return await super().update(id, schema)

    # ------------------------------------------------------------------ #
    # Queries spécialisées
    # ------------------------------------------------------------------ #
    def get_active_for_event(self, event: str) -> List[Webhook]:
        """Retourne les webhooks actifs abonnés à un événement."""
        try:
            return (
                self.db.query(self.model)
                    .filter(Webhook.is_active.is_(True))
                    .filter(Webhook.events.contains([event]))
                    .all()
            )
        except Exception as exc:
            raise DatabaseError("Failed to fetch webhooks") from exc

    def rotate_secret(self, webhook: Webhook, secret: Optional[str] = None) -> Webhook:
        """Rotation manuelle du secret."""
        webhook.secret = secret or self.generate_secret()
        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)
        return webhook
