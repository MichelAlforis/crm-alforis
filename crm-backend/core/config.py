from pydantic_settings import BaseSettings
from functools import lru_cache
import os

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
    
    # CORS
    allowed_origins: list = ["http://localhost:3000", "http://localhost:3010", "http://localhost:5173"]
    
    # Files
    max_upload_size: int = 10485760  # 10MB
    upload_dir: str = "./uploads"
    
    # Backup
    backup_dir: str = "./backups"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

@lru_cache()
def get_settings() -> Settings:
    """Retourner une instance unique de Settings (singleton)"""
    return Settings()

settings = get_settings()