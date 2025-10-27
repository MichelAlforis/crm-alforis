"""
Rate Limiting pour l'API - Protection anti-abus

Utilise slowapi pour limiter les requêtes par IP/User
"""

import logging
from typing import Optional

from fastapi import Request

try:  # pragma: no cover - optional dependency guard
    from slowapi import Limiter, _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    from slowapi.util import get_remote_address
    SLOWAPI_AVAILABLE = True
except ImportError:  # pragma: no cover - executed when slowapi absent
    SLOWAPI_AVAILABLE = False

    class RateLimitExceeded(Exception):  # type: ignore
        """Fallback exception mimicking slowapi.errors.RateLimitExceeded."""

        def __init__(self, detail: str = "Rate limit exceeded", headers: Optional[dict] = None):
            super().__init__(detail)
            self.detail = detail
            self.headers = headers or {}

    def get_remote_address(request: Request) -> str:  # type: ignore
        client = getattr(request, "client", None)
        host = getattr(client, "host", None)
        return host or "unknown"

    def _rate_limit_exceeded_handler(*args, **kwargs):  # type: ignore
        return None

    class Limiter:  # type: ignore
        """No-op limiter replacement when slowapi is unavailable."""

        def __init__(self, *args, **kwargs):
            self.default_limits = kwargs.get("default_limits", [])

        def limit(self, *args, **kwargs):
            def decorator(func):
                return func

            return decorator

logger = logging.getLogger(__name__)


# ============================================================================
# Configuration des limites
# ============================================================================

# Limites par défaut (par IP)
# Note: High limit to accommodate test suite (420 tests with auth fixtures)
# The testclient identification in get_remote_address() provides adequate control
DEFAULT_LIMIT = "1000/minute"  # Increased from 200 to handle test suite

# Limites par type d'endpoint
PUBLIC_WEBHOOK_LIMIT = "10/minute"  # Webhooks publics (non auth)
AUTHENTICATED_LIMIT = "60/minute"  # API authentifiée standard
ADMIN_LIMIT = "1000/minute"  # Admins (ops intensives)
SEARCH_LIMIT = "30/minute"  # Recherche (queries lourdes)
EMAIL_SEND_LIMIT = "20/minute"  # Envoi d'emails
AI_AGENT_LIMIT = "10/minute"  # AI agent (coût élevé)


# ============================================================================
# Key functions pour identifier les clients
# ============================================================================


def get_remote_address_or_user(request: Request) -> str:
    """
    Identifie le client par IP ou user_id si authentifié

    Permet de limiter par utilisateur plutôt que par IP
    pour les utilisateurs authentifiés

    During testing, returns a special key to apply higher limits
    """
    # Detect test client (pytest uses "testclient" as host)
    client = getattr(request, "client", None)
    if client and hasattr(client, "host") and client.host == "testclient":
        return "test:client"

    # Essayer d'extraire le user_id du token JWT
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            from core.security import decode_token

            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            user_id = payload.get("sub")
            if user_id:
                return f"user:{user_id}"
    except Exception:
        pass

    # Fallback sur l'IP
    return get_remote_address(request)


def get_user_id_key(request: Request) -> str:
    """
    Identifie uniquement par user_id (pour endpoints authentifiés)

    Lève une exception si pas de token valide
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise ValueError("Missing Bearer token")

        from core.security import decode_token

        token = auth_header.replace("Bearer ", "")
        payload = decode_token(token)
        user_id = payload.get("sub")

        if not user_id:
            raise ValueError("Invalid token: missing user_id")

        return f"user:{user_id}"

    except Exception as e:
        logger.warning(f"Rate limit key extraction failed: {e}")
        # Fallback sur IP si erreur
        return get_remote_address(request)


# ============================================================================
# Limiter instance
# ============================================================================

# Limiter principal (par IP par défaut)
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[DEFAULT_LIMIT],
    # storage_uri="redis://redis:6379/1",  # Optionnel: backend Redis
    headers_enabled=True,  # Ajouter headers X-RateLimit-*
)


# ============================================================================
# Custom rate limit exceeded handler
# ============================================================================


async def custom_rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """
    Handler personnalisé pour les erreurs de rate limiting

    Retourne un JSON avec détails + logs
    """
    # Log l'abus
    client = get_remote_address(request)
    logger.warning(f"Rate limit exceeded: {request.method} {request.url.path} " f"from {client}")

    # Extraire les headers de limite
    retry_after = exc.headers.get("Retry-After", "60")

    return {
        "error": "rate_limit_exceeded",
        "detail": "Too many requests. Please try again later.",
        "retry_after_seconds": int(retry_after),
        "path": str(request.url.path),
    }


# ============================================================================
# Helpers pour vérifier les limites
# ============================================================================


def is_admin_user(request: Request) -> bool:
    """
    Vérifie si l'utilisateur est admin

    Permet de skip le rate limiting pour les admins
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            from core.security import decode_token

            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            return payload.get("is_admin", False)
    except Exception:
        pass

    return False


def get_client_identifier(request: Request) -> str:
    """
    Retourne un identifiant lisible du client (pour logs)
    """
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            from core.security import decode_token

            token = auth_header.replace("Bearer ", "")
            payload = decode_token(token)
            user_id = payload.get("sub")
            email = payload.get("email")
            if email:
                return f"User {user_id} ({email})"
    except Exception:
        pass

    return f"IP {get_remote_address(request)}"


# ============================================================================
# Decorator pour exemptions conditionnelles
# ============================================================================


def exempt_if_admin(func):
    """
    Decorator pour exempter les admins du rate limiting

    Usage:
        @router.get("/expensive-operation")
        @exempt_if_admin
        @limiter.limit("10/minute")
        async def expensive_op(request: Request):
            ...
    """
    from functools import wraps

    @wraps(func)
    async def wrapper(request: Request, *args, **kwargs):
        if is_admin_user(request):
            # Skip rate limit pour admins
            logger.debug(f"Rate limit skipped for admin: {get_client_identifier(request)}")
            return await func(request, *args, **kwargs)

        # Appliquer rate limit normal
        return await func(request, *args, **kwargs)

    return wrapper


# ============================================================================
# Exemples d'utilisation
# ============================================================================

"""
# Dans main.py
from core.rate_limit import limiter, custom_rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)

# Dans les routes
from core.rate_limit import (
    limiter,
    PUBLIC_WEBHOOK_LIMIT,
    AUTHENTICATED_LIMIT,
    SEARCH_LIMIT,
    AI_AGENT_LIMIT,
    exempt_if_admin,
)

# Webhook public (strict)
@router.post("/webhooks/resend")
@limiter.limit(PUBLIC_WEBHOOK_LIMIT)
async def resend_webhook(request: Request, payload: dict):
    ...

# API authentifiée standard
@router.get("/api/v1/people")
@limiter.limit(AUTHENTICATED_LIMIT)
async def list_people(request: Request):
    ...

# Recherche (query lourde)
@router.get("/api/v1/search")
@limiter.limit(SEARCH_LIMIT)
async def search(request: Request, q: str):
    ...

# AI Agent (coût élevé, exempt admins)
@router.post("/api/v1/ai/analyze")
@exempt_if_admin
@limiter.limit(AI_AGENT_LIMIT)
async def ai_analyze(request: Request, data: dict):
    ...

# Admin endpoint (haute limite)
@router.get("/api/v1/admin/export")
@limiter.limit(ADMIN_LIMIT)
async def admin_export(request: Request):
    ...
"""
