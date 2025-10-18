from fastapi import FastAPI, Request, status, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from core import init_db, health_check, settings
from core.exceptions import APIException
from api import api_router
from schemas.base import HealthCheckResponse
from core.monitoring import (
    init_sentry,
    init_structured_logging,
    get_logger,
    capture_exception,
)
from core.notifications import websocket_endpoint
from core.security import decode_token, get_password_hash
from core.events import event_bus
from core.permissions import init_default_permissions
from core.database import SessionLocal
from models.role import Role, UserRole
from models.user import User
from sqlalchemy.orm import Session

try:
    from api.routes.auth import TEST_USERS
except Exception:
    TEST_USERS = {}

# Initialiser monitoring (Sentry + structured logging)
init_structured_logging()
init_sentry()
logger = get_logger(__name__)

# Créer l'application FastAPI
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="CRM API for TPM Finance - Investment Pipeline Management",
    debug=settings.debug,
)

# ============= MIDDLEWARE =============

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler global
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.message,
            "status_code": exc.status_code,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

# Exception handler for FastAPI HTTP exceptions (preserves original status/details)
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=getattr(exc, "headers", None),
    )

# ============= EVENTS =============

def _ensure_test_users(db: Session) -> None:
    """Seed default API users required by the legacy test suite."""
    if not TEST_USERS:
        logger.warning("seed_users_skipped", reason="TEST_USERS empty")
        return

    roles_cache: dict[str, Role | None] = {}

    def _get_role(name: UserRole | None) -> Role | None:
        if name is None:
            return None
        key = name.value
        if key not in roles_cache:
            roles_cache[key] = db.query(Role).filter(Role.name == name).first()
        return roles_cache[key]

    for email, payload in TEST_USERS.items():
        normalized_email = email.strip().lower()
        existing = db.query(User).filter(User.email == normalized_email).first()
        if existing:
            continue

        role = _get_role(UserRole.ADMIN if payload.get("is_admin") else UserRole.USER)
        user = User(
            email=normalized_email,
            username=normalized_email.split("@")[0],
            full_name=payload.get("name"),
            hashed_password=get_password_hash(payload["password"]),
            role=role,
            is_active=True,
        )
        db.add(user)
        logger.info(
            "seed_user_created",
            email=normalized_email,
            role=role.name if role else None,
        )
    db.commit()


@app.on_event("startup")
async def startup_event():
    """Initialiser la base de données au démarrage"""
    logger.info("app_startup", message="Démarrage de l'application CRM")
    init_db()
    logger.info("app_startup_complete", message="Base de données initialisée")

    # Initialiser permissions par défaut
    db = SessionLocal()
    try:
        init_default_permissions(db)
        logger.info("permissions_initialized", message="Permissions RBAC initialisées")
        _ensure_test_users(db)
    finally:
        db.close()

    # Démarrer Event Bus (notifications)
    await event_bus.start_listening()
    logger.info("event_bus_started", message="Event Bus Redis démarré")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup au shutdown"""
    # Arrêter Event Bus
    await event_bus.stop_listening()
    logger.info("event_bus_stopped", message="Event Bus Redis arrêté")

    logger.info("app_shutdown", message="Arrêt de l'application CRM")

# ============= ROUTES =============

# Inclure les routes API versionnées
app.include_router(api_router)

@app.get("/health", response_model=HealthCheckResponse)
async def health_check_endpoint():
    """Health check endpoint"""
    db_status = health_check()
    return HealthCheckResponse(
        status="healthy" if db_status else "degraded",
        database=db_status,
        timestamp=datetime.utcnow(),
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.api_title,
        "version": settings.api_version,
        "status": "active",
        "docs": "/docs",
        "health": "/health",
    }

# WebSocket endpoint pour notifications temps réel
@app.websocket("/ws/notifications")
async def notifications_ws(websocket: WebSocket):
    """
    WebSocket endpoint pour notifications temps réel

    Frontend se connecte: ws://localhost:8000/ws/notifications?token=<jwt_token>
    """
    token = websocket.query_params.get("token")
    user_id_param = websocket.query_params.get("user_id")

    resolved_user_id = None

    if user_id_param:
        try:
            resolved_user_id = int(user_id_param)
        except ValueError:
            resolved_user_id = user_id_param

    if resolved_user_id is None and token:
        try:
            payload = decode_token(token)
            raw_user_id = payload.get("sub") or payload.get("user_id")
            if raw_user_id is None:
                raise ValueError("Missing subject in token")
            try:
                resolved_user_id = int(raw_user_id)
            except (TypeError, ValueError):
                resolved_user_id = raw_user_id
        except Exception:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

    if resolved_user_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket_endpoint(websocket, resolved_user_id)

# ============= ERROR HANDLERS =============

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "detail": "Endpoint not found",
            "path": str(request.url.path),
        },
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    capture_exception(exc)
    logger.error(
        "unhandled_exception",
        error=str(exc),
        path=str(request.url.path),
        method=request.method,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Internal server error",
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
