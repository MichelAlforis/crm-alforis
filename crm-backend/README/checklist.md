# ✅ CRM Backend - Checklist de Vérification

## 📋 Phase 1 - Validation

### 📦 Structure des Fichiers
- [ ] `crm-backend/` dossier créé
- [ ] `core/` dossier avec tous les fichiers
- [ ] `models/` dossier avec tous les fichiers
- [ ] `schemas/` dossier avec tous les fichiers
- [ ] `services/` dossier avec tous les fichiers
- [ ] `api/routes/` dossier avec les 3 fichiers routes
- [ ] `scripts/` dossier avec backup.sh et restore.sh
- [ ] `main.py` à la racine
- [ ] `docker-compose.yml` à la racine
- [ ] `Dockerfile` à la racine
- [ ] `requirements.txt` à la racine
- [ ] `.env.example` à la racine
- [ ] `README.md` à la racine

### 🔧 Configuration
- [ ] `.env.example` contient toutes les variables nécessaires
- [ ] `requirements.txt` à jour avec toutes les dépendances
- [ ] `docker-compose.yml` correctement formaté
- [ ] `Dockerfile` contient les bonnes commandes

### 🐍 Code Python
- [ ] `core/config.py` : Settings singleton
- [ ] `core/database.py` : SessionLocal et get_db
- [ ] `core/exceptions.py` : Exceptions custom
- [ ] `core/security.py` : JWT + password hashing
- [ ] `models/base.py` : BaseModel avec timestamps
- [ ] `models/investor.py` : Tous les modèles
- [ ] `schemas/base.py` : BaseSchema et schemas génériques
- [ ] `services/base.py` : BaseService générique CRUD
- [ ] `services/investor.py` : InvestorService métier
- [ ] `services/interaction.py` : InteractionService métier
- [ ] `services/kpi.py` : KPIService métier
- [ ] `api/routes/investors.py` : Routes investisseurs
- [ ] `api/routes/interactions.py` : Routes interactions
- [ ] `api/routes/kpis.py` : Routes KPIs
- [ ] `api/__init__.py` : Centralisation des routeurs

### 📚 Documentation
- [ ] `README.md` complet
- [ ] `PHASE_1_SUMMARY.md` créé
- [ ] `API_EXAMPLES.md` avec exemples
- [ ] `ARCHITECTURE.md` avec diagrammes

---

## 🚀 Démarrage & Tests

### ✅ Lancer l'Application

#### Option 1: Docker Compose
```bash
cd crm-backend
docker-compose up -d
```

**Vérifier:**
- [ ] PostgreSQL démarre sans erreur
- [ ] API démarre sans erreur
- [ ] Pas de port conflict (8000, 5432)

#### Option 2: Local
```bash
cd crm-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Éditer .env pour pointer vers votre PostgreSQL
python main.py
```

### 🏥 Health Check

```bash
curl http://localhost:8000/health
```

**Résultat attendu:**
```json
{
  "status": "healthy",
  "database": true,
  "timestamp": "..."
}
```

- [ ] Status: "healthy"
- [ ] Database: true
- [ ] Réponse en JSON valide

### 📖 Documentation Interactive

Ouvrir dans votre navigateur:
- [ ] http://localhost:8000/docs (Swagger UI)
- [ ] http://localhost:8000/redoc (ReDoc)
- [ ] Voir les endpoints listés
- [ ] "Schemas" affiche les modèles

### 🧪 Test des Endpoints

#### 1. Investisseurs

```bash
# Créer
curl -X POST http://localhost:8000/api/v1/investors \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```
- [ ] Réponse 201 Created
- [ ] ID retourné
- [ ] Timestamps created_at et updated_at présents

```bash
# Lister
curl http://localhost:8000/api/v1/investors
```
- [ ] Réponse 200
- [ ] Structure PaginatedResponse correcte
- [ ] Items contient l'investisseur créé

```bash
# Rechercher
curl http://localhost:8000/api/v1/investors/search?q=Test
```
- [ ] Réponse 200
- [ ] Résultat trouvé

```bash
# Statistiques
curl http://localhost:8000/api/v1/investors/stats
```
- [ ] Réponse 200
- [ ] Contient total_count, by_pipeline_stage, by_client_type

#### 2. Interactions

```bash
# Créer
curl -X POST http://localhost:8000/api/v1/interactions/investor/1 \
  -H "Content-Type: application/json" \
  -d '{"type":"appel","date":"2024-10-15","duration_minutes":30}'
```
- [ ] Réponse 201 Created
- [ ] investor_id correct

```bash
# Lister pour un investisseur
curl http://localhost:8000/api/v1/interactions/investor/1
```
- [ ] Réponse 200
- [ ] Interactions listées

#### 3. KPIs

```bash
# Créer/Mettre à jour
curl -X POST "http://localhost:8000/api/v1/kpis/investor/1?year=2024&month=10" \
  -H "Content-Type: application/json" \
  -d '{"rdv_count":5,"pitchs":2}'
```
- [ ] Réponse 201 ou 200
- [ ] KPI créé/mis à jour

```bash
# Résumé mensuel
curl http://localhost:8000/api/v1/kpis/summary/month/2024/10
```
- [ ] Réponse 200
- [ ] Métriques agrégées

### 🗄️ Vérifier la Base de Données

```bash
docker-compose exec postgres psql -U crm_user -d crm_db
```

**Dans psql:**
```sql
\dt              -- Voir toutes les tables
SELECT * FROM investors;
SELECT * FROM interactions;
SELECT * FROM kpis;
```

- [ ] 4 tables créées : investors, contacts, interactions, kpis
- [ ] Données présentes (investisseur créé, interaction, KPI)
- [ ] Colonnes correctes

### 📊 Tester le Flow Complet

```bash
# 1. Créer investisseur
INVESTOR=$(curl -s -X POST http://localhost:8000/api/v1/investors \
  -H "Content-Type: application/json" \
  -d '{"name":"Flow Test","email":"flow@test.com"}' | jq '.id')

# 2. Créer interaction
curl -s -X POST http://localhost:8000/api/v1/interactions/investor/$INVESTOR \
  -H "Content-Type: application/json" \
  -d '{"type":"appel","date":"2024-10-15"}'

# 3. Créer KPI
curl -s -X POST http://localhost:8000/api/v1/kpis/investor/$INVESTOR?year=2024&month=10 \
  -H "Content-Type: application/json" \
  -d '{"rdv_count":1}'

# 4. Obtenir les stats
curl -s http://localhost:8000/api/v1/investors/stats | jq .

# 5. Obtenir les résumés
curl -s http://localhost:8000/api/v1/interactions/investor/$INVESTOR/summary

echo "✅ Flow complet exécuté!"
```

- [ ] Tous les appels réussissent
- [ ] Pas d'erreur 500
- [ ] Données cohérentes

---

## 🐛 Dépannage

### ❌ "Connection refused on port 8000"
```bash
# Vérifier que l'API est lancée
docker-compose ps
# ou
lsof -i :8000
```
- [ ] Container API est "Up"

### ❌ "Database connection failed"
```bash
# Vérifier PostgreSQL
docker-compose logs postgres
# Vérifier la connection string
cat .env | grep DATABASE_URL
```
- [ ] Service postgres est "Up"
- [ ] DATABASE_URL est correct

### ❌ "ModuleNotFoundError"
```bash
# Vérifier les imports
python -c "from main import app; print('OK')"
# Réinstaller dépendances
pip install -r requirements.txt
```
- [ ] Tous les imports réussissent

### ❌ "Port already in use"
```bash
# Voir qui utilise le port
lsof -i :8000
# Ou changer le port dans docker-compose.yml
```

### ❌ Erreur dans les logs
```bash
docker-compose logs -f api
# Chercher les lignes avec ERROR
```
- [ ] Logs analysés
- [ ] Erreur comprendre et corrigée

---

## 🎯 Production Readiness Checklist

- [ ] `.env` configuré avec secrets sécurisés
- [ ] DEBUG=False en production
- [ ] SECRET_KEY changé (pas la valeur par défaut)
- [ ] ALLOWED_ORIGINS configuré pour votre domaine
- [ ] Database backups configurés
- [ ] Logs centralisés (optional)
- [ ] Health check configuré dans le loadbalancer
- [ ] Rate limiting en place (optional)
- [ ] Monitoring actif (optional)

---

## 🚢 Avant de Passer à Phase 2

### ✅ Code Quality
- [ ] Pas d'imports inutilisés
- [ ] Noms de variables cohérents
- [ ] Docstrings présentes
- [ ] Pas de code commenté ("dead code")
- [ ] Erreurs gérées proprement

### ✅ Tests Manuels
- [ ] Tous les endpoints testés
- [ ] Créer → Lire → Mettre à jour → Supprimer (CRUD)
- [ ] Cas d'erreur testés
- [ ] Validations fonctionnent

### ✅ Documentation
- [ ] README.md à jour
- [ ] API examples complets
- [ ] Architecture documentée
- [ ] Deployment guide clear

### ✅ Performance
- [ ] Pas de timeouts
- [ ] Pas de memory leaks
- [ ] Requêtes rapides (<100ms)
- [ ] Pagination fonctionne

---

## ✨ Félicitations!

Si toutes les cases sont cochées, vous êtes **Phase 1 COMPLET**! 🎉

**Vous avez:**
✅ Backend production-ready
✅ API complètement fonctionnelle
✅ Zero duplication
✅ Architecture ultra-modulaire
✅ Docker setup
✅ Documentation complète

**Prochaine étape:** Phase 2 - Frontend React + intégrations

Prêt à continuer? 🚀
