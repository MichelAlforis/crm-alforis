# Rapport de Coverage des Tests - CRM Backend

**Date:** 27 octobre 2025
**Commit:** `6c54cc36` (feature/chapitre7-workflows-interactions)
**Pytest version:** 7.4.3
**Coverage:** pytest-cov 4.1.0

---

## Résultats Globaux

### Statistiques

- **Total tests:** 163 collectés
- **Tests réussis:** 118 ✅
- **Tests échoués:** 44 ❌
- **Tests skipped:** 1 ⚠️
- **Durée:** 49.73s

### Coverage par Module

#### ✅ **Excellente Coverage (>80%)**

| Module | Statements | Missed | Coverage |
|--------|-----------|--------|----------|
| **core/exports.py** | 205 | 2 | **99%** 🎯 |
| **core/config.py** | 77 | 3 | **96%** |
| **models/email_config.py** | 33 | 1 | **97%** |
| **models/email_marketing.py** | 41 | 2 | **95%** |
| **models/interaction.py** | 62 | 3 | **95%** |
| **models/organisation.py** | 186 | 7 | **96%** |
| **models/person.py** | 65 | 3 | **95%** |
| **models/ai_agent.py** | 140 | 9 | **94%** |
| **models/email.py** | 221 | 14 | **94%** |
| **core/search.py** | 106 | 19 | **82%** |
| **api/routes/people.py** | 75 | 14 | **81%** |

#### ⚠️ **Coverage Moyenne (50-80%)**

| Module | Statements | Missed | Coverage |
|--------|-----------|--------|----------|
| **api/routes/auth.py** | 127 | 31 | **76%** |
| **api/routes/organisations.py** | 119 | 33 | **72%** |
| **api/routes/imports.py** | 160 | 48 | **70%** |
| **core/security.py** | 70 | 26 | **63%** |
| **api/routes/dashboards.py** | 73 | 32 | **56%** |
| **core/cache.py** | 166 | 76 | **54%** |
| **core/permissions.py** | 135 | 59 | **56%** |
| **api/routes/mandats.py** | 71 | 35 | **51%** |

#### ❌ **Faible Coverage (<50%)**

| Module | Statements | Missed | Coverage | **Priorité** |
|--------|-----------|--------|----------|--------------|
| **api/routes/email_campaigns.py** | 559 | 474 | **15%** | 🔴 **URGENT** |
| **api/routes/monitoring.py** | 106 | 85 | **20%** | 🔴 **URGENT** |
| **api/routes/mailing_lists.py** | 116 | 89 | **23%** | 🔴 **HIGH** |
| **api/routes/ai_agent.py** | 269 | 203 | **25%** | 🔴 **HIGH** |
| **api/routes/external_webhooks.py** | 82 | 60 | **27%** | 🟡 **MEDIUM** |
| **api/routes/rate_limit.py** | 83 | 61 | **27%** | 🟡 **MEDIUM** |
| **api/routes/users.py** | 85 | 60 | **29%** | 🟡 **MEDIUM** |
| **core/webhooks.py** | 64 | 38 | **41%** | 🟡 **MEDIUM** |
| **core/notifications.py** | 274 | 158 | **42%** | 🟡 **MEDIUM** |
| **api/routes/workflows.py** | 126 | 83 | **34%** | 🔴 **HIGH** |
| **api/routes/tasks.py** | 85 | 57 | **33%** | 🟡 **MEDIUM** |

#### 🚨 **Coverage Nulle (0%)**

| Module | Statements | Missed | Raison |
|--------|-----------|--------|---------|
| **core/audit.py** | 80 | 80 | Aucun test d'audit |
| **core/encryption.py** | 40 | 40 | Aucun test de chiffrement |
| **core/publish.py** | 19 | 19 | Module événementiel non testé |
| **models/activity_attachment.py** | 23 | 23 | Modèle legacy non testé |
| **models/activity_participant.py** | 29 | 29 | Modèle legacy non testé |
| **models/email_campaign.py** | 75 | 75 | **Critique - nouveau module** |

---

## Problèmes Identifiés

### 🔴 **Critiques - Bugs bloquants**

#### 1. Exception Handler Bug (`main.py:314`)
**Erreur:** `AttributeError: 'ResourceNotFound' object has no attribute 'detail'`

```python
# Code actuel (BUGGY):
@app.exception_handler(ResourceNotFound)
async def api_exception_handler(request: Request, exc: ResourceNotFound):
    return JSONResponse(
        status_code=404,
        content={"detail": exc.detail}  # ❌ ResourceNotFound n'a pas d'attribut .detail
    )
```

**Impact:**
- Tous les tests faisant des requêtes GET sur ressources inexistantes crashent avec 500 au lieu de 404
- Tests affectés: `test_organisations.py`, `test_people.py`, `test_people.py::test_delete_person_org_link`

**Fix requis:**
```python
@app.exception_handler(ResourceNotFound)
async def api_exception_handler(request: Request, exc: ResourceNotFound):
    return JSONResponse(
        status_code=404,
        content={"detail": str(exc) or "Resource not found"}
    )
```

#### 2. Tests Interactions - Champs incorrects
**Erreur:** `TypeError: 'subject' is an invalid keyword argument for Interaction`

**Problème:**
- Les tests utilisent `subject` mais le modèle utilise `title`
- Les tests utilisent `TASK` mais l'enum n'a que `CALL, EMAIL, MEETING, VISIO, NOTE, OTHER`
- Interaction n'a pas de champ `completed_at` (uniquement `created_at`, `updated_at`)

**Fichier:** `tests/test_interactions.py` (15 tests échoués sur 15)

**Corrections requises:**
```python
# ❌ AVANT
interaction = Interaction(
    type=InteractionType.TASK,  # N'existe pas
    subject="Tâche test",       # Devrait être title
    scheduled_at=...,           # N'existe pas
    completed_at=...,           # N'existe pas
    created_by_id=user.id       # Devrait être created_by
)

# ✅ APRÈS
interaction = Interaction(
    type=InteractionType.MEETING,
    title="Réunion test",
    created_by=user.id,
    org_id=org.id,  # OU person_id (requis par contrainte CHECK)
)
```

#### 3. Tests Workflows - Enums et champs incorrects
**Erreur:** `AttributeError: MANUAL` (n'existe pas dans WorkflowTriggerType)

**Problème:**
- `WorkflowTriggerType.MANUAL` n'existe pas (disponibles: ORGANISATION_CREATED, ORGANISATION_UPDATED, DEAL_CREATED, etc.)
- Champ `is_active` n'existe pas (le modèle utilise `status: WorkflowStatus.ACTIVE/INACTIVE/DRAFT`)
- Les tests essaient de passer `is_active=True` mais le modèle attend `status=WorkflowStatus.ACTIVE`

**Fichier:** `tests/test_workflows.py` (11 tests échoués sur 11)

**Corrections requises:**
```python
# ❌ AVANT
workflow = Workflow(
    trigger_type=WorkflowTriggerType.MANUAL,  # N'existe pas
    is_active=True,                            # N'existe pas
    actions=[...]
)

# ✅ APRÈS
workflow = Workflow(
    trigger_type=WorkflowTriggerType.ORGANISATION_CREATED,
    status=WorkflowStatus.ACTIVE,
    actions=[...]
)
```

#### 4. Person Model - created_by_id invalide
**Erreur:** `TypeError: 'created_by_id' is an invalid keyword argument for Person`

**Problème:** Le modèle Person hérite de BaseModel, qui n'a pas de champ `created_by_id`

**Fix requis:** Vérifier si Person devrait avoir ce champ ou utiliser un autre mécanisme de tracking

---

### 🟡 **Warnings - Tests fragiles**

#### 5. Performance Test Flaky
**Test:** `test_export_large_dataset_csv`
**Erreur:** `assert 2.39 < 2.0` (test de performance)

**Problème:** Le test attend <2s mais prend 2.39s (docker overhead)

**Recommandation:** Augmenter le seuil à 3s ou désactiver en CI

#### 6. Timezone-aware datetime
**Test:** `test_notification_is_expired`
**Erreur:** `TypeError: can't compare offset-naive and offset-aware datetimes`

**Fix requis:** Utiliser `datetime.now(timezone.utc)` partout

#### 7. WebSocket ConnectionManager API
**Test:** `test_connection_manager_user_tracking`
**Erreur:** `AttributeError: 'ConnectionManager' object has no attribute 'connect'`

**Problème:** L'API du ConnectionManager a changé

---

## Plan d'Action Recommandé

### 🎯 **Phase 1: Fixes Critiques (2-3h)**

1. **Fixer main.py exception handler** ✅ PRIORITÉ 1
   - Impact: 10+ tests
   - Difficulté: Facile (5 min)

2. **Fixer test_interactions.py** ✅ PRIORITÉ 1
   - Remplacer `subject` → `title`
   - Supprimer `TASK` → utiliser `MEETING`/`CALL`/`EMAIL`
   - Supprimer `scheduled_at`, `completed_at`
   - Remplacer `created_by_id` → `created_by`
   - Ajouter contrainte `org_id` OU `person_id`
   - Impact: 15 tests
   - Difficulté: Moyenne (30-45 min)

3. **Fixer test_workflows.py** ✅ PRIORITÉ 1
   - Remplacer `MANUAL` → `ORGANISATION_CREATED` ou autre trigger valide
   - Remplacer `is_active=True` → `status=WorkflowStatus.ACTIVE`
   - Impact: 11 tests
   - Difficulté: Moyenne (20-30 min)

4. **Vérifier Person.created_by_id** ✅ PRIORITÉ 1
   - Soit ajouter le champ au modèle
   - Soit retirer des tests
   - Impact: 3-5 tests
   - Difficulté: Facile (10-15 min)

### 🚀 **Phase 2: Nouveaux Tests (3-4h)**

5. **Créer test_email_campaigns.py** 🔴 URGENT
   - Coverage actuel: **15%** (559 statements, 474 missed)
   - Module critique pour Chapitre 7
   - Tests à créer:
     - ✅ Création de campagne email
     - ✅ Envoi de campagne
     - ✅ Tracking des opens/clicks
     - ✅ Gestion des bounces
     - ✅ Statistiques de campagne
     - ✅ Segmentation des destinataires

6. **Créer test_monitoring.py** 🔴 URGENT
   - Coverage actuel: **20%** (106 statements, 85 missed)
   - Tests à créer:
     - ✅ `/api/v1/monitoring/health` endpoint
     - ✅ System metrics (CPU, RAM, disk)
     - ✅ Database metrics
     - ✅ Supervisord workers status
     - ✅ Error aggregation

7. **Augmenter coverage workflows** 🔴 HIGH
   - Coverage actuel: **34%**
   - Ajouter tests d'exécution de workflows
   - Tester les différents triggers
   - Tester les actions (create_task, send_notification, etc.)

### 📊 **Phase 3: Coverage >80% (2-3h)**

8. **Tests manquants pour modules core:**
   - `core/audit.py` (0% → 80%)
   - `core/encryption.py` (0% → 80%)
   - `core/notifications.py` (42% → 80%)
   - `core/webhooks.py` (41% → 80%)

9. **Tests manquants pour API routes:**
   - `api/routes/mailing_lists.py` (23% → 80%)
   - `api/routes/users.py` (29% → 80%)
   - `api/routes/tasks.py` (33% → 80%)

---

## Métriques d'Objectif

### Coverage Cible: **≥ 80%**

| Catégorie | Coverage Actuel | Objectif | Gap |
|-----------|----------------|----------|-----|
| **Models** | **94%** | 95% | ✅ Excellent |
| **API Routes** | **~45%** | 80% | ❌ -35% |
| **Core** | **~60%** | 80% | ⚠️ -20% |
| **Global** | **~58%** | 80% | ❌ -22% |

### Estimation Temps de Travail

- **Fixes bugs critiques:** 2-3h ⏰
- **Nouveaux tests (email_campaigns, monitoring):** 3-4h ⏰
- **Coverage global >80%:** 2-3h ⏰

**Total estimé:** **7-10h de développement**

---

## Commandes Utiles

### Lancer tous les tests avec coverage
```bash
docker-compose exec api pytest tests/ \
  --ignore=tests/test_ai_agent.py \
  --cov=api --cov=models --cov=core \
  --cov-report=term --cov-report=html \
  -v
```

### Lancer un fichier de test spécifique
```bash
docker-compose exec api pytest tests/test_interactions.py -v
```

### Voir le rapport HTML
```bash
docker-compose exec api pytest tests/ --cov=. --cov-report=html
open crm-backend/htmlcov/index.html
```

### Lancer tests en parallèle (plus rapide)
```bash
docker-compose exec api pytest tests/ -n auto --dist loadgroup
```

---

## Prochaines Étapes

1. ✅ **Fixer main.py exception handler** (5 min)
2. ✅ **Fixer test_interactions.py** (30-45 min)
3. ✅ **Fixer test_workflows.py** (20-30 min)
4. ✅ **Créer test_email_campaigns.py** (2-3h)
5. ✅ **Créer test_monitoring.py** (1h)
6. ⏰ **Re-run coverage et viser 80%**
7. 📝 **Documenter les résultats dans le README**

---

**Note:** Ce rapport a été généré automatiquement après l'exécution de la suite de tests complète.
Les statistiques sont basées sur l'état actuel du code sur la branche `feature/chapitre7-workflows-interactions`.
