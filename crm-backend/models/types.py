"""
Shared SQLAlchemy column type helpers.

Provides aliases that remain compatible with both PostgreSQL (JSONB) and
SQLite (JSON) so that our models can run against the in-memory SQLite
database used in tests without requiring Postgres-specific types.
"""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB

from core.config import settings


def _is_postgres(url: str) -> bool:
    """Detect if the configured database URL targets PostgreSQL."""
    return "postgres" in url or url.startswith("postgresql")


# Use JSONB in production (PostgreSQL) but fall back to the generic JSON type
# when running on SQLite for unit tests.
JSONField = JSONB if _is_postgres(settings.database_url.lower()) else JSON

