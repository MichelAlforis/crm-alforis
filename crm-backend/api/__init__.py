from fastapi import APIRouter
from api.routes import auth, investors, interactions, kpis, imports, fournisseurs

# Créer le routeur principal
api_router = APIRouter(prefix="/api/v1")

# ⭐ AUTH ROUTES (sans authentification requise)
api_router.include_router(auth.router)

# API ROUTES (authentification requise - mais optionnelle pour le dev)
api_router.include_router(investors.router)
api_router.include_router(interactions.router)
api_router.include_router(kpis.router)
api_router.include_router(fournisseurs.router)

# ⚡ IMPORTS ROUTES (bulk operations)
api_router.include_router(imports.router)

__all__ = ["api_router"]