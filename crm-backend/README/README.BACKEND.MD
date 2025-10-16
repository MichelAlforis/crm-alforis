# TPM Finance CRM - Backend API

Système de gestion de relation client (CRM) propriétaire pour TPM Finance, spécialisé dans le pipeline commercial d'investisseurs/fournisseurs.

## 📋 Architecture

### Stack Technique
- **Backend**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 16
- **Containerization**: Docker & Docker Compose
- **ORM**: SQLAlchemy 2.0
- **Validation**: Pydantic v2

### Structure

```
crm-backend/
├── core/              # Configuration, DB, exceptions, security
├── models/            # SQLAlchemy models (Investor, Interaction, KPI)
├── schemas/           # Pydantic schemas pour validation/réponses
├── services/          # Logique métier (BaseService réutilisable)
├── api/
│   └── routes/        # Routes FastAPI (investors, interactions, kpis)
├── scripts/           # Scripts utilitaires (backup, restore)
├── main.py            # Application FastAPI
├── docker-compose.yml # Orchestration des services
└── Dockerfile         # Image Docker de l'API
```

## 🚀 Démarrage Rapide

### Prérequis
- Docker & Docker Compose
- Ou: Python 3.11+ & PostgreSQL 16

### Option 1: Avec Docker (Recommandé)

```bash
# Démarrer les services
docker-compose up -d

# Voir les logs
docker-compose logs -f api

# Accéder à l'API
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
# ReDoc: http://localhost:8000/redoc
```

### Option 2: Local (Développement)

```bash
# Créer un environnement virtuel
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Configurer l'environnement
cp .env.example .env
# Éditer .env avec vos paramètres

# Démarrer PostgreSQL
# (installer PostgreSQL ou utiliser Docker: docker run -d -p 5432:5432 postgres:16)

# Démarrer l'API
python main.py
```

## 📚 Architecture Ultra-Modulaire

### Philosophie Core: Zero Duplication

#### BaseService Générique
```python
# Tous les services héritent de BaseService
# CRUD génériques + méthodes réutilisables

class InvestorService(BaseService[Investor, InvestorCreate, InvestorUpdate]):
    async def get_by_pipeline_stage(self, stage):
        # Logique métier spécifique
```

#### Schemas Hérités
```python
# BaseSchema → TimestampedSchema → Modèles spécifiques
# Évite la redondance (timestamps, validation, config)
```

#### Routes Centralisées
```python
# api/__init__.py centralise tous les routeurs
# Une source unique de configuration
```

## 🔌 API Endpoints

### Investisseurs
```
GET    /api/v1/investors                    # Liste avec pagination
GET    /api/v1/investors/search?q=...       # Recherche
GET    /api/v1/investors/stats              # Statistiques
GET    /api/v1/investors/{id}               # Détails complets
POST   /api/v1/investors                    # Créer
PUT    /api/v1/investors/{id}               # Mettre à jour
PUT    /api/v1/investors/{id}/move-to-next-stage  # Pipeline
DELETE /api/v1/investors/{id}               # Supprimer
```

### Interactions
```
GET    /api/v1/interactions                 # Liste
GET    /api/v1/interactions/investor/{id}   # Par investisseur
POST   /api/v1/interactions/investor/{id}   # Créer
PUT    /api/v1/interactions/{id}            # Mettre à jour
DELETE /api/v1/interactions/{id}            # Supprimer
```

### KPIs
```
GET    /api/v1/kpis                         # Liste
GET    /api/v1/kpis/investor/{id}?year=... # Par investisseur
POST   /api/v1/kpis/investor/{id}           # Créer/Mettre à jour
GET    /api/v1/kpis/summary/month/{year}/{month}  # Résumé mensuel
GET    /api/v1/kpis/summary/annual/{id}/{year}    # Résumé annuel
```

## 🔐 Authentification

L'API utilise **JWT (Bearer tokens)** pour l'authentification.

```bash
# Exemple de requête authentifiée
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/v1/investors
```

**À implémenter**: Endpoint de login pour générer les tokens

## 💾 Base de Données

### Modèles Principaux

#### Investor
- `id`: Primary key
- `name`, `email`, `phone`, `website`
- `pipeline_stage`: prospect_froid → client
- `client_type`: CGPI, Wholesale, Institutionnel
- `is_active`, `created_at`, `updated_at`

#### Contact
- Lié à un Investor
- Informations du contact direct

#### Interaction
- Type: Appel, Email, Réunion, Webinaire
- Date, durée, notes
- Historique complet

#### KPI
- Mensuel par investisseur
- Métriques: RDV, pitchs, due diligences, closings
- Revenue tracking, commission rate

## 🔄 Sauvegarde & Restauration

### Sauvegarder
```bash
# Créer une sauvegarde
docker-compose exec postgres pg_dump -U crm_user crm_db | gzip > backup.sql.gz

# Ou avec le script
./scripts/backup.sh
```

### Restaurer
```bash
# Restaurer une sauvegarde
gunzip < backup.sql.gz | docker-compose exec -T postgres psql -U crm_user -d crm_db

# Ou avec le script
./scripts/restore.sh backup.sql.gz
```

## 🧪 Testing

```bash
# Accéder à Swagger UI interactif
# http://localhost:8000/docs

# Ou ReDoc
# http://localhost:8000/redoc
```

## 📝 Variables d'Environnement

```
DATABASE_URL=postgresql://user:pass@host/db
DATABASE_ECHO=False
DEBUG=True
SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## 🚢 Déploiement en Production

### Sur serveur loué

```bash
# 1. Cloner le projet
git clone ... crm-backend
cd crm-backend

# 2. Configurer l'environnement
cp .env.example .env
# Éditer .env avec configuration production

# 3. Démarrer avec Compose
docker-compose up -d

# 4. Mettre en place les backups automatiques
crontab -e
# Ajouter: 0 2 * * * /path/to/scripts/backup.sh
```

### Avec nginx (reverse proxy)

```nginx
server {
    listen 80;
    server_name crm.example.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📚 Phase 2 (Prochaines étapes)

- [ ] Système de rapports automatisés (PDF/Excel)
- [ ] Import/Export Excel
- [ ] Filtres avancés et recherche full-text
- [ ] Système de permissions granulaires
- [ ] Webhooks pour intégrations tierces
- [ ] Système de notifications
- [ ] Analytics et dashboards

## ✨ Points Clés de l'Architecture

✅ **Modulaire**: Chaque composant est indépendant et testable
✅ **Scalable**: BaseService + services métier extensibles
✅ **Maintenable**: Zero duplication, code centralisé
✅ **Type-safe**: Pydantic + SQLAlchemy
✅ **Performant**: Async/await, pooling DB
✅ **Sécurisé**: JWT, validation, exception handling

## 📞 Support

Pour les questions sur l'architecture ou l'implémentation, consultez:
- SQLAlchemy: https://docs.sqlalchemy.org/
- FastAPI: https://fastapi.tiangolo.com/
- Pydantic: https://docs.pydantic.dev/