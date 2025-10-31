"""
Endpoint Prometheus metrics pour monitoring avancé

Expose des métriques au format OpenMetrics/Prometheus:
- Métriques système (CPU, RAM, disque)
- Métriques applicatives (requêtes HTTP, DB queries, cache)
- Métriques métier (tâches, interactions, emails)
- Métriques workers (Celery tasks)

Usage:
    GET /metrics -> Format Prometheus (text/plain)
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Response
from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    Info,
    generate_latest,
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    REGISTRY,
)
from sqlalchemy import text, func
from sqlalchemy.orm import Session

from core.database import get_db

# Import optionnel de psutil
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    psutil = None
    PSUTIL_AVAILABLE = False


router = APIRouter(tags=["metrics"])

# ============================================
# MÉTRIQUES PROMETHEUS
# ============================================

# Infos générales
app_info = Info('crm_app', 'CRM Application Info')
app_info.info({
    'version': '1.0.0',
    'environment': 'production',
    'app_name': 'CRM TPM Finance'
})

# --- Métriques Système ---
system_cpu_usage = Gauge('system_cpu_percent', 'CPU usage percentage')
system_memory_usage = Gauge('system_memory_percent', 'Memory usage percentage')
system_memory_used_bytes = Gauge('system_memory_used_bytes', 'Memory used in bytes')
system_memory_total_bytes = Gauge('system_memory_total_bytes', 'Total memory in bytes')
system_disk_usage = Gauge('system_disk_percent', 'Disk usage percentage')
system_disk_used_bytes = Gauge('system_disk_used_bytes', 'Disk used in bytes')
system_disk_total_bytes = Gauge('system_disk_total_bytes', 'Total disk in bytes')

# --- Métriques HTTP (FastAPI) ---
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)
http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'endpoint']
)

# --- Métriques Base de Données ---
db_connections_active = Gauge('db_connections_active', 'Active database connections')
db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query duration',
    ['query_type']
)

# --- Métriques Cache Redis ---
cache_hits_total = Counter('cache_hits_total', 'Total cache hits')
cache_misses_total = Counter('cache_misses_total', 'Total cache misses')
cache_keys_count = Gauge('cache_keys_count', 'Number of keys in cache')
cache_memory_bytes = Gauge('cache_memory_bytes', 'Cache memory usage in bytes')

# --- Métriques Métier ---
tasks_total = Gauge('tasks_total', 'Total number of tasks', ['status'])
tasks_created_24h = Gauge('tasks_created_last_24h', 'Tasks created in last 24 hours')
tasks_completed_24h = Gauge('tasks_completed_last_24h', 'Tasks completed in last 24 hours')
tasks_failed_24h = Gauge('tasks_failed_last_24h', 'Tasks failed in last 24 hours')

interactions_total = Gauge('interactions_total', 'Total number of interactions')
interactions_created_24h = Gauge('interactions_created_last_24h', 'Interactions created in last 24 hours')

emails_sent_total = Counter('emails_sent_total', 'Total emails sent', ['status'])
emails_opened_total = Counter('emails_opened_total', 'Total emails opened')

# --- Métriques Celery ---
celery_tasks_active = Gauge('celery_tasks_active', 'Active Celery tasks')
celery_tasks_scheduled = Gauge('celery_tasks_scheduled', 'Scheduled Celery tasks')
celery_tasks_total = Counter('celery_tasks_total', 'Total Celery tasks executed', ['task_name', 'status'])

# --- Métriques Business ---
organisations_total = Gauge('organisations_total', 'Total number of organisations')
people_total = Gauge('people_total', 'Total number of people')
users_total = Gauge('users_total', 'Total number of users')
active_users_24h = Gauge('active_users_last_24h', 'Active users in last 24 hours')


def collect_system_metrics():
    """Collecte les métriques système avec psutil"""
    if not PSUTIL_AVAILABLE:
        return

    try:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=0.1)
        system_cpu_usage.set(cpu_percent)

        # Memory
        mem = psutil.virtual_memory()
        system_memory_usage.set(mem.percent)
        system_memory_used_bytes.set(mem.used)
        system_memory_total_bytes.set(mem.total)

        # Disk
        disk = psutil.disk_usage('/')
        system_disk_usage.set(disk.percent)
        system_disk_used_bytes.set(disk.used)
        system_disk_total_bytes.set(disk.total)

    except Exception:
        pass  # Silent fail - metrics seront absentes


def collect_database_metrics(db: Session):
    """Collecte les métriques base de données"""
    try:
        from models.task import Task, TaskStatus
        from models.interaction import Interaction
        from models.organisation import Organisation
        from models.person import Person
        from models.user import User

        # Connexions actives
        try:
            active_conns = db.execute(
                text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'")
            ).scalar()
            db_connections_active.set(active_conns or 0)
        except Exception:
            pass

        # Période 24h
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(hours=24)

        # Tasks
        tasks_by_status = db.query(Task.status, func.count(Task.id)).group_by(Task.status).all()
        for status, count in tasks_by_status:
            tasks_total.labels(status=status.value if status else 'unknown').set(count)

        tasks_created_24h.set(
            db.query(Task).filter(Task.created_at >= yesterday).count()
        )
        tasks_completed_24h.set(
            db.query(Task)
            .filter(Task.created_at >= yesterday, Task.status == TaskStatus.DONE)
            .count()
        )
        tasks_failed_24h.set(
            db.query(Task)
            .filter(Task.created_at >= yesterday, Task.status == TaskStatus.CANCELLED)
            .count()
        )

        # Interactions
        interactions_total.set(db.query(Interaction).count())
        interactions_created_24h.set(
            db.query(Interaction).filter(Interaction.created_at >= yesterday).count()
        )

        # Business entities
        organisations_total.set(db.query(Organisation).count())
        people_total.set(db.query(Person).count())
        users_total.set(db.query(User).count())

        # Active users (ayant une activité dans les 24h)
        # Note: nécessiterait un champ last_activity_at sur User
        # active_users_24h.set(...)

    except Exception:
        pass  # Silent fail


def collect_cache_metrics():
    """Collecte les métriques cache Redis"""
    try:
        from core.cache import get_cache_stats

        stats = get_cache_stats()
        if stats and 'hits' in stats:
            # Note: Les counters ne peuvent que incrementer
            # On utilise les valeurs actuelles si disponibles
            cache_keys_count.set(stats.get('keys_count', 0))

            # Memory en MB -> bytes
            mem_mb = stats.get('memory_used_mb', 0)
            cache_memory_bytes.set(mem_mb * 1024 * 1024)

    except Exception:
        pass  # Silent fail


def collect_celery_metrics():
    """Collecte les métriques Celery"""
    try:
        # TODO: Implémenter via Celery inspect API
        # from celery_app import app
        # inspect = app.control.inspect()
        # active = inspect.active()
        # scheduled = inspect.scheduled()
        pass
    except Exception:
        pass


@router.get("/metrics")
async def metrics_endpoint(
    db: Session = Depends(get_db),
):
    """
    Endpoint Prometheus metrics (format OpenMetrics)

    Exposition publique (pas d'auth) pour scraping Prometheus.
    En production, protéger via firewall ou reverse proxy.

    Returns:
        Response: Métriques au format text/plain (Prometheus)
    """
    # Collecte de toutes les métriques
    collect_system_metrics()
    collect_database_metrics(db)
    collect_cache_metrics()
    collect_celery_metrics()

    # Génération du format Prometheus
    metrics_output = generate_latest(REGISTRY)

    return Response(
        content=metrics_output,
        media_type=CONTENT_TYPE_LATEST,
    )
