"""
Endpoint de monitoring avancé pour supervision production

Fournit des métriques détaillées sur:
- Santé système (CPU, RAM, disque)
- Activité base de données (tâches 24h, erreurs)
- État des workers (supervisord)
- Files d'attente (Redis/Celery si configuré)
"""

import subprocess
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from core.database import get_db
from core.auth import get_current_user
from models.user import User
from models.task import Task, TaskStatus
from models.notification import Notification

router = APIRouter(tags=["monitoring"], prefix="/monitoring")

try:  # pragma: no cover - optional dependency guard
    import psutil  # type: ignore

    PSUTIL_AVAILABLE = True
except ImportError:  # pragma: no cover - executed when psutil missing
    psutil = None  # type: ignore
    PSUTIL_AVAILABLE = False


def get_system_metrics() -> Dict[str, Any]:
    """
    Collecte les métriques système avec psutil

    Returns:
        Dict avec CPU, RAM, disque, réseau
    """
    if not PSUTIL_AVAILABLE:
        return {"error": "psutil non disponible - métriques système désactivées"}

    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()

        # RAM
        mem = psutil.virtual_memory()
        mem_total_gb = mem.total / (1024**3)
        mem_used_gb = mem.used / (1024**3)
        mem_percent = mem.percent

        # Disque
        disk = psutil.disk_usage("/")
        disk_total_gb = disk.total / (1024**3)
        disk_used_gb = disk.used / (1024**3)
        disk_percent = disk.percent

        return {
            "cpu": {
                "percent": round(cpu_percent, 1),
                "count": cpu_count,
                "status": "healthy" if cpu_percent < 80 else "warning" if cpu_percent < 95 else "critical",
            },
            "memory": {
                "total_gb": round(mem_total_gb, 2),
                "used_gb": round(mem_used_gb, 2),
                "percent": round(mem_percent, 1),
                "status": "healthy" if mem_percent < 80 else "warning" if mem_percent < 95 else "critical",
            },
            "disk": {
                "total_gb": round(disk_total_gb, 2),
                "used_gb": round(disk_used_gb, 2),
                "percent": round(disk_percent, 1),
                "status": "healthy" if disk_percent < 80 else "warning" if disk_percent < 95 else "critical",
            },
        }
    except Exception as e:
        return {"error": f"Failed to collect system metrics: {str(e)}"}


def get_supervisord_status() -> Dict[str, Any]:
    """
    Récupère le statut des workers supervisord

    Returns:
        Dict avec statut de chaque programme
    """
    try:
        result = subprocess.run(
            ["supervisorctl", "status"],
            capture_output=True,
            text=True,
            timeout=5,
        )

        workers = {}
        if result.returncode == 0:
            for line in result.stdout.strip().split("\n"):
                if line:
                    parts = line.split()
                    if len(parts) >= 2:
                        name = parts[0]
                        status = parts[1]
                        workers[name] = {
                            "status": status,
                            "healthy": status == "RUNNING",
                        }

        return {
            "workers": workers,
            "status": "healthy" if all(w["healthy"] for w in workers.values()) else "degraded",
        }
    except subprocess.TimeoutExpired:
        return {"error": "Supervisorctl timeout", "status": "unknown"}
    except FileNotFoundError:
        # Supervisord non configuré (mode dev)
        return {"workers": {}, "status": "not_configured"}
    except Exception as e:
        return {"error": str(e), "status": "error"}


def get_database_metrics(db: Session) -> Dict[str, Any]:
    """
    Collecte les métriques de base de données

    Returns:
        Dict avec stats des 24 dernières heures
    """
    try:
        # Période de 24h
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        # Tâches des dernières 24h
        tasks_total = db.query(Task).filter(Task.created_at >= yesterday).count()
        tasks_completed = (
            db.query(Task)
            .filter(Task.created_at >= yesterday, Task.status == TaskStatus.DONE)
            .count()
        )
        tasks_failed = (
            db.query(Task)
            .filter(Task.created_at >= yesterday, Task.status == TaskStatus.CANCELLED)
            .count()
        )

        # Notifications non lues
        notifications_unread = db.query(Notification).filter(Notification.is_read == False).count()

        # Connexions DB actives (PostgreSQL)
        try:
            db_connections = db.execute(
                text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
            ).scalar()
        except Exception:
            db_connections = None

        return {
            "tasks_24h": {
                "total": tasks_total,
                "completed": tasks_completed,
                "failed": tasks_failed,
                "success_rate": round((tasks_completed / tasks_total * 100) if tasks_total > 0 else 0, 1),
            },
            "notifications": {"unread": notifications_unread},
            "connections": {"active": db_connections} if db_connections else {},
            "status": "healthy" if tasks_failed < 10 else "warning",
        }
    except Exception as e:
        return {"error": f"Failed to collect database metrics: {str(e)}"}


def get_recent_errors(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    """
    Récupère les erreurs récentes depuis les logs ou notifications

    Returns:
        Liste des erreurs récentes
    """
    try:
        # Pour l'instant, on utilise les tâches failed comme proxy
        # Dans une vraie prod, on aurait une table d'erreurs/logs
        recent_failed_tasks = (
            db.query(Task)
            .filter(Task.status == TaskStatus.CANCELLED)
            .order_by(Task.updated_at.desc())
            .limit(limit)
            .all()
        )

        errors = []
        for task in recent_failed_tasks:
            errors.append(
                {
                    "timestamp": task.updated_at.isoformat() if task.updated_at else None,
                    "type": "task_failed",
                    "task_id": task.id,
                    "title": task.title,
                    "description": task.description[:100] if task.description else None,
                }
            )

        return errors
    except Exception as e:
        return [{"error": f"Failed to fetch errors: {str(e)}"}]


@router.get("/health")
async def monitoring_health(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint de monitoring complet

    Retourne:
    - Métriques système (CPU, RAM, disque)
    - Activité DB (tâches 24h, notifications)
    - État workers (supervisord)
    - Erreurs récentes

    Requires:
        - Authentification (utilisateur connecté)
        - Rôle admin recommandé (à implémenter si besoin)

    Returns:
        Dict avec toutes les métriques
    """
    try:
        # Collecte de toutes les métriques
        system = get_system_metrics()
        database = get_database_metrics(db)
        workers = get_supervisord_status()
        errors = get_recent_errors(db, limit=10)

        # Déterminer le statut global
        statuses = []
        if "status" in system.get("cpu", {}):
            statuses.append(system["cpu"]["status"])
        if "status" in system.get("memory", {}):
            statuses.append(system["memory"]["status"])
        if "status" in database:
            statuses.append(database["status"])
        if "status" in workers:
            statuses.append(workers["status"])

        # Statut global : critical > warning > degraded > healthy
        if "critical" in statuses:
            overall_status = "critical"
        elif "warning" in statuses:
            overall_status = "warning"
        elif "degraded" in statuses or "error" in statuses:
            overall_status = "degraded"
        else:
            overall_status = "healthy"

        return {
            "status": overall_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "system": system,
            "database": database,
            "workers": workers,
            "errors": errors,
            "uptime": "N/A",  # TODO: implémenter uptime tracking
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Monitoring error: {str(e)}")


@router.get("/metrics")
async def get_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Endpoint léger pour métriques rapides (pour polling fréquent)

    Returns:
        Dict avec métriques essentielles uniquement
    """
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        mem_percent = psutil.virtual_memory().percent
        disk_percent = psutil.disk_usage("/").percent

        return {
            "cpu_percent": round(cpu_percent, 1),
            "memory_percent": round(mem_percent, 1),
            "disk_percent": round(disk_percent, 1),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metrics error: {str(e)}")
