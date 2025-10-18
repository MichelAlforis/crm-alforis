"""
Routes API - Webhooks sortants

Permet la gestion CRUD des webhooks et la rotation des secrets.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from core import get_db, verify_admin_user
from core.events import EventType
from schemas.webhook import (
    WebhookCreate,
    WebhookUpdate,
    WebhookResponse,
    WebhookRotateSecretRequest,
)
from services.webhook import WebhookService

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.get("", response_model=List[WebhookResponse])
async def list_webhooks(
    is_active: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Lister les webhooks configurés (admin uniquement)."""
    service = WebhookService(db)
    filters = {"is_active": is_active} if is_active is not None else None
    items, _ = await service.get_all(limit=500, filters=filters or {})
    return [WebhookResponse.model_validate(item) for item in items]


@router.get("/{webhook_id}", response_model=WebhookResponse)
async def get_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Récupérer un webhook par ID."""
    service = WebhookService(db)
    webhook = await service.get_by_id(webhook_id)
    return WebhookResponse.model_validate(webhook)


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    payload: WebhookCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Créer un nouveau webhook."""
    service = WebhookService(db)
    webhook = await service.create(payload)
    return WebhookResponse.model_validate(webhook)


@router.put("/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: int,
    payload: WebhookUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Mettre à jour un webhook existant."""
    service = WebhookService(db)
    webhook = await service.update(webhook_id, payload)
    return WebhookResponse.model_validate(webhook)


@router.delete("/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Supprimer un webhook."""
    service = WebhookService(db)
    await service.delete(webhook_id)
    return None


@router.post("/{webhook_id}/rotate-secret", response_model=WebhookResponse)
async def rotate_webhook_secret(
    webhook_id: int,
    payload: WebhookRotateSecretRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(verify_admin_user),
):
    """Régénérer le secret HMAC d'un webhook."""
    service = WebhookService(db)
    webhook = await service.get_by_id(webhook_id)
    rotated = service.rotate_secret(webhook, payload.secret)
    return WebhookResponse.model_validate(rotated)


@router.get("/events/available")
async def list_available_events(
    current_user: dict = Depends(verify_admin_user),
):
    """Lister les événements disponibles pour configurer un webhook."""
    return [
        {
            "value": event.value,
            "label": event.name.replace("_", " ").title(),
        }
        for event in EventType
    ]
