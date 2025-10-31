from fastapi import APIRouter

from api.routes import (
    ai_agent,
    ai_autofill,
    ai_learning,
    ai_ollama,
    ai_statistics,
    auth,
    autofill_hitl,
    autofill_jobs,
    dashboards,
    email_accounts,
    email_campaigns,
    email_intelligence,
    enrichment,
    external_webhooks,
    health,
    imports,
    integrations,
    legal,
    mailing_lists,
    mandats,
    monitoring,
    oauth_callbacks,
    org_links,
    organisations,
    people,
    produits,
    public,
    push_notifications,
    tasks,
    totp,
    trials,
    users,
    workflows,
)
from api.routes import ai as ai_routes
from routers import dashboard, email_config, email_marketing, exports, help, interactions, rgpd, search, webhooks
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

## 📧 MULTI-MAIL ACCOUNTS (Multi-tenant email accounts management)
api_router.include_router(email_accounts.router)

## 🔐 OAUTH2 CALLBACKS (Gmail & Outlook OAuth)
api_router.include_router(oauth_callbacks.router)

# 🔗 WEBHOOKS EXTERNES (alforis.fr → CRM)
api_router.include_router(external_webhooks.router)

# 🌐 ROUTES PUBLIQUES (sans auth utilisateur, avec Bearer token)
api_router.include_router(public.router)

# 🤖 WORKFLOWS & AUTOMATION (Phase 2.2)
api_router.include_router(workflows.router)

# 🧠 AI AGENT (Phase 3.0)
api_router.include_router(ai_agent.router)

# 📊 EMAIL INTELLIGENCE DASHBOARD (Acte IV.1)
api_router.include_router(email_intelligence.router)

# 🔄 AUTOFILL JOBS (Acte IV.2 - Option 1)
api_router.include_router(autofill_jobs.router)

# 🤝 AUTOFILL HITL v2 (Acte V - Human-In-The-Loop)
api_router.include_router(autofill_hitl.router)

# 🌐 WEB ENRICHMENT (Acte V - AI + Internet)
api_router.include_router(enrichment.router)

# 🤖 AI STATISTICS & INTEGRATIONS (Chapitre 17)
api_router.include_router(ai_statistics.router)
api_router.include_router(integrations.router)

# 🧠 AI ROUTES (Phase 2 - Semantic Parsing + Command Suggestions)
api_router.include_router(ai_routes.router)

# ✨ AI AUTOFILL SUGGESTIONS (Phase 2B - Context Menu)
api_router.include_router(ai_autofill.router)

# 🧠 AI LEARNING & PATTERNS (Phase 3 - AI Memory System)
api_router.include_router(ai_learning.router)

# 🚀 AI OLLAMA (LiteLLM + Redis Cache)
api_router.include_router(ai_ollama.router)

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

# 📊 DASHBOARD V2 (Advanced Analytics)
api_router.include_router(dashboard.router)

# 📄 LEGAL DOCUMENTS (CGU, CGV, DPA, Privacy) - PDF Downloads
api_router.include_router(legal.router)

# 🔐 TWO-FACTOR AUTHENTICATION (2FA / TOTP)
api_router.include_router(totp.router)

# 🎁 TRIAL MANAGEMENT (Free Trial System)
api_router.include_router(trials.router)

# 🔒 RGPD COMPLIANCE (Data Export & Deletion)
api_router.include_router(rgpd.router)

__all__ = ["api_router"]
