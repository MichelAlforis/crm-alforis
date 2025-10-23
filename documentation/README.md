# Documentation CRM Alforis

> **Documentation essentielle - 30 fichiers prioritaires**

---

## 📂 Structure

```
documentation/
├── backend/          # API, BDD, workflows (7 fichiers)
├── frontend/         # UI, hooks, architecture (5 fichiers)
├── deployment/       # Déploiement production (3 fichiers)
├── features/         # IA, filtres, interactions (4 fichiers)
├── marketing/        # Campagnes email (4 fichiers)
├── mobile/           # PWA mobile (2 fichiers)
├── guides/           # Permissions, notifications, tests (4 fichiers)
└── archive/          # Documentation secondaire (20+ fichiers)
```

---

## 🚀 Démarrage Rapide

### Installation

```bash
# 1. Backend
cd crm-backend
docker-compose up -d

# 2. Base de données
docker-compose exec api python scripts/init_database.py

# 3. Frontend
cd ../crm-frontend
npm install
npm run dev
```

### Accès

- **Frontend** : http://localhost:3000
- **API** : http://localhost:8000
- **API Docs** : http://localhost:8000/docs

---

## 📖 Documentation Prioritaire

### 🔧 Backend (7 fichiers)

**Essentiels**
- [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) - 78 endpoints API complets
- [INIT_DATABASE.md](backend/INIT_DATABASE.md) - Setup base de données
- [WORKFLOWS.md](backend/WORKFLOWS.md) - Automatisations métier

**Imports/Exports**
- [IMPORTS.md](backend/IMPORTS.md) - Imports massifs
- [EXPORTS.md](backend/EXPORTS.md) - Exports CSV/Excel/PDF
- [RECHERCHE.md](backend/RECHERCHE.md) - Recherche full-text

**API**
- [api/README.md](backend/api/README.md) - Documentation API détaillée

### 🎨 Frontend (5 fichiers)

**Architecture**
- [ARCHITECTURE.md](frontend/ARCHITECTURE.md) - Architecture Next.js
- [STRUCTURE.md](frontend/STRUCTURE.md) - Structure dossiers
- [QUICK_START.md](frontend/QUICK_START.md) - Démarrage rapide

**Développement**
- [FRONTEND_ENDPOINTS_HOOKS.md](frontend/FRONTEND_ENDPOINTS_HOOKS.md) - Hooks React Query
- [PRODUCTION_DEPLOY.md](frontend/PRODUCTION_DEPLOY.md) - Build production

### 🚀 Déploiement (3 fichiers)

- [DEPLOY_COMMANDS.md](deployment/DEPLOY_COMMANDS.md) - **Commandes essentielles**
- [README-DEPLOY.md](deployment/README-DEPLOY.md) - Guide complet déploiement
- [WEBHOOK_SETUP_ALFORIS.md](deployment/WEBHOOK_SETUP_ALFORIS.md) - Config webhooks Resend

### ✨ Fonctionnalités (4 fichiers)

- [ADVANCED_FILTERS_GUIDE.md](features/ADVANCED_FILTERS_GUIDE.md) - Filtres avancés
- [AI_AGENT_README.md](features/AI_AGENT_README.md) - Agent IA
- [PROJET_AGENT_IA_RESUME.md](features/PROJET_AGENT_IA_RESUME.md) - Résumé IA
- [INTERACTIONS_AUTO_CREATION.md](features/INTERACTIONS_AUTO_CREATION.md) - Auto-interactions

### 📧 Marketing (4 fichiers)

- [email-campaigns-guide.md](marketing/email-campaigns-guide.md) - **Guide principal**
- [FEATURE_CAMPAIGN_SUBSCRIPTIONS.md](marketing/FEATURE_CAMPAIGN_SUBSCRIPTIONS.md) - Abonnements
- [GUIDE_TEST_MODULE_MARKETING.md](marketing/GUIDE_TEST_MODULE_MARKETING.md) - Tests marketing
- [GUIDE_TEST_ABONNEMENTS.md](marketing/GUIDE_TEST_ABONNEMENTS.md) - Tests abonnements

### 📱 Mobile (2 fichiers)

- [PWA_GUIDE.md](mobile/PWA_GUIDE.md) - **Guide PWA complet**
- [MOBILE_OPTIMIZATION_SUMMARY.md](mobile/MOBILE_OPTIMIZATION_SUMMARY.md) - Résumé optimisation

### 📚 Guides (4 fichiers)

- [PERMISSIONS.md](guides/PERMISSIONS.md) - Gestion permissions
- [NOTIFICATIONS.md](guides/NOTIFICATIONS.md) - Système notifications
- [WEBHOOKS.md](guides/WEBHOOKS.md) - Configuration webhooks
- [TESTS.md](guides/TESTS.md) - Guide tests

---

## 🛠️ Stack Technique

**Backend**
- FastAPI (Python 3.12)
- PostgreSQL 15
- SQLAlchemy 2.0
- Celery + Redis
- Resend API

**Frontend**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- React Query (TanStack Query)
- next-pwa

**DevOps**
- Docker + Docker Compose
- Nginx
- Sentry
- Hetzner VPS

---

## 📊 État du Projet

**Backend** : ✅ 100% Production Ready
- 78 endpoints API opérationnels
- Authentification JWT complète
- Workflows automatisés
- Webhooks configurés

**Frontend** : ✅ 95% Production Ready
- Dashboard analytics complet
- Module marketing 100% fonctionnel
- PWA installable
- Exports multi-formats

---

## 🗄️ Archive

**20+ fichiers secondaires** archivés dans [archive/](archive/) pour référence :

**Analyses & Rapports**
- Analyses SonarQube (backend/frontend)
- Rapports debug et sessions
- Analyses marketing détaillées
- Plans d'action et TODO

**Guides Secondaires**
- Guides déploiement détaillés
- Documentation PWA avancée
- Guides monitoring/performance
- Checklist implementation

**Documentation Legacy**
- Historiques migrations
- Systèmes CNMV/CSSF/SDG
- Guides intégration obsolètes

---

## 🔗 Liens Utiles

- [README Principal](../README.md) - Vue d'ensemble projet
- [Checklist Tests Production](../CHECKLIST_TESTS_FRONTEND_PROD.md) - Tests frontend
- [Checklist Améliorations](../CHECKLIST_AMELIORATION_FUTURE.md) - Roadmap

---

**Dernière mise à jour** : 23 octobre 2025
