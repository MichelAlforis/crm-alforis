from fastapi import APIRouter
from api.routes import (
    auth,
    health,
    imports,
    people,
    org_links,
    tasks,
    organisations,
    mandats,
    users,
    produits,
    dashboards,
    workflows,
    email_campaigns,
    ai_agent,
    mailing_lists,
    external_webhooks,
    public,
)
from routers import search, exports, webhooks, email_config, help, interactions
from webhooks import sendgrid as inbound_sendgrid

# ❌ SUPPRIMÉ (20 oct 2024): kpis
#    → Migrés vers /dashboards/stats
# ✅ AJOUTÉ (24 oct 2024): interactions v1 (nouveau module séparé d'OrganisationActivity)

# Créer le routeur principal
api_router = APIRouter(prefix="/api/v1")

# 🏥 HEALTH CHECK (sans prefix, pour Docker)
api_router.include_router(health.router, prefix="")

# ⭐ AUTH ROUTES (sans authentification requise)
api_router.include_router(auth.router)

# ✅ ARCHITECTURE UNIFIÉE (Production)
api_router.include_router(organisations.router)  # Remplace
api_router.include_router(people.router)         # Personnes physiques
api_router.include_router(org_links.router)      # Liens Person ↔ Organisation
api_router.include_router(users.router)          # Gestion utilisateurs
api_router.include_router(tasks.router)          # Tâches
api_router.include_router(dashboards.router)     # Dashboards
api_router.include_router(email_campaigns.router)  # Email automation

# ⚠️ À REVOIR - Peut-être garder ou refondre
api_router.include_router(mandats.router)
api_router.include_router(produits.router)

# 🔍 RECHERCHE & EXPORTS (Semaine 5)
api_router.include_router(search.router)
api_router.include_router(exports.router)
api_router.include_router(webhooks.router)
api_router.include_router(inbound_sendgrid.router)

## 📧 EMAIL CONFIGURATION & MAILING LISTS (Chapitre 6)
api_router.include_router(email_config.router)
api_router.include_router(mailing_lists.router)

# 🔗 WEBHOOKS EXTERNES (alforis.fr → CRM)
api_router.include_router(external_webhooks.router)

# 🌐 ROUTES PUBLIQUES (sans auth utilisateur, avec Bearer token)
api_router.include_router(public.router)

# 🤖 WORKFLOWS & AUTOMATION (Phase 2.2)
api_router.include_router(workflows.router)

# 🧠 AI AGENT (Phase 3.0)
api_router.include_router(ai_agent.router)

# ⚡ IMPORTS ROUTES (bulk operations)
api_router.include_router(imports.router)

# ❓ HELP & ANALYTICS (Phase 4)
api_router.include_router(help.router)

# 💬 INTERACTIONS V1 (Chapitre 7 - Phase 3.1)
api_router.include_router(interactions.router)

__all__ = ["api_router"]
