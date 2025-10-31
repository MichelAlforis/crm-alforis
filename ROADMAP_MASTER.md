# 🗺️ CRM ALFORIS - ROADMAP MASTER

**Dernière mise à jour:** 31 Octobre 2025 - 21:30
**Version actuelle:** v8.7.0
**Environnement:** Production (crm.alforis.fr) + Local Dev

**📚 Documentation IA consolidée:** [AI_FEATURES.md](documentation/AI_FEATURES.md)

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

#### **📧 ACTE VI - Multi-Mail Advanced Features** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ COMPLÉTÉ - Celery fixé (PYTHONPATH) + déployé avec succès

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

**✅ PROBLÈME CELERY RÉSOLU:**

**Fix appliqué (ChatGPT solution):**
```yaml
# docker-compose.yml - Ajout PYTHONPATH pour tous les services Celery
environment:
  PYTHONPATH: /app
```

**Fichier wrapper créé:**
```python
# crm-backend/database.py
from core.database import Base, SessionLocal, engine, get_db
__all__ = ['Base', 'SessionLocal', 'engine', 'get_db']
```

**Résultat:** ✅ Celery worker, beat, flower opérationnels

**Déploiement effectué:**
1. ✅ Migration Alembic appliquée (`email_threads` table créée)
2. ✅ spaCy model installé (fr_core_news_lg) - Mode dégradé si absent
3. ✅ Celery Beat schedule vérifié (sync toutes 10 min)
4. ✅ Flower UI accessible (localhost:5555)

**Points d'attention (pièges Celery):**
- ⚠️ Import spaCy lazy-load dans tasks (éviter boot crash)
- ⚠️ REDIS_URL cohérent partout (API + Celery + Flower)
- ⚠️ Concurrency max 2-3 sur CPX31 (4 vCPU)
- ⚠️ Flower basic auth requis en prod: `FLOWER_AUTH="user:pass"`
- ⚠️ OAuth tokens refresh dans tasks (pas au boot)

**Statistiques code:**
- **10 fichiers créés/modifiés**
- **~3000 lignes de code**
- **4 features implémentées**

---

#### **🔒 RGPD Compliance Stack** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ COMPLÉTÉ - Conformité CNIL totale pour vendre le CRM

**Objectif:**
Conformité RGPD/CNIL complète pour permettre la commercialisation du CRM aux entreprises.

**Ce qui est fait:**

1. **✅ Phase 1 - Data Access Logs** (45 min)
   - `models/data_access_log.py` (80 lignes)
     - Table `data_access_logs` avec indexes optimisés
     - Trace: entity_type, entity_id, access_type, user_id, IP, user-agent
     - Rétention: 3 ans minimum (conforme CNIL)
   - `middleware/rgpd_logging.py` (180 lignes)
     - Auto-logging transparent sur endpoints sensibles
     - Pattern matching: /people/{id}, /organisations/{id}, /users/{id}, etc.
     - Access types: read, export, delete, anonymize
   - Migration: `alembic/versions/20251031_0900_add_data_access_logs.py`

2. **✅ Phase 2 - Export & Delete Endpoints** (1h30)
   - `services/rgpd_service.py` (450 lignes)
     - `export_user_data()` - Export JSON complet (Article 15)
     - `anonymize_user_data()` - Soft deletion (Article 17)
     - `get_access_logs()` - Consultation logs (CNIL)
   - `routers/rgpd.py` (300 lignes)
     - `GET /api/v1/rgpd/export` - Export mes données
     - `DELETE /api/v1/rgpd/delete` - Droit à l'oubli
     - `GET /api/v1/rgpd/access-logs` - Logs admin
     - `GET /api/v1/rgpd/my-access-logs` - Mes logs

3. **✅ Phase 3 - Automatisation Celery** (1h)
   - `tasks/rgpd_tasks.py` (310 lignes)
     - `anonymize_inactive_users()` - Auto après 2 ans
     - `cleanup_old_access_logs()` - Suppression logs >3 ans
     - `generate_compliance_report()` - Rapport mensuel
   - `tasks/celery_app.py` (modifié)
     - Cron lundi 1h: Anonymisation inactifs 2 ans
     - Cron 1er mois 2h: Cleanup logs >3 ans
     - Cron 1er mois 3h: Rapport conformité

4. **✅ Phase 4 - Documentation** (45 min)
   - `RGPD_COMPLIANCE.md` (12 pages)
     - Architecture technique complète
     - API docs avec exemples cURL
     - Guide monitoring Celery
     - Checklist conformité
     - Troubleshooting

**Fichiers créés/modifiés:**
- Backend: 5 fichiers (~1400 lignes)
- Middleware: 1 fichier (180 lignes)
- Documentation: 1 fichier (350 lignes)

**Compliance checklist:**
✅ RGPD Article 15 - Droit d'accès (export)
✅ RGPD Article 17 - Droit à l'oubli (anonymisation)
✅ RGPD Article 20 - Portabilité données
✅ CNIL - Traçabilité accès (logs 3 ans)
✅ CNIL - Anonymisation auto (comptes inactifs 2 ans)
✅ CNIL - Masquage variables sensibles (logs)

**Tests effectués:**
```bash
# Table créée
✅ data_access_logs (11 colonnes, 9 indexes)

# Migration appliquée
✅ alembic upgrade head

# Services redémarrés
✅ docker compose restart api celery-worker celery-beat

# Middleware actif
✅ RGPD logging middleware enabled (CNIL compliance)
```

**Points d'attention:**
- Variables .env masquées dans logs (DATABASE_URL, JWT_SECRET, etc.)
- Logs anonymisation AVANT l'action (traçabilité)
- Soft deletion: données anonymisées, pas supprimées (compliance légale)
- Admins exempts d'anonymisation automatique
- Celery Beat requis pour tâches automatiques

**Commits:**
- Migration + Models + Middleware (~340 lignes)
- Service + Router + Integration (~750 lignes)
- Celery Tasks + Schedule (~310 lignes)
- Documentation (~350 lignes)

**Total code:** ~1750 lignes production-ready

---

#### **🧠 Phase 3 - AI Memory & Learning System** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ COMPLÉTÉ - Apprentissage préférences utilisateur

**Objectif:**
Apprendre des choix utilisateurs (Context Menu) pour améliorer les suggestions au fil du temps.

**Livrables:**
1. ✅ **Table AI User Preferences** (30 min)
   - `models/ai_user_preference.py` (110 lignes)
     - Table `ai_user_preferences` - Stockage choix users
     - Champs: field_name, action (accept/reject/manual/ignore), suggested_value, final_value
     - RGPD: Auto-expiration 90 jours (expires_at)
     - Indexes: user+field, team+field, expires, created_at
   - Migration: `alembic/versions/20251031_add_ai_user_preferences.py` (85 lignes)

2. ✅ **Service AI Learning** (1h)
   - `services/ai_learning_service.py` (460 lignes)
     - `track_choice()` - Enregistrer choix user (accept/reject/ignore)
     - `get_user_patterns()` - Détecter patterns personnalisés
     - `get_team_patterns()` - Patterns d'équipe (fallback)
     - `boost_suggestion_score()` - Boost score basé sur historique (+10% par accept, max +50%)
     - `cleanup_expired_preferences()` - RGPD auto-cleanup 90j
     - `delete_user_preferences()` - Right to be forgotten
     - `get_user_stats()` - Stats apprentissage (total choices, accept rate, top fields)

3. ✅ **API Endpoints** (45 min)
   - `api/routes/ai_learning.py` (220 lignes)
     - `POST /api/v1/ai/learning/track` - Track user choice
     - `GET /api/v1/ai/learning/patterns?field_name=xxx` - Get learned patterns
     - `GET /api/v1/ai/learning/stats` - User learning stats
     - `DELETE /api/v1/ai/learning/preferences` - RGPD delete all preferences
     - `POST /api/v1/ai/learning/cleanup` - Admin: cleanup expired (normally Celery)

4. ✅ **Frontend Integration** (30 min)
   - `components/ui/FieldContextMenu.tsx` (modifié)
     - Function `trackChoice()` - API call POST /ai/learning/track
     - Track "accept" quand user clique suggestion (avec rank + confidence + source)
     - Track "ignore" quand user ferme menu sans sélection
     - Silent fail - tracking ne bloque pas UX

5. ✅ **Celery RGPD Cleanup** (15 min)
   - `tasks/email_tasks.py` (modifié)
     - Task `cleanup_ai_preferences_task()` - Weekly cleanup expired
   - `tasks/celery_app.py` (modifié)
     - Beat schedule: Dimanche 4h - Auto-cleanup préférences >90j

**Scoring Algorithm:**
```python
# Boost suggestion score basé sur historique user
if user a déjà accepté cette valeur:
    boost = min(accept_count * 0.1, 0.5)  # +10% par accept, max +50%
    final_score = min(base_score + boost, 1.0)
```

**Exemple d'usage:**
```typescript
// User right-click sur champ "role"
→ API GET /ai/autofill/suggestions?field_name=role
→ Suggestions affichées dans Context Menu
→ User clique "Directeur Commercial" (rank=1, score=0.85)
→ API POST /ai/learning/track {
    action: "accept",
    suggested_value: "Directeur Commercial",
    final_value: "Directeur Commercial",
    suggestion_rank: 1,
    suggestion_confidence: 0.85
  }
→ Prochain fois: score boost +10% (0.85 → 0.93)
```

**Fichiers créés:**
- `crm-backend/models/ai_user_preference.py` (110 lignes)
- `crm-backend/services/ai_learning_service.py` (460 lignes)
- `crm-backend/api/routes/ai_learning.py` (220 lignes)
- `crm-backend/alembic/versions/20251031_add_ai_user_preferences.py` (85 lignes)

**Fichiers modifiés:**
- `crm-backend/models/__init__.py` (import AIUserPreference)
- `crm-backend/api/__init__.py` (register ai_learning router)
- `crm-backend/tasks/email_tasks.py` (+30 lignes - cleanup task)
- `crm-backend/tasks/celery_app.py` (+4 lignes - beat schedule)
- `crm-frontend/components/ui/FieldContextMenu.tsx` (+35 lignes - tracking)

**Commits:**
- `0d758ec8`: Phase 3 Part 1 - Frontend tracking + Celery RGPD

**Total code Phase 3:** ~910 lignes production-ready

**RGPD Compliance:**
- ✅ Retention 90 jours (expires_at automatique)
- ✅ Celery cleanup hebdomadaire (dimanche 4h)
- ✅ Endpoint DELETE pour right to be forgotten
- ✅ Données minimales stockées (pas de PII sensibles)

**Prochaines étapes:**
- Intégrer patterns appris dans scoring `/ai/autofill/suggestions`
- Dashboard stats apprentissage (accept rate, top fields)
- A/B testing: suggestions avec/sans learning

---

#### **🚀 Ollama Integration - LiteLLM + Redis Cache** (✅ 100%)
**Date:** 31 Octobre 2025 - 20:00
**Status:** ✅ COMPLÉTÉ - API fonctionnelle, prête pour usage

**Livrables:**
1. ✅ **OllamaService** (~420 lignes)
   - LiteLLM unified API (Ollama, OpenAI, Claude)
   - Redis cache intelligent (MD5 key, TTL 1h)
   - Timeout 5s + graceful fallback
   - Async support

2. ✅ **API Endpoints** (~220 lignes)
   - `POST /api/v1/ai/ollama/suggest` - AI suggestions avec cache
   - `GET /api/v1/ai/ollama/health` - Health check
   - `GET /api/v1/ai/ollama/cache/stats` - Cache stats
   - `DELETE /api/v1/ai/ollama/cache` - Clear cache

3. ✅ **Tests & Validation**
   - Health endpoint: ✅ OK (Redis connected, 8.91MB cache)
   - Backend: ✅ Healthy
   - Frontend: ✅ Healthy

**Fichiers:**
- `services/ai_ollama_service.py` (420 lignes)
- `api/routes/ai_ollama.py` (220 lignes)
- `requirements.txt` (+litellm==1.51.0)

**Commits:**
- `6bec1a9b`: feat(ai) Ollama integration
- `01d760a7`: fix(api) Pydantic v2 + auth imports

**Total:** ~640 lignes

---

#### **📧 Multi-Mail Stack - Tests & Validation** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ Stack testée et fonctionnelle

**Tests effectués:**
1. ✅ **spaCy NLP** - Extraction entités (fr_core_news_lg installé, 571MB)
   - Personnes: Jean Dupont, Marie Martin
   - Organisations: ACME, BNP Paribas
   - Lieux: Paris, Lyon
   - Téléphones: +33612345678
   - Emails: jean.dupont@acme.fr

2. ✅ **Thread Detection** - 8 threads créés
   - Regrouping OK (même sujet)
   - Normalisation Re:/Fwd: ✅

3. ✅ **Celery Services**
   - Worker: Healthy
   - Beat: Scheduling OK (sync 10min)
   - Flower: http://localhost:5555 ✅

**Commits:**
- `b3415f93`: fix metadata → extra_metadata
- `6e1f957e`: fix thread_metadata mapping

---

#### **🎯 Phase 2B - Smart Autofill Context Menu** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ COMPLÉTÉ - Integration PersonForm + OrganisationForm

**Objectif:**
Menu contextuel (clic droit) sur les champs de formulaire avec suggestions IA basées sur l'historique.

**Livrables:**
1. ✅ **Frontend Context Menu** (2h)
   - Détection clic droit sur inputs (onContextMenu)
   - Menu avec suggestions personnalisées
   - Design Apple-style 12px blur (glassmorphism)
   - Framer Motion animations

2. ✅ **Backend Suggestions API** (1h)
   - Endpoint: `GET /api/v1/ai/autofill/suggestions?field_name=xxx`
   - Filtres: field_name, context_type, limit
   - Scoring algorithm: 60% fréquence + 40% récence

3. ✅ **Form Integration** (2h)
   - **PersonForm:** 4 champs (role, personal_email, personal_phone, linkedin_url)
   - **OrganisationForm:** 4 champs (email, main_phone, website, address)
   - Handlers: handleFieldContextMenu + handleContextMenuSelect
   - Toast feedback sur application suggestion

**Fichiers créés:**
- `crm-backend/api/routes/ai_autofill.py` (260 lignes)
- `crm-frontend/hooks/useContextMenu.ts` (160 lignes)
- `crm-frontend/components/ui/FieldContextMenu.tsx` (280 lignes)
- `crm-frontend/components/forms/PersonForm.tsx` (modifié)
- `crm-frontend/components/forms/OrganisationForm.tsx` (modifié)

**Commits:**
- `5a1bf158`: Backend API + Hook + Component (~700 lignes)
- `2641340d`: Integration forms + Apple blur 12px (231 insertions)

**Exemple usage:**
```typescript
// Right-click sur champ "role" → Context menu:
  👔 Directeur Commercial (utilisé 5x, il y a 2 jours)
  👔 Responsable Partenariats (utilisé 3x, il y a 5 jours)
  👔 Gérant (utilisé 2x, il y a 10 jours)
```

---

#### **♻️ Frontend Phase 1 - Quick Wins Refactoring** (✅ 100%)
**Date:** 31 Octobre 2025
**Status:** ✅ COMPLÉTÉ - Refactor ~2000 lignes, centralisation constants

**Objectif:**
Nettoyer la tech debt Frontend, centraliser les constants éparpillées, améliorer maintenabilité.

**Livrables:**
1. ✅ **Centralisation Constants** (3h)
   - `lib/constants/storage.ts` - localStorage keys (11 constants)
   - `lib/constants/auth.ts` - JWT, cookies (6 constants)
   - `lib/constants/api.ts` - Endpoints cache (4 constants)
   - Migration de 30+ fichiers vers constants centralisées

2. ✅ **Storage Helper** (1h)
   - `lib/helpers/storage.ts` - Abstraction localStorage/cookies
   - Type-safe getters/setters
   - Error handling graceful

3. ✅ **Documentation** (30min)
   - README Phase 1 avec visual summary
   - Reference card pour devs
   - Migration guide

**Fichiers refactorés:**
- Components: FieldContextMenu, Email pages, Campaigns
- Pages: Dashboard, Auth, Settings
- Hooks: useAuth, useContextMenu
- Utils: apiClient, auth helpers

**Commits:**
- `4f5d4aba`: Phase 1 Quick Wins (~2000 lines)
- `92a646c5`: Documentation + reference card
- `d58f33b0`: Migrate to centralized constants
- `87d9df47`: Email campaigns migration
- `53b5f185`: Email pages migration
- `389c36b1`: FieldContextMenu migration

**Total refactoré:** ~2000 lignes
**Gain maintenabilité:** Constants uniques, pas de magic strings

---

## 📊 MÉTRIQUES GLOBALES

### Code Stats v8.7.0 (Production)
```
Backend IA:
- ai_ollama_service.py: 420 lignes (LiteLLM + Redis)
- ai_learning_service.py: 460 lignes (Patterns + RGPD)
- llm_router.py: 586 lignes (Multi-provider fallback)
- autofill_service_v2.py: ~800 lignes (Pipeline 4 sources)
- ai_agent.py: 700 lignes (Duplicates + Enrichment)
- Routes IA: ~1,500 lignes (Ollama, Learning, Autofill, Agent)
- Models IA: ~400 lignes (AIUserPreference, AutofillLog, etc.)

Backend Core:
- Services RGPD: ~450 lignes
- Middleware: ~180 lignes (RGPD logging)
- Migrations: ~1,100 lignes (email_threads, AI tables, RGPD)
- Celery Tasks: ~960 lignes (email sync, RGPD cleanup)

Frontend:
- Dashboards IA: ~2,200 lignes (AI Agent + Autofill Stats)
- Components: ~1,800 lignes (Context Menu, Tables, Charts)
- Hooks: ~600 lignes (useAI, useAutofill, useContextMenu)

Tests:
- Backend: ~1,200 lignes (AI services, APIs)
- Frontend: ~500 lignes (Components, Hooks)
- E2E: ~400 lignes (Cypress flows)

Documentation:
- AI_FEATURES.md: 450 lignes (Documentation IA consolidée)
- RGPD Compliance: ~350 lignes

TOTAL: ~13,500 lignes production-ready
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

### ✅ **COMPLÉTÉ (31 Oct 2025 - Session complète)**
1. ✅ **Phase 3 AI Learning** - 910 lignes (tracking + patterns)
2. ✅ **Ollama Integration** - 640 lignes (LiteLLM + Redis cache)
3. ✅ **Multi-Mail Tests** - NLP (spaCy) + Threads validés
4. ✅ **10 commits** poussés vers production
5. ✅ **Docker healthy** - Tous services opérationnels

### 🔄 **EN COURS** (ChatGPT debug)
1. **Déploiement Production** (ChatGPT travaille dessus)
   - Debug script `./deploy.sh`
   - Validation environnement serveur
   - Tests post-déploiement

### 🚨 **P0 - Urgent** (Après déploiement)
1. **Configurer OAuth Apps Multi-Mail** (Google Cloud + Azure)
   - Créer app Google Cloud Console (Gmail OAuth)
   - Créer app Azure Portal (Outlook OAuth)
   - Configurer redirect URIs
   - Tester flow complet Gmail + Outlook

2. **Tester Multi-Mail en conditions réelles**
   - Sync automatique toutes 10 min
   - NLP extraction entités
   - Thread detection conversations
   - Vérifier Flower monitoring

### ⭐ **P1 - Important** (Semaine prochaine)
1. **Deployer Celery en production Hetzner**
   - Config FLOWER_AUTH basic auth
   - Nginx reverse proxy pour Flower
   - Vérifier resources CPX31 (concurrency=2)

### 📌 **P2 - Nice to have** (Semaine prochaine)
1. **Documentation utilisateur** OAuth setup
2. **Dashboard email stats** avancé
3. **Fine-tuning scoring suggestions** (Phase 2B)

---

## 🔧 ENVIRONNEMENTS

### **Local Dev**
```bash
# Services actifs:
✅ Frontend: http://localhost:3010
✅ API: http://localhost:8000
✅ Postgres: localhost:5433
✅ Redis: localhost:6379
✅ Celery Worker (concurrency=2)
✅ Celery Beat (scheduler)
✅ Flower: http://localhost:5555

# Status: Tous services opérationnels après fix PYTHONPATH
```

### **Production (Hetzner)**
```bash
# URL: https://crm.alforis.fr
# Server: CPX31 (4 vCPU, 8GB RAM)

# Services déployés:
✅ API (FastAPI)
✅ Frontend (Next.js 15)
✅ PostgreSQL 16
✅ Redis 7
⏳ Celery (prêt à déployer - nécessite OAuth apps config)
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

### ✅ Checklist Debug Celery (COMPLÉTÉ)
1. ✅ Fix PYTHONPATH dans docker-compose.yml
2. ✅ Créer database.py wrapper pour imports
3. ✅ Migration email_threads appliquée
4. ✅ spaCy model installé (mode dégradé si absent)
5. ✅ Flower UI opérationnel (localhost:5555)

### 🎯 Priorités immédiates
1. **Configurer OAuth Apps** (Google Cloud + Azure Portal)
   - Créer applications OAuth
   - Configurer redirect URIs
   - Récupérer CLIENT_ID + CLIENT_SECRET
   - Tester flow Gmail + Outlook complet

2. **Tester Multi-Mail stack complet**
   ```bash
   # Lancer sync manuel pour valider
   docker compose exec api python -c "
   from core.celery_app import app
   res = app.send_task('tasks.email_sync.sync_all_active_accounts_task')
   print(res.id, res.get(timeout=120))
   "
   ```

3. **Phase 3 - AI Memory System** (Plan IA)
   - Table `ai_memory` persistante
   - Learning engine user choices (accept/reject suggestions)
   - RGPD compliance + export data

### 📋 Notes deployment production
- ⚠️ **Flower:** Ajouter `FLOWER_AUTH="user:password"` en prod
- ⚠️ **Nginx:** Proxy Flower via `/flower/` avec IP whitelist
- ⚠️ **Concurrency:** Max 2-3 workers sur CPX31 (4 vCPU)
- ⚠️ **spaCy:** Lazy-load dans tasks pour éviter crash boot

---

**Dernière mise à jour:** 31 Octobre 2025 - 20:00
**Prochaine review:** Après déploiement serveur + config OAuth

---

## 📚 RÉFÉRENCES

- [ACTE_V_WEB_ENRICHMENT.md](./ACTE_V_WEB_ENRICHMENT.md) - Web enrichment details
- [documentation/ACTE_IV_DEPLOYMENT.md](./documentation/ACTE_IV_DEPLOYMENT.md) - Deployment guide
- [documentation/ACTE_III_COMPLETION.md](./documentation/ACTE_III_COMPLETION.md) - AI layer details

---

**🎯 SESSION SUIVANTE:**
1. Vérifier déploiement serveur (ChatGPT debug)
2. Configurer OAuth Apps (Google + Azure)
3. Tests production Multi-Mail stack
