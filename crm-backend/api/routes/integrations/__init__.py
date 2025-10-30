"""
Routes API pour les intégrations externes - Module refactorisé

Architecture:
- outlook.py : OAuth Microsoft, sync emails, signatures
- email_accounts.py : CRUD comptes email multi-provider (O365, IMAP, IONOS)
- email_sync.py : Orchestration sync multi-comptes
- autofill.py : AI autofill v2 + preview/apply

Usage:
    from api.routes.integrations import router
    app.include_router(router)
"""

from fastapi import APIRouter

from . import autofill, email_accounts, email_sync, outlook

# Router principal avec prefix /integrations
router = APIRouter(prefix="/integrations", tags=["Integrations"])

# Inclusion des sous-routers (sans re-préfixer, déjà fait dans chaque module)
router.include_router(outlook.router, prefix="/outlook", tags=["Outlook"])
router.include_router(
    email_accounts.router, prefix="/email-accounts", tags=["Email Accounts"]
)
router.include_router(email_sync.router, tags=["Email Sync"])
router.include_router(autofill.router, prefix="/ai/autofill", tags=["AI Autofill"])

__all__ = ["router"]
