# 🚀 CHECKLIST AMÉLIORATIONS FUTURES - CRM ALFORIS

**Date de création :** 2025-10-22
**Version :** 1.0
**Objectif :** Roadmap structurée des améliorations pour atteindre le niveau Tier 1 (HubSpot/Salesforce)
**Environnement cible :** Production (crm.alforis.fr)

---

## 📊 TABLEAU DE BORD GÉNÉRAL

| Chapitre | Priorité | Effort | Impact Business | ROI | Statut |
|----------|----------|--------|----------------|-----|--------|
| 1. Redis Cache & Performance | 🔴 Haute | 1j | Performance +50% | ⭐⭐⭐⭐⭐ | ⬜ À FAIRE |
| 2. Analytics UX (PostHog) | 🔴 Haute | 2j | Insights utilisateurs | ⭐⭐⭐⭐⭐ | ⬜ À FAIRE |
| 3. Visualisations Avancées | 🔴 Haute | 4j | Décisions +40% | ⭐⭐⭐⭐⭐ | ⬜ À FAIRE |
| 4. Intégration Zapier/Make | 🔴 Critique | 7j | Extensibilité +200% | ⭐⭐⭐⭐⭐ | ⬜ À FAIRE |
| 5. Calendrier (Google/Outlook) | 🟡 Moyenne | 5j | Productivité +25% | ⭐⭐⭐⭐ | ⬜ À FAIRE |
| 6. Téléphonie (Twilio) | 🟡 Moyenne | 4j | Conversion +15% | ⭐⭐⭐⭐ | ⬜ À FAIRE |
| 7. Visioconférence | 🟢 Basse | 3j | UX +10% | ⭐⭐⭐ | ⬜ À FAIRE |
| 8. LinkedIn Integration | 🟢 Basse | 6j | Lead Gen +20% | ⭐⭐⭐ | ⬜ À FAIRE |
| 9. Automatisations Workflow | 🟡 Moyenne | 8j | Efficacité +30% | ⭐⭐⭐⭐ | ⬜ À FAIRE |
| 10. Intelligence Artificielle | 🟡 Moyenne | 10j | Scoring +35% | ⭐⭐⭐⭐ | ⬜ À FAIRE |
| 11. Mobile App (React Native) | 🟢 Basse | 15j | Accessibilité +40% | ⭐⭐⭐ | ⬜ À FAIRE |
| 12. Notifications Push | 🟡 Moyenne | 3j | Engagement +25% | ⭐⭐⭐⭐ | ⬜ À FAIRE |
| **TOTAL** | - | **68 jours** | **Compétitivité Tier 1** | - | **0%** |

### 🎯 Légende Priorités
- 🔴 **Haute** : Quick wins / Critiques pour compétitivité
- 🟡 **Moyenne** : Améliorations importantes
- 🟢 **Basse** : Nice-to-have / Long terme

### 💰 Budget Estimé
| Service | Coût mensuel | Notes |
|---------|-------------|-------|
| PostHog | 0€ | Gratuit jusqu'à 1M events |
| Zapier | 0-29€ | Free tier suffisant au départ |
| Twilio | 50-100€ | ~500 appels/mois |
| Google APIs | 0€ | Gratuit |
| Redis (prod) | 0€ | Docker self-hosted |
| **TOTAL** | **~80-130€/mois** | |

---

## ✅ PRIORITÉ 2 - IMPLÉMENTÉ (26 Oct 2025)

### 🔒 1. Rate Limiting (Anti-abus)
**Fichiers**:
- [crm-backend/core/rate_limit.py](crm-backend/core/rate_limit.py) - Config slowapi
- [crm-backend/main.py](crm-backend/main.py) - Intégration middleware
- [crm-backend/api/routes/external_webhooks.py](crm-backend/api/routes/external_webhooks.py) - Application

**Limites**: Webhooks 10/min • API 60/min • Admins 1000/min • Recherche 30/min • AI 10/min

### ⚡ 2. Indexes de Performance
**Fichier**: [crm-backend/alembic/versions/add_performance_indexes.py](crm-backend/alembic/versions/add_performance_indexes.py)

**Indexes**: Full-text search (GIN) • Foreign keys • Composite • Email tracking

### 📋 3. Audit Trail
**Fichiers**:
- [crm-backend/models/audit_log.py](crm-backend/models/audit_log.py) - Modèle
- [crm-backend/core/audit.py](crm-backend/core/audit.py) - Decorator
- [crm-backend/alembic/versions/add_audit_logs.py](crm-backend/alembic/versions/add_audit_logs.py) - Migration

**Traçabilité**: user_id, IP, user-agent, old/new values • Decorator `@audit_changes()`

### 🧹 4. Script Maintenance DB
**Fichier**: [crm-backend/scripts/db_maintenance.py](crm-backend/scripts/db_maintenance.py)

**Fonctions**: Purge logs >90j • Sessions expirées • Notifications >30j • VACUUM

**Usage**: `python scripts/db_maintenance.py --execute` (cron quotidien 3AM)

---

## 📝 Instructions d'utilisation

1. **Suivez l'ordre de priorité** (Chapitres 1-4 en premier)
2. Pour chaque feature développée, marquez :
   - ✅ **COMPLÉTÉ** : Feature développée, testée, déployée
   - 🔧 **EN COURS** : Développement en cours
   - ⚠️ **BLOQUÉ** : Problème technique ou dépendance manquante
   - ⏭️ **REPORTÉ** : Décision de reporter à plus tard
   - ⬜ **À FAIRE** : Pas encore commencé

3. **Estimations de temps** : Basées sur 1 développeur expérimenté
4. **Mettre à jour** le tableau de bord après chaque chapitre complété

---

## CHAPITRE 1 : Redis Cache & Performance 🚀

**Priorité** : 🔴 Haute | **Effort** : 1 jour | **Impact** : Performance +50%

### 📋 Contexte
Redis est installé (v5.0.0) et configuré à 80%, mais **désactivé** en production. Le code de cache est prêt ([core/cache.py](crm-backend/core/cache.py)) avec 11 endpoints déjà décorés avec `@cache_response()`.

### 🎯 Objectifs
- Activer Redis en production
- Réduire temps de réponse API de 300ms → 50ms
- Diminuer charge DB de 40%
- Monitorer hit/miss rate

### ✅ Checklist

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 1.1 | Activer Redis en production (docker-compose) | ⬜ | docker-compose.yml, docker-compose.redis.yml | `docker compose up -d redis` |
| 1.2 | Configurer variables .env | ⬜ | crm-backend/.env | REDIS_ENABLED=true, REDIS_PASSWORD |
| 1.3 | Tester connexion Redis (health check) | ⬜ | /api/v1/health | Vérifier "redis": true |
| 1.4 | Ajouter cache sur /contacts (GET) | ⬜ | api/routes/people.py | TTL: 300s |
| 1.5 | Ajouter cache sur /mandats (GET) | ⬜ | api/routes/mandats.py | TTL: 300s |
| 1.6 | Ajouter cache sur /produits (GET) | ⬜ | api/routes/produits.py | TTL: 600s |
| 1.7 | Créer endpoint /api/v1/cache/stats | ⬜ | api/routes/cache.py (nouveau) | Statistiques hit/miss |
| 1.8 | Créer endpoint DELETE /api/v1/cache | ⬜ | api/routes/cache.py | Clear cache (admin only) |
| 1.9 | Ajouter page frontend Cache Stats | ⬜ | app/dashboard/cache/page.tsx | Dashboard admin |
| 1.10 | Configurer APScheduler avec Redis backend | ⬜ | tasks/celery_app.py | Persistent jobs |
| 1.11 | Tests de charge (100 req/s) | ⬜ | - | Locust ou K6 |
| 1.12 | Documentation cache pour équipe | ⬜ | documentation/CACHE.md | Guide utilisation |

### 📊 Métriques de succès
- ✅ Hit rate > 70% après 1 semaine
- ✅ Temps réponse moyen < 100ms (actuellement ~300ms)
- ✅ 0 erreur Redis en production

### 🔗 Dépendances
- Aucune (tout est déjà installé)

### 📚 Ressources
- [Documentation Redis](https://redis.io/docs/)
- [Code cache existant](crm-backend/core/cache.py)
- [Endpoints avec cache](crm-backend/api/routes/organisations.py:37)

---

## CHAPITRE 2 : Analytics UX avec PostHog 📊

**Priorité** : 🔴 Haute | **Effort** : 2 jours | **Impact** : Insights utilisateurs

### 📋 Contexte
Actuellement **0% de tracking UX**. Vous ne savez pas :
- Quelles pages sont les plus visitées
- Où les utilisateurs cliquent
- Combien de temps ils restent
- Où ils abandonnent (frustrations)

### 🎯 Objectifs
- Comprendre comportement utilisateurs
- Identifier points de friction
- Optimiser parcours utilisateur
- A/B testing de nouvelles features

### ✅ Checklist

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 2.1 | Créer compte PostHog (self-hosted ou cloud) | ⬜ | - | Recommandé: cloud (gratuit) |
| 2.2 | Installer SDK backend | ⬜ | requirements.txt | `pip install posthog` |
| 2.3 | Installer SDK frontend | ⬜ | package.json | `npm install posthog-js` |
| 2.4 | Configurer PostHog client | ⬜ | lib/posthog.ts (nouveau) | Init avec API key |
| 2.5 | Wrapper PostHog provider | ⬜ | app/layout.tsx | <PostHogProvider> |
| 2.6 | Tracking pages vues automatique | ⬜ | lib/posthog.ts | useEffect router |
| 2.7 | Tracking événements custom | ⬜ | components/ | Ex: "contact_created" |
| 2.8 | Tracking erreurs API | ⬜ | lib/api.ts | posthog.capture('api_error') |
| 2.9 | Configurer funnels clés | ⬜ | PostHog dashboard | Login → Contact → Deal |
| 2.10 | Activer session replay | ⬜ | PostHog settings | Privacy-safe |
| 2.11 | Activer heatmaps | ⬜ | PostHog settings | Clics + scroll |
| 2.12 | Créer dashboard KPIs UX | ⬜ | PostHog | Pages vues, temps, conversion |
| 2.13 | Configurer alertes (erreurs) | ⬜ | PostHog | Slack/Email |
| 2.14 | Privacy: RGPD compliance | ⬜ | lib/posthog.ts | opt-out, anonymize IP |

### 📊 Événements clés à tracker

**Backend (Python)**
```python
posthog.capture(
    distinct_id=user.id,
    event='contact_created',
    properties={'source': 'manual', 'organisation_id': org.id}
)
```

**Frontend (TypeScript)**
```typescript
posthog.capture('button_clicked', {
  button_name: 'create_contact',
  page: '/contacts',
  user_role: user.role
})
```

### 📊 Métriques de succès
- ✅ 100% pages vues trackées
- ✅ 10+ événements custom configurés
- ✅ Heatmaps actives sur 5 pages clés
- ✅ 1 funnel de conversion fonctionnel

### 💰 Coût
- **Gratuit** jusqu'à 1M events/mois
- Ensuite: ~$0.000225/event (~$225 pour 1M events supplémentaires)

---

## CHAPITRE 3 : Visualisations Avancées 📈

**Priorité** : 🔴 Haute | **Effort** : 4 jours | **Impact** : Décisions +40%

### 📋 Contexte
Actuellement seulement **1 bar chart** ([CampaignAnalytics.tsx](crm-frontend/components/email/CampaignAnalytics.tsx)). Recharts déjà installé mais sous-utilisé (20/100).

### 🎯 Objectifs
- Ajouter 8 types de graphiques avancés
- Dashboard analytics complet
- Visualisations temps réel
- Export graphiques en image

### ✅ Checklist - Graphiques de base

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 3.1 | **LINE CHART**: Revenue mensuel | ⬜ | components/analytics/RevenueChart.tsx | Tendances 12 mois |
| 3.2 | **LINE CHART**: RDV/Pitchs/Closings | ⬜ | components/analytics/ActivityTrendsChart.tsx | Multi-lignes |
| 3.3 | **AREA CHART**: Emails cumulés | ⬜ | components/analytics/EmailVolumeChart.tsx | Stacked area |
| 3.4 | **PIE CHART**: Répartition statuts deals | ⬜ | components/analytics/DealStatusChart.tsx | Donut chart |
| 3.5 | **PIE CHART**: Organisations par type | ⬜ | components/analytics/OrgTypesChart.tsx | Pie chart |
| 3.6 | **BAR CHART**: Top 10 organisations (revenue) | ⬜ | components/analytics/TopOrgsChart.tsx | Horizontal bars |
| 3.7 | **COMBO CHART**: Volume + Taux conversion | ⬜ | components/analytics/ConversionChart.tsx | Bars + Line |
| 3.8 | **RADAR CHART**: Performance commerciale | ⬜ | components/analytics/PerformanceRadar.tsx | Multi-axes |

### ✅ Checklist - Graphiques avancés

| # | Tâche | Statut | Packages requis | Remarques |
|---|-------|--------|----------------|-----------|
| 3.9 | **FUNNEL CHART**: Conversion pipeline | ⬜ | Recharts FunnelChart | Lead → RDV → Pitch → Closing |
| 3.10 | **HEATMAP**: Activité hebdomadaire | ⬜ | @nivo/calendar | Interactions par jour |
| 3.11 | **SANKEY**: Flux source → résultat | ⬜ | @nivo/sankey | LinkedIn → Gagné/Perdu |
| 3.12 | **CALENDAR**: Vue planning | ⬜ | @fullcalendar/react | RDV + Tasks intégrés |
| 3.13 | **MAP**: Répartition géographique | ⬜ | react-leaflet | Clients par région |
| 3.14 | **TREEMAP**: Revenue par catégorie | ⬜ | Recharts Treemap | Hiérarchie produits |

### ✅ Checklist - Dashboard Analytics

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 3.15 | Page /dashboard/analytics | ⬜ | app/dashboard/analytics/page.tsx | Hub principal |
| 3.16 | Onglet "Ventes" | ⬜ | app/dashboard/analytics/sales/page.tsx | Funnel + Revenue |
| 3.17 | Onglet "Marketing" | ⬜ | app/dashboard/analytics/marketing/page.tsx | Campaigns + Sources |
| 3.18 | Onglet "Activité" | ⬜ | app/dashboard/analytics/activity/page.tsx | Heatmap + Timeline |
| 3.19 | Onglet "Performance" | ⬜ | app/dashboard/analytics/performance/page.tsx | Radar + KPIs |
| 3.20 | Filtres date range picker | ⬜ | components/analytics/DateRangePicker.tsx | 7j, 30j, 12m, custom |
| 3.21 | Filtres par équipe/utilisateur | ⬜ | components/analytics/UserFilter.tsx | Multi-select |
| 3.22 | Export graphiques PNG | ⬜ | components/analytics/ChartExport.tsx | html2canvas |
| 3.23 | Export données CSV | ⬜ | components/analytics/DataExport.tsx | Papa Parse |
| 3.24 | Mode plein écran | ⬜ | components/analytics/FullscreenMode.tsx | Présentations |
| 3.25 | Refresh automatique (30s) | ⬜ | hooks/useAutoRefresh.ts | Temps réel |

### ✅ Checklist - Backend Analytics API

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 3.26 | GET /api/v1/analytics/revenue | ⬜ | api/routes/analytics.py (nouveau) | Revenue par période |
| 3.27 | GET /api/v1/analytics/funnel | ⬜ | api/routes/analytics.py | Données funnel |
| 3.28 | GET /api/v1/analytics/activity | ⬜ | api/routes/analytics.py | Heatmap data |
| 3.29 | GET /api/v1/analytics/performance | ⬜ | api/routes/analytics.py | Metrics par user |
| 3.30 | GET /api/v1/analytics/top-orgs | ⬜ | api/routes/analytics.py | Top clients |
| 3.31 | Cache analytics (Redis) | ⬜ | core/cache.py | TTL: 5min |

### 📦 Packages à installer

```bash
npm install @nivo/core @nivo/funnel @nivo/calendar @nivo/sankey
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/interaction
npm install react-leaflet leaflet
npm install html2canvas
npm install papaparse @types/papaparse
```

### 📊 Métriques de succès
- ✅ 12+ types de graphiques différents
- ✅ Page Analytics complète et responsive
- ✅ Export fonctionnel (PNG + CSV)
- ✅ Refresh temps réel actif

---

## CHAPITRE 4 : Intégration Zapier / Make 🔌

**Priorité** : 🔴 Critique | **Effort** : 7 jours | **Impact** : +5000 intégrations

### 📋 Contexte
**0 intégration externe** actuellement. En créant une intégration Zapier/Make, vous débloquez l'accès à **5000+ applications** sans développer chaque intégration individuellement.

### 🎯 Objectifs
- Webhooks sortants configurables
- Triggers Zapier (contact créé, deal gagné, etc.)
- Actions Zapier (créer contact, update deal, etc.)
- Documentation publique

### ✅ Checklist - Backend Webhooks

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 4.1 | Modèle DB Webhook | ⬜ | models/webhook.py (nouveau) | event, url, headers, active |
| 4.2 | API POST /webhooks (create) | ⬜ | api/routes/webhooks.py | CRUD webhooks |
| 4.3 | API GET /webhooks (list) | ⬜ | api/routes/webhooks.py | Liste user webhooks |
| 4.4 | API DELETE /webhooks/{id} | ⬜ | api/routes/webhooks.py | Supprimer webhook |
| 4.5 | API POST /webhooks/{id}/test | ⬜ | api/routes/webhooks.py | Test webhook |
| 4.6 | Service webhook dispatcher | ⬜ | services/webhooks.py | Trigger async |
| 4.7 | Event bus intégration | ⬜ | core/events.py | on("contact.created") |
| 4.8 | Retry logic (3 tentatives) | ⬜ | services/webhooks.py | Exponential backoff |
| 4.9 | Logs webhooks (succès/échec) | ⬜ | models/webhook_log.py | Debugging |
| 4.10 | Rate limiting (10 req/s) | ⬜ | services/webhooks.py | Éviter spam |
| 4.11 | Signature HMAC | ⬜ | services/webhooks.py | Sécurité webhook |
| 4.12 | Secret key par webhook | ⬜ | models/webhook.py | Validation côté client |

### ✅ Checklist - Événements disponibles

| # | Événement | Statut | Déclenché par | Payload |
|---|-----------|--------|---------------|---------|
| 4.13 | contact.created | ⬜ | POST /people | Person object |
| 4.14 | contact.updated | ⬜ | PUT /people/{id} | Person object |
| 4.15 | contact.deleted | ⬜ | DELETE /people/{id} | {id, deleted_at} |
| 4.16 | organisation.created | ⬜ | POST /organisations | Organisation object |
| 4.17 | organisation.updated | ⬜ | PUT /organisations/{id} | Organisation object |
| 4.18 | deal.created | ⬜ | POST /mandats | Mandat object |
| 4.19 | deal.won | ⬜ | Update status → "gagné" | Mandat object |
| 4.20 | deal.lost | ⬜ | Update status → "perdu" | Mandat object |
| 4.21 | email.sent | ⬜ | Campaign send | Campaign + recipient |
| 4.22 | email.opened | ⬜ | Email tracking | Campaign + recipient |
| 4.23 | email.clicked | ⬜ | Link tracking | Campaign + recipient + link |
| 4.24 | task.created | ⬜ | POST /tasks | Task object |
| 4.25 | task.completed | ⬜ | Update status → "done" | Task object |

### ✅ Checklist - Frontend UI

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 4.26 | Page /settings/integrations | ⬜ | app/settings/integrations/page.tsx | Hub intégrations |
| 4.27 | Section "Webhooks" | ⬜ | components/settings/WebhooksList.tsx | Liste webhooks |
| 4.28 | Modal "Nouveau webhook" | ⬜ | components/settings/WebhookModal.tsx | Formulaire création |
| 4.29 | Sélecteur événement (dropdown) | ⬜ | components/settings/EventSelector.tsx | 13 événements |
| 4.30 | Test webhook (bouton) | ⬜ | components/settings/WebhookTest.tsx | Envoyer test payload |
| 4.31 | Logs webhooks (tableau) | ⬜ | components/settings/WebhookLogs.tsx | Historique 7j |
| 4.32 | Documentation inline | ⬜ | components/settings/WebhookDocs.tsx | Exemples code |

### ✅ Checklist - Zapier App

| # | Tâche | Statut | Plateforme | Remarques |
|---|-------|--------|-----------|-----------|
| 4.33 | Compte développeur Zapier | ⬜ | zapier.com/developer | Gratuit |
| 4.34 | Créer app "Alforis CRM" | ⬜ | Zapier CLI | zapier init |
| 4.35 | Authentification (API Key) | ⬜ | authentication.js | Bearer token |
| 4.36 | Trigger "New Contact" | ⬜ | triggers/contact_created.js | Webhook |
| 4.37 | Trigger "New Deal" | ⬜ | triggers/deal_created.js | Webhook |
| 4.38 | Trigger "Deal Won" | ⬜ | triggers/deal_won.js | Webhook |
| 4.39 | Action "Create Contact" | ⬜ | creates/contact.js | POST /people |
| 4.40 | Action "Update Contact" | ⬜ | creates/update_contact.js | PUT /people/{id} |
| 4.41 | Action "Create Organisation" | ⬜ | creates/organisation.js | POST /organisations |
| 4.42 | Search "Find Contact" | ⬜ | searches/contact.js | GET /people |
| 4.43 | Tests unitaires Zapier | ⬜ | test/ | zapier test |
| 4.44 | Publier en privé | ⬜ | Zapier dashboard | Inviter beta users |
| 4.45 | Logo + description | ⬜ | Zapier dashboard | Branding |

### 📚 Documentation

| # | Tâche | Statut | Fichiers | Remarques |
|---|-------|--------|---------|-----------|
| 4.46 | Guide webhook (FR) | ⬜ | documentation/WEBHOOKS.md | Public |
| 4.47 | Guide Zapier (FR) | ⬜ | documentation/ZAPIER_SETUP.md | Screenshots |
| 4.48 | API Reference webhooks | ⬜ | documentation/api/WEBHOOKS_API.md | OpenAPI |
| 4.49 | Exemples payloads | ⬜ | documentation/WEBHOOK_EXAMPLES.md | JSON samples |
| 4.50 | FAQ intégrations | ⬜ | documentation/INTEGRATIONS_FAQ.md | Troubleshooting |

### 📊 Métriques de succès
- ✅ 13 événements webhook opérationnels
- ✅ Zapier app publiée (privée)
- ✅ 3+ triggers et 3+ actions Zapier
- ✅ Documentation complète

### 🔗 Intégrations possibles via Zapier
- **CRM** : Salesforce, HubSpot, Pipedrive
- **Email** : Gmail, Outlook, Mailchimp
- **Productivité** : Google Sheets, Airtable, Notion
- **Communication** : Slack, Teams, Discord
- **Calendrier** : Google Calendar, Outlook Calendar
- **Formulaires** : Typeform, Google Forms, Jotform
- Et 4994+ autres apps !

---

## CHAPITRE 5 : Intégration Calendrier (Google/Outlook) 📅

**Priorité** : 🟡 Moyenne | **Effort** : 5 jours | **Impact** : Productivité +25%

### 📋 Contexte
Actuellement **aucune synchronisation** avec calendriers externes. Les utilisateurs doivent manuellement ajouter leurs RDV CRM dans leur calendrier.

### 🎯 Objectifs
- Sync bidirectionnelle Google Calendar / Outlook
- Créer événements calendrier depuis CRM
- Import automatique RDV dans CRM
- Génération liens visio automatiques

### ✅ Checklist - Backend Google Calendar

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 5.1 | Installer SDK Google | ⬜ | requirements.txt | google-api-python-client |
| 5.2 | Créer projet Google Cloud | ⬜ | console.cloud.google.com | OAuth credentials |
| 5.3 | Configurer OAuth2 consent | ⬜ | Google Cloud Console | Scopes calendar |
| 5.4 | Modèle DB CalendarIntegration | ⬜ | models/calendar_integration.py | tokens, refresh_token |
| 5.5 | Service GoogleCalendarService | ⬜ | services/google_calendar.py | API wrapper |
| 5.6 | OAuth flow (redirect) | ⬜ | api/routes/integrations.py | /auth/google/callback |
| 5.7 | Méthode create_event() | ⬜ | services/google_calendar.py | POST event |
| 5.8 | Méthode update_event() | ⬜ | services/google_calendar.py | PUT event |
| 5.9 | Méthode delete_event() | ⬜ | services/google_calendar.py | DELETE event |
| 5.10 | Méthode list_events() | ⬜ | services/google_calendar.py | GET events range |
| 5.11 | Sync bidirectionnelle (webhooks) | ⬜ | services/google_calendar.py | Push notifications |
| 5.12 | Génération lien Google Meet | ⬜ | services/google_calendar.py | conferenceData |

### ✅ Checklist - Backend Outlook Calendar

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 5.13 | Installer SDK Microsoft | ⬜ | requirements.txt | msal, msgraph-core |
| 5.14 | Créer app Azure AD | ⬜ | portal.azure.com | OAuth credentials |
| 5.15 | Service OutlookCalendarService | ⬜ | services/outlook_calendar.py | Graph API |
| 5.16 | OAuth flow (redirect) | ⬜ | api/routes/integrations.py | /auth/outlook/callback |
| 5.17 | Méthodes CRUD events | ⬜ | services/outlook_calendar.py | create/update/delete |
| 5.18 | Sync bidirectionnelle | ⬜ | services/outlook_calendar.py | Delta queries |
| 5.19 | Génération lien Teams | ⬜ | services/outlook_calendar.py | onlineMeeting |

### ✅ Checklist - Sync Logic

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 5.20 | Task CRM → Événement calendrier | ⬜ | services/calendar_sync.py | Auto-sync toggle |
| 5.21 | Événement calendrier → Interaction CRM | ⬜ | services/calendar_sync.py | Import RDV |
| 5.22 | Détection conflits horaires | ⬜ | services/calendar_sync.py | Alertes overlapping |
| 5.23 | Gestion fuseaux horaires | ⬜ | services/calendar_sync.py | UTC + TZ user |
| 5.24 | Rappels automatiques | ⬜ | services/calendar_sync.py | 15min avant RDV |
| 5.25 | Job sync périodique (15min) | ⬜ | tasks/calendar_sync.py | APScheduler |

### ✅ Checklist - Frontend

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 5.26 | Page /settings/calendar | ⬜ | app/settings/calendar/page.tsx | Config calendriers |
| 5.27 | Bouton "Connecter Google" | ⬜ | components/settings/GoogleCalendarConnect.tsx | OAuth popup |
| 5.28 | Bouton "Connecter Outlook" | ⬜ | components/settings/OutlookCalendarConnect.tsx | OAuth popup |
| 5.29 | Statut connexion | ⬜ | components/settings/CalendarStatus.tsx | Connecté/Déconnecté |
| 5.30 | Toggle auto-sync | ⬜ | components/settings/CalendarSyncToggle.tsx | ON/OFF |
| 5.31 | Calendrier intégré (vue) | ⬜ | components/calendar/CalendarView.tsx | @fullcalendar/react |
| 5.32 | Bouton "Ajouter au calendrier" | ⬜ | components/tasks/AddToCalendarButton.tsx | Sur chaque task |
| 5.33 | Modal création événement | ⬜ | components/calendar/EventModal.tsx | Formulaire + visio |
| 5.34 | Vue semaine/mois | ⬜ | components/calendar/CalendarView.tsx | Switch view |
| 5.35 | Filtres calendrier | ⬜ | components/calendar/CalendarFilters.tsx | RDV/Tasks/Pitchs |

### 📊 Métriques de succès
- ✅ Sync Google + Outlook opérationnelle
- ✅ < 1min de latence sync
- ✅ 0 doublon d'événements
- ✅ 90%+ utilisateurs activent sync

---

## CHAPITRE 6 : Téléphonie (Twilio / Aircall) 📞

**Priorité** : 🟡 Moyenne | **Effort** : 4 jours | **Impact** : Conversion +15%

### 📋 Contexte
Actuellement **aucune intégration téléphonie**. Les commerciaux appellent depuis leur téléphone personnel et doivent manuellement logger les appels dans le CRM.

### 🎯 Objectifs
- Click-to-call depuis CRM
- Historique appels automatique
- Enregistrement appels (avec consentement)
- Transcription automatique (Whisper AI)

### ✅ Checklist - Backend Twilio

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 6.1 | Compte Twilio + numéro | ⬜ | twilio.com | ~10€/mois |
| 6.2 | Installer SDK Twilio | ⬜ | requirements.txt | twilio==8.x |
| 6.3 | Configurer credentials | ⬜ | .env | TWILIO_ACCOUNT_SID, AUTH_TOKEN |
| 6.4 | Service TwilioVoiceService | ⬜ | services/twilio_voice.py | API wrapper |
| 6.5 | Méthode initiate_call() | ⬜ | services/twilio_voice.py | Click-to-call |
| 6.6 | Webhook appel entrant | ⬜ | api/routes/webhooks.py | /webhooks/twilio/incoming |
| 6.7 | Webhook status appel | ⬜ | api/routes/webhooks.py | /webhooks/twilio/status |
| 6.8 | Webhook recording ready | ⬜ | api/routes/webhooks.py | /webhooks/twilio/recording |
| 6.9 | Modèle DB Call | ⬜ | models/call.py | from, to, duration, status |
| 6.10 | Auto-créer Interaction CRM | ⬜ | services/call_logger.py | Après appel terminé |
| 6.11 | Téléchargement enregistrement | ⬜ | services/twilio_voice.py | MP3 → S3/local |
| 6.12 | Transcription Whisper | ⬜ | services/transcription.py | openai.Audio.transcribe |

### ✅ Checklist - Frontend Softphone

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 6.13 | Installer Twilio Client SDK | ⬜ | package.json | @twilio/voice-sdk |
| 6.14 | Composant Softphone | ⬜ | components/phone/Softphone.tsx | Popup mini-dialer |
| 6.15 | Bouton "Appeler" sur contacts | ⬜ | components/people/PersonCard.tsx | Click numéro |
| 6.16 | Bouton "Appeler" sur organisations | ⬜ | components/organisations/OrgCard.tsx | Click numéro |
| 6.17 | Notification appel entrant | ⬜ | components/phone/IncomingCallNotification.tsx | Toast + son |
| 6.18 | Écran appel en cours | ⬜ | components/phone/ActiveCall.tsx | Timer + boutons |
| 6.19 | Boutons: Mute, Hold, Transfer | ⬜ | components/phone/CallControls.tsx | Contrôles call |
| 6.20 | Historique appels | ⬜ | components/phone/CallHistory.tsx | Liste recent calls |
| 6.21 | Lecteur enregistrement | ⬜ | components/phone/CallRecordingPlayer.tsx | Audio player |
| 6.22 | Affichage transcription | ⬜ | components/phone/CallTranscript.tsx | Texte + search |

### ✅ Checklist - Conformité légale

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 6.23 | Consentement enregistrement | ⬜ | services/twilio_voice.py | Message vocal |
| 6.24 | Opt-out enregistrement | ⬜ | models/person.py | Champ allow_recording |
| 6.25 | RGPD: Conservation (3 ans max) | ⬜ | tasks/cleanup_calls.py | Job nettoyage |
| 6.26 | Logs appels (audit) | ⬜ | models/call_log.py | Who called who when |

### 📊 Métriques de succès
- ✅ Click-to-call opérationnel
- ✅ 100% appels loggés automatiquement
- ✅ Transcription < 2min après appel
- ✅ Conformité RGPD

### 💰 Coût estimé
- Twilio: ~0.01€/min + 10€/mois numéro
- Whisper API: ~0.006€/min transcription
- **Total**: ~50-100€/mois pour 500 appels

---

## CHAPITRE 7 : Visioconférence (Zoom/Meet/Teams) 🎥

**Priorité** : 🟢 Basse | **Effort** : 3 jours | **Impact** : UX +10%

### 📋 Contexte
Intégration déjà **partiellement couverte** par le Chapitre 5 (Google Meet via Calendar, Teams via Outlook). Ce chapitre ajoute Zoom et améliore l'UX.

### 🎯 Objectifs
- Génération liens visio en 1 clic
- Support Zoom + Google Meet + Teams
- Intégration dans événements calendrier
- Rappels avec lien visio

### ✅ Checklist

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 7.1 | Installer Zoom SDK | ⬜ | requirements.txt | PyJWT + requests |
| 7.2 | Créer app Zoom OAuth | ⬜ | marketplace.zoom.us | JWT credentials |
| 7.3 | Service ZoomService | ⬜ | services/zoom.py | Create meeting API |
| 7.4 | Méthode create_meeting() | ⬜ | services/zoom.py | Generate Zoom link |
| 7.5 | Bouton "Générer lien Zoom" | ⬜ | components/tasks/VideoMeetingButton.tsx | Sur tasks/RDV |
| 7.6 | Sélecteur provider (Zoom/Meet/Teams) | ⬜ | components/tasks/VideoProviderSelect.tsx | Dropdown |
| 7.7 | Auto-ajout lien dans événement | ⬜ | services/calendar_sync.py | Description event |
| 7.8 | Copier lien (clipboard) | ⬜ | components/tasks/CopyVideoLink.tsx | Button copy |
| 7.9 | Envoyer lien par email | ⬜ | services/email_service.py | Template avec lien |
| 7.10 | Statistiques meetings | ⬜ | api/routes/analytics.py | Nombre meetings créés |

### 📊 Métriques de succès
- ✅ 3 providers supportés (Zoom/Meet/Teams)
- ✅ Génération lien < 3 secondes
- ✅ 100% liens ajoutés aux événements

---

## CHAPITRE 8 : LinkedIn Integration 🔗

**Priorité** : 🟢 Basse | **Effort** : 6 jours | **Impact** : Lead Gen +20%

### 📋 Contexte
LinkedIn API **très restrictive** (uniquement pour partners). Solutions alternatives: scraping (zone grise) ou intégration via Zapier/Phantombuster.

### 🎯 Objectifs
- Importer contacts depuis LinkedIn
- Sync automatique profils
- Tracking interactions LinkedIn
- Lead sourcing

### ⚠️ Avertissement légal
Le scraping LinkedIn viole leurs CGU. Options légales :
1. **LinkedIn Partner Program** (difficile d'accès)
2. **Zapier LinkedIn integration** (recommandé)
3. **Extension Chrome** (utilisateur consent)

### ✅ Checklist - Zapier approach (RECOMMANDÉ)

| # | Tâche | Statut | Méthode | Remarques |
|---|-------|--------|---------|-----------|
| 8.1 | Zap: LinkedIn → CRM | ⬜ | Zapier LinkedIn Lead Gen Forms | Légal |
| 8.2 | Import CSV LinkedIn | ⬜ | Import page | Export manuel LinkedIn |
| 8.3 | Champs LinkedIn | ⬜ | models/person.py | linkedin_url, linkedin_headline |
| 8.4 | Enrichissement profil | ⬜ | services/clearbit.py ou people-data-labs.com | API payante |

### ✅ Checklist - Extension Chrome (alternative)

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 8.5 | Extension Chrome boilerplate | ⬜ | chrome-extension/ | manifest.json |
| 8.6 | Bouton "Ajouter au CRM" | ⬜ | content-script.js | Inject button |
| 8.7 | Scrape profil LinkedIn | ⬜ | scraper.js | DOM parsing |
| 8.8 | API CRM (CORS) | ⬜ | crm-backend/main.py | Autoriser extension |
| 8.9 | POST contact depuis extension | ⬜ | api/routes/people.py | Create contact |
| 8.10 | Publication Chrome Web Store | ⬜ | chrome.google.com/webstore | Review process |

### 📊 Métriques de succès
- ✅ Import LinkedIn opérationnel
- ✅ Enrichissement automatique profils
- ✅ Extension Chrome publiée (si applicable)

### 💰 Coût
- Clearbit/People Data Labs: ~50-200€/mois (1000-5000 enrichments)

---

## CHAPITRE 9 : Automatisations Workflow 🤖

**Priorité** : 🟡 Moyenne | **Effort** : 8 jours | **Impact** : Efficacité +30%

### 📋 Contexte
Actuellement workflows **manuels uniquement**. Les utilisateurs doivent créer des tâches, assigner, rappeler manuellement.

### 🎯 Objectifs
- Workflow builder visuel (drag & drop)
- Déclencheurs automatiques
- Actions conditionnelles
- Templates pré-configurés

### ✅ Checklist - Backend Automation Engine

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 9.1 | Modèle DB Workflow | ⬜ | models/workflow.py | name, trigger, actions |
| 9.2 | Modèle DB WorkflowStep | ⬜ | models/workflow_step.py | type, config, order |
| 9.3 | Service WorkflowEngine | ⬜ | services/workflow_engine.py | Exécution workflows |
| 9.4 | Triggers: Contact créé | ⬜ | services/triggers/contact_created.py | Event listener |
| 9.5 | Triggers: Deal mis à jour | ⬜ | services/triggers/deal_updated.py | Conditions statut |
| 9.6 | Triggers: Email ouvert | ⬜ | services/triggers/email_opened.py | 3+ opens |
| 9.7 | Triggers: Inactivité (30j) | ⬜ | tasks/workflow_scheduler.py | Job quotidien |
| 9.8 | Actions: Créer tâche | ⬜ | services/actions/create_task.py | Auto-assign |
| 9.9 | Actions: Envoyer email | ⬜ | services/actions/send_email.py | Template email |
| 9.10 | Actions: Notification | ⬜ | services/actions/send_notification.py | Push/Email |
| 9.11 | Actions: Update champ | ⬜ | services/actions/update_field.py | Set status/score |
| 9.12 | Actions: Webhook | ⬜ | services/actions/call_webhook.py | External system |
| 9.13 | Actions: Délai (wait) | ⬜ | services/actions/delay.py | Wait 3 days |
| 9.14 | Conditions: IF/ELSE | ⬜ | services/workflow_engine.py | Branching logic |
| 9.15 | Variables: {{contact.name}} | ⬜ | services/template_engine.py | Template vars |

### ✅ Checklist - Frontend Workflow Builder

| # | Tâche | Statut | Package | Remarques |
|---|-------|--------|---------|-----------|
| 9.16 | Installer ReactFlow | ⬜ | reactflow | Workflow visual editor |
| 9.17 | Page /workflows/builder | ⬜ | app/workflows/builder/page.tsx | Drag & drop UI |
| 9.18 | Node: Trigger | ⬜ | components/workflow/nodes/TriggerNode.tsx | Point de départ |
| 9.19 | Node: Action | ⬜ | components/workflow/nodes/ActionNode.tsx | Étape workflow |
| 9.20 | Node: Condition | ⬜ | components/workflow/nodes/ConditionNode.tsx | IF/ELSE |
| 9.21 | Node: Delay | ⬜ | components/workflow/nodes/DelayNode.tsx | Wait X days |
| 9.22 | Config panel (sidebar) | ⬜ | components/workflow/ConfigPanel.tsx | Paramètres node |
| 9.23 | Templates pré-configurés | ⬜ | components/workflow/Templates.tsx | 10+ templates |
| 9.24 | Test workflow | ⬜ | components/workflow/TestWorkflow.tsx | Dry-run mode |
| 9.25 | Historique exécutions | ⬜ | app/workflows/[id]/history/page.tsx | Logs |

### ✅ Checklist - Templates pré-configurés

| # | Template | Statut | Description |
|---|----------|--------|-------------|
| 9.26 | Lead nurturing | ⬜ | Séquence emails automatique |
| 9.27 | Follow-up RDV | ⬜ | Email 1h avant + recap après |
| 9.28 | Réactivation inactifs | ⬜ | Email après 30j inactivité |
| 9.29 | Onboarding client | ⬜ | 7 jours de messages |
| 9.30 | Escalade manager | ⬜ | Notif si deal > X€ |

### 📊 Métriques de succès
- ✅ Workflow builder opérationnel
- ✅ 10+ templates disponibles
- ✅ 50% tâches automatisées

---

## CHAPITRE 10 : Intelligence Artificielle 🧠

**Priorité** : 🟡 Moyenne | **Effort** : 10 jours | **Impact** : Scoring +35%

### 📋 Contexte
Module AI agent déjà présent ([ai_agent.py](crm-backend/services/ai_agent.py)) mais limité à la détection de doublons et suggestions qualité.

### 🎯 Objectifs
- Lead scoring prédictif
- Prédiction probabilité closing
- Recommandations next best action
- Détection anomalies (deals bloqués)

### ✅ Checklist - Lead Scoring

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 10.1 | Modèle DB LeadScore | ⬜ | models/lead_score.py | score, factors, updated_at |
| 10.2 | Features engineering | ⬜ | services/ai/features.py | 20+ features (email_opens, etc.) |
| 10.3 | Training dataset | ⬜ | tasks/ai_training.py | Historique deals gagnés/perdus |
| 10.4 | Modèle ML (XGBoost) | ⬜ | services/ai/lead_scoring.py | Classifier |
| 10.5 | API predict_score() | ⬜ | api/routes/ai.py | POST /ai/score |
| 10.6 | Batch scoring (nightly) | ⬜ | tasks/score_leads.py | Toutes les nuits |
| 10.7 | Affichage score UI | ⬜ | components/people/LeadScore.tsx | Badge A/B/C/D |
| 10.8 | Explication score (SHAP) | ⬜ | services/ai/explainability.py | Pourquoi ce score? |

### ✅ Checklist - Prédiction Closing

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 10.9 | Probabilité win (%) | ⬜ | services/ai/win_probability.py | 0-100% chance |
| 10.10 | Estimation date closing | ⬜ | services/ai/closing_date.py | Régression |
| 10.11 | Affichage proba UI | ⬜ | components/mandats/WinProbability.tsx | Gauge chart |
| 10.12 | Alertes deals bloqués | ⬜ | services/ai/stuck_deals.py | Aucune activité 14j |

### ✅ Checklist - Recommandations

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 10.13 | Next best action | ⬜ | services/ai/recommendations.py | "Appeler ce contact" |
| 10.14 | Optimal send time (emails) | ⬜ | services/ai/send_time.py | ML sur historique opens |
| 10.15 | Similar contacts | ⬜ | services/ai/similarity.py | Embeddings + cosine |
| 10.16 | Affichage suggestions UI | ⬜ | components/dashboard/AISuggestions.tsx | Widget dashboard |

### 📊 Métriques de succès
- ✅ Lead scoring précision > 75%
- ✅ Prédiction closing ±7 jours
- ✅ 80% actions recommandées pertinentes

---

## CHAPITRE 11 : Mobile App (React Native) 📱

**Priorité** : 🟢 Basse | **Effort** : 15 jours | **Impact** : Accessibilité +40%

### 📋 Contexte
CRM actuellement **web-only**. PWA existe mais limité (pas d'accès offline complet, pas de push natifs).

### 🎯 Objectifs
- App iOS + Android native
- Mode offline
- Push notifications natives
- Accès caméra (scan cartes visite)

### ✅ Checklist - Setup

| # | Tâche | Statut | Remarques |
|---|-------|--------|-----------|
| 11.1 | Init React Native project | ⬜ | expo init ou react-native init |
| 11.2 | Config iOS (Xcode) | ⬜ | Bundle ID, certificates |
| 11.3 | Config Android (Android Studio) | ⬜ | Package name, keystore |
| 11.4 | Navigation (React Navigation) | ⬜ | Stack + Tab navigator |
| 11.5 | State management (Zustand) | ⬜ | Sync avec web |

### ✅ Checklist - Features

| # | Tâche | Statut | Remarques |
|---|-------|--------|-----------|
| 11.6 | Écran login | ⬜ | Biometric (FaceID/Fingerprint) |
| 11.7 | Liste contacts | ⬜ | Infinite scroll |
| 11.8 | Détail contact | ⬜ | Swipe actions (call, email) |
| 11.9 | Créer contact | ⬜ | Formulaire + photo |
| 11.10 | Scan carte visite (OCR) | ⬜ | react-native-text-recognition |
| 11.11 | Mode offline | ⬜ | SQLite local + sync |
| 11.12 | Push notifications | ⬜ | FCM (Firebase) |
| 11.13 | Géolocalisation | ⬜ | Check-in clients |

### 📊 Métriques de succès
- ✅ App publiée App Store + Play Store
- ✅ Notation > 4.0/5
- ✅ Mode offline opérationnel

---

## CHAPITRE 12 : Notifications Push 🔔

**Priorité** : 🟡 Moyenne | **Effort** : 3 jours | **Impact** : Engagement +25%

### 📋 Contexte
Actuellement **notifications email uniquement**. WebSocket implémenté mais limité aux utilisateurs connectés.

### 🎯 Objectifs
- Push notifications web (PWA)
- Push notifications mobile (FCM)
- Préférences personnalisables
- Temps réel

### ✅ Checklist

| # | Tâche | Statut | Fichiers concernés | Remarques |
|---|-------|--------|-------------------|-----------|
| 12.1 | Firebase project | ⬜ | firebase.google.com | FCM setup |
| 12.2 | Service Worker push | ⬜ | public/sw.js | Handle notifications |
| 12.3 | Backend Firebase Admin SDK | ⬜ | requirements.txt | Send push |
| 12.4 | Demande permission navigateur | ⬜ | components/NotificationPermission.tsx | Onboarding |
| 12.5 | Enregistrer device token | ⬜ | api/routes/devices.py | Store FCM token |
| 12.6 | Envoyer notification | ⬜ | services/push_notifications.py | send_push() |
| 12.7 | Préférences notifications | ⬜ | app/settings/notifications/page.tsx | Toggles par type |
| 12.8 | Notification: Nouveau lead | ⬜ | triggers | Deal assigned to you |
| 12.9 | Notification: Tâche due | ⬜ | triggers | 1h avant deadline |
| 12.10 | Notification: Email ouvert | ⬜ | triggers | Hot lead! |

### 📊 Métriques de succès
- ✅ 60% utilisateurs acceptent push
- ✅ Taux d'ouverture > 20%
- ✅ Latence < 5 secondes

---

## 🎯 PLAN D'EXÉCUTION RECOMMANDÉ

### Phase 1 - Quick Wins (2 semaines)
1. ✅ Chapitre 1: Redis Cache (1j)
2. ✅ Chapitre 2: PostHog Analytics (2j)
3. ✅ Chapitre 3: Visualisations (4j)

**Résultat**: Performance +50%, meilleure compréhension utilisateurs, dashboard pro

### Phase 2 - Extensibilité (4 semaines)
4. ✅ Chapitre 4: Zapier/Make (7j)
5. ✅ Chapitre 5: Calendrier (5j)
6. ✅ Chapitre 6: Téléphonie (4j)

**Résultat**: 5000+ intégrations, productivité +25%, conversion +15%

### Phase 3 - Intelligence (4 semaines)
7. ✅ Chapitre 9: Workflows (8j)
8. ✅ Chapitre 10: IA (10j)
9. ✅ Chapitre 12: Push (3j)

**Résultat**: Automatisation 50% tâches, scoring prédictif, engagement +25%

### Phase 4 - Nice-to-Have (6 semaines)
10. ✅ Chapitre 7: Visio (3j)
11. ✅ Chapitre 8: LinkedIn (6j)
12. ✅ Chapitre 11: Mobile App (15j)

**Résultat**: CRM complet niveau Tier 1

---

## 📊 PROGRESSION GLOBALE

| Phase | Chapitres | Durée | Statut | % Complétion |
|-------|-----------|-------|--------|--------------|
| Phase 1 | 1-3 | 2 sem | ⬜ À FAIRE | 0% |
| Phase 2 | 4-6 | 4 sem | ⬜ À FAIRE | 0% |
| Phase 3 | 9-10, 12 | 4 sem | ⬜ À FAIRE | 0% |
| Phase 4 | 7-8, 11 | 6 sem | ⬜ À FAIRE | 0% |
| **TOTAL** | **12 chapitres** | **16 semaines** | **⬜** | **0%** |

---

## 📝 NOTES

- **Mise à jour** : Ce document doit être mis à jour après chaque chapitre complété
- **Priorisation** : Ajustable selon besoins business
- **Effort** : Basé sur 1 développeur fullstack expérimenté
- **Budget** : ~80-130€/mois pour tous les services externes
- **ROI attendu** : CRM niveau Tier 1 compétitif vs HubSpot/Salesforce

---

**Dernière mise à jour** : 2025-10-22
**Prochaine révision** : Après Phase 1 complétée
