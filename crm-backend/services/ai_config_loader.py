"""
AI Configuration Loader - Load encrypted API keys from database

This service loads AI provider API keys from the database (encrypted with Fernet AES-256)
and provides them to AI services like SignatureParserService and LLMRouter.

Architecture:
- Keys stored in ai_configurations table (encrypted_anthropic_key, encrypted_openai_key, etc.)
- Fallback to environment variables if no DB keys configured
- Thread-safe caching for performance
"""

import logging
from typing import Optional, Dict
from functools import lru_cache

from core.config import settings
from core.encryption import get_encryption_service

logger = logging.getLogger(__name__)


class AIConfigLoader:
    """Load AI configuration and API keys from database or environment"""

    def __init__(self, db_session=None):
        self.db = db_session
        self.encryption = get_encryption_service()
        self._cache: Dict[str, Optional[str]] = {}

    def _get_db_config(self):
        """Get active AI configuration from database"""
        if not self.db:
            return None

        try:
            from models.ai_agent import AIConfiguration
            config = self.db.query(AIConfiguration).filter(
                AIConfiguration.is_active == True
            ).first()
            return config
        except Exception as e:
            logger.warning(f"Failed to load AI config from DB: {e}")
            return None

    def get_anthropic_key(self) -> Optional[str]:
        """Get Anthropic (Claude) API key - DB or env fallback"""
        if "anthropic" in self._cache:
            return self._cache["anthropic"]

        # Try database first
        config = self._get_db_config()
        if config and config.encrypted_anthropic_key:
            try:
                key = self.encryption.decrypt(config.encrypted_anthropic_key)
                self._cache["anthropic"] = key
                logger.info("✅ Loaded Anthropic key from database")
                return key
            except Exception as e:
                logger.warning(f"Failed to decrypt Anthropic key: {e}")

        # Fallback to environment
        key = settings.anthropic_api_key
        if key:
            self._cache["anthropic"] = key
            logger.info("✅ Loaded Anthropic key from environment")
            return key

        logger.warning("⚠️  No Anthropic API key configured")
        self._cache["anthropic"] = None
        return None

    def get_openai_key(self) -> Optional[str]:
        """Get OpenAI (GPT) API key - DB or env fallback"""
        if "openai" in self._cache:
            return self._cache["openai"]

        # Try database first
        config = self._get_db_config()
        if config and config.encrypted_openai_key:
            try:
                key = self.encryption.decrypt(config.encrypted_openai_key)
                self._cache["openai"] = key
                logger.info("✅ Loaded OpenAI key from database")
                return key
            except Exception as e:
                logger.warning(f"Failed to decrypt OpenAI key: {e}")

        # Fallback to environment
        key = settings.openai_api_key
        if key:
            self._cache["openai"] = key
            logger.info("✅ Loaded OpenAI key from environment")
            return key

        logger.warning("⚠️  No OpenAI API key configured")
        self._cache["openai"] = None
        return None

    def get_mistral_key(self) -> Optional[str]:
        """Get Mistral AI API key (EU - RGPD) - DB or env fallback"""
        if "mistral" in self._cache:
            return self._cache["mistral"]

        # Try database first
        config = self._get_db_config()
        if config and config.encrypted_mistral_key:
            try:
                key = self.encryption.decrypt(config.encrypted_mistral_key)
                self._cache["mistral"] = key
                logger.info("✅ Loaded Mistral key from database")
                return key
            except Exception as e:
                logger.warning(f"Failed to decrypt Mistral key: {e}")

        # Fallback to environment
        key = settings.mistral_api_key
        if key:
            self._cache["mistral"] = key
            logger.info("✅ Loaded Mistral key from environment")
            return key

        logger.warning("⚠️  No Mistral API key configured")
        self._cache["mistral"] = None
        return None

    def get_ollama_url(self) -> str:
        """Get Ollama base URL - DB or env fallback"""
        if "ollama" in self._cache:
            return self._cache["ollama"]

        # Try database first
        config = self._get_db_config()
        if config and config.encrypted_ollama_url:
            try:
                url = self.encryption.decrypt(config.encrypted_ollama_url)
                self._cache["ollama"] = url
                logger.info(f"✅ Loaded Ollama URL from database: {url}")
                return url
            except Exception as e:
                logger.warning(f"Failed to decrypt Ollama URL: {e}")

        # Fallback to environment
        url = settings.ollama_base_url
        self._cache["ollama"] = url
        logger.info(f"✅ Using Ollama URL from environment: {url}")
        return url

    def get_available_providers(self) -> list[str]:
        """Get list of available AI providers (with configured keys)"""
        providers = []

        if self.get_ollama_url():
            providers.append("ollama")

        if self.get_mistral_key():
            providers.append("mistral")

        if self.get_openai_key():
            providers.append("openai")

        if self.get_anthropic_key():
            providers.append("anthropic")

        return providers

    def clear_cache(self):
        """Clear cached keys (useful after updating configuration)"""
        self._cache.clear()
        logger.info("🔄 AI config cache cleared")


@lru_cache(maxsize=1)
def get_ai_config_loader_cached():
    """
    Get cached AI config loader (without DB session)

    WARNING: This loads from environment only (no DB).
    Use get_ai_config_loader(db) for DB-backed loading.
    """
    return AIConfigLoader(db_session=None)


def get_ai_config_loader(db_session):
    """
    Get AI config loader with database session

    This is the recommended way to get API keys - it checks DB first, then env.
    """
    return AIConfigLoader(db_session=db_session)


__all__ = ["AIConfigLoader", "get_ai_config_loader", "get_ai_config_loader_cached"]
