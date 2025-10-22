"""
Routes API pour la gestion des configurations email
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from core.database import get_db
from models.user import User
from schemas.email_config import (
    EmailConfigurationCreate,
    EmailConfigurationUpdate,
    EmailConfigurationResponse,
    EmailConfigurationTestRequest,
    EmailConfigurationTestResponse,
)
from services.email_config_service import EmailConfigurationService
from core.security import get_current_user
from core.exceptions import ResourceNotFound, ValidationError

router = APIRouter(prefix="/email-config", tags=["Email Configuration"])


@router.get("/", response_model=List[EmailConfigurationResponse])
def list_email_configurations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Liste toutes les configurations email"""
    service = EmailConfigurationService(db)
    configs = service.get_all()
    return configs


@router.get("/active", response_model=EmailConfigurationResponse)
def get_active_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère la configuration email active"""
    service = EmailConfigurationService(db)
    config = service.get_active()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Aucune configuration email active"
        )
    return config


@router.get("/{config_id}", response_model=EmailConfigurationResponse)
def get_email_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Récupère une configuration email par ID"""
    service = EmailConfigurationService(db)
    try:
        config = service.get_by_id(config_id)
        return config
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/", response_model=EmailConfigurationResponse, status_code=status.HTTP_201_CREATED)
def create_email_configuration(
    data: EmailConfigurationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle configuration email"""
    service = EmailConfigurationService(db)
    try:
        config = service.create(data, user_id=current_user.id)
        return config
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/{config_id}", response_model=EmailConfigurationResponse)
def update_email_configuration(
    config_id: int,
    data: EmailConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Met à jour une configuration email"""
    service = EmailConfigurationService(db)
    try:
        config = service.update(config_id, data, user_id=current_user.id)
        return config
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Supprime une configuration email"""
    service = EmailConfigurationService(db)
    try:
        service.delete(config_id)
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{config_id}/activate", response_model=EmailConfigurationResponse)
def activate_email_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Active une configuration email (désactive les autres)"""
    service = EmailConfigurationService(db)
    try:
        config = service.activate(config_id)
        return config
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{config_id}/deactivate", response_model=EmailConfigurationResponse)
def deactivate_email_configuration(
    config_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Désactive une configuration email"""
    service = EmailConfigurationService(db)
    try:
        config = service.deactivate(config_id)
        return config
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{config_id}/test", response_model=EmailConfigurationTestResponse)
def test_email_configuration(
    config_id: int,
    test_request: EmailConfigurationTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Teste une configuration email en envoyant un email"""
    service = EmailConfigurationService(db)
    try:
        result = service.test_connection(config_id, test_request)
        return result
    except ResourceNotFound as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
