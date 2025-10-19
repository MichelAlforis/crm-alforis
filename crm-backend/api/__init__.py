from fastapi import APIRouter
from api.routes import (
    auth,
    # investors,        # ❌ LEGACY - Désactivé (utiliser /organisations?type=client)
    # interactions,     # ❌ LEGACY - Désactivé (utiliser /organisation_activities)
    # kpis,            # ❌ LEGACY - Désactivé
    # fournisseurs,    # ❌ LEGACY - Désactivé (utiliser /organisations?type=fournisseur)
    imports,
    people,
    org_links,
    tasks,
    organisations,
    mandats,
    # produits,        # ⚠️ TEMPORAIRE - À revoir
    dashboards,
    workflows,
    email_campaigns,
)
from routers import search, exports, webhooks
from webhooks import sendgrid as inbound_sendgrid

# Créer le routeur principal
api_router = APIRouter(prefix="/api/v1")

# ⭐ AUTH ROUTES (sans authentification requise)
api_router.include_router(auth.router)

# ✅ ARCHITECTURE UNIFIÉE (Production)
api_router.include_router(organisations.router)  # Remplace investors + fournisseurs
api_router.include_router(people.router)         # Personnes physiques
api_router.include_router(org_links.router)      # Liens Person ↔ Organisation
api_router.include_router(tasks.router)          # Tâches
api_router.include_router(dashboards.router)     # Dashboards
api_router.include_router(email_campaigns.router)  # Email automation

# ❌ LEGACY ROUTES - Désactivées (utiliser architecture unifiée)
# api_router.include_router(investors.router)     # → /organisations?type=client
# api_router.include_router(fournisseurs.router)  # → /organisations?type=fournisseur
# api_router.include_router(interactions.router)  # → /organisation_activities
# api_router.include_router(kpis.router)          # → Stats dans dashboards

# ⚠️ À REVOIR - Peut-être garder ou refondre
api_router.include_router(mandats.router)
# api_router.include_router(produits.router)

# 🔍 RECHERCHE & EXPORTS (Semaine 5)
api_router.include_router(search.router)
api_router.include_router(exports.router)
api_router.include_router(webhooks.router)
api_router.include_router(inbound_sendgrid.router)

# 🤖 WORKFLOWS & AUTOMATION (Phase 2.2)
api_router.include_router(workflows.router)

# ⚡ IMPORTS ROUTES (bulk operations)
api_router.include_router(imports.router)

__all__ = ["api_router"]
