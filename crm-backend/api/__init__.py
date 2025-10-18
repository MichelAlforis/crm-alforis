from fastapi import APIRouter
from api.routes import (
    auth,
    investors,
    interactions,
    kpis,
    imports,
    fournisseurs,
    people,
    org_links,
    tasks,
    organisations,
    mandats,
    produits,
)
from routers import search, exports, webhooks

# Créer le routeur principal
api_router = APIRouter(prefix="/api/v1")

# ⭐ AUTH ROUTES (sans authentification requise)
api_router.include_router(auth.router)

# API ROUTES (authentification requise - mais optionnelle pour le dev)
api_router.include_router(investors.router)
api_router.include_router(interactions.router)
api_router.include_router(kpis.router)
api_router.include_router(fournisseurs.router)  # Legacy - sera progressivement remplacé
api_router.include_router(people.router)
api_router.include_router(org_links.router)
api_router.include_router(tasks.router)

# 🆕 NOUVEAUX ROUTES - Organisation, Mandats, Produits
api_router.include_router(organisations.router)
api_router.include_router(mandats.router)
api_router.include_router(produits.router)

# 🔍 RECHERCHE & EXPORTS (Semaine 5)
api_router.include_router(search.router)
api_router.include_router(exports.router)
api_router.include_router(webhooks.router)

# ⚡ IMPORTS ROUTES (bulk operations)
api_router.include_router(imports.router)

__all__ = ["api_router"]
