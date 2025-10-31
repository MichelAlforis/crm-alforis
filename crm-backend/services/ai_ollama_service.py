"""
Service Ollama optimisé avec LiteLLM + Redis Cache.

Fournit une interface unifiée pour:
- Ollama (local, rapide, gratuit)
- OpenAI GPT (fallback premium)
- Anthropic Claude (fallback premium)

Features:
- Cache Redis intelligent (évite appels répétés)
- Timeout courts (5s) pour ne pas bloquer l'UI
- Retry automatique avec fallback
- Graceful degradation si Ollama down
"""

import logging
import hashlib
import json
import os
from typing import Optional, Dict, Any, List
from datetime import timedelta

import redis
from litellm import completion, acompletion
from litellm.exceptions import Timeout, APIError, ServiceUnavailableError

logger = logging.getLogger(__name__)


class OllamaService:
    """
    Service IA optimisé avec Ollama + LiteLLM + Redis cache.

    Usage:
        service = OllamaService()
        result = service.get_suggestion(
            prompt="Suggest a role for: CEO at ACME Corp",
            model="mistral:7b"
        )
    """

    def __init__(
        self,
        redis_host: str = "redis",
        redis_port: int = 6379,
        redis_db: int = 1,  # DB 1 pour cache Ollama (DB 0 = Celery)
        cache_ttl: int = 3600,  # 1 heure
        ollama_base_url: str = "http://localhost:11434",
        default_timeout: float = 5.0,
    ):
        """
        Initialize Ollama service with Redis cache.

        Args:
            redis_host: Redis hostname
            redis_port: Redis port
            redis_db: Redis database number (default 1)
            cache_ttl: Cache TTL in seconds (default 1h)
            ollama_base_url: Ollama API base URL
            default_timeout: Default timeout for LLM calls (seconds)
        """
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.redis_db = redis_db
        self.cache_ttl = cache_ttl
        self.ollama_base_url = ollama_base_url
        self.default_timeout = default_timeout

        # Redis connection (lazy-loaded)
        self._redis: Optional[redis.Redis] = None

        # Fallback configuration
        self.enable_fallback = os.getenv("OLLAMA_ENABLE_FALLBACK", "false").lower() == "true"
        self.fallback_model = os.getenv("OLLAMA_FALLBACK_MODEL", "gpt-3.5-turbo")

        logger.info(
            f"[OllamaService] Initialized with cache_ttl={cache_ttl}s, "
            f"timeout={default_timeout}s, fallback={self.enable_fallback}"
        )

    @property
    def redis(self) -> redis.Redis:
        """Lazy-load Redis connection."""
        if self._redis is None:
            try:
                self._redis = redis.Redis(
                    host=self.redis_host,
                    port=self.redis_port,
                    db=self.redis_db,
                    decode_responses=True,
                    socket_timeout=2.0,
                    socket_connect_timeout=2.0,
                )
                # Test connection
                self._redis.ping()
                logger.info(f"[OllamaService] Redis connected: {self.redis_host}:{self.redis_port}/{self.redis_db}")
            except Exception as e:
                logger.warning(f"[OllamaService] Redis connection failed: {e}. Cache disabled.")
                self._redis = None

        return self._redis

    def _get_cache_key(self, prompt: str, model: str, **kwargs) -> str:
        """
        Generate cache key from prompt + model + params.

        Args:
            prompt: User prompt
            model: Model name
            **kwargs: Additional params (temperature, max_tokens, etc.)

        Returns:
            Cache key (hex string)
        """
        # Include all relevant params in cache key
        cache_input = json.dumps({
            "prompt": prompt,
            "model": model,
            **kwargs
        }, sort_keys=True)

        hash_obj = hashlib.md5(cache_input.encode())
        return f"ollama:cache:{hash_obj.hexdigest()}"

    def _get_from_cache(self, cache_key: str) -> Optional[str]:
        """Get cached response from Redis."""
        if not self.redis:
            return None

        try:
            cached = self.redis.get(cache_key)
            if cached:
                logger.debug(f"[OllamaService] Cache HIT: {cache_key}")
                return cached
            else:
                logger.debug(f"[OllamaService] Cache MISS: {cache_key}")
                return None
        except Exception as e:
            logger.warning(f"[OllamaService] Redis get error: {e}")
            return None

    def _set_to_cache(self, cache_key: str, value: str) -> None:
        """Set response in Redis cache with TTL."""
        if not self.redis:
            return

        try:
            self.redis.setex(cache_key, self.cache_ttl, value)
            logger.debug(f"[OllamaService] Cached: {cache_key} (TTL={self.cache_ttl}s)")
        except Exception as e:
            logger.warning(f"[OllamaService] Redis set error: {e}")

    def get_suggestion(
        self,
        prompt: str,
        model: str = "mistral:7b",
        temperature: float = 0.7,
        max_tokens: int = 150,
        timeout: Optional[float] = None,
        system_prompt: Optional[str] = None,
        use_cache: bool = True,
    ) -> Optional[str]:
        """
        Get AI suggestion from Ollama (avec cache Redis).

        Args:
            prompt: User prompt
            model: Model name (default: mistral:7b)
            temperature: Sampling temperature (0-1)
            max_tokens: Max tokens to generate
            timeout: Request timeout in seconds (default: self.default_timeout)
            system_prompt: Optional system prompt
            use_cache: Enable Redis cache (default: True)

        Returns:
            Generated text or None if error
        """
        timeout = timeout or self.default_timeout

        # Build cache key
        cache_key = self._get_cache_key(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt,
        )

        # Check cache
        if use_cache:
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                return cached_result

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Try Ollama
        try:
            logger.info(f"[OllamaService] Calling Ollama: model={model}, timeout={timeout}s")

            response = completion(
                model=f"ollama/{model}",
                messages=messages,
                api_base=self.ollama_base_url,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

            result = response.choices[0].message.content
            logger.info(f"[OllamaService] Ollama success: {len(result)} chars")

            # Cache result
            if use_cache and result:
                self._set_to_cache(cache_key, result)

            return result

        except (Timeout, ServiceUnavailableError) as e:
            logger.warning(f"[OllamaService] Ollama timeout/unavailable: {e}")

            # Fallback to premium API if enabled
            if self.enable_fallback:
                return self._fallback_request(messages, temperature, max_tokens, cache_key, use_cache)
            else:
                logger.info("[OllamaService] Fallback disabled, returning None")
                return None

        except APIError as e:
            logger.error(f"[OllamaService] Ollama API error: {e}")
            return None

        except Exception as e:
            logger.exception(f"[OllamaService] Unexpected error: {e}")
            return None

    def _fallback_request(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
        cache_key: str,
        use_cache: bool,
    ) -> Optional[str]:
        """
        Fallback to premium API (OpenAI GPT or Claude).

        Requires OPENAI_API_KEY or ANTHROPIC_API_KEY in env.
        """
        try:
            logger.info(f"[OllamaService] Fallback to {self.fallback_model}")

            response = completion(
                model=self.fallback_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=10.0,  # Longer timeout for external API
            )

            result = response.choices[0].message.content
            logger.info(f"[OllamaService] Fallback success: {len(result)} chars")

            # Cache result
            if use_cache and result:
                self._set_to_cache(cache_key, result)

            return result

        except Exception as e:
            logger.error(f"[OllamaService] Fallback failed: {e}")
            return None

    async def aget_suggestion(
        self,
        prompt: str,
        model: str = "mistral:7b",
        temperature: float = 0.7,
        max_tokens: int = 150,
        timeout: Optional[float] = None,
        system_prompt: Optional[str] = None,
        use_cache: bool = True,
    ) -> Optional[str]:
        """
        Async version of get_suggestion().

        Useful for concurrent requests in FastAPI async endpoints.
        """
        timeout = timeout or self.default_timeout

        # Build cache key
        cache_key = self._get_cache_key(
            prompt=prompt,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt,
        )

        # Check cache (sync)
        if use_cache:
            cached_result = self._get_from_cache(cache_key)
            if cached_result:
                return cached_result

        # Build messages
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        # Try Ollama (async)
        try:
            logger.info(f"[OllamaService] Calling Ollama (async): model={model}")

            response = await acompletion(
                model=f"ollama/{model}",
                messages=messages,
                api_base=self.ollama_base_url,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )

            result = response.choices[0].message.content
            logger.info(f"[OllamaService] Ollama async success: {len(result)} chars")

            # Cache result
            if use_cache and result:
                self._set_to_cache(cache_key, result)

            return result

        except Exception as e:
            logger.warning(f"[OllamaService] Ollama async error: {e}")
            return None

    def get_cache_stats(self) -> Dict[str, Any]:
        """
        Get Redis cache statistics.

        Returns:
            Dict with cache stats (keys, memory, hit rate, etc.)
        """
        if not self.redis:
            return {"error": "Redis not connected"}

        try:
            # Count ollama cache keys
            pattern = "ollama:cache:*"
            keys = self.redis.keys(pattern)

            # Get memory usage
            info = self.redis.info("memory")

            return {
                "cache_keys": len(keys),
                "cache_pattern": pattern,
                "memory_used_mb": round(info.get("used_memory", 0) / 1024 / 1024, 2),
                "cache_ttl": self.cache_ttl,
                "redis_db": self.redis_db,
            }
        except Exception as e:
            logger.error(f"[OllamaService] Cache stats error: {e}")
            return {"error": str(e)}

    def clear_cache(self, pattern: str = "ollama:cache:*") -> int:
        """
        Clear Ollama cache in Redis.

        Args:
            pattern: Redis key pattern (default: all ollama cache)

        Returns:
            Number of keys deleted
        """
        if not self.redis:
            logger.warning("[OllamaService] Redis not connected, cannot clear cache")
            return 0

        try:
            keys = self.redis.keys(pattern)
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"[OllamaService] Cleared {deleted} cache keys matching '{pattern}'")
                return deleted
            else:
                logger.info(f"[OllamaService] No cache keys found matching '{pattern}'")
                return 0
        except Exception as e:
            logger.error(f"[OllamaService] Clear cache error: {e}")
            return 0


# Global instance (lazy-loaded)
_ollama_service: Optional[OllamaService] = None


def get_ollama_service() -> OllamaService:
    """
    Get or create global OllamaService instance.

    Usage in FastAPI:
        from services.ai_ollama_service import get_ollama_service

        @app.get("/suggest")
        def suggest():
            ollama = get_ollama_service()
            result = ollama.get_suggestion("...")
            return {"suggestion": result}
    """
    global _ollama_service

    if _ollama_service is None:
        _ollama_service = OllamaService()

    return _ollama_service
