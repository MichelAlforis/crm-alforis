# 📚 Documentation CRM Alforis

> **Version**: 1.0 (Architecture Unifiée)
> **Date**: Octobre 2024
> **Statut**: Production Ready

---

## 🚀 Démarrage Rapide

### Pour les Développeurs

1. **Backend API** → Consultez [api/API_ENDPOINTS.md](api/API_ENDPOINTS.md)
2. **Frontend** → Consultez [frontend/QUICK_START.md](frontend/QUICK_START.md)
3. **Base de données** → Consultez [api/INIT_DATABASE.md](api/INIT_DATABASE.md)

### Pour les Utilisateurs

- **Guide utilisateur** → (À venir)
- **FAQ** → (À venir)

---

## 📂 Organisation de la Documentation

```
documentation/
├── README.md                      # ← Vous êtes ici
├── FRONTEND_TODO.md               # Liste des features frontend à implémenter
├── ANALYSE_REORGANISATION.md      # Analyse de la réorganisation
│
├── api/                           # 📘 Documentation API & Backend
│   ├── API_ENDPOINTS.md           # Documentation complète des 78 endpoints
│   ├── EXPORTS.md                 # Système d'exports (CSV, Excel, PDF)
│   ├── IMPORTS.md                 # Imports massifs (bulk operations)
│   ├── RECHERCHE.md               # Recherche full-text
│   ├── WORKFLOWS.md               # Workflows automatisés
│   └── INIT_DATABASE.md           # Initialisation base de données
│
├── frontend/                      # 🎨 Documentation Frontend
│   ├── QUICK_START.md             # Guide démarrage rapide
│   ├── ARCHITECTURE.md            # Architecture frontend
│   ├── STRUCTURE.md               # Organisation du code
│   ├── IMPLEMENTATION_STATUS.md   # État d'implémentation
│   └── PRODUCTION_DEPLOY.md       # Déploiement production
│
├── guides/                        # 📚 Guides Thématiques
│   ├── MONITORING.md              # Monitoring & observabilité
│   ├── NOTIFICATIONS.md           # Système de notifications
│   ├── PERFORMANCE.md             # Optimisations & performance
│   ├── PERMISSIONS.md             # RBAC & gestion permissions
│   ├── TESTS.md                   # Tests automatisés
│   ├── WEBHOOKS.md                # Webhooks
│   └── PRODUCTION_QUICKSTART.md   # Déploiement rapide
│
├── backend/                       # 🔧 Backend Technique
│   ├── checklist.md               # Checklist production backend
│   └── api/
│       ├── README.md              # Vue d'ensemble API
│       └── IMPORTS_USAGE.md       # Usage imports massifs
│
└── archive/                       # 🗃️ Archives
    └── MIGRATION_HISTORY_2024-10.md  # Historique migration Oct 2024
```

---

## 🎯 Architecture CRM

### Modèle de Données Unifié

```
Organisation (Entreprise)
    ├── People (Personnes physiques)
    │   └── PersonOrganisationLink (Rôle, email pro)
    ├── Mandats (Contrats distribution)
    │   └── Produits (Fonds, OPCVM, etc.)
    ├── Tasks (Tâches)
    ├── Activities (Timeline événements)
    └── Documents

Système d'Automation
    ├── Workflows (Déclencheurs + Actions)
    ├── Email Campaigns (A/B testing)
    ├── Webhooks (Intégrations externes)
    └── Notifications (Temps réel)
```

### Technologies

**Backend**:
- Python 3.12+ (FastAPI)
- PostgreSQL 15 (26 tables)
- SQLAlchemy 2.0 (ORM)
- Celery (Tasks asynchrones)
- Redis (Cache & broker)

**Frontend**:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query (State management)

**DevOps**:
- Docker & Docker Compose
- Nginx (Reverse proxy)
- Sentry (Monitoring erreurs)

---

## 📊 État du Projet

### ✅ Fonctionnalités Disponibles (Backend 100%)

| Feature | Status | Documentation |
|---------|--------|---------------|
| **API REST** | ✅ 78 endpoints | [api/API_ENDPOINTS.md](api/API_ENDPOINTS.md) |
| **Organisations** | ✅ CRUD + Stats | [api/API_ENDPOINTS.md#organisations](api/API_ENDPOINTS.md#-organisations) |
| **Personnes** | ✅ CRUD + Liens | [api/API_ENDPOINTS.md#personnes](api/API_ENDPOINTS.md#-personnes) |
| **Tâches** | ✅ CRUD + Quick actions | [api/API_ENDPOINTS.md#tâches](api/API_ENDPOINTS.md#-tâches) |
| **Mandats** | ✅ CRUD + Actifs | [api/API_ENDPOINTS.md#mandats](api/API_ENDPOINTS.md#-mandats-de-distribution) |
| **Recherche** | ✅ Full-text | [api/RECHERCHE.md](api/RECHERCHE.md) |
| **Imports** | ✅ Bulk operations | [api/IMPORTS.md](api/IMPORTS.md) |
| **Exports** | ✅ CSV/Excel/PDF | [api/EXPORTS.md](api/EXPORTS.md) |
| **Workflows** | ✅ Automatisés | [api/WORKFLOWS.md](api/WORKFLOWS.md) |
| **Webhooks** | ✅ Intégrations | [guides/WEBHOOKS.md](guides/WEBHOOKS.md) |
| **Email Campaigns** | ✅ A/B testing | [api/API_ENDPOINTS.md#email-automation](api/API_ENDPOINTS.md#-email-automation) |
| **Dashboards** | ✅ Stats & KPIs | [api/API_ENDPOINTS.md#dashboards](api/API_ENDPOINTS.md#-dashboards--statistiques) |

### ⚠️ Fonctionnalités Frontend (Partielles)

| Feature | Status | Notes |
|---------|--------|-------|
| **Forms Organisations** | ❌ À implémenter | Voir [FRONTEND_TODO.md](FRONTEND_TODO.md) |
| **Forms Mandats** | ❌ À implémenter | Priorité 1 |
| **Forms Produits** | ❌ À implémenter | Priorité 1 |
| **Timeline Activité** | ⚠️ Partiel | Améliorer UX |
| **Recherche Globale** | ⚠️ Partiel | Ajouter autocomplete |
| **Stats Dashboard** | ⚠️ Partiel | Ajouter charts |
| **Workflows UI** | ❌ À implémenter | Priorité 3 |
| **Webhooks UI** | ❌ À implémenter | Priorité 3 |

**Détails**: Voir [FRONTEND_TODO.md](FRONTEND_TODO.md) pour estimation efforts (~51h)

---

## 🔧 Guides Techniques

### Pour les Développeurs Backend

- **[api/API_ENDPOINTS.md](api/API_ENDPOINTS.md)** - Référence complète API (78 endpoints)
- **[api/INIT_DATABASE.md](api/INIT_DATABASE.md)** - Initialiser la base de données
- **[backend/checklist.md](backend/checklist.md)** - Checklist avant mise en production
- **[guides/TESTS.md](guides/TESTS.md)** - Tests automatisés (pytest, coverage)

### Pour les Développeurs Frontend

- **[frontend/QUICK_START.md](frontend/QUICK_START.md)** - Démarrage rapide (5 min)
- **[frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md)** - Architecture & patterns
- **[frontend/STRUCTURE.md](frontend/STRUCTURE.md)** - Organisation du code
- **[FRONTEND_TODO.md](FRONTEND_TODO.md)** - Features à implémenter

### Pour les DevOps

- **[guides/PRODUCTION_QUICKSTART.md](guides/PRODUCTION_QUICKSTART.md)** - Déploiement rapide
- **[guides/MONITORING.md](guides/MONITORING.md)** - Monitoring & logs (Sentry, etc.)
- **[guides/PERFORMANCE.md](guides/PERFORMANCE.md)** - Optimisations & caching

### Guides Avancés

- **[guides/PERMISSIONS.md](guides/PERMISSIONS.md)** - RBAC & contrôle d'accès
- **[guides/NOTIFICATIONS.md](guides/NOTIFICATIONS.md)** - Système notifications
- **[guides/WEBHOOKS.md](guides/WEBHOOKS.md)** - Intégrations webhooks
- **[api/WORKFLOWS.md](api/WORKFLOWS.md)** - Workflows automatisés
- **[api/EXPORTS.md](api/EXPORTS.md)** - Exports avancés
- **[api/RECHERCHE.md](api/RECHERCHE.md)** - Recherche full-text

---

## 📖 Référence Rapide

### Commandes Utiles

```bash
# Backend
cd crm-backend
docker-compose up -d              # Démarrer services
docker-compose logs -f api        # Voir logs API
python scripts/init_database.py   # Initialiser DB
pytest tests/                     # Lancer tests

# Frontend
cd crm-frontend
npm run dev                       # Dev server (port 3000)
npm run build                     # Build production
npm run type-check                # Vérifier types TypeScript

# Base de données
psql -h localhost -p 5433 -U crm_user -d crm_db  # Connexion PostgreSQL
```

### Endpoints Principaux

```bash
# Health check
curl http://localhost:8000/api/v1/health

# Authentification
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Organisations
curl http://localhost:8000/api/v1/organisations \
  -H "Authorization: Bearer {token}"

# Recherche
curl "http://localhost:8000/api/v1/search/organisations?q=alforis" \
  -H "Authorization: Bearer {token}"
```

---

## 🆘 Support & Contribution

### Besoin d'Aide ?

1. Consultez la doc spécifique dans les sous-dossiers
2. Vérifiez [FRONTEND_TODO.md](FRONTEND_TODO.md) pour les features à venir
3. Consultez [archive/MIGRATION_HISTORY_2024-10.md](archive/MIGRATION_HISTORY_2024-10.md) pour l'historique

### Contribuer

1. Lire la documentation appropriée
2. Suivre les patterns existants
3. Ajouter tests si nécessaire
4. Mettre à jour la documentation

---

## 📜 Historique

- **20 Oct 2024**: Réorganisation documentation, suppression obsolète, création archives
- **19 Oct 2024**: Fresh start database, migration complète vers architecture unifiée
- **18 Oct 2024**: Implémentation workflows, email campaigns, webhooks
- **17 Oct 2024**: Recherche full-text, exports, imports massifs

Voir [archive/MIGRATION_HISTORY_2024-10.md](archive/MIGRATION_HISTORY_2024-10.md) pour détails complets.

---

**Dernière mise à jour**: 20 Octobre 2024
**Mainteneur**: Équipe Alforis Finance
**Licence**: Propriétaire
