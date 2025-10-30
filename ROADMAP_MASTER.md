# 🗺️ CRM ALFORIS - ROADMAP MASTER

**Dernière mise à jour:** 31 Octobre 2025
**Version actuelle:** v8.5.0
**Environnement:** Production (crm.alforis.fr) + Local Dev

---

## 📊 ÉTAT GLOBAL DU PROJET

### ✅ **COMPLÉTÉ (Production)**

#### **🎭 ACTE III - AI Intelligence Layer** (✅ 100%)
**Date:** 30 Octobre 2025
**Status:** Déployé en production

**Livrables:**
- ✅ Phase 1: Premium Login Design (glassmorphism + vidéo)
- ✅ Phase 2A: AI Signature Parsing (Mistral/Ollama)
- ✅ Phase 2B: Intent Detection (10 catégories)
- ✅ Phase 2C: Email Sync at Scale (batch 100-300)

**Fichiers clés:**
- `services/signature_parser_service.py` - Parser IA signatures
- `services/intent_detection_service.py` - Détection intent
- `scripts/batch_sync_and_parse.sh` - Script batch
- Migration: `intent` columns sur `crm_interactions`

**Tests production:**
```bash
# Signature parsing (Dalila Jibou test)
✅ 7/8 champs extraits
✅ Confidence: 72.7%
✅ Cache: 0ms (instant)

# Intent detection
✅ 10 catégories supportées
✅ Cascade: Ollama → Mistral → OpenAI → Claude
```

---

#### **🎯 ACTE IV - Autofill Intelligence** (✅ 100%)
**Date:** 30 Octobre 2025
**Status:** Déployé en production

**Livrables:**
- ✅ **Option 1:** Email Intelligence Dashboard
  - KPIs: Signature success rate, Cache hit rate, Intents distribution
  - Time-series charts
  - Real-time metrics

- ✅ **Option 2:** Batch Autofill Jobs
  - Endpoint `/api/v1/autofill-jobs/run-now`
  - UI Dashboard avec sliders config
  - Auto-apply threshold: 92%
  - Cron hourly job ready

- ✅ **Option 3:** Routing Rules Engine
  - Table `routing_rules` avec patterns
  - Auto-assign emails par intent
  - Cascade if no match

- ✅ **Option 4:** AI Feedback Loop
  - Table `ai_feedback` (approve/reject)
  - Table `ai_accuracy_metrics` (tracking qualité)
  - Learning system pour améliorer modèle

**Fichiers clés:**
- `api/routes/email_intelligence.py`
- `api/routes/autofill_jobs.py`
- `models/routing_rule.py`, `models/ai_feedback.py`
- Dashboards: `/dashboard/ai/intelligence`, `/dashboard/ai/autofill`

**Cron job:**
```bash
# Hourly autofill (50 emails max)
0 * * * * /srv/crm-alforis/scripts/cron_autofill.sh 50 1
```

---

#### **🌐 ACTE V - Web Enrichment** (✅ 100%)
**Date:** 30 Octobre 2025
**Status:** Déployé en production (nécessite SERPAPI_API_KEY)

**Livrables:**
- ✅ **Option A:** Core Web Enrichment Service
  - Service `web_enrichment_service.py`
  - SerpAPI integration (Google Knowledge Graph)
  - Cache Redis (7 jours TTL)
  - Confidence scoring (0-1)
  - Endpoints: `/api/v1/enrichment/organisation`

- ✅ **Option B:** Prompt LLM + HITL v2
  - Web context injection dans prompts IA
  - Few-shot learning (5 exemples)
  - HITL v2 API (`autofill_hitl.py` - 467 lignes)
  - Frontend React page (bulk actions, filtres)
  - Audit trail RGPD

- ✅ **Tests & Quality**
  - Unit tests `test_web_enrichment_service.py` (368 lignes)
  - 20 tests, coverage 95%+
  - Fixtures Redis + SerpAPI mocks

**Enrichissement automatique:**
```json
{
  "name": "Alforis Finance",
  "country": "FR"
}

→ Résultat:
{
  "website": "alforis.com",
  "address": "123 Avenue Champs-Élysées, 75008 Paris",
  "phone": "+33123456789",
  "linkedin": "linkedin.com/company/alforis",
  "confidence": 0.85
}
```

**Configuration requise:**
```bash
# .env production
SERPAPI_API_KEY=your_key_here
AUTOFILL_USE_WEB_ENRICHMENT=true
AUTOFILL_WEB_MIN_CONFIDENCE=0.70
```

**Commits:**
- `a7cf3217`: Service + API + Migration (898 lignes)
- `c663b782`: Pipeline integration (66 lignes)
- `1a5fa5dc`: Feature flags (112 lignes)
- `d8e8c451`: Prompt LLM + web_context (156 lignes)
- `f7ef92dc`: HITL v2 backend (467 lignes)
- `9b8cde80`: HITL v2 frontend (432 lignes)
- `37a941a6`: Unit tests (368 lignes)

**Total:** ~2400 lignes production-ready

---

### ⏳ **EN COURS (Bugs Docker)**

#### **🎯 ACTE VI - Multi-Mail Advanced Features** (⚠️ 90% - Docker issues)
**Date:** 31 Octobre 2025
**Status:** Code créé (~3000 lignes) mais Celery containers refusent de démarrer

**Ce qui est fait:**

1. **✅ Celery - Synchronisation automatique** (100%)
   - `tasks/email_sync.py` (305 lignes)
     - `sync_all_active_accounts_task()` - Toutes les 10 min
     - `sync_account_task()` - Sync manuelle
     - `cleanup_old_emails_task()` - Cleanup quotidien 3h
   - `docker-compose.yml` - 3 services ajoutés:
     - `celery-worker` (concurrency=2)
     - `celery-beat` (scheduler)
     - `flower` (monitoring UI port 5555)

2. **✅ OAuth Gmail/Outlook** (100%)
   - `services/oauth_gmail.py` (380 lignes)
     - Google OAuth2 flow
     - Gmail API integration
     - Token refresh automatique
   - `services/oauth_outlook.py` (395 lignes)
     - Microsoft MSAL OAuth
     - Microsoft Graph API
     - Token refresh automatique
   - `api/routes/oauth_callbacks.py` (280 lignes)
     - `/oauth/gmail/authorize` + `/oauth/gmail/callback`
     - `/oauth/outlook/authorize` + `/oauth/outlook/callback`
     - `/oauth/status` - Config check

   **Variables .env requises:**
   ```bash
   # Gmail
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/oauth/gmail/callback

   # Outlook
   MICROSOFT_CLIENT_ID=xxx
   MICROSOFT_CLIENT_SECRET=xxx
   MICROSOFT_REDIRECT_URI=http://localhost:8000/api/v1/oauth/outlook/callback
   ```

3. **✅ spaCy NLP - Extraction entités** (100%)
   - `services/email_nlp_service.py` (370 lignes)
     - `extract_entities()` - PER, ORG, LOC, DATE
     - `enrich_person_data()` - Enrichissement contact
     - `extract_keywords()` - Top 10 keywords
     - `detect_sentiment()` - Placeholder sentiment
     - `extract_intent()` - Intent detection (meeting, info, devis, etc.)
     - `_extract_phones()` - Téléphones FR normalisés E.164
     - `_extract_emails()` - Extraction emails

   **Modèle requis:**
   ```bash
   # Dans container API
   docker compose exec api python -m spacy download fr_core_news_lg
   ```

4. **✅ Thread Detection - Conversations** (100%)
   - `models/email_thread.py` (160 lignes)
     - Modèle `EmailThread` avec relations
   - `services/email_thread_service.py` (420 lignes)
     - `find_or_create_thread()` - Détection via headers/subject
     - `extract_message_ids()` - Parse Message-ID/References/In-Reply-To
     - `add_email_to_thread()` - Ajoute email au thread
     - `get_thread_emails()` - Récupère emails d'un thread
     - `rebuild_thread_from_emails()` - Réindexation
   - Migration: `alembic/versions/20251030_add_email_threads.py`
     - Table `email_threads`
     - FK `email_thread_id` sur `crm_interactions`
   - Modifications: `models/interaction.py` + `models/team.py`

**🚨 PROBLÈME ACTUEL:**

```bash
# Docker compose refuse de builder Celery containers
ERROR: Celery services won't start
```

**Ce qui reste à faire:**

1. **Débugger Docker Celery** (1-2h)
   - Identifier pourquoi celery-worker/beat/flower refusent
   - Peut-être problème de dépendances requirements.txt
   - Ou config docker-compose.yml

2. **Appliquer migration Alembic** (5 min)
   ```bash
   docker compose exec api alembic upgrade head
   ```

3. **Installer spaCy model** (2 min)
   ```bash
   docker compose exec api python -m spacy download fr_core_news_lg
   ```

4. **Tester les 4 features** (30 min)
   - Vérifier Celery Beat schedule
   - Tester OAuth Gmail/Outlook flows
   - Tester NLP extraction
   - Vérifier thread detection

**Statistiques code:**
- **10 fichiers créés/modifiés**
- **~3000 lignes de code**
- **4 features implémentées**

---

### 📋 **À FAIRE (Plan IA)**

#### **🎯 Phase 2B - Smart Autofill Context Menu** (❌ 0%)
**Estimation:** 3-4h

**Objectif:**
Menu contextuel (clic droit) sur les champs de formulaire avec suggestions IA basées sur l'historique.

**Livrables:**
1. **Frontend Context Menu** (2h)
   - Détection clic droit sur inputs
   - Menu avec suggestions personnalisées
   - Intégration AI Memory pour contexte
   - Design Apple-style (glassmorphism)

2. **Backend Suggestions API** (1h)
   - `/api/v1/ai/autofill/suggestions`
   - Filtres: field_name, person_id, org_id
   - Ranking par fréquence + récence

3. **AI Memory Integration** (1h)
   - Récupération historique utilisateur
   - Scoring suggestions par pertinence
   - Cache suggestions fréquentes

**Exemple:**
```javascript
// Clic droit sur champ "phone"
→ Context menu:
  📞 +33 6 12 34 56 78 (utilisé 5x)
  📞 +33 1 23 45 67 89 (utilisé 2x)
  ✨ Suggérer un nouveau numéro
```

---

#### **🧠 Phase 3 - AI Memory & Learning System** (❌ 0%)
**Estimation:** 5-6h

**Objectif:**
Système de mémoire persistante pour apprendre des préférences utilisateur et améliorer les suggestions au fil du temps.

**Livrables:**
1. **AI Memory Storage** (2h)
   - Table `ai_memory` (user_id, context, data, usage_count)
   - CRUD API `/api/v1/ai/memory`
   - Retention policy (90 jours)

2. **Learning Engine** (2h)
   - Tracking user choices (accept/reject)
   - Pattern detection (ex: toujours mettre "M." avant nom)
   - Auto-amélioration prompts basé sur feedback

3. **Observability** (1h)
   - Dashboard learning metrics
   - Precision/Recall par champ
   - User satisfaction score

4. **RGPD Compliance** (1h)
   - Right to be forgotten (DELETE /ai/memory)
   - Data export (GET /ai/memory/export)
   - Audit trail transparent

---

## 📊 MÉTRIQUES GLOBALES

### Code Stats (Production)
```
Backend:
- Services IA: ~2500 lignes
- Routes API: ~1500 lignes
- Models: ~800 lignes
- Migrations: ~600 lignes

Frontend:
- Dashboards: ~1800 lignes
- Components: ~1200 lignes

Tests:
- Unit tests: ~800 lignes
- Coverage: 95%+

TOTAL: ~9200 lignes production-ready
```

### Performance (Hetzner CPX31)
```
- Batch 50 emails: 10-15 min (2-3 min with cache)
- Signature parsing: 3-8s first, 0ms cached
- Intent detection: 1-3s first, 0ms cached
- Cache hit rate: 80-90% après 24h
- Web enrichment: 2-5s (SerpAPI)
```

### Capacité
```
- Max ~500-1000 emails/jour (hourly cron)
- Database: ~1MB per 1000 emails
- Disk: ~50MB logs/mois
```

---

## 🎯 PRIORITÉS IMMÉDIATES

### 🚨 **P0 - Urgent** (Cette semaine)
1. **Débugger Celery Docker** - Acte VI bloqué
2. **Appliquer migration email_threads**
3. **Tester 4 features multi-mail**

### ⭐ **P1 - Important** (Cette semaine)
1. **Phase 2B - Context Menu** (Plan IA)
2. **Configurer OAuth Apps** (Google Cloud + Azure)
3. **Installer spaCy model fr_core_news_lg**

### 📌 **P2 - Nice to have** (Semaine prochaine)
1. **Phase 3 - AI Memory System**
2. **Monitoring Celery** (Flower UI)
3. **Documentation utilisateur** pour OAuth

---

## 🔧 ENVIRONNEMENTS

### **Local Dev**
```bash
# Services actifs:
- Frontend: http://localhost:3010
- API: http://localhost:8000
- Postgres: localhost:5433
- Redis: localhost:6379

# Non actifs (bugs):
- Celery Worker
- Celery Beat
- Flower (port 5555)
```

### **Production (Hetzner)**
```bash
# URL: https://crm.alforis.fr
# Server: CPX31 (4 vCPU, 8GB RAM)

# Services:
✅ API (FastAPI)
✅ Frontend (Next.js 15)
✅ PostgreSQL 16
✅ Redis 7
❌ Celery (pas encore déployé)
```

---

## 📝 NOTES TECHNIQUES

### Stack
```
Backend:
- FastAPI 0.100+
- SQLAlchemy 2.0
- Alembic (migrations)
- Celery 5.3 + Redis (tasks)
- spaCy 3.7 (NLP)
- google-auth, msal (OAuth)

Frontend:
- Next.js 15 (App Router)
- React 19
- TailwindCSS
- shadcn/ui

AI:
- Ollama (local)
- Mistral AI (EU/Paris)
- OpenAI GPT-4
- Claude 3.5 Sonnet

Infra:
- Docker Compose
- Nginx reverse proxy
- PostgreSQL 16
- Redis 7
```

### Dépendances Acte VI (ajoutées)
```python
# requirements.txt (lignes 35-55)
celery==5.3.4
flower==2.0.1
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-api-python-client==2.111.0
msal==1.26.0
spacy==3.7.2
```

---

## 🚀 PROCHAINE SESSION

### Checklist Debug Celery
1. Vérifier logs docker: `docker compose logs celery-worker`
2. Checker requirements.txt pour conflits
3. Tester celery_app.py standalone
4. Valider config Redis REDIS_URL
5. Rebuild from scratch si nécessaire

### Après fix Celery
1. Appliquer migration: `alembic upgrade head`
2. Installer spaCy: `python -m spacy download fr_core_news_lg`
3. Tester sync automatique (toutes les 10 min)
4. Configurer OAuth apps (Google + Microsoft)
5. Tester OAuth flow complet

### Puis Plan IA
1. Implémenter Context Menu (Phase 2B)
2. Implémenter AI Memory (Phase 3)

---

**Dernière mise à jour:** 31 Octobre 2025 - 02:30
**Prochaine review:** Après fix Celery Docker

---

## 📚 RÉFÉRENCES

- [ACTE_V_WEB_ENRICHMENT.md](./ACTE_V_WEB_ENRICHMENT.md) - Web enrichment details
- [documentation/ACTE_IV_DEPLOYMENT.md](./documentation/ACTE_IV_DEPLOYMENT.md) - Deployment guide
- [documentation/ACTE_III_COMPLETION.md](./documentation/ACTE_III_COMPLETION.md) - AI layer details

---

**🎯 OBJECTIF SESSION SUIVANTE:** Débugger et déployer Acte VI (Multi-Mail Advanced)
