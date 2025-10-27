# 🔍 Monitoring & Error Tracking - Guide Complet

Système complet de monitoring avec Sentry et structured logging.

---

## ✅ Ce qui a été créé

**Fichiers créés :**
1. `crm-backend/core/monitoring.py` - Module monitoring complet (~400 lignes)
2. `crm-backend/core/config.py` - Configuration mise à jour (sentry_dsn, environment)
3. `crm-backend/requirements.txt` - Dépendances ajoutées (sentry-sdk, structlog)

---

## 📦 Installation

### 1. Installer les dépendances

```bash
cd crm-backend

# Installer Sentry + structured logging
pip install sentry-sdk[fastapi]==1.39.1 structlog==23.2.0

# Ou avec requirements.txt
pip install -r requirements.txt
```

### 2. Créer un compte Sentry (Gratuit)

```bash
# Aller sur https://sentry.io
# Créer un compte (gratuit jusqu'à 5000 events/mois)
# Créer un projet "CRM Backend" (FastAPI)
# Copier le DSN fourni
```

### 3. Configurer les variables d'environnement

```bash
# .env
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
ENVIRONMENT=production  # ou development, staging
LOG_LEVEL=INFO
```

---

## 🚀 Intégration dans l'Application

### Mettre à jour `main.py`

```python
# crm-backend/main.py

from fastapi import FastAPI
from core.monitoring import init_sentry, init_structured_logging, get_logger

# Créer logger
logger = get_logger(__name__)

# Créer l'application
app = FastAPI(
    title="CRM API",
    version="1.0.0",
)

# ============= STARTUP =============

@app.on_event("startup")
async def startup_event():
    """Initialiser au démarrage"""
    logger.info("🚀 Démarrage de l'application CRM...")

    # Initialiser Sentry
    init_sentry()

    # Initialiser structured logging
    init_structured_logging()

    # Initialiser la base de données
    init_db()

    logger.info("✅ Application démarrée")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup au shutdown"""
    logger.info("🛑 Arrêt de l'application CRM")


# ============= MIDDLEWARE =============

# Middleware pour capturer contexte utilisateur
@app.middleware("http")
async def add_sentry_context(request: Request, call_next):
    from core.monitoring import set_transaction_context, add_breadcrumb

    # Définir la transaction
    set_transaction_context(
        name=f"{request.method} {request.url.path}",
        operation="http.request"
    )

    # Ajouter breadcrumb
    add_breadcrumb(
        message=f"HTTP Request: {request.method} {request.url.path}",
        category="http",
        data={
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host,
        }
    )

    response = await call_next(request)
    return response


# ============= ERROR HANDLERS =============

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    from core.monitoring import capture_exception

    # Capturer l'exception dans Sentry
    capture_exception(exc, extra={
        "url": str(request.url),
        "method": request.method,
    })

    logger.error(
        "unhandled_exception",
        error=str(exc),
        url=str(request.url),
        method=request.method,
    )

    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
```

---

## 📊 Utilisation dans les Routes

### Exemple simple

```python
# api/routes/organisations.py

from core.monitoring import get_logger, add_breadcrumb, capture_exception

logger = get_logger(__name__)

@router.get("/organisations")
async def list_organisations(db: Session = Depends(get_db)):
    # Ajouter breadcrumb
    add_breadcrumb("Fetching organisations", category="query")

    try:
        orgs = db.query(Organisation).all()

        # Logger l'opération
        logger.info("organisations_fetched", count=len(orgs))

        return orgs

    except Exception as e:
        # Logger l'erreur
        logger.error("organisations_fetch_failed", error=str(e))

        # Capturer dans Sentry
        capture_exception(e, extra={"query": "organisations"})

        raise
```

### Avec contexte utilisateur

```python
from core.monitoring import set_user_context, get_logger

logger = get_logger(__name__)

@router.get("/me")
async def get_current_user(current_user: User = Depends(get_current_user)):
    # Définir le contexte utilisateur dans Sentry
    set_user_context(user_id=current_user.id, email=current_user.email)

    logger.info("user_profile_accessed", user_id=current_user.id)

    return current_user
```

### Avec performance monitoring

```python
from core.monitoring import PerformanceMonitor, get_logger

logger = get_logger(__name__)

@router.post("/organisations")
async def create_organisation(
    data: OrganisationCreate,
    db: Session = Depends(get_db)
):
    # Monitorer la performance
    with PerformanceMonitor("create_organisation") as monitor:
        org = Organisation(**data.dict())
        db.add(org)
        db.commit()
        db.refresh(org)

        # Ajouter des données à la trace
        monitor.set_data(org_id=org.id, org_name=org.name)
        monitor.set_tag("category", org.category)

        logger.info(
            "organisation_created",
            org_id=org.id,
            org_name=org.name,
            category=org.category
        )

        return org
```

### Capture de messages (pas d'erreur)

```python
from core.monitoring import capture_message, get_logger

logger = get_logger(__name__)

@router.post("/organisations/import")
async def import_organisations(file: UploadFile):
    # Début de l'import
    capture_message(f"Starting import from {file.filename}", level="info")

    results = process_import(file)

    # Fin de l'import
    capture_message(
        f"Import completed: {results['success']} success, {results['errors']} errors",
        level="info" if results['errors'] == 0 else "warning"
    )

    logger.info(
        "import_completed",
        filename=file.filename,
        success_count=results['success'],
        error_count=results['errors']
    )

    return results
```

---

## 🎛️ Dashboard Sentry

### Ce que vous verrez dans Sentry

1. **Issues** - Liste des erreurs capturées
   - Stack trace complète
   - Breadcrumbs (historique avant l'erreur)
   - Contexte utilisateur
   - Variables locales

2. **Performance** - Traces de performance
   - Temps de réponse par endpoint
   - Requêtes DB lentes
   - Graphiques de performance

3. **Releases** - Suivi des versions
   - Erreurs par version
   - Deploy tracking

4. **Alerts** - Alertes configurables
   - Email quand nouvelle erreur
   - Slack/Discord intégration
   - Threshold alerts (> X erreurs/min)

---

## 📧 Configurer les Alertes

### Dans Sentry Dashboard

1. **Aller dans** Settings → Projects → CRM Backend → Alerts

2. **Créer une alerte "New Issue"**
   ```
   Conditions: Quand une nouvelle erreur apparaît
   Actions: Envoyer email à admin@alforis.fr
   ```

3. **Créer une alerte "Error Rate"**
   ```
   Conditions: Quand > 10 erreurs en 1 minute
   Actions: Envoyer email + notification Slack
   ```

4. **Créer une alerte "Performance"**
   ```
   Conditions: Quand temps réponse > 1 seconde
   Actions: Notification
   ```

---

## 📊 Structured Logging

### Format des logs

Logs structurés en JSON (parsable par Elasticsearch, Datadog, etc.):

```json
{
  "event": "organisation_created",
  "org_id": 123,
  "org_name": "Alforis Finance",
  "category": "Institution",
  "level": "info",
  "timestamp": "2025-10-17T10:30:45.123Z",
  "logger": "api.routes.organisations"
}
```

### Utilisation

```python
from core.monitoring import get_logger

logger = get_logger(__name__)

# Simple
logger.info("user_logged_in", user_id=123)

# Avec contexte
logger.warning(
    "slow_query_detected",
    query="organisations",
    duration_ms=1500,
    threshold_ms=1000
)

# Erreur
logger.error(
    "database_connection_failed",
    error=str(e),
    retry_count=3
)
```

---

## 🧪 Tester le Monitoring

### 1. Tester Sentry localement

```python
# Créer un endpoint de test

@router.get("/test-sentry")
async def test_sentry():
    """Test Sentry error capture"""
    from core.monitoring import capture_message, capture_exception

    # Test message
    capture_message("Test message from CRM", level="info")

    # Test exception
    try:
        1 / 0
    except Exception as e:
        capture_exception(e, extra={"test": "sentry"})

    return {"message": "Check Sentry dashboard!"}
```

### 2. Vérifier dans Sentry

- Aller sur https://sentry.io
- Ouvrir votre projet "CRM Backend"
- Voir l'erreur dans Issues
- Voir le message dans "All Events"

### 3. Tester les logs

```bash
# Lancer l'API
uvicorn main:app --reload

# Faire des requêtes
curl http://localhost:8000/api/v1/organisations

# Voir les logs structurés dans le terminal
```

---

## 🔍 Health Check Monitoring

### Endpoint de santé

```python
# Dans main.py ou routes/health.py

from core.monitoring import check_monitoring_health

@router.get("/health/monitoring")
async def monitoring_health():
    """Check monitoring system health"""
    health = check_monitoring_health()

    return {
        "status": "ok",
        "monitoring": health
    }
```

Réponse:
```json
{
  "status": "ok",
  "monitoring": {
    "sentry": {
      "enabled": true,
      "environment": "production",
      "dsn_configured": true
    },
    "logging": {
      "level": "INFO",
      "structured": true
    }
  }
}
```

---

## 🎯 Best Practices

### 1. Ne pas logger d'informations sensibles

```python
# ❌ Mauvais
logger.info("user_login", password=password)

# ✅ Bon
logger.info("user_login", user_id=user.id)
```

### 2. Utiliser des noms d'événements clairs

```python
# ❌ Mauvais
logger.info("action")
logger.info("done")

# ✅ Bon
logger.info("organisation_created")
logger.info("import_completed")
```

### 3. Ajouter du contexte

```python
# ❌ Mauvais
logger.error("Error")

# ✅ Bon
logger.error(
    "database_query_failed",
    query="organisations",
    error=str(e),
    user_id=current_user.id
)
```

### 4. Utiliser les bons niveaux de log

```python
logger.debug("Variable value: x=5")          # DEBUG
logger.info("user_logged_in", user_id=123)   # INFO
logger.warning("slow_query", duration_ms=1500) # WARNING
logger.error("database_error", error=str(e))  # ERROR
```

### 5. Capturer le contexte avec breadcrumbs

```python
add_breadcrumb("Starting import", category="import")
add_breadcrumb("Validating file", category="import", data={"filename": file.filename})
add_breadcrumb("Processing rows", category="import", data={"row_count": 100})
# Si erreur, Sentry aura tout l'historique
```

---

## 📈 Métriques à Surveiller

### Dans Sentry

1. **Error Rate** - Taux d'erreurs/minute
2. **Apdex Score** - Satisfaction utilisateur
3. **P95 Response Time** - 95% des requêtes < X secondes
4. **Failed Requests** - Nombre de 5xx
5. **Slow Transactions** - Transactions > 1s

### Dashboard recommandé

```
┌─────────────────────────────────────────┐
│  CRM Backend - Monitoring Dashboard     │
├─────────────────────────────────────────┤
│  📊 Errors (24h): 12                    │
│  ⏱️  Avg Response: 150ms                │
│  🔥 Hottest Endpoint: POST /orgs       │
│  🐌 Slowest Endpoint: GET /kpis        │
│  👥 Active Users: 15                    │
└─────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Problème: Sentry ne capture rien

```bash
# 1. Vérifier le DSN
echo $SENTRY_DSN

# 2. Vérifier l'environnement
echo $ENVIRONMENT

# 3. Tester avec endpoint /test-sentry

# 4. Vérifier les logs
# Devrait afficher: "✅ Sentry initialisé"
```

### Problème: Trop d'events (quota dépassé)

```python
# Réduire le sample rate dans monitoring.py

def get_traces_sample_rate() -> float:
    if settings.environment == "production":
        return 0.05  # 5% au lieu de 10%
```

### Problème: Logs pas structurés

```bash
# Vérifier que init_structured_logging() est appelé
# Devrait afficher: "✅ Structured logging initialisé"
```

---

## 🎉 Résumé

**Vous avez maintenant :**

✅ **Sentry configuré** pour capturer toutes les erreurs
✅ **Structured logging** (logs JSON exploitables)
✅ **Performance monitoring** (traces de requêtes)
✅ **User context** (savoir quel user a eu l'erreur)
✅ **Breadcrumbs** (historique avant l'erreur)
✅ **Alertes** configurables (email, Slack)

**ROI :**
- 🚀 Détection bugs en temps réel
- 🔍 Stack traces complètes
- 📊 Métriques de performance
- 📧 Alertes automatiques
- 🎯 Fix bugs 10x plus vite

**Gain de temps estimé :** 80% du temps de debug économisé

---

**Prochaine étape :** Frontend monitoring avec Sentry (Next.js)

---

**Créé le :** 2025-10-17
**Version :** 1.0.0
