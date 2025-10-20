# Documentation CRM Alforis

> **Structure simplifiée** : Backend / Frontend / Guides

---

## 📂 Structure

```
documentation/
├── backend/          # API, BDD, workflows, endpoints
├── frontend/         # UI, hooks, composants
├── guides/           # Déploiement, Docker, configuration
└── archive/          # Anciennes docs (référence uniquement)
```

---

## 🚀 Démarrage rapide

```bash
# Installation
npm install
cd crm-backend && docker-compose up -d

# Base de données
python scripts/init_database.py

# Développement
npm run dev                    # Frontend (port 3000)
docker-compose logs -f api     # Backend logs
```

---

## 📖 Documentation

### Backend
- [API_ENDPOINTS.md](backend/API_ENDPOINTS.md) - 78 endpoints API
- [INIT_DATABASE.md](backend/INIT_DATABASE.md) - Setup base de données
- [WORKFLOWS.md](backend/WORKFLOWS.md) - Automatisations
- [IMPORTS.md](backend/IMPORTS.md) - Imports massifs
- [EXPORTS.md](backend/EXPORTS.md) - Exports CSV/Excel/PDF
- [RECHERCHE.md](backend/RECHERCHE.md) - Recherche full-text

### Frontend
- [FRONTEND_ENDPOINTS_HOOKS.md](frontend/FRONTEND_ENDPOINTS_HOOKS.md) - Hooks React Query
- [FRONTEND_TODO.md](frontend/FRONTEND_TODO.md) - Tâches en cours
- [ANALYSE_FRONTEND_EXISTANT.md](frontend/ANALYSE_FRONTEND_EXISTANT.md) - État actuel

### Guides
- [DEPLOIEMENT_PRODUCTION.md](guides/DEPLOIEMENT_PRODUCTION.md) - Déploiement
- [DOCKER_REGISTRY_MIRRORS.md](guides/DOCKER_REGISTRY_MIRRORS.md) - Config Docker
- [CHANGELOG_DEPLOYMENT.md](guides/CHANGELOG_DEPLOYMENT.md) - Historique

---

## 🛠️ Stack technique

**Backend**: FastAPI + PostgreSQL + SQLAlchemy + Celery + Redis
**Frontend**: Next.js 14 + TypeScript + Tailwind + React Query
**DevOps**: Docker + Nginx + Sentry

---

## 📊 État du projet

✅ Backend : 100% (78 endpoints opérationnels)
⚠️ Frontend : Partiel (voir [FRONTEND_TODO.md](frontend/FRONTEND_TODO.md))

---

## 🗄️ Archive

Les anciennes docs sont dans `archive/` - **ne plus utiliser** pour les nouveaux développements.

---

**Dernière mise à jour** : 2025-10-20
