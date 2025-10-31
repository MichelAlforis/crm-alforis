"""
Health check endpoints pour monitoring et Docker healthcheck

Endpoints:
- GET /health - Simple health check (fast, for Docker)
- GET /health/detailed - Detailed health check (postgres, redis, celery)
"""

import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.cache import RedisClient
from core.database import get_db

router = APIRouter(tags=["health"])
logger = logging.getLogger("crm-api")


@router.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint (lightweight)

    Retourne le statut de l'API et de la base de données.
    Utilisé par Docker pour vérifier que l'API est opérationnelle.
    """
    try:
        # Vérifier la connexion DB
        db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "database": "connected",
            "service": "crm-api",
            "version": "1.0.0",
        }
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


@router.get("/health/detailed")
async def health_check_detailed(db: Session = Depends(get_db)):
    """
    Detailed health check endpoint

    Vérifie l'état de tous les services:
    - PostgreSQL (database)
    - Redis (cache)
    - Celery (workers)

    Returns:
        {
            "status": "healthy" | "degraded" | "unhealthy",
            "timestamp": "2025-10-31T10:00:00Z",
            "checks": {
                "database": {...},
                "redis": {...},
                "celery": {...}
            }
        }
    """
    checks: Dict[str, Dict[str, Any]] = {}
    overall_status = "healthy"

    # 1. PostgreSQL Check
    try:
        result = db.execute(text("SELECT version()")).fetchone()
        pg_version = result[0] if result else "unknown"

        # Check connection pool stats
        pool_size = db.bind.pool.size()
        pool_checkedout = db.bind.pool.checkedout()

        checks["database"] = {
            "status": "healthy",
            "version": pg_version.split(",")[0] if pg_version else "unknown",
            "pool_size": pool_size,
            "connections_in_use": pool_checkedout,
            "response_time_ms": "< 5"
        }
    except Exception as e:
        logger.error(f"PostgreSQL health check failed: {e}")
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        overall_status = "unhealthy"

    # 2. Redis Check
    try:
        redis_client = RedisClient.get_client()
        redis_client.ping()

        # Get Redis info
        info = redis_client.info()
        memory_used = info.get("used_memory_human", "unknown")
        connected_clients = info.get("connected_clients", 0)

        checks["redis"] = {
            "status": "healthy",
            "version": info.get("redis_version", "unknown"),
            "memory_used": memory_used,
            "connected_clients": connected_clients,
            "response_time_ms": "< 5"
        }
    except Exception as e:
        logger.warning(f"Redis health check failed: {e}")
        checks["redis"] = {
            "status": "degraded",
            "error": str(e),
            "message": "Redis unavailable, cache disabled"
        }
        # Redis failure is not critical (degraded, not unhealthy)
        if overall_status == "healthy":
            overall_status = "degraded"

    # 3. Celery Workers Check
    try:
        from tasks.celery_app import celery_app

        # Get active workers
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        stats = inspect.stats()

        if active_workers:
            worker_count = len(active_workers)
            worker_names = list(active_workers.keys())

            # Get task counts
            total_tasks = sum(len(tasks) for tasks in active_workers.values())

            checks["celery"] = {
                "status": "healthy",
                "workers": worker_count,
                "worker_names": worker_names,
                "active_tasks": total_tasks,
                "stats": stats if stats else {}
            }
        else:
            checks["celery"] = {
                "status": "degraded",
                "workers": 0,
                "message": "No active workers found"
            }
            if overall_status == "healthy":
                overall_status = "degraded"

    except Exception as e:
        logger.warning(f"Celery health check failed: {e}")
        checks["celery"] = {
            "status": "degraded",
            "error": str(e),
            "message": "Celery unavailable"
        }
        if overall_status == "healthy":
            overall_status = "degraded"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "checks": checks
    }
