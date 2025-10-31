import json
import logging
import os
import time
import traceback
from contextlib import asynccontextmanager
from typing import AsyncIterator, Optional

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

# ============================================================
# 🔍 Logging configuration
# ============================================================

# Configure logging level from environment (DEBUG, INFO, WARNING, ERROR)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("crm-api")

# ============================================================
# 🔧 Feature flags & ENV
# ============================================================

APP_TITLE = os.getenv("APP_TITLE", "Alforis CRM API")
APP_VERSION = os.getenv("APP_VERSION", "0.1.0")

# CORS
_raw_origins = os.getenv("ALLOWED_ORIGINS", '["http://localhost:3010","http://127.0.0.1:3010"]')
try:
    ALLOWED_ORIGINS = json.loads(_raw_origins) if _raw_origins.strip().startswith("[") else [
        o.strip() for o in _raw_origins.split(",") if o.strip()
    ]
except Exception:
    ALLOWED_ORIGINS = ["http://localhost:3010", "http://127.0.0.1:3010"]

# Sentry (optionnel)
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
SENTRY_ENV = os.getenv("SENTRY_ENVIRONMENT", "development")

# DB & Redis
DATABASE_URL = os.getenv("DATABASE_URL")  # ex: postgresql+psycopg2://crm_user:crm_password@postgres:5432/crm_db
REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
ENABLE_REDIS_EVENTS = os.getenv("ENABLE_REDIS_EVENTS", "0").lower() in ("1", "true", "yes")

# Reload à éviter dans Docker (géré par uvicorn CLI si besoin)
ENABLE_METRICS_MIDDLEWARE = True


# ============================================================
# 🧰 Sentry (optionnel, non bloquant)
# ============================================================

def _init_sentry_if_available() -> None:
    if not SENTRY_DSN:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            environment=SENTRY_ENV,
            integrations=[FastApiIntegration(), LoggingIntegration(level=None, event_level=None)],
            traces_sample_rate=0.0,  # ajuste si tu veux le tracing
        )
    except Exception as e:
        logger.warning(f"Sentry initialization failed: {e}")


# ============================================================
# 🧪 Readiness checks (DB + Redis) — non bloquants
# ============================================================

async def _check_db() -> bool:
    if not DATABASE_URL:
        return False
    # Essaye en async si possible, sinon fallback "psycopg2" via simple test
    try:
        # si URL sync → transforme pour asyncpg (best effort)
        dsn = DATABASE_URL.replace("+psycopg2", "+asyncpg")
        import asyncpg  # type: ignore
        conn = await asyncpg.connect(dsn)
        await conn.execute("SELECT 1")
        await conn.close()
        return True
    except Exception:
        return False


async def _check_redis() -> bool:
    if not ENABLE_REDIS_EVENTS:
        return False
    try:
        import redis.asyncio as aioredis  # type: ignore
        r = aioredis.from_url(REDIS_URL, decode_responses=True)
        pong = await r.ping()
        await r.close()
        return bool(pong)
    except Exception:
        return False


# ============================================================
# ♻️ Lifespan (start/stop) — rien de bloquant
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    _init_sentry_if_available()
    # Ici tu peux init tes pools (optionnels et non-bloquants)
    yield
    # Ici tu peux fermer proprement tes pools


# ============================================================
# 🚀 App
# ============================================================

app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/v1/docs",
    openapi_url="/api/v1/openapi.json",
    redoc_url="/api/v1/redoc",
    swagger_ui_parameters={"defaultModelsExpandDepth": -1},
)

# --- Middleware CORS ---
logger.info(f"CORS configuration: {ALLOWED_ORIGINS}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Allow frontend to read custom headers
    max_age=600,  # Cache preflight requests for 10 minutes
)
logger.info(f"CORS middleware enabled for origins: {ALLOWED_ORIGINS}")

# --- GZip (utile pour grosses réponses JSON) ---
app.add_middleware(GZipMiddleware, minimum_size=1024)

# --- RGPD Data Access Logging ---
try:
    from middleware.rgpd_logging import RGPDLoggingMiddleware

    app.add_middleware(RGPDLoggingMiddleware)
    logger.info("RGPD logging middleware enabled (CNIL compliance)")
except ImportError as e:
    logger.warning(f"RGPD logging middleware not available: {e}")
except Exception as e:
    logger.warning(f"RGPD logging middleware setup failed: {e}")

# --- Rate Limiting ---
try:
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware

    from core.rate_limit import custom_rate_limit_exceeded_handler, limiter

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, custom_rate_limit_exceeded_handler)
    app.add_middleware(SlowAPIMiddleware)
    logger.info("Rate limiting enabled (slowapi)")
except ImportError:
    logger.warning("slowapi not available - rate limiting disabled")
except Exception as e:
    logger.warning(f"Rate limiting setup failed: {e}")

# --- Metrics simple (temps de réponse) ---
if ENABLE_METRICS_MIDDLEWARE:
    @app.middleware("http")
    async def add_process_time_header(request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception as exc:
            # Log structured error with appropriate level
            logger.error(
                f"Exception in {request.method} {request.url.path}",
                exc_info=exc,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "client": request.client.host if request.client else None,
                }
            )

            # In DEBUG mode, also print full traceback to console
            if logger.isEnabledFor(logging.DEBUG):
                print("=" * 80)
                print(f"❌ DEBUG TRACEBACK: {request.method} {request.url.path}")
                print("=" * 80)
                traceback.print_exc()
                print("=" * 80)

            # Send to Sentry if configured
            if SENTRY_DSN:
                try:
                    import sentry_sdk  # type: ignore
                    sentry_sdk.capture_exception(exc)
                except Exception as e:
                    logger.warning(f"Failed to send exception to Sentry: {e}")

            # Controlled JSON response (hide internal details in production)
            error_detail = str(exc) if logger.isEnabledFor(logging.DEBUG) else "Internal Server Error"
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal Server Error", "error": error_detail},
            )
        finally:
            process_time = time.perf_counter() - start
            # Tu peux loguer si tu veux
        return response


# ============================================================
# ✅ Health & Ready
# ============================================================

@app.get("/api/v1/health", include_in_schema=False)
async def health():
    """Health minimal → ne doit JAMAIS planter."""
    return {"status": "ok"}

@app.get("/api/v1/ready", include_in_schema=False)
async def ready():
    """Readiness plus profond : DB + Redis (non bloquant)."""
    db_ok = await _check_db()
    redis_ok = await _check_redis()
    status = "ok" if (db_ok and (redis_ok or not ENABLE_REDIS_EVENTS)) else "degraded"
    return {"status": status, "db": db_ok, "redis": redis_ok if ENABLE_REDIS_EVENTS else None}


# ============================================================
# 📦 Inclusion des routers applicatifs
# ============================================================

# IMPORTANT :
# On isole les imports pour éviter qu’un module optionnel (ex: events/redis) ne fasse planter tout le boot.
# Ajoute/retire les lignes selon ce que tu as réellement.
try:
    from api import (
        api_router,  # ton APIRouter principal qui inclut people, organisations, kpis, auth, etc.
    )

    # api_router a déjà le prefix="/api/v1" dans api/__init__.py, ne pas le redoubler !
    app.include_router(api_router)
except Exception as e:
    logger.error(f"Failed to load API routes: {e}", exc_info=e)
    if logger.isEnabledFor(logging.DEBUG):
        traceback.print_exc()

# ============================================================
# 🔌 WebSocket pour notifications temps réel
# ============================================================

try:
    from fastapi import Query, WebSocket, WebSocketDisconnect

    from core.database import get_db
    from core.notifications import websocket_endpoint
    from core.security import decode_token

    @app.websocket("/ws/notifications")
    async def notifications_websocket(
        websocket: WebSocket,
        token: str = Query(...)
    ):
        """Endpoint WebSocket pour les notifications temps réel (multi-tenant)"""
        try:
            # Décoder le token pour obtenir l'utilisateur
            payload = decode_token(token)
            user_id = payload.get("sub")

            if not user_id:
                await websocket.close(code=1008, reason="Invalid token: missing user_id")
                return

            # Récupérer l'org_id depuis le token ou la DB
            org_id = payload.get("org_id")

            # Fallback: si pas dans le token, récupérer depuis la DB
            if not org_id:
                from models.user import User
                db_gen = get_db()
                db = next(db_gen)
                try:
                    user = db.query(User).filter(User.id == int(user_id)).first()
                    if user and hasattr(user, "organisation_id"):
                        org_id = user.organisation_id
                    elif user:
                        # Fallback: organisation par défaut (1) si pas d'org_id
                        org_id = 1
                    else:
                        await websocket.close(code=1008, reason="User not found")
                        return
                finally:
                    db.close()

            if not org_id:
                await websocket.close(code=1008, reason="Invalid token: missing org_id")
                return

            # Connecter via le manager avec org_id
            await websocket_endpoint(websocket, int(user_id), int(org_id))

        except Exception as e:
            logger.error(f"WebSocket error: {e}", exc_info=e)
            try:
                await websocket.close(code=1011, reason=f"Error: {str(e)}")
            except:
                pass

    logger.info("WebSocket endpoint /ws/notifications enabled")

except Exception as e:
    logger.warning(f"WebSocket not available: {e}")

# Si tu préfères inclure router par router :
# try:
#     from api.routes import auth, people, organisations, kpis, products, system
#     app.include_router(auth.router, prefix="/api/v1", tags=["auth"])
#     app.include_router(people.router, prefix="/api/v1", tags=["people"])
#     app.include_router(organisations.router, prefix="/api/v1", tags=["organisations"])
#     app.include_router(kpis.router, prefix="/api/v1", tags=["kpis"])
#     app.include_router(products.router, prefix="/api/v1", tags=["products"])
#     # etc.
# except Exception as e:
#     print("⚠️ Erreur lors du chargement des sous-routers :", e)
#     traceback.print_exc()


# ============================================================
# 🛡️ Handlers d'erreurs (facultatifs mais propres)
# ============================================================

from core.exceptions import APIException


@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handler pour les exceptions API personnalisées (404, 409, etc.)"""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message}
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    if SENTRY_DSN:
        try:
            import sentry_sdk  # type: ignore
            sentry_sdk.capture_exception(exc)
        except Exception as e:
            logger.warning(f"Failed to send exception to Sentry: {e}")

    # Structured logging
    logger.error(
        f"Unhandled exception in {request.method} {request.url.path}",
        exc_info=exc,
        extra={
            "method": request.method,
            "path": request.url.path,
            "client": request.client.host if request.client else None,
        }
    )

    # Debug mode: print full traceback
    if logger.isEnabledFor(logging.DEBUG):
        traceback.print_exc()

    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


# ============================================================
# ▶️ Entrée locale (utile hors Docker)
# ============================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
# test optimisation $(date)

