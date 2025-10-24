# CRM Alforis Finance

**CRM moderne et complet pour la gestion de relations clients dans le secteur financier**

Version 1.0 - Production Ready

---

## Description

CRM Next-generation développé pour ALFORIS Finance, offrant une solution complète de gestion de contacts, organisations, campagnes marketing, workflows automatisés et agent IA.

### Fonctionnalités principales

- **Gestion Contacts & Organisations** : CRUD complet, recherche avancée, imports/exports
- **Module Marketing** : Campagnes email, templates, listes de diffusion, webhooks
- **Workflows automatisés** : Automatisations métier personnalisables
- **Agent IA** : Assistant intelligent pour analyse et suggestions
- **Dashboard Analytics** : Statistiques et KPIs en temps réel
- **PWA Mobile** : Application installable, mode hors ligne
- **Exports multi-formats** : CSV, Excel, PDF
- **RGPD Compliant** : Gestion des désabonnements et consentements

---

## Stack Technique

### Backend
- **Framework** : FastAPI (Python 3.12)
- **Base de données** : PostgreSQL 15
- **ORM** : SQLAlchemy 2.0
- **Cache** : Redis
- **Workers** : Celery
- **Email** : Resend API

### Frontend
- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **State** : React Query (TanStack Query)
- **Forms** : React Hook Form + Zod
- **PWA** : next-pwa

### DevOps
- **Conteneurisation** : Docker + Docker Compose
- **Reverse Proxy** : Nginx
- **Monitoring** : Sentry
- **CI/CD** : Scripts automatisés
- **Serveur** : Hetzner VPS

---

## Démarrage Rapide

### Prérequis

- Docker & Docker Compose
- Node.js 18+
- Python 3.12+

### Installation

```bash
# 1. Cloner le repository
git clone <repo-url>
cd V1

# 2. Démarrer les services backend
cd crm-backend
docker-compose up -d

# 3. Installer et démarrer le frontend
cd ../crm-frontend
npm install
npm run dev
```

L'application sera accessible à :
- Frontend : http://localhost:3000
- Backend API : http://localhost:8000
- API Docs : http://localhost:8000/docs

### Configuration

Variables d'environnement requises (voir `.env.example`) :

**Backend** :
- `DATABASE_URL` : Connexion PostgreSQL
- `REDIS_URL` : Connexion Redis
- `RESEND_API_KEY` : Clé API Resend
- `JWT_SECRET` : Secret JWT

**Frontend** :
- `NEXT_PUBLIC_API_URL` : URL de l'API backend

---

## Structure du Projet

```
V1/
├── crm-backend/          # API FastAPI
│   ├── api/              # Routes et endpoints
│   ├── models/           # Modèles SQLAlchemy
│   ├── services/         # Logique métier
│   ├── core/             # Configuration, auth, events
│   └── alembic/          # Migrations DB
│
├── crm-frontend/         # Application Next.js
│   ├── app/              # Pages (App Router)
│   ├── components/       # Composants React
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilitaires
│   └── public/           # Assets statiques
│
├── documentation/        # Documentation complète
│   ├── backend/          # Docs API et backend
│   ├── frontend/         # Docs UI et composants
│   ├── deployment/       # Guides de déploiement
│   ├── features/         # Documentation fonctionnalités
│   ├── marketing/        # Docs module marketing
│   ├── mobile/           # Docs PWA et mobile
│   └── guides/           # Guides utilisateurs
│
├── scripts/              # Scripts d'automatisation
└── data/                 # Données de référence
```

---

## Documentation

**30 fichiers essentiels** organisés dans [documentation/](documentation/)

### Guides Essentiels

**Démarrage**
- [Index complet](documentation/README.md) - Vue d'ensemble complète
- [Backend Setup](documentation/backend/INIT_DATABASE.md) - Installation BDD
- [Frontend Quick Start](documentation/frontend/QUICK_START.md) - Démarrage rapide

**Production**
- [Commandes déploiement](documentation/deployment/DEPLOY_COMMANDS.md) - **Guide principal**
- [Guide déploiement](documentation/deployment/README-DEPLOY.md) - Déploiement complet
- [PWA Mobile](documentation/mobile/PWA_GUIDE.md) - Application mobile

**Développement**
- [API Endpoints](documentation/backend/API_ENDPOINTS.md) - 78 endpoints
- [Hooks React](documentation/frontend/FRONTEND_ENDPOINTS_HOOKS.md) - Hooks React Query
- [Architecture Frontend](documentation/frontend/ARCHITECTURE.md) - Structure Next.js

### Par Thématique

- **Backend** (7 fichiers) - API, BDD, workflows, imports/exports
- **Frontend** (5 fichiers) - Architecture, hooks, composants
- **Déploiement** (3 fichiers) - Production, webhooks, commandes
- **Features** (4 fichiers) - IA, filtres, interactions
- **Marketing** (4 fichiers) - Campagnes email, abonnements
- **Mobile** (2 fichiers) - PWA, optimisation
- **Guides** (4 fichiers) - Permissions, notifications, tests

### Checklists Qualité

- [Tests Frontend Production](TESTS_FRONTEND.md) - 259/297 tests validés (87%)
- [Roadmap Améliorations](CHECKLIST_AMELIORATION_FUTURE.md) - Prochaines étapes

---

## Déploiement Production

Le déploiement est automatisé via le script `scripts/deploy.sh`

```bash
# Déploiement complet (recommandé)
./scripts/deploy.sh -v update

# Backend uniquement
./scripts/deploy.sh -v deploy-backend

# Frontend uniquement
./scripts/deploy.sh -v deploy-frontend

# Voir les logs
./scripts/deploy.sh logs
```

Plus de détails : [documentation/deployment/](documentation/deployment/)

---

## Tests

### Tests Backend

```bash
cd crm-backend
pytest
```

### Tests Frontend

```bash
cd crm-frontend
npm test
```

### Tests E2E

Voir la checklist complète : [CHECKLIST_TESTS_FRONTEND_PROD.md](CHECKLIST_TESTS_FRONTEND_PROD.md)

---

## État du Projet

**Backend** : Production Ready (100%)
- 78 endpoints API documentés
- Authentification JWT complète
- Webhooks Resend configurés
- Workflows automatisés opérationnels

**Frontend** : Production Ready (95%)
- 87% des tests frontend validés (259/297)
- Dashboard analytics complet
- Module marketing 100% fonctionnel
- PWA installable sur mobile
- Export multi-formats implémenté

**Prochaines améliorations** : [CHECKLIST_AMELIORATION_FUTURE.md](CHECKLIST_AMELIORATION_FUTURE.md)

---

## Contribution

Pour contribuer au projet :

1. Créer une branche feature : `git checkout -b feature/ma-feature`
2. Commiter les changements : `git commit -m "Description"`
3. Pousser la branche : `git push origin feature/ma-feature`
4. Créer une Pull Request

---

## Support & Contact

- Documentation : [documentation/](documentation/)
- Issues : Créer une issue GitHub
- Email : contact@alforis.com

---

## Licence

Propriétaire - ALFORIS Finance © 2025

Tous droits réservés. Ce projet est confidentiel et propriétaire.

---

**Dernière mise à jour** : 23 octobre 2025
