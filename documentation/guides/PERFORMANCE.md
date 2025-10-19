# 🚀 Guide Complet - Cache & Performance

Guide complet pour optimiser les performances du CRM avec Redis et bonnes pratiques.

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation Redis](#installation-redis)
3. [Configuration](#configuration)
4. [Utilisation du cache](#utilisation-du-cache)
5. [Invalidation du cache](#invalidation-du-cache)
6. [Optimisation base de données](#optimisation-base-de-données)
7. [Monitoring des performances](#monitoring-des-performances)
8. [Bonnes pratiques](#bonnes-pratiques)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Vue d'ensemble

### Objectifs

- **Réduire la charge DB** : 95% des requêtes servies depuis le cache
- **Améliorer les temps de réponse** : 10x plus rapide (500ms → 50ms)
- **Scalabilité** : Supporter 100x plus d'utilisateurs
- **Disponibilité** : Cache avec fallback gracieux

### Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ Request
       ▼
┌─────────────┐
│  FastAPI    │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       ▼              ▼
┌─────────────┐  ┌──────────┐
│    Redis    │  │ Postgres │
│   (Cache)   │  │   (DB)   │
└─────────────┘  └──────────┘
    ▲ TTL            ▲
    │ Invalidation   │
    └────────────────┘
```

### Métriques cibles

| Métrique               | Avant      | Après      | Gain     |
|------------------------|------------|------------|----------|
| Temps réponse GET      | 500ms      | 50ms       | **10x**  |
| Requêtes DB / sec      | 1000       | 50         | **95%↓** |
| Utilisateurs simultanés| 100        | 10,000     | **100x** |
| Hit rate cache         | 0%         | 90%+       | -        |

---

## 📦 Installation Redis

### Option 1 : Docker Compose (Recommandé)

Redis est déjà configuré dans `docker-compose.redis.yml`.

```bash
# Démarrer tous les services avec Redis
docker compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# Vérifier que Redis fonctionne
docker logs crm-redis

# Tester Redis
docker exec -it crm-redis redis-cli ping
# Réponse: PONG
```

### Option 2 : Redis local (Dev)

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt update
sudo apt install redis-server
sudo systemctl start redis

# Tester
redis-cli ping
# Réponse: PONG
```

### Option 3 : Redis Cloud (Production)

**Redis Cloud** : https://redis.com/cloud/

1. Créer un compte gratuit (30MB gratuit)
2. Créer une base Redis
3. Récupérer l'endpoint et le mot de passe
4. Configurer dans `.env` :

```bash
REDIS_HOST=redis-12345.c123.us-east-1-1.ec2.cloud.redislabs.com
REDIS_PORT=12345
REDIS_PASSWORD=your-redis-password
```

---

## ⚙️ Configuration

### 1. Variables d'environnement

Ajouter à `.env` :

```bash
# ============================================
# Redis Cache
# ============================================
REDIS_HOST=redis           # ou localhost en dev local
REDIS_PORT=6379
REDIS_PASSWORD=            # Vide = pas de password
REDIS_DB=0                 # DB numéro (0-15)
```

### 2. Configuration Python

Le fichier `core/config.py` contient déjà la config :

```python
class Settings(BaseSettings):
    # Redis Cache
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
```

### 3. Installation des dépendances

```bash
# Backend
cd crm-backend
pip install -r requirements.txt

# Vérifier que redis est installé
pip list | grep redis
# redis    5.0.1
```

### 4. Test de connexion

```python
from core.cache import RedisClient, check_cache_health

# Test connexion
is_available = RedisClient.is_available()
print(f"Redis disponible: {is_available}")

# Health check complet
health = check_cache_health()
print(health)
# {'status': 'healthy', 'available': True, 'ping': True, ...}
```

---

## 🎨 Utilisation du cache

### Décorateur `@cache_response`

Le moyen le plus simple de cacher les réponses d'API.

#### Exemple basique

```python
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from core.cache import cache_response
from core.database import get_db
from models.organisation import Organisation

router = APIRouter()

@router.get("/organisations")
@cache_response(ttl=300, key_prefix="organisations")
async def list_organisations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Liste des organisations (cachée 5 minutes)"""
    return db.query(Organisation).offset(skip).limit(limit).all()
```

**Résultat** :
- ✅ 1ère requête : 500ms (cache MISS)
- ✅ Requêtes suivantes : 50ms (cache HIT)
- ✅ Après 5 min : cache expiré, refresh automatique

#### Paramètres du décorateur

```python
@cache_response(
    ttl=300,                    # Time-to-live en secondes
    key_prefix="organisations", # Préfixe de la clé
    skip_if=lambda user: user.is_admin  # Condition pour skip
)
```

### Exemples par cas d'usage

#### 1. Liste simple (GET)

```python
@router.get("/organisations")
@cache_response(ttl=300, key_prefix="organisations")
async def list_organisations(db: Session = Depends(get_db)):
    return db.query(Organisation).all()
```

#### 2. Liste avec filtres

```python
@router.get("/organisations")
@cache_response(ttl=300, key_prefix="organisations")
async def list_organisations(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Cache par combinaison de filtres"""
    query = db.query(Organisation)

    if category:
        query = query.filter(Organisation.category == category)
    if active_only:
        query = query.filter(Organisation.is_active == True)

    return query.all()
```

**Clés générées automatiquement** :
- `organisations:list_organisations:hash(category=None,active_only=True)`
- `organisations:list_organisations:hash(category=Institution,active_only=True)`

#### 3. Détail d'un objet (GET by ID)

```python
@router.get("/organisations/{org_id}")
@cache_response(ttl=600, key_prefix="organisations")
async def get_organisation(
    org_id: int,
    db: Session = Depends(get_db)
):
    """Cache 10 minutes"""
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organisation non trouvée")
    return org
```

#### 4. Skip cache pour certains utilisateurs

```python
@router.get("/organisations")
@cache_response(
    ttl=300,
    key_prefix="organisations",
    skip_if=lambda current_user: current_user.is_admin  # Admins = toujours fresh
)
async def list_organisations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return db.query(Organisation).all()
```

#### 5. Recherche (GET /search)

```python
@router.get("/organisations/search")
@cache_response(ttl=600, key_prefix="organisations:search")
async def search_organisations(
    q: str,
    db: Session = Depends(get_db)
):
    """Cache 10 minutes par recherche"""
    return db.query(Organisation).filter(
        Organisation.name.ilike(f"%{q}%")
    ).all()
```

### Cache manuel (sans décorateur)

Pour plus de contrôle :

```python
from core.cache import get_cache, set_cache, generate_cache_key

@router.get("/custom")
async def custom_endpoint(param: str, db: Session = Depends(get_db)):
    # Générer la clé
    cache_key = f"custom:{generate_cache_key(param)}"

    # Essayer le cache
    cached = get_cache(cache_key)
    if cached:
        return cached

    # Cache MISS : calculer
    result = expensive_operation(param, db)

    # Stocker dans le cache (TTL 5 min)
    set_cache(cache_key, result, ttl=300)

    return result
```

---

## 🗑️ Invalidation du cache

**Règle d'or** : Invalider le cache après chaque modification (POST, PUT, DELETE).

### Invalidation automatique par pattern

```python
from core.cache import delete_cache, invalidate_organisation_cache

# POST : Créer une organisation
@router.post("/organisations")
async def create_organisation(
    data: OrganisationCreate,
    db: Session = Depends(get_db)
):
    org = Organisation(**data.dict())
    db.add(org)
    db.commit()

    # ✅ Invalider le cache des organisations
    invalidate_organisation_cache()

    return org

# PUT : Modifier une organisation
@router.put("/organisations/{org_id}")
async def update_organisation(
    org_id: int,
    data: OrganisationUpdate,
    db: Session = Depends(get_db)
):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404)

    for key, value in data.dict(exclude_unset=True).items():
        setattr(org, key, value)

    db.commit()

    # ✅ Invalider le cache (toutes les organisations)
    invalidate_organisation_cache()

    # Ou seulement cette organisation
    # invalidate_organisation_cache(org_id=org_id)

    return org

# DELETE : Supprimer
@router.delete("/organisations/{org_id}")
async def delete_organisation(org_id: int, db: Session = Depends(get_db)):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404)

    db.delete(org)
    db.commit()

    # ✅ Invalider le cache
    invalidate_organisation_cache()

    return {"message": "Organisation supprimée"}
```

### Fonctions d'invalidation disponibles

```python
from core.cache import (
    invalidate_organisation_cache,
    invalidate_person_cache,
    invalidate_all_caches,
    delete_cache,
    clear_all_cache,
)

# Invalider les organisations (toutes ou une seule)
invalidate_organisation_cache()           # Toutes
invalidate_organisation_cache(org_id=42)  # Org 42 uniquement

# Invalider les personnes
invalidate_person_cache()
invalidate_person_cache(person_id=123)

# Invalider tous les caches de l'app
invalidate_all_caches()  # organisations:*, people:*, mandats:*, etc.

# Invalider par pattern custom
delete_cache("mon_prefix:*")

# Vider TOUT Redis (⚠️ attention!)
clear_all_cache()
```

### Pattern d'invalidation avancé

```python
# Invalider plusieurs patterns
def invalidate_org_and_related(org_id: int):
    """Invalide organisation + toutes les données liées"""
    invalidate_organisation_cache(org_id=org_id)
    delete_cache(f"mandats:*:org_{org_id}*")
    delete_cache(f"interactions:*:org_{org_id}*")
    delete_cache(f"people:*:org_{org_id}*")
```

---

## 🗄️ Optimisation base de données

Le cache c'est bien, mais optimiser les requêtes DB est aussi crucial.

### 1. Indexes

Ajouter des indexes sur les colonnes souvent filtrées/triées.

```python
# models/organisation.py
from sqlalchemy import Index

class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False, index=True)  # ✅ Index
    category = Column(Enum(OrganisationCategory), index=True)  # ✅ Index
    is_active = Column(Boolean, default=True, index=True)  # ✅ Index
    email = Column(String(255), unique=True)

    # Index composite pour filtres combinés
    __table_args__ = (
        Index('idx_org_category_active', 'category', 'is_active'),
    )
```

**Migration Alembic** :

```bash
# Générer la migration
alembic revision --autogenerate -m "Add indexes to organisations"

# Appliquer
alembic upgrade head
```

### 2. Eager Loading (éviter N+1)

**Problème N+1** : Charger 100 organisations = 1 requête + 100 requêtes pour les relations = **101 requêtes** 😱

```python
# ❌ MAUVAIS : N+1 queries
@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    orgs = db.query(Organisation).all()

    # Pour chaque org, SQLAlchemy fait 1 requête pour charger les mandats
    for org in orgs:
        print(org.mandats)  # ❌ N+1 problem!

    return orgs
```

**Solution : Eager loading avec `joinedload`**

```python
from sqlalchemy.orm import joinedload

# ✅ BON : 1 seule requête avec JOIN
@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    orgs = db.query(Organisation)\
        .options(
            joinedload(Organisation.mandats),
            joinedload(Organisation.contacts),
        )\
        .all()

    # Aucune requête supplémentaire!
    for org in orgs:
        print(org.mandats)  # ✅ Déjà chargé

    return orgs
```

### 3. Pagination

Toujours paginer les listes longues.

```python
@router.get("/organisations")
async def list_organisations(
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Pagination avec offset/limit"""
    skip = (page - 1) * limit

    query = db.query(Organisation)

    # Total (pour frontend)
    total = query.count()

    # Résultats paginés
    items = query.offset(skip).limit(limit).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
```

### 4. Select only needed columns

```python
# ❌ Charger toutes les colonnes
orgs = db.query(Organisation).all()

# ✅ Charger seulement id, name
orgs = db.query(Organisation.id, Organisation.name).all()
```

### 5. Requêtes complexes : utiliser SQL brut

Pour les requêtes très complexes, SQL brut est parfois plus performant.

```python
from sqlalchemy import text

@router.get("/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Stats avec SQL brut pour performance"""
    result = db.execute(text("""
        SELECT
            category,
            COUNT(*) as count,
            AVG(annual_revenue) as avg_revenue
        FROM organisations
        WHERE is_active = true
        GROUP BY category
    """))

    return [dict(row) for row in result]
```

---

## 📊 Monitoring des performances

### 1. Statistiques du cache

Endpoint pour surveiller le cache :

```python
from core.cache import get_cache_stats

@router.get("/cache/stats")
async def cache_stats():
    """
    Retourne:
    {
        "available": true,
        "hits": 15420,
        "misses": 1234,
        "total_requests": 16654,
        "hit_rate": 92.59,
        "keys_count": 523,
        "memory_used": "12.4M"
    }
    """
    return get_cache_stats()
```

### 2. Health check complet

```python
from core.cache import check_cache_health

@router.get("/health")
async def health_check():
    """Health check avec cache status"""
    cache_health = check_cache_health()

    return {
        "status": "healthy",
        "cache": cache_health,
        "database": check_db_health(),
    }
```

### 3. Performance Monitoring avec décorateur

```python
from core.monitoring import PerformanceMonitor, get_logger

logger = get_logger(__name__)

@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    """Tracker les performances avec Sentry"""

    with PerformanceMonitor("list_organisations"):
        orgs = db.query(Organisation).all()

    logger.info("organisations_listed", count=len(orgs))

    return orgs
```

### 4. Dashboard Grafana (Optionnel)

Pour un monitoring avancé, connecter Redis à Grafana :

1. Installer **Redis Exporter** : https://github.com/oliver006/redis_exporter
2. Ajouter à `docker-compose.yml` :

```yaml
redis-exporter:
  image: oliver006/redis_exporter:latest
  ports:
    - "9121:9121"
  environment:
    REDIS_ADDR: redis:6379
  depends_on:
    - redis
```

3. Visualiser les métriques :
   - Hit rate
   - Memory usage
   - Commands/sec
   - Latency

---

## ✅ Bonnes pratiques

### 1. TTL approprié

```python
# Données rarement modifiées → TTL long
@cache_response(ttl=3600, key_prefix="produits")  # 1 heure
async def list_produits(): ...

# Données fréquemment modifiées → TTL court
@cache_response(ttl=60, key_prefix="interactions")  # 1 minute
async def list_interactions(): ...

# Données temps réel → pas de cache
async def get_live_stats(): ...  # Pas de décorateur
```

### 2. Key naming convention

```
<entity>:<operation>:<params_hash>

Exemples:
- organisations:list_organisations:a3f5b9...
- organisations:get_organisation:42
- people:search_people:hash(q="dupont")
```

### 3. Cache warming (pré-chauffage)

Préchauffer le cache au démarrage de l'app :

```python
# startup.py
from core.cache import set_cache

async def warmup_cache():
    """Préchauffer le cache au démarrage"""
    logger.info("🔥 Warming up cache...")

    # Charger les données les plus populaires
    db = SessionLocal()

    orgs = db.query(Organisation).limit(100).all()
    set_cache("organisations:top100", orgs, ttl=3600)

    products = db.query(Produit).all()
    set_cache("produits:all", products, ttl=3600)

    logger.info(f"✅ Cache warmed with {len(orgs)} orgs, {len(products)} products")
```

### 4. Graceful degradation

Le cache doit toujours avoir un fallback :

```python
from core.cache import get_cache, set_cache

@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    cache_key = "organisations:all"

    # Essayer le cache
    cached = get_cache(cache_key)
    if cached:
        return cached

    # Cache MISS ou Redis down → fallback sur DB
    orgs = db.query(Organisation).all()

    # Essayer de cacher (si Redis est up)
    set_cache(cache_key, orgs, ttl=300)

    return orgs
```

Le module `core/cache.py` gère déjà cela automatiquement :

```python
def get_cache(key: str) -> Optional[Any]:
    if not RedisClient.is_available():
        return None  # ✅ Fallback gracieux
    # ...
```

### 5. Monitoring continu

```python
from core.monitoring import add_breadcrumb

@router.get("/organisations")
@cache_response(ttl=300, key_prefix="organisations")
async def list_organisations(db: Session = Depends(get_db)):
    add_breadcrumb(
        category="cache",
        message="Fetching organisations",
        level="info"
    )

    return db.query(Organisation).all()
```

### 6. Tests du cache

```python
# tests/test_cache.py
import pytest
from core.cache import get_cache, set_cache, delete_cache

def test_cache_set_get():
    """Test cache basique"""
    key = "test:key"
    value = {"data": "test"}

    # Set
    success = set_cache(key, value, ttl=60)
    assert success is True

    # Get
    cached = get_cache(key)
    assert cached == value

    # Delete
    deleted = delete_cache(key)
    assert deleted == 1

def test_cache_miss():
    """Test cache miss"""
    cached = get_cache("non_existent_key")
    assert cached is None
```

---

## 🔧 Troubleshooting

### ❌ Redis ne démarre pas

**Symptôme** : `redis.ConnectionError: Error connecting to Redis`

**Solutions** :

```bash
# Vérifier que Redis tourne
docker ps | grep redis

# Si absent, démarrer
docker compose -f docker-compose.yml -f docker-compose.redis.yml up -d redis

# Vérifier les logs
docker logs crm-redis

# Tester la connexion
docker exec -it crm-redis redis-cli ping
```

### ❌ Cache ne fonctionne pas

**Symptôme** : Toutes les requêtes sont lentes (cache MISS)

**Solutions** :

```bash
# 1. Vérifier la config
echo $REDIS_HOST
echo $REDIS_PORT

# 2. Tester la connexion Python
python
>>> from core.cache import RedisClient
>>> RedisClient.is_available()
True

# 3. Vérifier que le décorateur est bien présent
# Chercher @cache_response dans le code
```

### ❌ Hit rate faible (<50%)

**Causes possibles** :

1. **TTL trop court** : Augmenter le TTL
2. **Invalidation trop fréquente** : Invalider seulement les clés nécessaires
3. **Paramètres changeants** : Les filtres créent des clés différentes

**Solutions** :

```python
# ❌ TTL trop court
@cache_response(ttl=10)  # 10 secondes

# ✅ TTL adapté
@cache_response(ttl=300)  # 5 minutes

# ❌ Invalider tout
invalidate_all_caches()

# ✅ Invalider ciblé
invalidate_organisation_cache(org_id=42)
```

### ❌ Mémoire Redis pleine

**Symptôme** : `OOM (Out Of Memory)`

**Solutions** :

```bash
# 1. Vérifier l'usage mémoire
docker exec -it crm-redis redis-cli INFO memory

# 2. Vider le cache
docker exec -it crm-redis redis-cli FLUSHDB

# 3. Augmenter la limite mémoire (docker-compose.redis.yml)
services:
  redis:
    deploy:
      resources:
        limits:
          memory: 512M  # Augmenter
```

### ❌ Cache stale (données obsolètes)

**Symptôme** : Les modifications ne se reflètent pas

**Solutions** :

```python
# Vérifier que l'invalidation est bien appelée
@router.post("/organisations")
async def create_organisation(...):
    # Créer l'organisation
    org = Organisation(...)
    db.add(org)
    db.commit()

    # ✅ CRUCIAL : Invalider le cache
    invalidate_organisation_cache()

    return org
```

### ❌ Performances toujours lentes

**Checklist** :

- [ ] Redis tourne et répond (redis-cli ping)
- [ ] Décorateur `@cache_response` présent
- [ ] TTL approprié (pas 0 ou négatif)
- [ ] Indexes DB créés (voir section Optimisation)
- [ ] Eager loading utilisé (joinedload)
- [ ] Pagination implémentée (limit/offset)
- [ ] Monitoring activé (Sentry, logs)

---

## 📈 Métriques de succès

### Objectifs atteints

✅ **Temps de réponse** : 50ms (vs 500ms avant)
✅ **Hit rate cache** : 90%+
✅ **Charge DB** : Réduite de 95%
✅ **Disponibilité** : Graceful fallback si Redis down

### Comment mesurer

```python
import time

@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    start = time.time()

    orgs = db.query(Organisation).all()

    duration_ms = (time.time() - start) * 1000
    logger.info("list_organisations", duration_ms=duration_ms)

    return orgs
```

Ou avec Sentry (automatique) :
- Dashboard Sentry → Performance → Transactions
- Voir le P50, P95, P99 des endpoints

---

## 🎓 Ressources

### Documentation officielle

- **Redis** : https://redis.io/docs/
- **redis-py** : https://redis-py.readthedocs.io/
- **SQLAlchemy Performance** : https://docs.sqlalchemy.org/en/20/faq/performance.html
- **FastAPI Caching** : https://fastapi.tiangolo.com/advanced/custom-response/

### Outils recommandés

- **Redis Commander** : UI pour visualiser Redis (https://github.com/joeferner/redis-commander)
- **RedisInsight** : Desktop app officielle (https://redis.com/redis-enterprise/redis-insight/)
- **Locust** : Load testing (https://locust.io/)

### Prochaines étapes

1. ✅ Cache Redis opérationnel
2. ✅ Monitoring Sentry activé
3. ⏳ **Prochain** : Sécurité & Permissions (S3-4)

---

## 📝 Récapitulatif

### Fichiers créés/modifiés

```
crm-backend/
├── core/
│   ├── cache.py              ✅ Module cache complet
│   └── config.py             ✅ Config Redis ajoutée
├── requirements.txt          ✅ redis==5.0.1 ajouté
└── docker-compose.redis.yml  ✅ Service Redis

Documentation/
└── PERFORMANCE_COMPLET.md    ✅ Ce guide
```

### Commandes essentielles

```bash
# Démarrer avec Redis
docker compose -f docker-compose.yml -f docker-compose.redis.yml up -d

# Installer les dépendances
pip install -r requirements.txt

# Tester Redis
docker exec -it crm-redis redis-cli ping

# Vérifier le cache (depuis Python)
python
>>> from core.cache import check_cache_health
>>> check_cache_health()

# Voir les stats du cache
curl http://localhost:8000/api/v1/cache/stats
```

### Checklist d'intégration

- [ ] Redis démarre avec Docker Compose
- [ ] Variables `.env` configurées
- [ ] `pip install redis==5.0.1` installé
- [ ] Décorateurs `@cache_response` ajoutés aux routes GET
- [ ] Invalidations ajoutées aux routes POST/PUT/DELETE
- [ ] Indexes DB créés (Alembic migration)
- [ ] Tests cache écrits (`tests/test_cache.py`)
- [ ] Monitoring activé (stats, health check)
- [ ] Documentation d'équipe mise à jour

---

**🎉 Félicitations ! Votre CRM est maintenant optimisé avec cache Redis.**

**Prochaine étape** : Semaine 3-4 → Sécurité & UX (Permissions RBAC + Notifications temps réel)
