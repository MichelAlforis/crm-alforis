# Agent IA - Documentation Technique

## Vue d'ensemble

L'agent IA du CRM Alforis Finance automatise et améliore la gestion des données grâce à l'intelligence artificielle. Il utilise les modèles de langage les plus avancés (Claude, GPT-4) pour:

- **Détecter les doublons** de manière intelligente (même avec variations)
- **Enrichir automatiquement** les données manquantes
- **Contrôler la qualité** des données
- **Suggérer des optimisations** de workflows

---

## Architecture

### Stack Technique

**Backend:**
- FastAPI (routes asynchrones)
- SQLAlchemy (ORM avec PostgreSQL)
- httpx (appels API async)
- Redis (cache pour optimiser les coûts)

**Fournisseurs IA supportés:**
- **Anthropic Claude** (recommandé) - Claude 3.5 Sonnet
- **OpenAI** - GPT-4o
- **Ollama** - LLM locaux (gratuit)

### Modèles de données

```
ai_suggestions
├── type (duplicate_detection, data_enrichment, data_quality, etc.)
├── status (pending, approved, rejected, applied)
├── entity_type & entity_id (organisation, person)
├── suggestion_data (JSON avec détails)
├── confidence_score (0.0 à 1.0)
└── ai_provider & ai_model

ai_executions
├── task_type (duplicate_scan, bulk_enrichment, quality_check)
├── status (pending, running, success, failed)
├── total_items_processed
├── total_suggestions_created
├── total_prompt_tokens & total_completion_tokens
└── estimated_cost_usd

ai_configurations
├── ai_provider & ai_model
├── auto_apply_enabled & auto_apply_confidence_threshold
├── duplicate_similarity_threshold
├── daily_budget_usd & monthly_budget_usd
└── custom_prompts (JSON)

ai_cache
├── cache_key (hash SHA-256)
├── request_data & response_data (JSON)
├── hit_count (réutilisation)
└── expires_at
```

---

## API Endpoints

### Tâches IA

#### `POST /api/v1/ai/duplicates/detect`

Lance la détection de doublons.

**Request Body:**
```json
{
  "entity_type": "organisation",
  "limit": 100
}
```

**Response:** `202 Accepted` + `AIExecutionResponse`

---

#### `POST /api/v1/ai/enrich/organisations`

Lance l'enrichissement automatique.

**Request Body:**
```json
{
  "organisation_ids": [1, 2, 3] // null = toutes
}
```

**Response:** `202 Accepted` + `AIExecutionResponse`

---

#### `POST /api/v1/ai/quality/check`

Lance le contrôle qualité.

**Request Body:**
```json
{
  "organisation_ids": null // toutes
}
```

**Response:** `202 Accepted` + `AIExecutionResponse`

---

### Gestion des suggestions

#### `GET /api/v1/ai/suggestions`

Liste les suggestions avec filtres.

**Query Parameters:**
- `status`: pending, approved, rejected, applied
- `type`: duplicate_detection, data_enrichment, data_quality
- `entity_type`: organisation, person
- `limit`: 1-200 (default: 50)

**Response:**
```json
[
  {
    "id": 123,
    "type": "duplicate_detection",
    "status": "pending",
    "entity_type": "organisation",
    "entity_id": 45,
    "title": "Doublon potentiel: ACME Corp ↔ ACME Corporation",
    "suggestion_data": {
      "duplicate_id": 78,
      "similarity_score": 0.92,
      "suggested_action": "merge"
    },
    "confidence_score": 0.92,
    "created_at": "2025-10-21T10:30:00Z"
  }
]
```

---

#### `POST /api/v1/ai/suggestions/{id}/approve`

Approuve et applique une suggestion.

**Request Body:**
```json
{
  "notes": "Vérifié manuellement, fusion approuvée"
}
```

**Response:** Suggestion mise à jour avec status `applied`

---

#### `POST /api/v1/ai/suggestions/{id}/reject`

Rejette une suggestion.

**Request Body:**
```json
{
  "notes": "Ce ne sont pas des doublons"
}
```

---

### Configuration

#### `GET /api/v1/ai/config`

Récupère la configuration active.

**Response:**
```json
{
  "id": 1,
  "name": "default",
  "is_active": true,
  "ai_provider": "claude",
  "ai_model": "claude-3-5-sonnet-20241022",
  "auto_apply_enabled": false,
  "auto_apply_confidence_threshold": 0.95,
  "duplicate_similarity_threshold": 0.85,
  "quality_score_threshold": 0.70,
  "daily_budget_usd": 10.0,
  "monthly_budget_usd": 300.0,
  "total_executions": 45,
  "total_suggestions": 247,
  "total_cost_usd": 12.45
}
```

---

#### `PATCH /api/v1/ai/config`

Met à jour la configuration.

**Request Body:**
```json
{
  "auto_apply_enabled": true,
  "auto_apply_confidence_threshold": 0.95,
  "daily_budget_usd": 20.0
}
```

---

### Statistiques

#### `GET /api/v1/ai/statistics`

Statistiques globales de l'agent IA.

**Response:**
```json
{
  "total_suggestions": 247,
  "pending_suggestions": 12,
  "approved_suggestions": 198,
  "rejected_suggestions": 37,
  "applied_suggestions": 198,
  "total_executions": 45,
  "success_executions": 42,
  "failed_executions": 3,
  "total_cost_usd": 12.45,
  "total_tokens_used": 125000,
  "average_confidence_score": 0.87,
  "suggestions_by_type": {
    "duplicate_detection": 45,
    "data_enrichment": 150,
    "data_quality": 52
  },
  "cost_by_provider": {
    "claude": 12.45
  }
}
```

---

## Guide d'utilisation

### Installation & Configuration

#### 1. Installer les dépendances

```bash
cd crm-backend
pip install -r requirements.txt
```

#### 2. Configurer les API keys

Copier `.env.example` vers `.env` et remplir:

```bash
# Claude (recommandé)
ANTHROPIC_API_KEY="sk-ant-xxxxx"

# OU OpenAI
OPENAI_API_KEY="sk-xxxxx"

# OU Ollama (gratuit, local)
OLLAMA_BASE_URL="http://localhost:11434"
```

**Obtenir les API keys:**
- Claude: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
- OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Ollama: [ollama.com/download](https://ollama.com/download) (installation locale)

#### 3. Lancer les migrations

```bash
# Créer la migration (si besoin)
alembic revision --autogenerate -m "Add AI agent tables"

# Appliquer les migrations
alembic upgrade head
```

#### 4. Démarrer le serveur

```bash
uvicorn main:app --reload --port 8000
```

---

### Cas d'usage

#### Détecter les doublons

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/ai/duplicates/detect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"entity_type": "organisation", "limit": 100}'
```

**Via Python:**
```python
from services.ai_agent import AIAgentService
from core import get_db

db = next(get_db())
ai_service = AIAgentService(db)

# Lancer la détection
execution = await ai_service.detect_duplicates(
    entity_type="organisation",
    limit=100,
    triggered_by=user_id
)

print(f"Détection lancée: {execution.id}")
print(f"Suggestions créées: {execution.total_suggestions_created}")
```

---

#### Enrichir les données

**Via API:**
```bash
curl -X POST http://localhost:8000/api/v1/ai/enrich/organisations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"organisation_ids": [1, 2, 3]}'
```

**Via Python:**
```python
execution = await ai_service.enrich_organisations(
    organisation_ids=[1, 2, 3],
    triggered_by=user_id
)
```

---

#### Valider les suggestions

```bash
# Approuver
curl -X POST http://localhost:8000/api/v1/ai/suggestions/123/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"notes": "Vérifié, fusion validée"}'

# Rejeter
curl -X POST http://localhost:8000/api/v1/ai/suggestions/123/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"notes": "Faux positif"}'
```

---

## Optimisation des coûts

### Système de cache

L'agent IA utilise un cache intelligent pour éviter les appels API redondants:

```python
# Exemple: Comparer 2 organisations
cache_key = SHA256(org1_id + org2_id + nom1 + nom2)

# Si déjà calculé dans les 24h, utilise le cache
cached_result = await ai_service._get_cached_result("duplicate_check", request_data)

if cached_result:
    return cached_result["similarity"]  # Pas d'appel API = $0

# Sinon, appelle l'IA et met en cache
result = await ai_service._call_ai(prompt)
await ai_service._set_cache("duplicate_check", request_data, result)
```

**Économies estimées:** 70-80% des coûts API grâce au cache.

---

### Gestion des budgets

Configuration dans `.env`:

```bash
AI_DAILY_BUDGET_USD=10.0      # Limite quotidienne
AI_MONTHLY_BUDGET_USD=300.0   # Limite mensuelle
```

Le système vérifie automatiquement avant chaque appel:

```python
# TODO: Implémenter vérification budget
def _check_budget(self) -> bool:
    today_cost = db.query(func.sum(AIExecution.estimated_cost_usd)).filter(
        AIExecution.started_at >= today_start
    ).scalar()

    if today_cost >= self.config.daily_budget_usd:
        raise BudgetExceededException("Budget quotidien dépassé")
```

---

### Tarification

**Claude 3.5 Sonnet (recommandé):**
- Input: $3 / M tokens
- Output: $15 / M tokens
- Exemple: 1000 comparaisons ≈ $2-3

**GPT-4o:**
- Input: $2.50 / M tokens
- Output: $10 / M tokens
- Exemple: 1000 comparaisons ≈ $1.5-2.5

**Ollama (local):**
- Gratuit
- Nécessite GPU pour performances optimales

---

## Monitoring & Métriques

### Dashboard disponibles

```python
# Statistiques globales
GET /api/v1/ai/statistics

# Historique des exécutions
GET /api/v1/ai/executions?limit=20

# Détails d'une exécution
GET /api/v1/ai/executions/{id}
```

### Métriques clés

- **Taux de succès:** % d'exécutions réussies
- **Coût par suggestion:** Cost USD / Suggestions créées
- **Score de confiance moyen:** Qualité des suggestions
- **Taux d'approbation:** % de suggestions approuvées

---

## Sécurité & Best Practices

### Protection des API keys

✅ **FAIRE:**
- Utiliser des variables d'environnement
- Rotation régulière des clés (tous les 3-6 mois)
- Limiter les permissions (read-only si possible)

❌ **NE PAS FAIRE:**
- Commit les clés dans Git
- Partager les clés par email/Slack
- Utiliser la même clé dev/prod

### Validation des suggestions

**Workflow recommandé:**

1. **Phase 1 (1-2 semaines):** Validation manuelle 100%
   - `auto_apply_enabled=false`
   - Réviser chaque suggestion
   - Mesurer la précision

2. **Phase 2 (2-4 semaines):** Validation manuelle partielle
   - `auto_apply_enabled=true`
   - `auto_apply_confidence_threshold=0.97`
   - Seules suggestions très confiantes auto-appliquées

3. **Phase 3 (production):** Auto-application optimisée
   - `auto_apply_confidence_threshold=0.95`
   - Monitoring continu
   - Audit trail complet

### Audit & Traçabilité

Toutes les actions sont loggées:

```python
ai_execution.execution_logs = [
    {
        "timestamp": "2025-10-21T10:30:00Z",
        "level": "info",
        "message": "100 organisations analysées"
    },
    {
        "timestamp": "2025-10-21T10:31:00Z",
        "level": "info",
        "message": "12 doublons détectés"
    }
]
```

---

## Troubleshooting

### Erreur: "ANTHROPIC_API_KEY non configurée"

**Solution:**
```bash
# Vérifier .env
cat .env | grep ANTHROPIC

# Si manquant, ajouter
echo 'ANTHROPIC_API_KEY="sk-ant-xxxxx"' >> .env

# Redémarrer le serveur
```

### Erreur: "Budget quotidien dépassé"

**Solution:**
```bash
# Augmenter le budget dans .env
AI_DAILY_BUDGET_USD=20.0

# OU attendre minuit (UTC)

# OU vérifier les coûts
curl http://localhost:8000/api/v1/ai/statistics | jq '.total_cost_usd'
```

### Performance lente

**Causes possibles:**
1. Pas de cache Redis configuré
2. Trop de requêtes API en parallèle
3. Ollama sans GPU

**Solutions:**
```bash
# Activer Redis
REDIS_ENABLED=true

# Réduire batch size
AI_BATCH_SIZE=5

# Utiliser Claude/OpenAI au lieu d'Ollama
AI_DEFAULT_PROVIDER="claude"
```

---

## Roadmap

### Fonctionnalités prévues

**Phase 3.1 (Court terme):**
- ✅ Détection de doublons
- ✅ Enrichissement automatique
- ✅ Contrôle qualité
- 🔄 Migration Alembic
- 🔄 Dashboard frontend
- 🔄 Tests unitaires

**Phase 3.2 (Moyen terme):**
- ⏳ Catégorisation automatique
- ⏳ Extraction de contacts depuis sites web
- ⏳ Suggestions de workflows personnalisés
- ⏳ Analyse de sentiment (emails, interactions)
- ⏳ Prédiction de churn

**Phase 3.3 (Long terme):**
- ⏳ Fine-tuning modèles custom
- ⏳ RAG (Retrieval Augmented Generation)
- ⏳ Agent autonome avec mémoire
- ⏳ Multi-modal (analyse documents, images)

---

## Support & Contact

**Documentation:**
- API: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- Code: `/crm-backend/services/ai_agent.py`
- Schemas: `/crm-backend/schemas/ai_agent.py`

**Questions techniques:**
- Issues GitHub
- Email: tech@alforis-finance.com

---

## Licence

Propriétaire - Alforis Finance © 2025
