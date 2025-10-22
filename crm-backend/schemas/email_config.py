"""
Schémas Pydantic pour EmailConfiguration
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class EmailProviderEnum(str, Enum):
    """Fournisseurs d'email supportés"""
    RESEND = "resend"
    SENDGRID = "sendgrid"
    MAILGUN = "mailgun"


class EmailConfigurationBase(BaseModel):
    """Schéma de base pour EmailConfiguration"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    provider: EmailProviderEnum
    from_name: Optional[str] = Field(None, max_length=100)
    from_email: Optional[str] = Field(None, max_length=255)
    reply_to: Optional[str] = Field(None, max_length=255)
    rate_limit_per_minute: int = Field(default=120, ge=1, le=1000)
    batch_size: int = Field(default=500, ge=1, le=1000)
    track_opens: bool = True
    track_clicks: bool = True

    @field_validator('from_email', 'reply_to')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and '@' not in v:
            raise ValueError('Email invalide')
        return v


class EmailConfigurationCreate(EmailConfigurationBase):
    """Schéma pour créer une configuration email"""
    api_key: str = Field(..., min_length=10)  # Clé API en clair (sera cryptée)
    mailgun_domain: Optional[str] = None  # Seulement pour Mailgun
    is_active: bool = False


class EmailConfigurationUpdate(BaseModel):
    """Schéma pour mettre à jour une configuration email"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    api_key: Optional[str] = Field(None, min_length=10)  # Si fourni, sera crypté
    mailgun_domain: Optional[str] = None
    from_name: Optional[str] = Field(None, max_length=100)
    from_email: Optional[str] = Field(None, max_length=255)
    reply_to: Optional[str] = Field(None, max_length=255)
    rate_limit_per_minute: Optional[int] = Field(None, ge=1, le=1000)
    batch_size: Optional[int] = Field(None, ge=1, le=1000)
    track_opens: Optional[bool] = None
    track_clicks: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator('from_email', 'reply_to')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and '@' not in v:
            raise ValueError('Email invalide')
        return v


class EmailConfigurationResponse(EmailConfigurationBase):
    """Schéma de réponse pour EmailConfiguration"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    last_tested_at: Optional[datetime] = None
    test_status: Optional[str] = None
    test_error: Optional[str] = None
    # NE PAS exposer api_key_encrypted ni provider_config

    class Config:
        from_attributes = True


class EmailConfigurationTestRequest(BaseModel):
    """Requête pour tester une configuration email"""
    test_email: str = Field(..., description="Email de destination pour le test")

    @field_validator('test_email')
    @classmethod
    def validate_test_email(cls, v: str) -> str:
        if '@' not in v:
            raise ValueError('Email invalide')
        return v


class EmailConfigurationTestResponse(BaseModel):
    """Réponse après test d'une configuration"""
    success: bool
    message: str
    provider: EmailProviderEnum
    tested_at: datetime
    error: Optional[str] = None
