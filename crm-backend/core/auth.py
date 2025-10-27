"""Compatibility shim exposing auth helpers expected by legacy routes/tests."""

from core.security import get_current_user, get_current_user_optional, security, verify_admin_user

__all__ = [
    "get_current_user",
    "get_current_user_optional",
    "verify_admin_user",
    "security",
]
