"""Compatibility module exposing database helpers.

Older imports expect `database` as a top-level module.  We now forward those
calls to the canonical location in `core.database`.
"""

from core.database import Base, SessionLocal, engine, get_db

__all__ = ["Base", "SessionLocal", "engine", "get_db"]
