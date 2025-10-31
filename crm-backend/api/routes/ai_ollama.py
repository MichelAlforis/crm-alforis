"""
API Routes pour Ollama service (LiteLLM + Redis cache).

Endpoints:
- POST /ai/ollama/suggest - Get AI suggestion avec cache
- GET /ai/ollama/cache/stats - Cache statistics
- DELETE /ai/ollama/cache - Clear cache
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from services.ai_ollama_service import get_ollama_service, OllamaService
from models.user import User
from core import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai/ollama", tags=["AI - Ollama"])


# ============================================================================
# Request/Response Models
# ============================================================================

class OllamaSuggestionRequest(BaseModel):
    """Request pour obtenir une suggestion IA."""
    prompt: str = Field(..., description="User prompt", min_length=1, max_length=2000)
    model: str = Field(default="mistral:7b", description="Model name (mistral:7b, llama2:13b, etc.)")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Sampling temperature")
    max_tokens: int = Field(default=150, ge=10, le=500, description="Max tokens to generate")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt")
    use_cache: bool = Field(default=True, description="Enable Redis cache")


class OllamaSuggestionResponse(BaseModel):
    """Response avec suggestion IA."""
    success: bool
    suggestion: Optional[str]
    cached: bool = Field(description="True if result from cache")
    model: str
    error: Optional[str] = None


class CacheStatsResponse(BaseModel):
    """Response avec stats du cache Redis."""
    cache_keys: int = Field(description="Number of cached responses")
    cache_pattern: str
    memory_used_mb: float = Field(description="Redis memory used (MB)")
    cache_ttl: int = Field(description="Cache TTL in seconds")
    redis_db: int


class CacheClearResponse(BaseModel):
    """Response après clear du cache."""
    success: bool
    keys_deleted: int
    message: str


# ============================================================================
# Endpoints
# ============================================================================

@router.post("/suggest", response_model=OllamaSuggestionResponse)
async def get_ollama_suggestion(
    request: OllamaSuggestionRequest,
    current_user: User = Depends(get_current_user),
    ollama_service: OllamaService = Depends(get_ollama_service),
):
    """
    Obtenir une suggestion IA depuis Ollama (avec cache Redis).

    Features:
    - Cache Redis automatique (1h TTL)
    - Timeout 5s (pas de blocage UI)
    - Fallback optionnel vers GPT/Claude

    Example:
        POST /ai/ollama/suggest
        {
            "prompt": "Suggest a role for: CEO at ACME Corporation",
            "model": "mistral:7b",
            "temperature": 0.7,
            "max_tokens": 100
        }
    """
    try:
        logger.info(
            f"[Ollama API] User {current_user.id} requesting suggestion: "
            f"model={request.model}, cache={request.use_cache}"
        )

        # Check cache first (for "cached" flag)
        cache_key = ollama_service._get_cache_key(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            system_prompt=request.system_prompt,
        )
        was_cached = ollama_service._get_from_cache(cache_key) is not None

        # Get suggestion
        suggestion = await ollama_service.aget_suggestion(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            system_prompt=request.system_prompt,
            use_cache=request.use_cache,
        )

        if suggestion:
            logger.info(f"[Ollama API] Success: {len(suggestion)} chars, cached={was_cached}")
            return OllamaSuggestionResponse(
                success=True,
                suggestion=suggestion,
                cached=was_cached,
                model=request.model,
            )
        else:
            logger.warning("[Ollama API] No suggestion returned")
            return OllamaSuggestionResponse(
                success=False,
                suggestion=None,
                cached=False,
                model=request.model,
                error="Ollama service unavailable or timeout",
            )

    except Exception as e:
        logger.exception(f"[Ollama API] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")


@router.get("/cache/stats", response_model=CacheStatsResponse)
def get_cache_stats(
    current_user: User = Depends(get_current_user),
    ollama_service: OllamaService = Depends(get_ollama_service),
):
    """
    Obtenir les statistiques du cache Redis Ollama.

    Requires: User authentifié

    Returns:
        - cache_keys: Nombre de réponses cachées
        - memory_used_mb: Mémoire Redis utilisée
        - cache_ttl: TTL du cache (secondes)
    """
    try:
        stats = ollama_service.get_cache_stats()

        if "error" in stats:
            raise HTTPException(status_code=503, detail=stats["error"])

        return CacheStatsResponse(**stats)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"[Ollama API] Cache stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/cache", response_model=CacheClearResponse)
def clear_cache(
    current_user: User = Depends(get_current_user),
    ollama_service: OllamaService = Depends(get_ollama_service),
):
    """
    Vider le cache Redis Ollama.

    Requires: User authentifié

    Utile pour:
    - Forcer refresh des suggestions
    - Libérer mémoire Redis
    - Debug/testing
    """
    try:
        logger.info(f"[Ollama API] User {current_user.id} clearing cache")

        deleted_count = ollama_service.clear_cache()

        return CacheClearResponse(
            success=True,
            keys_deleted=deleted_count,
            message=f"Cleared {deleted_count} cache entries",
        )

    except Exception as e:
        logger.exception(f"[Ollama API] Cache clear error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def ollama_health_check(
    ollama_service: OllamaService = Depends(get_ollama_service),
):
    """
    Health check pour Ollama service.

    Vérifie:
    - Redis connectivity
    - Cache stats

    Returns:
        {"status": "healthy", "redis": "connected", ...}
    """
    try:
        # Check Redis
        redis_status = "connected" if ollama_service.redis else "disconnected"

        # Get cache stats
        cache_stats = ollama_service.get_cache_stats() if ollama_service.redis else {}

        return {
            "status": "healthy",
            "redis": redis_status,
            "redis_db": ollama_service.redis_db,
            "cache_ttl": ollama_service.cache_ttl,
            "ollama_base_url": ollama_service.ollama_base_url,
            "timeout": ollama_service.default_timeout,
            "fallback_enabled": ollama_service.enable_fallback,
            "cache_stats": cache_stats,
        }

    except Exception as e:
        logger.exception(f"[Ollama API] Health check error: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
        }
