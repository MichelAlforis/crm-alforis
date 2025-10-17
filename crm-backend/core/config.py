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
    database_url: str = "postgresql://user:password@localhost/crm_db"
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

    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Retourner une instance unique de Settings (singleton)"""
    return Settings()

settings = get_settings()