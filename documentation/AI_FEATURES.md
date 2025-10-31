# 🤖 IA - Documentation Technique

**Version:** 8.7.0
**Dernière mise à jour:** 31 Octobre 2025

---

## 📋 Vue d'ensemble

Le CRM intègre 5 systèmes IA complémentaires :

1. **Ollama Integration** - LLM local avec cache Redis (Phase 3)
2. **AI Learning** - Apprentissage des préférences utilisateur (Phase 3)
3. **Context Menu** - Suggestions intelligentes sur formulaires (Phase 2B)
4. **Autofill V2** - Remplissage automatique multi-sources (Phase 4)
5. **AI Agent** - Détection doublons + enrichissement (Phase 3.1)

---

## 1️⃣ Ollama Integration

### Description
Service IA utilisant LiteLLM comme couche d'abstraction pour Ollama (local), OpenAI et Claude.

### Stack
- **Backend:** [services/ai_ollama_service.py](../crm-backend/services/ai_ollama_service.py) (420 lignes)
- **API:** [api/routes/ai_ollama.py](../crm-backend/api/routes/ai_ollama.py) (220 lignes)
- **Cache:** Redis DB1 (TTL 1h, clés MD5)
- **Modèles:** mistral:7b, llama2:13b, gpt-3.5-turbo, claude

### Endpoints

```bash
POST   /api/v1/ai/ollama/suggest       # Génération suggestion (avec cache)
GET    /api/v1/ai/ollama/health        # Health check (Redis + stats)
GET    /api/v1/ai/ollama/cache/stats   # Statistiques cache
DELETE /api/v1/ai/ollama/cache         # Vider cache
```

### Configuration

```bash
# Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_ENABLE_FALLBACK=false
OLLAMA_FALLBACK_MODEL=gpt-3.5-turbo

# Redis Cache
REDIS_HOST=redis
REDIS_PORT=6379
OLLAMA_REDIS_DB=1
OLLAMA_CACHE_TTL=3600

# Performance
OLLAMA_DEFAULT_TIMEOUT=5.0
```

### Utilisation

```python
from services.ai_ollama_service import get_ollama_service

service = get_ollama_service()
result = await service.aget_suggestion(
    prompt="Suggest a role for: CEO at ACME Corp",
    model="mistral:7b",
    temperature=0.7,
    max_tokens=150,
    use_cache=True
)
```

### Coûts
- **Ollama (local):** Gratuit (nécessite GPU)
- **Fallback GPT:** $0.0003/requête (gpt-3.5-turbo)
- **Économie cache:** 70-80% des appels

---

## 2️⃣ AI Learning System

### Description
Système d'apprentissage qui mémorise les choix utilisateur pour améliorer les suggestions.

### Stack
- **Backend:** [services/ai_learning_service.py](../crm-backend/services/ai_learning_service.py) (460 lignes)
- **API:** [api/routes/ai_learning.py](../crm-backend/api/routes/ai_learning.py) (230 lignes)
- **Model:** [models/ai_user_preference.py](../crm-backend/models/ai_user_preference.py) (110 lignes)
- **Migration:** `ai_user_pref_001`

### Endpoints

```bash
POST /api/v1/ai/learning/track           # Enregistrer un choix
GET  /api/v1/ai/learning/patterns        # Détecter patterns
GET  /api/v1/ai/learning/stats           # Statistiques globales
GET  /api/v1/ai/learning/user/{id}/stats # Stats par utilisateur
POST /api/v1/ai/learning/cleanup         # Nettoyage RGPD
```

### Table Structure

```sql
CREATE TABLE ai_user_preferences (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    team_id INTEGER,
    field_name VARCHAR(100) NOT NULL,
    context_type VARCHAR(50),
    action VARCHAR(20) CHECK (action IN ('accept', 'reject', 'modify')),
    suggested_value TEXT,
    final_value TEXT,
    extra_metadata JSONB,
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '90 days'),
    created_at TIMESTAMP DEFAULT NOW(),
    INDEX idx_learning_user_field (user_id, field_name, created_at)
);
```

### RGPD Compliance
- **Auto-expiration:** 90 jours (configurable)
- **Cleanup Celery:** Tous les jours à 3h
- **Anonymisation:** Possible via `extra_metadata`

### Utilisation

```python
from services.ai_learning_service import AILearningService

service = AILearningService(db)

# Enregistrer un choix
service.track_choice(
    user_id=1,
    team_id=1,
    field_name="role",
    context_type="person_form",
    action="accept",
    suggested_value="Directeur Marketing",
    final_value="Directeur Marketing"
)

# Détecter patterns
patterns = service.get_user_patterns(
    user_id=1,
    field_name="role",
    limit=10,
    days_back=30
)

# Boost score
new_score = service.boost_suggestion_score(
    user_id=1,
    field_name="role",
    suggested_value="Directeur Marketing",
    base_score=0.75
)
# Returns: 0.825 (+10% boost si 1 accept récent)
```

---

## 3️⃣ Context Menu (Phase 2B)

### Description
Menu contextuel sur formulaires affichant suggestions IA sur clic droit.

### Stack
- **Frontend:** [components/ai/ContextMenu.tsx](../crm-frontend/components/ai/ContextMenu.tsx)
- **API:** [api/routes/ai_autofill.py](../crm-backend/api/routes/ai_autofill.py)
- **Intégration:** Formulaires Person/Organisation

### Features
- Clic droit sur champ → Suggestions IA
- Accept → Track + Apply
- Reject → Track pour amélioration
- Modify → Track valeur modifiée

### Endpoints

```bash
POST /api/v1/ai/autofill/suggest  # Obtenir suggestions pour champ
POST /api/v1/ai/autofill/apply    # Appliquer + tracker
```

### Utilisation

```tsx
import { ContextMenu } from '@/components/ai/ContextMenu'

<ContextMenu
  fieldName="role"
  entityType="person"
  currentValue={formData.role}
  onApply={(value) => setFormData({ ...formData, role: value })}
/>
```

---

## 4️⃣ Autofill V2 (Multi-Sources)

### Description
Système de remplissage automatique avec 4 sources (Rules, DB Patterns, Outlook, LLM).

### Stack
- **Backend:** [services/autofill_service_v2.py](../crm-backend/services/autofill_service_v2.py)
- **LLM Router:** [services/llm_router.py](../crm-backend/services/llm_router.py) (586 lignes)
- **API:** [api/routes/ai_statistics.py](../crm-backend/api/routes/ai_statistics.py) (336 lignes)
- **Model:** [models/autofill_log.py](../crm-backend/models/autofill_log.py)

### Pipeline (ordre prioritaire)

1. **Rules** (10ms) - TLD→Pays, Email→Langue
2. **DB Patterns** (20ms) - Patterns confirmés (≥2 contacts)
3. **Company Resolver** (30ms) - Email→Entreprise
4. **Outlook Signatures** (50ms) - Graph API extraction
5. **LLM Fallback** (300ms) - Mistral/OpenAI/Claude

### LLM Router Configuration

```bash
# Provider Selection
LLM_PRIMARY_PROVIDER=auto  # ou "mistral", "openai", "anthropic", "ollama"
LLM_PROVIDER_ORDER=mistral,openai,anthropic,ollama

# Performance
LLM_LATENCY_BUDGET_MS=600
LLM_REQUEST_TIMEOUT_MS=10000
LLM_CIRCUIT_BREAKER_THRESHOLD=3

# Cost & Cache
LLM_COST_CAP_EUR=0.10
LLM_CACHE_TTL_SECONDS=60
```

### Endpoints Statistiques

```bash
GET /api/v1/ai/autofill/stats?days=7          # Métriques apply_rate, latency, sources
GET /api/v1/ai/autofill/stats/timeline?days=7 # Timeline jour par jour
GET /api/v1/ai/autofill/stats/leaderboard     # Top 10 utilisateurs
```

### Coûts Estimés

| Provider  | Model                 | Coût/req | Budget 100€/mois |
|-----------|-----------------------|----------|------------------|
| Mistral   | mistral-large-latest  | $0.003   | ~33k requêtes    |
| OpenAI    | gpt-4o-mini           | $0.0003  | ~333k requêtes   |
| Anthropic | claude-3.5-sonnet     | $0.007   | ~14k requêtes    |
| Ollama    | llama3.1:8b (local)   | $0       | Illimité         |

---

## 5️⃣ AI Agent (Duplicate Detection & Enrichment)

### Description
Agent IA pour détection doublons, enrichissement automatique et contrôle qualité.

### Stack
- **Backend:** [services/ai_agent.py](../crm-backend/services/ai_agent.py) (700 lignes)
- **API:** [api/routes/ai_agent.py](../crm-backend/api/routes/ai_agent.py) (600 lignes)
- **Frontend:** [app/dashboard/ai/](../crm-frontend/app/dashboard/ai/)
- **Models:** AISuggestion, AIExecution, AIConfiguration, AICache

### Endpoints (16 total)

```bash
# Tâches IA
POST /api/v1/ai/duplicates/detect          # Détection doublons
POST /api/v1/ai/enrich/organisations       # Enrichissement
POST /api/v1/ai/quality/check              # Contrôle qualité

# Suggestions
GET  /api/v1/ai/suggestions                # Liste suggestions
POST /api/v1/ai/suggestions/{id}/approve   # Approuver
POST /api/v1/ai/suggestions/{id}/reject    # Rejeter
GET  /api/v1/ai/suggestions/{id}/preview   # Preview avant application

# Batch Operations
POST /api/v1/ai/suggestions/batch/approve  # Approuver plusieurs (10-20x plus rapide)
POST /api/v1/ai/suggestions/batch/reject   # Rejeter plusieurs

# Monitoring
GET  /api/v1/ai/executions                 # Historique exécutions
GET  /api/v1/ai/statistics                 # Stats globales
GET  /api/v1/ai/config                     # Configuration
PATCH /api/v1/ai/config                    # Mise à jour config
```

### Configuration

```bash
# Provider
AI_DEFAULT_PROVIDER=claude  # ou openai, ollama
ANTHROPIC_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx

# Budgets
AI_DAILY_BUDGET_USD=10.0
AI_MONTHLY_BUDGET_USD=300.0

# Auto-Application
AI_AUTO_APPLY_ENABLED=false
AI_AUTO_APPLY_CONFIDENCE_THRESHOLD=0.95
AI_DUPLICATE_SIMILARITY_THRESHOLD=0.85
```

### Coûts Estimés

**Scénario modéré (recommandé):**
- 50 détections/semaine (200 organisations)
- 20 enrichissements/semaine
- **Coût:** $5-10/mois (Claude) ou $3-8/mois (GPT-4o)

**Production à grande échelle:**
- 1000 organisations/jour
- **Coût:** $100-200/mois avec budget management

---

## 📊 Monitoring & Métriques

### Dashboard AI Agent
- **Route:** `/dashboard/ai/agent`
- **Métriques:** Suggestions pending, coût total, confiance moyenne
- **Actions:** Détecter doublons, Enrichir, Contrôle qualité

### Dashboard Autofill V2
- **Route:** `/dashboard/ai/autofill`
- **Métriques:** Apply rate, latence, mix sources
- **Timeline:** 7/14/30/90 jours
- **Leaderboard:** Top 10 utilisateurs

### Alertes Recommandées

```bash
# Fallback LLM rate > 10%
sum(rate(llm_fallback_total[5m])) / sum(rate(llm_requests_total[5m])) > 0.10

# Coût quotidien > budget
sum(increase(llm_cost_eur[24h])) > 20

# Cache hit rate < 30%
sum(rate(llm_cache_hits[5m])) / sum(rate(llm_requests_total[5m])) < 0.30
```

---

## 🔒 Sécurité & RGPD

### API Keys Management
- ✅ Stockage en variables d'environnement
- ✅ Rotation régulière (3-6 mois)
- ❌ **JAMAIS** commit dans Git

### RGPD Compliance
- **AI User Preferences:** Auto-expiration 90 jours
- **Autofill Logs:** Anonymisation possible
- **Right to Deletion:** Endpoint `/ai/learning/cleanup`

### Rate Limiting
```python
@limiter.limit("10/minute")  # Max 10 req/min par user
async def get_autofill_statistics(...):
```

---

## 🧪 Tests

### Backend Tests

```bash
# Tests unitaires AI Learning
pytest tests/test_ai_learning_service.py

# Tests API Ollama
pytest tests/test_ai_ollama.py

# Tests LLM Router
pytest tests/test_llm_router.py

# Tests Autofill V2
pytest tests/test_autofill_service_v2.py
```

### Frontend Tests

```bash
# Tests composants
npm run test:unit

# Tests E2E Dashboard AI
npm run test:e2e -- --spec ai-agent-flow.cy.ts
```

---

## 📚 Documentation Complémentaire

- **API Interactive:** http://localhost:8000/api/v1/docs
- **Architecture Backend:** [crm-backend/README.md](../crm-backend/README.md)
- **Frontend Hooks:** [crm-frontend/hooks/useAI.ts](../crm-frontend/hooks/useAI.ts)
- **Alembic Migrations:** [DEV_GUIDE_ALEMBIC.md](./DEV_GUIDE_ALEMBIC.md)

---

## 🚀 Démarrage Rapide

### 1. Configuration Minimale

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxxxx  # OU
OPENAI_API_KEY=sk-xxxxx         # OU
OLLAMA_BASE_URL=http://localhost:11434

REDIS_HOST=redis
REDIS_PORT=6379
```

### 2. Migrations

```bash
cd crm-backend
alembic upgrade head
```

### 3. Test Services

```bash
# Test Ollama
curl http://localhost:8000/api/v1/ai/ollama/health

# Test Learning Stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/ai/learning/stats

# Test Autofill Stats
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/v1/ai/autofill/stats?days=7
```

---

**Total lignes IA:** ~13,500 lignes (Backend 9,500 + Frontend 4,000)
**Coût mensuel estimé:** $10-50 (selon utilisation)
**ROI:** 10h/semaine économisées (automatisation + apprentissage)
