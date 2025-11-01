import json
import os
from functools import lru_cache
from typing import List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # CORS - Accepte string ou list
    allowed_origins: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:3010",
        "http://localhost:5173",
    ]

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parser ALLOWED_ORIGINS depuis .env (string ou JSON)"""
        if isinstance(v, str):
            # Si c'est une string JSON, la parser
            if v.startswith("["):
                return json.loads(v)
            # Sinon, split par virgule
            return [origin.strip() for origin in v.split(",")]
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

    # Webhook Security (pour alforis.fr -> CRM)
    webhook_secret: str = ""  # Token Bearer pour authentifier les webhooks entrants
    resend_signing_secret: str = ""  # Secret HMAC Resend (svix) pour webhooks entrants

    # JWT Secret partagé avec alforis.fr pour désinscription
    unsubscribe_jwt_secret: str = ""  # Même secret que JWT_SECRET sur alforis.fr

    # Push Notifications (Web Push VAPID)
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_email: str = "contact@alforis.fr"

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
    ollama_model: str = "mistral:7b"

    # AI Agent Settings
    ai_auto_apply_enabled: bool = False  # Auto-appliquer suggestions haute confiance
    ai_auto_apply_threshold: float = 0.95  # Seuil de confiance pour auto-application
    ai_duplicate_threshold: float = 0.85  # Seuil similarité pour doublons
    ai_quality_threshold: float = 0.70  # Score qualité minimum
    ai_max_suggestions_per_run: int = 100
    ai_cache_ttl_hours: int = 24  # Durée de vie du cache en heures
    ai_daily_budget_usd: float = 10.0  # Budget quotidien max
    ai_monthly_budget_usd: float = 300.0  # Budget mensuel max

    # Autofill LLM routing (Mistral + fallback)
    llm_primary_provider: str = "auto"
    llm_secondary_provider: str = "auto"
    llm_provider_order: str = "mistral,openai,anthropic,ollama,other"
    llm_primary_model: str = "mistral-large-latest"
    mistral_api_key: str = ""
    mistral_api_base: str = "https://api.mistral.ai"
    llm_fallback_provider: str = "anthropic"
    llm_fallback_model: str = "claude-3-5-sonnet-20241022"
    llm_request_timeout_ms: int = 6000
    llm_latency_budget_ms: int = 800
    llm_max_retries: int = 1
    llm_circuit_breaker_threshold: int = 3
    llm_circuit_breaker_cooldown_seconds: int = 600
    llm_cache_ttl_seconds: int = 60
    llm_timeout_ms: int = 6000
    llm_cost_cap_eur: float = 2.0

    # AI Rate Limiting
    ai_rate_limit_rpm: int = 10  # Requests per minute
    ai_batch_size: int = 10  # Nombre d'items par batch

    # Microsoft OAuth - App 1: Graph API (Primary)
    outlook_client_id: str = ""
    outlook_client_secret: str = ""
    outlook_tenant: str = "organizations"
    outlook_redirect_uri: str = "http://localhost:3010/oauth/outlook/callback"
    outlook_scopes: str = "openid profile offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Contacts.Read"
    outlook_auth_url: str = ""
    outlook_token_url: str = ""
    outlook_allowed_domains: Union[str, List[str]] = []

    # Microsoft OAuth - App 2: EWS/IMAP (Fallback)
    o365_client_id: str = ""
    o365_client_secret: str = ""
    o365_tenant_id: str = ""
    o365_redirect_uri: str = "http://localhost:3010/oauth/o365/callback"
    o365_scopes: str = "https://outlook.office365.com/EWS.AccessAsUser.All https://outlook.office365.com/IMAP.AccessAsUser.All offline_access"
    o365_auth_url: str = ""
    o365_token_url: str = ""

    # Mail Provider Strategy
    mail_primary_provider: str = "graph"  # graph | imap | auto
    mail_fallback_enabled: bool = True
    mail_fallback_provider: str = "imap"
    mail_retry_count: int = 3
    mail_retry_delay_ms: int = 2000

    @field_validator("outlook_allowed_domains", mode="before")
    @classmethod
    def parse_outlook_allowed_domains(cls, value):
        if value in (None, ""):
            return []
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("["):
                try:
                    parsed = json.loads(value)
                    if isinstance(parsed, list):
                        return parsed
                    return [str(parsed)]
                except json.JSONDecodeError:
                    return [v.strip() for v in value.split(",") if v.strip()]
            return [v.strip() for v in value.split(",") if v.strip()]
        if isinstance(value, (list, tuple, set)):
            return [str(v).strip() for v in value if str(v).strip()]
        return [str(value).strip()]

    # Encryption (Fernet AES-256 pour tokens OAuth)
    encryption_key: str = ""

    # Celery Flower (Monitoring)
    flower_basic_auth: str = ""  # Format: "user:password" (empty = no auth)

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra='ignore'  # Ignore extra env vars not in Settings model
    )


@lru_cache()
def get_settings() -> Settings:
    """Retourner une instance unique de Settings (singleton)"""
    return Settings()


settings = get_settings()
