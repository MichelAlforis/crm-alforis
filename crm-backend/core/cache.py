"""
Système de Cache Redis

Fonctionnalités:
- Cache des réponses API
- Invalidation automatique
- TTL configurable
- Métriques (hit/miss rate)
"""

import hashlib
import json
import logging
from datetime import timedelta
from functools import wraps
from typing import Any, Callable, Optional

import redis
from fastapi.encoders import jsonable_encoder

from core.config import settings

# ============================================================================
# Redis Client
# ============================================================================


class RedisClient:
    """Client Redis singleton"""

    _instance: Optional[redis.Redis] = None

    @classmethod
    def get_client(cls) -> redis.Redis:
        """
        Obtient le client Redis (singleton)

        Returns:
            Client Redis
        """
        if cls._instance is None:
            cls._instance = redis.Redis(
                host=getattr(settings, "redis_host", "redis"),
                port=getattr(settings, "redis_port", 6379),
                password=getattr(settings, "redis_password", None),
                db=getattr(settings, "redis_db", 0),
                decode_responses=True,
                socket_timeout=1,
                socket_connect_timeout=1,
                retry_on_timeout=True,
            )
            logging.info(
                f"✅ Redis client initialisé - Host: {getattr(settings, 'redis_host', 'redis')}"
            )

        return cls._instance

    @classmethod
    def is_available(cls) -> bool:
        """
        Vérifie si Redis est disponible

        Returns:
            True si Redis répond, False sinon
        """
        try:
            client = cls.get_client()
            client.ping()
            return True
        except (redis.ConnectionError, redis.TimeoutError) as e:
            logging.warning(f"⚠️  Redis non disponible: {e}")
            return False


# ============================================================================
# Cache Functions
# ============================================================================


def generate_cache_key(*args, **kwargs) -> str:
    """
    Génère une clé de cache unique à partir des arguments

    Args:
        *args: Arguments positionnels
        **kwargs: Arguments nommés

    Returns:
        Clé de cache (hash SHA256)
    """
    # Combiner args et kwargs en string
    key_data = f"{args}:{sorted(kwargs.items())}"

    # Hash pour éviter clés trop longues
    key_hash = hashlib.sha256(key_data.encode()).hexdigest()

    return key_hash


def get_cache(key: str) -> Optional[Any]:
    """
    Récupère une valeur du cache

    Args:
        key: Clé du cache

    Returns:
        Valeur ou None si pas trouvée
    """
    if not RedisClient.is_available():
        return None

    try:
        client = RedisClient.get_client()
        value = client.get(key)

        if value:
            # Incrémenter hit count
            client.incr("cache:hits")
            logging.debug(f"✅ Cache HIT: {key[:16]}...")
            return json.loads(value)
        else:
            # Incrémenter miss count
            client.incr("cache:misses")
            logging.debug(f"❌ Cache MISS: {key[:16]}...")
            return None

    except Exception as e:
        logging.error(f"❌ Cache GET error: {e}")
        return None


def set_cache(key: str, value: Any, ttl: int = 300) -> bool:
    """
    Stocke une valeur dans le cache

    Args:
        key: Clé du cache
        value: Valeur à stocker
        ttl: Time-to-live en secondes (défaut: 5 min)

    Returns:
        True si succès, False sinon
    """
    if not RedisClient.is_available():
        return False

    try:
        client = RedisClient.get_client()
        value_json = json.dumps(jsonable_encoder(value))
        client.setex(key, ttl, value_json)
        logging.debug(f"💾 Cache SET: {key[:16]}... (TTL: {ttl}s)")
        return True

    except Exception as e:
        logging.error(f"❌ Cache SET error: {e}")
        return False


def delete_cache(pattern: str) -> int:
    """
    Supprime les clés de cache correspondant au pattern

    Args:
        pattern: Pattern Redis (ex: "organisations:*")

    Returns:
        Nombre de clés supprimées
    """
    if not RedisClient.is_available():
        return 0

    try:
        client = RedisClient.get_client()
        keys = client.keys(pattern)

        if keys:
            deleted = client.delete(*keys)
            logging.info(f"🗑️  Cache invalidé: {deleted} clés ({pattern})")
            return deleted

        return 0

    except Exception as e:
        logging.error(f"❌ Cache DELETE error: {e}")
        return 0


def clear_all_cache() -> bool:
    """
    Efface tout le cache

    Returns:
        True si succès
    """
    if not RedisClient.is_available():
        return False

    try:
        client = RedisClient.get_client()
        client.flushdb()
        logging.warning("🗑️  TOUT le cache a été effacé!")
        return True

    except Exception as e:
        logging.error(f"❌ Cache CLEAR error: {e}")
        return False


# ============================================================================
# Cache Decorator
# ============================================================================


def cache_response(ttl: int = 300, key_prefix: str = "", skip_if: Optional[Callable] = None):
    """
    Décorateur pour cacher les réponses de fonction

    Args:
        ttl: Time-to-live en secondes (défaut: 5 min)
        key_prefix: Préfixe pour la clé de cache
        skip_if: Fonction pour skip le cache (ex: lambda user: user.is_admin)

    Usage:
        @cache_response(ttl=600, key_prefix="organisations")
        async def list_organisations():
            return db.query(Organisation).all()

    Example:
        @router.get("/organisations")
        @cache_response(ttl=300, key_prefix="organisations")
        async def list_organisations(
            skip: int = 0,
            limit: int = 100,
            current_user: User = Depends(get_current_user)
        ):
            # Skip cache pour les admins
            if current_user.is_admin:
                return db.query(Organisation).all()

            return db.query(Organisation).offset(skip).limit(limit).all()
    """

    def decorator(func: Callable):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # Skip cache si condition remplie
            if skip_if and skip_if(*args, **kwargs):
                logging.debug(f"⏭️  Cache skipped: {func.__name__}")
                return await func(*args, **kwargs)

            # Générer la clé de cache
            cache_key = f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"

            # Essayer de récupérer du cache
            cached_value = get_cache(cache_key)
            if cached_value is not None:
                return cached_value

            # Cache MISS: exécuter la fonction
            result = await func(*args, **kwargs)

            # Stocker le résultat
            set_cache(cache_key, result, ttl)

            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # Skip cache si condition remplie
            if skip_if and skip_if(*args, **kwargs):
                logging.debug(f"⏭️  Cache skipped: {func.__name__}")
                return func(*args, **kwargs)

            # Générer la clé de cache
            cache_key = f"{key_prefix}:{func.__name__}:{generate_cache_key(*args, **kwargs)}"

            # Essayer de récupérer du cache
            cached_value = get_cache(cache_key)
            if cached_value is not None:
                return cached_value

            # Cache MISS: exécuter la fonction
            result = func(*args, **kwargs)

            # Stocker le résultat
            set_cache(cache_key, result, ttl)

            return result

        # Retourner le bon wrapper (async ou sync)
        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


# ============================================================================
# Cache Invalidation Helpers
# ============================================================================


def invalidate_organisation_cache(org_id: Optional[int] = None):
    """
    Invalide le cache des organisations

    Args:
        org_id: Optionnel, conservé pour compatibilité (efface tout le cache)
    """
    # Les clés utilisent un hash SHA256 => on invalide tout le namespace
    delete_cache("organisations:*")


def invalidate_person_cache(person_id: Optional[int] = None):
    """
    Invalide le cache des personnes

    Args:
        person_id: ID de la personne (None = toutes)
    """
    if person_id:
        delete_cache(f"people:*:{person_id}*")
    else:
        delete_cache("people:*")


def invalidate_all_caches():
    """Invalide tous les caches de l'application"""
    patterns = [
        "organisations:*",
        "people:*",
        "mandats:*",
        "produits:*",
        "interactions:*",
        "tasks:*",
    ]

    total_deleted = 0
    for pattern in patterns:
        total_deleted += delete_cache(pattern)

    logging.info(f"🗑️  {total_deleted} clés de cache invalidées")
    return total_deleted


# ============================================================================
# Cache Statistics
# ============================================================================


def get_cache_stats() -> dict:
    """
    Obtient les statistiques du cache

    Returns:
        Dict avec hits, misses, hit_rate, keys_count
    """
    if not RedisClient.is_available():
        return {"available": False, "error": "Redis non disponible"}

    try:
        client = RedisClient.get_client()

        hits = int(client.get("cache:hits") or 0)
        misses = int(client.get("cache:misses") or 0)
        total = hits + misses

        hit_rate = (hits / total * 100) if total > 0 else 0

        # Compter les clés
        keys_count = len(client.keys("*"))

        # Info Redis
        info = client.info()
        memory_used = info.get("used_memory_human", "N/A")

        return {
            "available": True,
            "hits": hits,
            "misses": misses,
            "total_requests": total,
            "hit_rate": round(hit_rate, 2),
            "keys_count": keys_count,
            "memory_used": memory_used,
        }

    except Exception as e:
        logging.error(f"❌ Cache stats error: {e}")
        return {"available": False, "error": str(e)}


def reset_cache_stats():
    """Réinitialise les statistiques du cache"""
    if not RedisClient.is_available():
        return False

    try:
        client = RedisClient.get_client()
        client.delete("cache:hits", "cache:misses")
        logging.info("📊 Statistiques du cache réinitialisées")
        return True

    except Exception as e:
        logging.error(f"❌ Cache stats reset error: {e}")
        return False


# ============================================================================
# Health Check
# ============================================================================


def check_cache_health() -> dict:
    """
    Vérifie l'état du cache

    Returns:
        Dict avec l'état du cache
    """
    available = RedisClient.is_available()

    if not available:
        return {"status": "unavailable", "available": False, "message": "Redis non disponible"}

    try:
        client = RedisClient.get_client()

        # Test ping
        ping_result = client.ping()

        # Stats
        stats = get_cache_stats()

        return {
            "status": "healthy",
            "available": True,
            "ping": ping_result,
            "stats": stats,
        }

    except Exception as e:
        return {"status": "error", "available": False, "error": str(e)}


# ============================================================================
# Exemples d'utilisation
# ============================================================================

"""
# Dans les routes API

from core.cache import cache_response, invalidate_organisation_cache

# GET avec cache (5 minutes)
@router.get("/organisations")
@cache_response(ttl=300, key_prefix="organisations")
async def list_organisations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    return db.query(Organisation).offset(skip).limit(limit).all()


# POST invalide le cache
@router.post("/organisations")
async def create_organisation(
    data: OrganisationCreate,
    db: Session = Depends(get_db)
):
    org = Organisation(**data.dict())
    db.add(org)
    db.commit()

    # Invalider le cache
    invalidate_organisation_cache()

    return org


# Cache avec condition (skip pour admins)
@router.get("/organisations")
@cache_response(
    ttl=600,
    key_prefix="organisations",
    skip_if=lambda current_user: current_user.is_admin
)
async def list_organisations_smart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Organisation).all()


# Endpoint stats cache
@router.get("/cache/stats")
async def cache_stats():
    from core.cache import get_cache_stats
    return get_cache_stats()


# Endpoint clear cache
@router.delete("/cache")
async def clear_cache():
    from core.cache import invalidate_all_caches
    deleted = invalidate_all_caches()
    return {"message": f"{deleted} clés supprimées"}
"""
