# 🤖 LLM Configuration Guide

**Date:** 2025-10-28
**Service:** Autofill V2 - LLM Fallback

---

## 📋 Overview

L'Autofill V2 utilise un **LLM Router** avec fallback automatique entre 4 providers :
1. **Mistral** (primary, si configuré)
2. **OpenAI** (fallback #1)
3. **Anthropic** (fallback #2)
4. **Ollama** (fallback #3, local)

Le router gère automatiquement :
- ✅ Circuit breaker (bloque provider après N échecs)
- ✅ Retry avec backoff exponentiel
- ✅ Cache TTL (60s par défaut)
- ✅ Cost cap par requête (0.10€ par défaut)
- ✅ Timeout configurable

---

## 🔑 Environment Variables

### Providers Configuration

```bash
# ===== Mistral (recommandé) =====
MISTRAL_API_KEY=your_mistral_api_key
MISTRAL_API_BASE=https://api.mistral.ai  # Default
LLM_PRIMARY_MODEL=mistral-large-latest    # ou mistral-medium

# ===== OpenAI =====
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4o-mini                  # ou gpt-4o
OPENAI_MAX_TOKENS=500

# ===== Anthropic =====
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # ou claude-3-opus
ANTHROPIC_MAX_TOKENS=500

# ===== Ollama (local, optionnel) =====
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_MODEL=mistral:7b
```

---

### Router Configuration

```bash
# ===== Provider Selection =====
LLM_PRIMARY_PROVIDER=auto              # ou "mistral", "openai", "anthropic", "ollama"
LLM_SECONDARY_PROVIDER=auto            # Fallback si primary échoue
LLM_PROVIDER_ORDER=mistral,openai,anthropic,ollama  # Ordre de fallback

# ===== Performance =====
LLM_LATENCY_BUDGET_MS=600              # Budget latence max pour autofill
LLM_REQUEST_TIMEOUT_MS=10000           # Timeout HTTP (10s)
LLM_TIMEOUT_MS=8000                    # Timeout global provider

# ===== Circuit Breaker =====
LLM_CIRCUIT_BREAKER_THRESHOLD=3        # Bloque provider après 3 échecs
LLM_CIRCUIT_BREAKER_COOLDOWN_SECONDS=60  # Cooldown avant retry

# ===== Cost & Retry =====
LLM_COST_CAP_EUR=0.10                  # Cap coût par requête (€)
LLM_MAX_RETRIES=1                      # Retry max avant fallback

# ===== Cache =====
LLM_CACHE_TTL_SECONDS=60               # Cache réponses identiques (60s)
```

---

## 🚀 Configuration Recommandée par Environnement

### Development (coût zéro)

```bash
# Pas de LLM en dev → autofill utilise rules + DB patterns uniquement
# Ou Ollama local si tu veux tester
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
LLM_PRIMARY_PROVIDER=ollama
```

### Staging (budget limité)

```bash
# OpenAI primary, pas de fallback coûteux
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini              # Pas cher (~$0.15/1M tokens)
LLM_PRIMARY_PROVIDER=openai
LLM_COST_CAP_EUR=0.05                 # Cap à 5 centimes/requête
LLM_LATENCY_BUDGET_MS=600
```

### Production (fiabilité max)

```bash
# Mistral primary, OpenAI fallback, Anthropic fallback #2
MISTRAL_API_KEY=...
MISTRAL_API_BASE=https://api.mistral.ai
LLM_PRIMARY_MODEL=mistral-large-latest

OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

LLM_PRIMARY_PROVIDER=mistral
LLM_SECONDARY_PROVIDER=openai
LLM_PROVIDER_ORDER=mistral,openai,anthropic

LLM_COST_CAP_EUR=0.10
LLM_LATENCY_BUDGET_MS=600
LLM_MAX_RETRIES=1
LLM_CIRCUIT_BREAKER_THRESHOLD=3
LLM_CACHE_TTL_SECONDS=60
```

---

## 💰 Coût Estimation

### Tarifs providers (per 1M tokens input/output)

| Provider  | Model                        | Input  | Output | Moyen/req |
| --------- | ---------------------------- | ------ | ------ | --------- |
| Mistral   | mistral-large-latest         | $2     | $6     | ~$0.003   |
| Mistral   | mistral-medium-latest        | $0.7   | $2.1   | ~$0.001   |
| OpenAI    | gpt-4o-mini                  | $0.15  | $0.60  | ~$0.0003  |
| OpenAI    | gpt-4o                       | $2.50  | $10    | ~$0.005   |
| Anthropic | claude-3-5-sonnet-20241022   | $3     | $15    | ~$0.007   |
| Anthropic | claude-3-opus                | $15    | $75    | ~$0.035   |
| Ollama    | mistral:7b (local)           | FREE   | FREE   | $0        |

**Note:** Moyen/req basé sur ~500 tokens input + 200 tokens output pour autofill.

### Budget mensuel recommandé

- **Staging:** 100€/mois → ~33k requêtes LLM (avec gpt-4o-mini)
- **Production:** 500€/mois → ~50k requêtes LLM (avec mistral-large)
  - Avec cache 60s + rules/DB patterns, ~70% des autofills n'appellent pas le LLM
  - Donc 50k LLM calls = ~170k autofills totaux

---

## 🔍 Monitoring & Alerting

### Métriques à surveiller

1. **Fallback rate**: % d'appels qui utilisent le fallback
   - ✅ < 5% : normal (timeouts occasionnels)
   - ⚠️ 5-10% : surveiller
   - 🔴 > 10% : alerter (provider primary en panne)

2. **Cost per day**: Coût total LLM/jour
   - ✅ < 5€/jour : normal staging
   - ⚠️ 5-20€/jour : surveiller
   - 🔴 > 20€/jour : alerter (spam ou bug)

3. **Cache hit rate**: % d'appels servis depuis cache
   - ✅ > 30% : bon
   - ⚠️ 10-30% : acceptable
   - 🔴 < 10% : cache inefficace

4. **Latency p95**: 95e percentile de latence LLM
   - ✅ < 600ms : excellent
   - ⚠️ 600-1000ms : acceptable
   - 🔴 > 1000ms : trop lent

### Grafana Dashboard (à créer - Phase 3)

```sql
-- Fallback rate (Prometheus)
sum(rate(llm_fallback_total[5m])) / sum(rate(llm_requests_total[5m]))

-- Cost per day
sum(increase(llm_cost_eur[24h]))

-- Cache hit rate
sum(rate(llm_cache_hits[5m])) / sum(rate(llm_requests_total[5m]))

-- Latency p95
histogram_quantile(0.95, rate(llm_latency_ms_bucket[5m]))
```

---

## 🧪 Testing LLM Router

### Test manuel en dev

```bash
# 1. Vérifier configuration
docker-compose exec api python3 -c "
from services.llm_router import LLMRouter
router = LLMRouter()
print(router.describe())
"

# 2. Test appel LLM (nécessite OPENAI_API_KEY ou autre)
docker-compose exec api python3 -c "
import asyncio
from services.llm_router import LLMRouter

async def test():
    router = LLMRouter()
    result = await router.generate_autofill_context(
        draft={'raw_snippet': 'John Doe | john@example.com | +33 6 12 34 56 78'},
        suggestions={}
    )
    print(f'Provider: {result.provider}')
    print(f'Latency: {result.latency_ms}ms')
    print(f'Cost: {result.cost_eur}€')
    print(f'Content: {result.content[:100]}...')

asyncio.run(test())
"
```

### Test avec données réelles

```bash
# Déclencher autofill sur un contact
curl -X POST http://localhost:8000/api/v1/ai/autofill \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "draft": {
      "raw_snippet": "Jean Dupont | Directeur Marketing | jean.dupont@mandarine-gestion.com | +33 1 23 45 67 89",
      "first_name": "Jean",
      "last_name": "Dupont"
    },
    "context": {
      "budget_mode": "normal"
    }
  }'
```

---

## 🔒 Security Best Practices

1. **API Keys Storage**
   - ✅ Stocke les clés dans des secrets (Kubernetes Secrets, AWS Secrets Manager)
   - ❌ **JAMAIS** commit les clés dans le code ou .env versionné
   - ✅ Utilise des variables d'env avec rotation régulière

2. **Rate Limiting**
   - ✅ Limite 10 req/min par user sur `/ai/autofill`
   - ✅ Cost cap par requête (0.10€ max)
   - ✅ Circuit breaker pour éviter spam si provider down

3. **Logging**
   - ✅ Log les métriques (provider, latency, cost, tokens)
   - ❌ **NE PAS** logger les API keys ou les prompts complets (RGPD)
   - ✅ Hash les payloads pour cache (SHA256)

4. **Fallback Graceful**
   - ✅ Si tous les providers échouent, autofill fonctionne quand même (rules + DB patterns)
   - ✅ Pas d'erreur 500, juste un warning dans les logs

---

## 📊 Decision actée (2025-10-28)

**Configuration initiale prod:**
```bash
LLM_PRIMARY_PROVIDER=auto
OPENAI_API_KEY=sk-...           # Fourni
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=sk-ant-...    # Fourni
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

LLM_LATENCY_BUDGET_MS=600
LLM_REQUEST_TIMEOUT_MS=10000
LLM_MAX_RETRIES=1
LLM_COST_CAP_EUR=0.05           # 5 centimes/requête
LLM_CIRCUIT_BREAKER_THRESHOLD=3
LLM_CACHE_TTL_SECONDS=60
```

**Budget mensuel initial:** 100€ (ajustable après 1 semaine d'observation)

**Alerte si:** Coût/jour > 5€ ou fallback rate > 10%

---

## 🔗 Liens Utiles

- [Mistral Pricing](https://mistral.ai/technology/#pricing)
- [OpenAI Pricing](https://openai.com/pricing)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Ollama Models](https://ollama.ai/library)

---

**Prêt pour Phase 1 ✅**
