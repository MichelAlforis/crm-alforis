from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List, Union
import os
import json

class Settings(BaseSettings):
    # API
    api_title: str = "TPM Finance CRM API"
    api_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = "your-secret-key"

    # Database
    database_url: str = "sqlite:///./crm_test.db"
    database_echo: bool = False

    # JWT
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24

    # CORS - Accepte string ou list
    allowed_origins: Union[str, List[str]] = ["http://localhost:3000", "http://localhost:3010", "http://localhost:5173"]

    @field_validator('allowed_origins', mode='before')
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parser ALLOWED_ORIGINS depuis .env (string ou JSON)"""
        if isinstance(v, str):
            # Si c'est une string JSON, la parser
            if v.startswith('['):
                return json.loads(v)
            # Sinon, split par virgule
            return [origin.strip() for origin in v.split(',')]
        return v

    # Files
    max_upload_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"

    # Backup
    backup_dir: str = "./backups"

    # Monitoring & Logging
    sentry_dsn: str = ""  # Sentry DSN (vide = désactivé)
    environment: str = "development"  # development, staging, production
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR

    # Redis Cache
    redis_enabled: bool = False
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""  # Vide = pas de password
    redis_db: int = 0

    # Email Automation
    sendgrid_api_key: str = ""
    sendgrid_event_webhook_key: str = ""
    mailgun_api_key: str = ""
    mailgun_domain: str = ""
    resend_api_key: str = ""
    default_email_from_name: str = "Alforis CRM"
    default_email_from_address: str = "noreply@example.com"
    default_email_reply_to: str = "support@example.com"
    default_email_unsubscribe_base_url: str = "https://example.com/email/unsubscribe"
    email_rate_limit_per_minute: int = 120
    email_batch_size: int = 500
    email_track_opens: bool = True
    email_track_clicks: bool = True

    # AI Agent Configuration
    ai_enabled: bool = True
    ai_default_provider: str = "claude"  # claude, openai, ollama

    # Anthropic Claude API
    anthropic_api_key: str = ""
    anthropic_model: str = "claude-3-5-sonnet-20241022"
    anthropic_max_tokens: int = 4096

    # OpenAI API
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_max_tokens: int = 4096

    # Ollama (Local LLM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.1:latest"

    # AI Agent Settings
    ai_auto_apply_enabled: bool = False  # Auto-appliquer suggestions haute confiance
    ai_auto_apply_threshold: float = 0.95  # Seuil de confiance pour auto-application
    ai_duplicate_threshold: float = 0.85  # Seuil similarité pour doublons
    ai_quality_threshold: float = 0.70  # Score qualité minimum
    ai_max_suggestions_per_run: int = 100
    ai_cache_ttl_hours: int = 24  # Durée de vie du cache en heures
    ai_daily_budget_usd: float = 10.0  # Budget quotidien max
    ai_monthly_budget_usd: float = 300.0  # Budget mensuel max

    # AI Rate Limiting
    ai_rate_limit_rpm: int = 10  # Requests per minute
    ai_batch_size: int = 10  # Nombre d'items par batch

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Retourner une instance unique de Settings (singleton)"""
    return Settings()

settings = get_settings()
