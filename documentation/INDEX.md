# 📚 CRM Alforis - Documentation

> **Documentation technique complète** | Dernière mise à jour: 28 octobre 2025

---

## 📊 Vue d'Ensemble

Documentation complète du CRM Alforis V1:
- **Backend**: API FastAPI, PostgreSQL, workflows
- **Frontend**: Next.js 14, TypeScript, PWA
- **Features**: IA, Marketing Hub, Interactions, Dashboard V2
- **Déploiement**: Docker, Nginx, Hetzner

**Total**: 44 fichiers | **Archive**: 5 fichiers historiques

---

## 🚀 Démarrage Rapide

### Nouveaux Développeurs
1. [QUICK_START.md](frontend/QUICK_START.md) - Installation en 5 minutes
2. [ARCHITECTURE.md](frontend/ARCHITECTURE.md) - Comprendre l'architecture
3. [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) - 78 endpoints disponibles

### Déploiement Production
1. [README-DEPLOY.md](deployment/README-DEPLOY.md) - Guide complet déploiement
2. [WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md) - Configuration webhooks
3. [PRODUCTION_DEPLOY.md](frontend/PRODUCTION_DEPLOY.md) - Build frontend optimisé

---

## 📂 Documentation par Catégorie

### 🔧 Backend (8 fichiers)

#### Essentiels
- **[API_ENDPOINTS.md](backend/API_ENDPOINTS.md)** - 78 endpoints API documentés
- **[INIT_DATABASE.md](backend/INIT_DATABASE.md)** - Setup et migration base de données
- **[WORKFLOWS.md](backend/WORKFLOWS.md)** - Automatisations métier

#### Imports/Exports
- **[IMPORTS.md](backend/IMPORTS.md)** - Imports CSV/Excel massifs
- **[EXPORTS.md](backend/EXPORTS.md)** - Exports CSV/Excel/PDF
- **[RECHERCHE.md](backend/RECHERCHE.md)** - Recherche full-text PostgreSQL

#### API
- **[api/README.md](backend/api/README.md)** - Vue d'ensemble API
- **[api/IMPORTS_USAGE.md](backend/api/IMPORTS_USAGE.md)** - API bulk imports

---

### 🎨 Frontend (9 fichiers)

#### Architecture
- **[ARCHITECTURE.md](frontend/ARCHITECTURE.md)** - Architecture Next.js App Router
- **[STRUCTURE.md](frontend/STRUCTURE.md)** - Structure dossiers et conventions
- **[QUICK_START.md](frontend/QUICK_START.md)** - Installation et démarrage

#### Développement
- **[HOOKS.md](frontend/HOOKS.md)** - 15+ hooks React personnalisés ⭐
- **[FRONTEND_ENDPOINTS_HOOKS.md](frontend/FRONTEND_ENDPOINTS_HOOKS.md)** - React Query hooks
- **[SIDEBAR.md](frontend/SIDEBAR.md)** - Navigation sidebar dynamique

#### Déploiement
- **[PRODUCTION_DEPLOY.md](frontend/PRODUCTION_DEPLOY.md)** - Build production et optimisations

---

### 🚀 Déploiement (2 fichiers)

- **[README-DEPLOY.md](deployment/README-DEPLOY.md)** - Guide complet déploiement Hetzner
- **[WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md)** - Configuration webhooks Resend

**Commandes essentielles**:
```bash
# Déploiement complet
./scripts/deploy.sh

# Build frontend uniquement
docker-compose up -d --build frontend

# Redémarrage API
docker-compose restart api
```

---

### ✨ Fonctionnalités (7 fichiers)

#### Dashboard
- **[DASHBOARD_V2.md](features/DASHBOARD_V2.md)** - Dashboard analytics avec widgets interactifs

#### Intelligence Artificielle
- **[AI_AGENT_README.md](features/AI_AGENT_README.md)** - Agent IA conversationnel
- **[PROJET_AGENT_IA_RESUME.md](features/PROJET_AGENT_IA_RESUME.md)** - Résumé projet IA (1300 lignes)

#### Interactions
- **[INTERACTIONS_V2_COMPLETE.md](features/INTERACTIONS_V2_COMPLETE.md)** - Système interactions V2
- **[INTERACTIONS_V2_AUDIT_SECURITY.md](features/INTERACTIONS_V2_AUDIT_SECURITY.md)** - Audit sécurité
- **[INTERACTIONS_AUTO_CREATION.md](features/INTERACTIONS_AUTO_CREATION.md)** - Création auto emails/appels

#### Filtres
- **[ADVANCED_FILTERS_GUIDE.md](features/ADVANCED_FILTERS_GUIDE.md)** - Filtres avancés multi-critères

---

### 📧 Marketing (4 fichiers)

- **[MARKETING_HUB_GUIDE.md](marketing/MARKETING_HUB_GUIDE.md)** - Hub marketing complet (178 tests) ⭐
- **[email-campaigns-guide.md](marketing/email-campaigns-guide.md)** - Guide campagnes emails
- **[FEATURE_CAMPAIGN_SUBSCRIPTIONS.md](marketing/FEATURE_CAMPAIGN_SUBSCRIPTIONS.md)** - Abonnements RGPD
- **[GUIDE_TEST_MODULE_MARKETING.md](marketing/GUIDE_TEST_MODULE_MARKETING.md)** - Tests module marketing

**Points clés**:
- Campagnes personnalisées avec templates
- Listes de diffusion segmentées
- Tracking emails (délivrés, ouverts, cliqués, bounces)
- Conformité RGPD (désinscription 1-clic)

---

### 📱 Mobile & PWA (2 fichiers)

- **[PWA_GUIDE.md](mobile/PWA_GUIDE.md)** - Progressive Web App complète
- **[MOBILE_OPTIMIZATION_SUMMARY.md](mobile/MOBILE_OPTIMIZATION_SUMMARY.md)** - Optimisations mobile

**Fonctionnalités PWA**:
- Installation mobile (iOS/Android)
- Mode offline
- Push notifications
- Icônes adaptatives

---

### 📚 Guides Transverses (4 fichiers)

- **[PERMISSIONS.md](guides/PERMISSIONS.md)** - Système permissions (roles: admin, commercial, viewer)
- **[NOTIFICATIONS.md](guides/NOTIFICATIONS.md)** - Notifications temps réel (WebSocket)
- **[WEBHOOKS.md](guides/WEBHOOKS.md)** - Configuration webhooks
- **[TESTS.md](guides/TESTS.md)** - Guide tests (pytest, Jest)

---

### 🛠️ Développement (1 fichier)

- **[DEV_GUIDE_ALEMBIC.md](DEV_GUIDE_ALEMBIC.md)** - Migrations Alembic (SQLAlchemy 2.0)

---

## 🗄️ Archive (5 fichiers)

Documentation historique conservée pour référence:

- **[MIGRATION_HISTORY_2024-10.md](archive/MIGRATION_HISTORY_2024-10.md)** - Historique migrations octobre
- **[ANALYSE_FRONTEND_EXISTANT.md](archive/ANALYSE_FRONTEND_EXISTANT.md)** - Analyse architecture originale
- **[HELP_SECTION_PLAN.md](archive/HELP_SECTION_PLAN.md)** - Plan section aide (complété)
- **[PRODUCTION_QUICKSTART.md](archive/PRODUCTION_QUICKSTART.md)** - Quickstart production (legacy)
- **[PERFORMANCE.md](archive/PERFORMANCE.md)** - Analyse performance (oct 2024)

---

## 🛠️ Stack Technique

### Backend
```
- Python 3.12 + FastAPI
- PostgreSQL 15 + SQLAlchemy 2.0
- Alembic (migrations)
- Celery + Redis (tâches async)
- Resend API (emails transactionnels)
- Anthropic Claude (IA)
```

### Frontend
```
- Next.js 14 (App Router)
- TypeScript 5
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- next-pwa (PWA)
- Recharts (visualisations)
```

### DevOps
```
- Docker + Docker Compose
- Nginx (reverse proxy)
- Sentry (monitoring)
- Hetzner VPS (production)
```

---

## 📊 État du Projet

### Backend
✅ **100% Production Ready**
- 78 endpoints API opérationnels
- Authentification JWT sécurisée
- Webhooks Resend configurés
- Workflows automatisés

### Frontend
✅ **95% Production Ready**
- 87% des tests validés (259/297) ⭐
- Dashboard analytics complet
- Marketing Hub 100% fonctionnel
- PWA installable
- Exports multi-formats

---

## 🎯 Fonctionnalités Clés

### CRM Core
- Gestion contacts (personnes + organisations)
- Tracking interactions (emails, appels, réunions)
- Workflows automatisés
- Permissions granulaires

### Marketing
- Campagnes emails personnalisées
- Templates réutilisables
- Tracking avancé (ouvertures, clics, bounces)
- Listes de diffusion RGPD

### Intelligence Artificielle
- Agent IA conversationnel (Claude)
- Auto-enrichissement contacts
- Scoring leads automatique
- Suggestions intelligentes

### Analytics
- Dashboard KPIs temps réel
- Graphiques interactifs
- Exports personnalisés
- Notifications WebSocket

---

## 🔗 Navigation Rapide

### Par Rôle

**Développeur Backend**
→ [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) | [WORKFLOWS.md](backend/WORKFLOWS.md) | [DEV_GUIDE_ALEMBIC.md](DEV_GUIDE_ALEMBIC.md)

**Développeur Frontend**
→ [HOOKS.md](frontend/HOOKS.md) | [ARCHITECTURE.md](frontend/ARCHITECTURE.md) | [FRONTEND_ENDPOINTS_HOOKS.md](frontend/FRONTEND_ENDPOINTS_HOOKS.md)

**DevOps**
→ [README-DEPLOY.md](deployment/README-DEPLOY.md) | [WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md)

**Product Owner**
→ [MARKETING_HUB_GUIDE.md](marketing/MARKETING_HUB_GUIDE.md) | [INTERACTIONS_V2_COMPLETE.md](features/INTERACTIONS_V2_COMPLETE.md) | [AI_AGENT_README.md](features/AI_AGENT_README.md)

**QA/Testeur**
→ [TESTS.md](guides/TESTS.md) | [GUIDE_TEST_MODULE_MARKETING.md](marketing/GUIDE_TEST_MODULE_MARKETING.md)

---

## 📖 Par Tâche

### Ajouter une fonctionnalité
1. Backend: [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) + [DEV_GUIDE_ALEMBIC.md](DEV_GUIDE_ALEMBIC.md)
2. Frontend: [HOOKS.md](frontend/HOOKS.md) + [ARCHITECTURE.md](frontend/ARCHITECTURE.md)
3. Tests: [TESTS.md](guides/TESTS.md)

### Déployer en production
1. [README-DEPLOY.md](deployment/README-DEPLOY.md) - Procédure complète
2. [PRODUCTION_DEPLOY.md](frontend/PRODUCTION_DEPLOY.md) - Build frontend
3. [WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md) - Webhooks

### Configurer Marketing
1. [MARKETING_HUB_GUIDE.md](marketing/MARKETING_HUB_GUIDE.md) - Vue d'ensemble
2. [email-campaigns-guide.md](marketing/email-campaigns-guide.md) - Campagnes
3. [FEATURE_CAMPAIGN_SUBSCRIPTIONS.md](marketing/FEATURE_CAMPAIGN_SUBSCRIPTIONS.md) - RGPD

### Optimiser Mobile
1. [PWA_GUIDE.md](mobile/PWA_GUIDE.md) - Configuration PWA
2. [MOBILE_OPTIMIZATION_SUMMARY.md](mobile/MOBILE_OPTIMIZATION_SUMMARY.md) - Optimisations

---

## 🆘 Support

### Problèmes Communs

**Erreurs déploiement**
→ [README-DEPLOY.md](deployment/README-DEPLOY.md#troubleshooting)

**Migrations BDD**
→ [DEV_GUIDE_ALEMBIC.md](DEV_GUIDE_ALEMBIC.md#résolution-de-problèmes)

**Webhooks non reçus**
→ [WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md#debugging)

**Tests frontend échoués**
→ [TESTS.md](guides/TESTS.md#debugging)

---

## 📈 Statistiques Documentation

```
Total fichiers:        41
Backend:               8 fichiers (20%)
Frontend:              9 fichiers (22%)
Features:              6 fichiers (15%)
Marketing:             4 fichiers (10%)
Guides:                4 fichiers (10%)
Déploiement:           2 fichiers (5%)
Mobile:                2 fichiers (5%)
Développement:         1 fichier  (2%)
Archive:               5 fichiers (12%)

Taille totale:        ~23,500 lignes
Réduction:            -33% (depuis 35,000 lignes)
Fichiers supprimés:   32 (doublons + obsolètes)
```

---

## 🎉 Dernières Mises à Jour

**28 octobre 2025** - Réorganisation majeure
- ✅ Suppression de 32 fichiers obsolètes (doublons, complétés, legacy)
- ✅ Réduction de 33% du volume de documentation
- ✅ Création de cet INDEX.md pour navigation claire
- ✅ Archivage sélectif (5 fichiers historiques conservés)

**27 octobre 2025** - Documentation enrichie
- ✅ [HOOKS.md](frontend/HOOKS.md) - 15+ hooks React documentés
- ✅ [MARKETING_HUB_GUIDE.md](marketing/MARKETING_HUB_GUIDE.md) - Guide complet (178 tests)

---

## 📝 Notes

### Maintenance Documentation
- **Supprimer** immédiatement les fichiers `*_COMPLETE.md` après phase terminée
- **Archiver** (pas supprimer) les guides de migration/analyse utiles
- **Éviter** les doublons entre `/archive` et répertoires actifs
- **Documenter** dans git commit la raison des suppressions

### Contribution
Lors de l'ajout de documentation:
1. Vérifier qu'elle n'existe pas déjà
2. Choisir le bon répertoire (backend/frontend/features/etc)
3. Suivre le format Markdown standard
4. Ajouter un lien dans ce INDEX.md
5. Mettre à jour [README.md](README.md) si nécessaire

---

**Documentation maintenue par**: Équipe CRM Alforis
**Dernière révision**: 28 octobre 2025
**Contact**: contact@alforis.com
