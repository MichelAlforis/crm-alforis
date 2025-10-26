"""
Configuration Monitoring et Error Tracking

Sentry pour capturer les erreurs en production.
Structured logging pour des logs exploitables.
"""

import logging
from typing import Optional

import sentry_sdk
import structlog
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from core.config import settings

# ============================================================================
# Sentry Configuration
# ============================================================================


def init_sentry():
    """
    Initialise Sentry pour le monitoring d'erreurs

    Features:
    - Capture automatique des exceptions
    - Performance monitoring (traces)
    - Breadcrumbs (historique avant erreur)
    - Release tracking
    - User context
    """
    if not settings.sentry_dsn:
        logging.warning("⚠️  SENTRY_DSN non configuré - monitoring désactivé")
        return

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        # Environment
        environment=settings.environment,  # "production", "staging", "development"
        # Release tracking (pour suivre les versions)
        release=f"crm-backend@{settings.api_version}",
        # Intégrations
        integrations=[
            # FastAPI
            FastApiIntegration(
                transaction_style="endpoint",  # Grouper par endpoint
            ),
            # SQLAlchemy
            SqlalchemyIntegration(),
            # Logging
            LoggingIntegration(
                level=logging.INFO,  # Capturer INFO et plus
                event_level=logging.ERROR,  # Envoyer à Sentry si ERROR+
            ),
        ],
        # Performance Monitoring (traces)
        traces_sample_rate=get_traces_sample_rate(),
        # Profiling (optionnel)
        profiles_sample_rate=0.1 if settings.environment == "production" else 0,
        # Filtrer les données sensibles
        before_send=filter_sensitive_data,
        # Options avancées
        attach_stacktrace=True,  # Stack trace même pour messages
        send_default_pii=False,  # Ne pas envoyer d'infos perso par défaut
        max_breadcrumbs=50,  # Historique avant erreur
    )

    logging.info(f"✅ Sentry initialisé - Env: {settings.environment}")


def get_traces_sample_rate() -> float:
    """
    Taux d'échantillonnage des traces de performance

    Returns:
        0.0 à 1.0 (% de requêtes à tracer)
    """
    if settings.environment == "production":
        return 0.1  # 10% des requêtes en prod
    elif settings.environment == "staging":
        return 0.5  # 50% en staging
    else:
        return 1.0  # 100% en dev


def filter_sensitive_data(event, hint):
    """
    Filtre les données sensibles avant envoi à Sentry

    Args:
        event: Événement Sentry
        hint: Contexte de l'erreur

    Returns:
        event modifié ou None pour ignorer
    """
    # Supprimer les tokens/passwords des données
    if "request" in event:
        headers = event["request"].get("headers", {})

        # Masquer Authorization header
        if "Authorization" in headers:
            headers["Authorization"] = "[Filtered]"

        # Masquer cookies
        if "Cookie" in headers:
            headers["Cookie"] = "[Filtered]"

    # Filtrer les variables d'environnement sensibles
    if "extra" in event:
        for key in ["password", "secret", "token", "key"]:
            if key in event["extra"]:
                event["extra"][key] = "[Filtered]"

    return event


# ============================================================================
# User Context
# ============================================================================


def set_user_context(user_id: Optional[int] = None, email: Optional[str] = None):
    """
    Définit le contexte utilisateur pour Sentry

    Args:
        user_id: ID de l'utilisateur
        email: Email de l'utilisateur
    """
    sentry_sdk.set_user(
        {
            "id": user_id,
            "email": email,
        }
    )


def clear_user_context():
    """Efface le contexte utilisateur"""
    sentry_sdk.set_user(None)


# ============================================================================
# Tags & Context
# ============================================================================


def set_transaction_context(name: str, operation: str = "http.request"):
    """
    Définit le contexte de la transaction

    Args:
        name: Nom de la transaction (ex: "GET /api/v1/organisations")
        operation: Type d'opération
    """
    with sentry_sdk.configure_scope() as scope:
        scope.set_transaction_name(name)
        scope.set_tag("operation", operation)


def add_breadcrumb(message: str, category: str = "default", level: str = "info", **data):
    """
    Ajoute un breadcrumb (trace) avant l'erreur

    Args:
        message: Message du breadcrumb
        category: Catégorie (ex: "query", "auth", "http")
        level: Niveau (info, warning, error)
        **data: Données additionnelles
    """
    sentry_sdk.add_breadcrumb(
        message=message,
        category=category,
        level=level,
        data=data,
    )


def capture_message(message: str, level: str = "info", **extra):
    """
    Capture un message (pas une exception)

    Args:
        message: Message à capturer
        level: Niveau (info, warning, error)
        **extra: Données additionnelles
    """
    sentry_sdk.capture_message(message, level=level, extras=extra)


def capture_exception(exception: Exception, **extra):
    """
    Capture une exception

    Args:
        exception: Exception à capturer
        **extra: Données additionnelles
    """
    sentry_sdk.capture_exception(exception, extras=extra)


# ============================================================================
# Structured Logging
# ============================================================================


def init_structured_logging():
    """
    Initialise le logging structuré avec structlog

    Avantages:
    - Logs en JSON (parsable)
    - Context automatique
    - Corrélation avec Sentry
    - Rotation automatique des fichiers
    """
    import os
    from logging.handlers import RotatingFileHandler

    structlog.configure(
        processors=[
            # Ajouter le niveau de log
            structlog.stdlib.add_log_level,
            # Ajouter le timestamp
            structlog.processors.TimeStamper(fmt="iso"),
            # Ajouter le contexte
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            # Formatter en JSON
            structlog.processors.JSONRenderer(),
        ],
        # Utiliser le logging standard de Python
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configuration du niveau de log
    log_level = logging.DEBUG if settings.debug else logging.INFO

    # Créer le répertoire de logs si nécessaire
    log_dir = "/app/logs"
    os.makedirs(log_dir, exist_ok=True)

    # Handler pour fichier avec rotation
    file_handler = RotatingFileHandler(
        filename=f"{log_dir}/app.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,  # Garder 5 fichiers de backup
        encoding="utf-8",
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter("%(message)s"))

    # Handler pour erreurs séparées
    error_handler = RotatingFileHandler(
        filename=f"{log_dir}/error.log",
        maxBytes=10 * 1024 * 1024,  # 10 MB
        backupCount=5,
        encoding="utf-8",
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(logging.Formatter("%(message)s"))

    # Handler console (stdout)
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter("%(message)s"))

    # Configuration finale
    logging.basicConfig(level=log_level, handlers=[file_handler, error_handler, console_handler])

    logging.info("✅ Structured logging initialisé avec rotation (10MB x 5 fichiers)")


def get_logger(name: str = __name__):
    """
    Obtient un logger structuré

    Args:
        name: Nom du logger (généralement __name__)

    Returns:
        Logger structlog

    Usage:
        logger = get_logger(__name__)
        logger.info("user_created", user_id=123, email="test@example.com")
    """
    return structlog.get_logger(name)


# ============================================================================
# Performance Monitoring
# ============================================================================


class PerformanceMonitor:
    """
    Moniteur de performance pour mesurer les opérations

    Usage:
        with PerformanceMonitor("database_query") as monitor:
            result = db.query(Organisation).all()
            monitor.set_data(count=len(result))
    """

    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.span = None

    def __enter__(self):
        self.span = sentry_sdk.start_span(op=self.operation_name)
        self.span.__enter__()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.span:
            self.span.__exit__(exc_type, exc_val, exc_tb)

    def set_data(self, **data):
        """Ajoute des données à la span"""
        if self.span:
            for key, value in data.items():
                self.span.set_data(key, value)

    def set_tag(self, key: str, value: str):
        """Ajoute un tag à la span"""
        if self.span:
            self.span.set_tag(key, value)


# ============================================================================
# Health Check
# ============================================================================


def check_monitoring_health() -> dict:
    """
    Vérifie l'état du monitoring

    Returns:
        dict avec l'état de chaque service
    """
    health = {
        "sentry": {
            "enabled": bool(settings.sentry_dsn),
            "environment": settings.environment,
            "dsn_configured": bool(settings.sentry_dsn),
        },
        "logging": {
            "level": logging.getLevelName(logging.root.level),
            "structured": True,
        },
    }

    return health


# ============================================================================
# Exemples d'utilisation
# ============================================================================

"""
# Dans main.py
from core.monitoring import init_sentry, init_structured_logging

@app.on_event("startup")
async def startup():
    init_sentry()
    init_structured_logging()


# Dans les routes
from core.monitoring import get_logger, add_breadcrumb, capture_exception

logger = get_logger(__name__)

@router.get("/organisations")
async def list_organisations():
    add_breadcrumb("Fetching organisations", category="query")

    try:
        orgs = db.query(Organisation).all()
        logger.info("organisations_fetched", count=len(orgs))
        return orgs
    except Exception as e:
        logger.error("organisations_fetch_failed", error=str(e))
        capture_exception(e, extra={"query": "organisations"})
        raise


# Avec performance monitoring
from core.monitoring import PerformanceMonitor

@router.post("/organisations")
async def create_organisation(data: OrganisationCreate):
    with PerformanceMonitor("create_organisation") as monitor:
        org = Organisation(**data.dict())
        db.add(org)
        db.commit()

        monitor.set_data(org_id=org.id, org_name=org.name)
        monitor.set_tag("category", org.category)

        return org


# Avec contexte utilisateur
from core.monitoring import set_user_context

@router.get("/me")
async def get_current_user(current_user: User = Depends(get_current_user)):
    set_user_context(user_id=current_user.id, email=current_user.email)
    return current_user
"""
