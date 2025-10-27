from typing import List, Optional

from pydantic import AnyHttpUrl, Field, field_validator

from core.events import EventType
from schemas.base import BaseSchema, TimestampedSchema


class WebhookBase(BaseSchema):
    """Champs communs aux webhooks."""

    url: AnyHttpUrl = Field(..., description="URL cible du webhook")
    events: List[str] = Field(..., description="Liste des événements EventType.value")
    description: Optional[str] = Field(
        None, description="Description courte affichée dans l'interface"
    )
    is_active: bool = Field(True, description="Permet d'activer/désactiver le webhook")

    @field_validator("events")
    @classmethod
    def validate_events(cls, events: List[str]) -> List[str]:
        if not events:
            raise ValueError("Au moins un événement doit être sélectionné")

        normalized: List[str] = []
        seen = set()

        for event in events:
            try:
                event_value = EventType(event).value
            except ValueError as exc:
                valid_events = ", ".join([e.value for e in EventType])
                raise ValueError(
                    f"Événement inconnu '{event}'. Événements valides: {valid_events}"
                ) from exc

            if event_value not in seen:
                seen.add(event_value)
                normalized.append(event_value)

        return normalized


class WebhookCreate(WebhookBase):
    """Payload de création de webhook."""

    secret: Optional[str] = Field(
        None,
        min_length=16,
        max_length=128,
        description="Secret HMAC (généré automatiquement si vide)",
    )


class WebhookUpdate(BaseSchema):
    """Payload de mise à jour partielle."""

    url: Optional[AnyHttpUrl] = None
    events: Optional[List[str]] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    secret: Optional[str] = Field(
        None,
        min_length=16,
        max_length=128,
        description="Nouveau secret HMAC (rotation manuelle)",
    )

    @field_validator("events")
    @classmethod
    def validate_optional_events(cls, events: Optional[List[str]]) -> Optional[List[str]]:
        if events is None:
            return events
        return WebhookBase.validate_events(events)  # type: ignore[arg-type]


class WebhookResponse(TimestampedSchema):
    """Représentation complète d'un webhook."""

    id: int
    url: AnyHttpUrl
    events: List[str]
    is_active: bool
    description: Optional[str] = None
    secret: str


class WebhookRotateSecretRequest(BaseSchema):
    """Request payload pour rotation de secret."""

    secret: Optional[str] = Field(
        None,
        min_length=16,
        max_length=128,
        description="Secret HMAC optionnel (sinon généré)",
    )
