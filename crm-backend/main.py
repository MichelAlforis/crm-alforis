from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import logging

from core import init_db, health_check, settings
from core.exceptions import APIException
from api import api_router
from schemas.base import HealthCheckResponse

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# ============= EVENTS =============

@app.on_event("startup")
async def startup_event():
    """Initialiser la base de données au démarrage"""
    logger.info("🚀 Démarrage de l'application CRM...")
    init_db()
    logger.info("✅ Base de données initialisée")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup au shutdown"""
    logger.info("🛑 Arrêt de l'application CRM")

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
    logger.error(f"Unhandled exception: {exc}")
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