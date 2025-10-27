from fastapi import APIRouter

from api.routes import (
    ai_agent,
    auth,
    dashboards,
    email_campaigns,
    external_webhooks,
    health,
    imports,
    mailing_lists,
    mandats,
    monitoring,
    org_links,
    organisations,
    people,
    produits,
    public,
    push_notifications,
    tasks,
    users,
    workflows,
)
from routers import email_config, email_marketing, exports, help, interactions, search, webhooks
from webhooks import sendgrid as inbound_sendgrid

# ❌ SUPPRIMÉ (20 oct 2024): kpis
#    → Migrés vers /dashboards/stats
# ✅ AJOUTÉ (24 oct 2024): interactions v1 (nouveau module séparé d'OrganisationActivity)
# ✅ AJOUTÉ (24 oct 2024): interactions v2 + email_marketing (inbox + lead scoring)

# Créer le routeur principal
api_router = APIRouter(prefix="/api/v1")

# 🏥 HEALTH CHECK (sans prefix, pour Docker)
api_router.include_router(health.router, prefix="")

# 📊 MONITORING (métriques système, DB, workers)
api_router.include_router(monitoring.router)

# ⭐ AUTH ROUTES (sans authentification requise)
api_router.include_router(auth.router)

# ✅ ARCHITECTURE UNIFIÉE (Production)
api_router.include_router(organisations.router)  # Remplace
api_router.include_router(people.router)  # Personnes physiques
api_router.include_router(org_links.router)  # Liens Person ↔ Organisation
api_router.include_router(users.router)  # Gestion utilisateurs
api_router.include_router(tasks.router)  # Tâches
api_router.include_router(dashboards.router)  # Dashboards
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

# 💬 INTERACTIONS V2 (Chapitre 7 - Phase 3.1-3.3)
api_router.include_router(interactions.router)

# 📧 EMAIL MARKETING & LEAD SCORING (Chapitre 7 - Phase 3.3)
api_router.include_router(email_marketing.router)

# 📱 PUSH NOTIFICATIONS (Chapitre 8 - PWA)
api_router.include_router(push_notifications.router)

__all__ = ["api_router"]
