# 🏦 CRM TPM Finance - Application de Gestion du Pipeline d'Investissement

Application CRM full-stack pour la gestion des investisseurs et du pipeline commercial.

## 📋 Table des Matières

- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation Rapide](#-installation-rapide-avec-docker)
- [Configuration](#️-configuration)
- [Utilisation](#-utilisation)
- [Développement](#-développement)
- [Production](#-production)
- [Structure du Projet](#-structure-du-projet)
- [API Documentation](#-api-documentation)
- [Dépannage](#-dépannage)

---

## 🚀 Technologies

### Backend
- **FastAPI** 0.104.1 - Framework web Python moderne
- **SQLAlchemy** 2.0.23 - ORM pour PostgreSQL
- **PostgreSQL** 16 - Base de données
- **JWT** - Authentification sécurisée
- **Uvicorn** - Serveur ASGI

### Frontend
- **Next.js** 14.2.33 - Framework React
- **TypeScript** 5.3.0 - Typage statique
- **Tailwind CSS** 3.3.0 - Styling
- **Zustand** 4.4.0 - Gestion d'état
- **React Hook Form** + **Zod** - Validation de formulaires
- **Recharts** - Graphiques et visualisations

### Infrastructure
- **Docker** + **Docker Compose** - Containerisation
- **PostgreSQL 16 Alpine** - Base de données en container

---

## 📦 Prérequis

- **Docker** >= 20.10
- **Docker Compose** >= 2.0
- **(Optionnel)** Node.js 20+ et Python 3.11+ pour développement local

---

## ⚡ Installation Rapide avec Docker

### 1️⃣ Cloner le projet

```bash
cd /path/to/project
```

### 2️⃣ Créer le fichier `.env`

```bash
cp .env.example .env
```

**Éditer `.env` et modifier au minimum :**

```env
# Sécurité - CHANGEZ CETTE VALEUR !
SECRET_KEY=VOTRE_CLE_SECRETE_FORTE

# Base de données
POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_SECURISE
```

💡 **Générer une clé secrète forte :**

```bash
openssl rand -hex 32
```

### 3️⃣ Lancer l'application

```bash
docker-compose up -d
```

**Attendez 1-2 minutes** que tous les services démarrent et passent les healthchecks.

### 4️⃣ Vérifier le statut

```bash
docker-compose ps
```

Tous les services doivent être `Up (healthy)` :

```
NAME            STATUS
crm-postgres    Up (healthy)
crm-api         Up (healthy)
crm-frontend    Up (healthy)
```

### 5️⃣ Accéder à l'application

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3010 | Interface utilisateur |
| **API** | http://localhost:8000 | API REST |
| **API Docs** | http://localhost:8000/docs | Documentation Swagger |
| **PostgreSQL** | localhost:5433 | Base de données |

---

## ⚙️ Configuration

### Variables d'Environnement

Toutes les variables sont dans [.env.example](.env.example). Principales variables :

#### Base de Données
```env
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=votre_password
POSTGRES_DB=crm_db
POSTGRES_EXTERNAL_PORT=5433
```

#### Backend API
```env
DEBUG=True                    # False en production
SECRET_KEY=votre_cle_secrete
ALLOWED_ORIGINS=http://localhost:3010,http://localhost:3000
API_PORT=8000
```

#### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
FRONTEND_PORT=3010
```

#### Sécurité JWT
```env
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
```

---

## 🎮 Utilisation

### Commandes Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Logs d'un service spécifique
docker-compose logs -f api
docker-compose logs -f frontend

# Arrêter les services
docker-compose down

# Arrêter ET supprimer les volumes (⚠️ PERTE DE DONNÉES)
docker-compose down -v

# Reconstruire les images
docker-compose build

# Reconstruire ET redémarrer
docker-compose up -d --build

# Redémarrer un service spécifique
docker-compose restart api
```

### Accès à la Base de Données

#### Depuis l'hôte
```bash
psql -h localhost -p 5433 -U crm_user -d crm_db
# Password: crm_password (ou votre .env)
```

#### Depuis un container
```bash
docker exec -it crm-postgres psql -U crm_user -d crm_db
```

### Exécuter des Commandes dans les Containers

```bash
# Backend - Shell Python
docker exec -it crm-api python

# Backend - Migrations Alembic
docker exec -it crm-api alembic upgrade head

# Frontend - Shell Node
docker exec -it crm-frontend sh

# Frontend - Installer une dépendance
docker exec -it crm-frontend npm install package-name
```

---

## 💻 Développement

### Mode Développement avec Docker

Le setup actuel est **optimisé pour le développement** :

✅ **Hot-reload activé** sur backend et frontend
✅ **Code synchronisé** en temps réel via volumes
✅ **Healthchecks** pour détecter les problèmes
✅ **Logs détaillés** pour le debugging

### Développement Local (Sans Docker)

#### Backend

```bash
cd crm-backend

# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Créer .env.local
cp .env.local.example .env.local

# Lancer le serveur
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
cd crm-frontend

# Installer les dépendances
npm install

# Créer .env.local
cp .env.local.example .env.local

# Lancer le serveur dev
npm run dev

# Ou avec nettoyage
npm run devc
```

### Tests

```bash
# Backend
cd crm-backend
pytest

# Frontend
cd crm-frontend
npm run test
npm run type-check
npm run lint
```

---

## 🏭 Production

### Build de Production

```bash
# Build des images de production
docker-compose -f docker-compose.prod.yml build

# Lancer en production
docker-compose -f docker-compose.prod.yml up -d
```

### Checklist Pré-Production

- [ ] Changer `SECRET_KEY` dans `.env`
- [ ] Mettre `DEBUG=False`
- [ ] Configurer des mots de passe forts
- [ ] Restreindre `ALLOWED_ORIGINS` aux domaines autorisés
- [ ] Activer HTTPS/SSL
- [ ] Configurer les backups PostgreSQL
- [ ] Mettre en place un reverse proxy (Nginx/Traefik)
- [ ] Configurer les logs persistants
- [ ] Mettre en place la surveillance (monitoring)

---

## 📁 Structure du Projet

```
.
├── crm-backend/              # Backend FastAPI
│   ├── main.py              # Point d'entrée
│   ├── core/                # Configuration, DB, sécurité
│   ├── models/              # Modèles SQLAlchemy
│   ├── schemas/             # Schémas Pydantic
│   ├── api/routes/          # Endpoints API
│   ├── services/            # Logique métier
│   ├── uploads/             # Fichiers uploadés
│   ├── backups/             # Sauvegardes DB
│   └── Dockerfile
│
├── crm-frontend/            # Frontend Next.js
│   ├── app/                 # Pages Next.js 14
│   ├── components/          # Composants React
│   ├── hooks/               # Hooks personnalisés
│   ├── lib/                 # Types, API client, utils
│   ├── services/            # Services API
│   ├── scripts/             # Scripts utilitaires
│   └── Dockerfile
│
├── docker-compose.yml       # Configuration Docker
├── .env                     # Variables d'environnement (gitignored)
├── .env.example             # Template de configuration
└── README.md                # Ce fichier
```

---

## 📖 API Documentation

### Endpoints Principaux

| Méthode | Endpoint | Description | Auth |
|---------|----------|-------------|------|
| `POST` | `/api/v1/auth/login` | Connexion utilisateur | ❌ |
| `GET` | `/api/v1/auth/me` | Profil utilisateur | ✅ |
| `GET` | `/api/v1/investors` | Liste des investisseurs | ✅ |
| `POST` | `/api/v1/investors` | Créer un investisseur | ✅ |
| `GET` | `/api/v1/investors/{id}` | Détails d'un investisseur | ✅ |
| `PUT` | `/api/v1/investors/{id}` | Modifier un investisseur | ✅ |
| `DELETE` | `/api/v1/investors/{id}` | Supprimer un investisseur | ✅ |
| `GET` | `/api/v1/interactions` | Liste des interactions | ✅ |
| `POST` | `/api/v1/interactions` | Logger une interaction | ✅ |
| `GET` | `/api/v1/kpis` | Liste des KPIs | ✅ |
| `POST` | `/api/v1/kpis` | Créer un KPI | ✅ |

### Documentation Interactive

- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc

### Authentification

L'API utilise **JWT Bearer Token** :

```bash
# 1. Connexion
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Réponse
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}

# 2. Utiliser le token
curl http://localhost:8000/api/v1/investors \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGc..."
```

---

## 🔧 Dépannage

### Problème : Les containers ne démarrent pas

```bash
# Vérifier les logs
docker-compose logs

# Rebuild complet
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Problème : Frontend ne se connecte pas à l'API

1. Vérifier que l'API est accessible :
```bash
curl http://localhost:8000/health
```

2. Vérifier `NEXT_PUBLIC_API_URL` dans `.env`

3. Vérifier les CORS dans le backend (`ALLOWED_ORIGINS`)

### Problème : Erreur de connexion PostgreSQL

```bash
# Vérifier que PostgreSQL est healthy
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres

# Test de connexion
docker exec -it crm-postgres pg_isready -U crm_user
```

### Problème : Port déjà utilisé

```bash
# Trouver le processus qui bloque le port
lsof -i :3010  # ou 8000, 5433

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans .env
FRONTEND_PORT=3011
```

### Problème : Hot-reload ne fonctionne pas

Le hot-reload fonctionne via les volumes Docker. Si les changements ne sont pas détectés :

```bash
# Redémarrer le service
docker-compose restart frontend
docker-compose restart api
```

### Nettoyer complètement Docker

```bash
# ⚠️ ATTENTION : Supprime TOUTES les données !
docker-compose down -v
docker system prune -a --volumes
```

---

## 📊 Modèle de Données

### Investor (Investisseur)
- `id`, `name`, `email`, `phone`, `website`, `company`
- `industry`, `pipeline_stage`, `client_type`
- Relations : `contacts[]`, `interactions[]`, `kpis[]`

### Contact
- `id`, `investor_id`, `name`, `email`, `phone`, `title`

### Interaction
- `id`, `investor_id`, `type`, `date`, `duration_minutes`
- `subject`, `notes`

### KPI (Key Performance Indicators)
- `id`, `investor_id`, `year`, `month`
- `rdv_count`, `pitchs`, `due_diligences`, `closings`
- `revenue`, `commission_rate`

---

## 🤝 Contribution

1. Créer une branche feature
```bash
git checkout -b feature/nouvelle-fonctionnalite
```

2. Faire vos modifications

3. Tester
```bash
docker-compose up -d --build
```

4. Commit et push
```bash
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

---

## 📝 License

Propriétaire - TPM Finance © 2024

---

## 📞 Support

Pour toute question ou problème :
- **Email** : support@tpmfinance.com
- **Documentation API** : http://localhost:8000/docs

---

**Fait avec ❤️ par l'équipe TPM Finance**
