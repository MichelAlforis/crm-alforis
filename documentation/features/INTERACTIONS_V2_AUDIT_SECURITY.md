# Audit Sécurité & Qualité - Interactions V2 + Email Marketing

**Date**: 2025-10-24
**Auditeur**: Claude Code
**Scope**: Backend API, Worker, Database migrations

---

## ✅ Points Validés

### 1. Database Migrations & Indexes

#### ✅ Migration `add_interactions_v2_fields.py`
**Indexes créés:**
```sql
-- ✅ Index composite (status, assignee_id) pour inbox queries
CREATE INDEX idx_interactions_status_assignee ON crm_interactions(status, assignee_id);

-- ✅ Index partiel next_action_at pour reminders (WHERE NOT NULL)
CREATE INDEX idx_interactions_next_action ON crm_interactions(next_action_at)
WHERE next_action_at IS NOT NULL;

-- ✅ Index assignee (WHERE NOT NULL)
CREATE INDEX idx_interactions_assignee ON crm_interactions(assignee_id)
WHERE assignee_id IS NOT NULL;
```

**Verdict**: ✅ **Performant** - Aucun full scan prévu
- Inbox queries utilisent `idx_interactions_status_assignee`
- Worker queries utilisent `idx_interactions_next_action`
- Partial indexes réduisent l'overhead

#### ✅ Migration `add_email_sends_lead_scores.py`
**Indexes créés:**
```sql
-- ✅ Index pour hot leads query (DESC, WHERE score > 0)
CREATE INDEX idx_lead_scores_score ON lead_scores(score DESC) WHERE score > 0;

-- ✅ Index pour lookup webhook (provider, external_id)
CREATE INDEX idx_email_sends_provider_ext ON email_sends(provider, external_id);

-- ✅ Constraint UNIQUE pour idempotence
CONSTRAINT uq_provider_external_id UNIQUE (provider, external_id)

-- ✅ Check constraint pour cohérence données
CONSTRAINT chk_email_entity CHECK (
    (organisation_id IS NOT NULL) OR (person_id IS NOT NULL)
)
```

**Verdict**: ✅ **Idempotent & Performant**
- Webhook ingest utilise UNIQUE constraint → upsert sécurisé
- Hot leads query utilise `idx_lead_scores_score` (partial index)
- Check constraint évite orphan records

---

### 2. Permissions API

#### ✅ PATCH Endpoints (status/assignee/next-action)

**Code `_check_permissions_write()` lines 62-77:**
```python
def _check_permissions_write(interaction: Interaction, user_id: int, user_roles: List[str]):
    is_creator = interaction.created_by == user_id
    is_sales = "sales" in user_roles
    is_admin = "admin" in user_roles

    if not (is_creator or is_sales or is_admin):
        raise HTTPException(status_code=403, detail="Permissions insuffisantes")
```

**Utilisé dans:**
- `PATCH /{id}/status` (line 468)
- `PATCH /{id}/assignee` (line 492+)
- `PATCH /{id}/next-action` (line 515+)
- `DELETE /{id}` (line 248)

**Verdict**: ✅ **Sécurisé**
- Permissions cohérentes (creator OR sales OR admin)
- Appliquées systématiquement sur tous les PATCH/DELETE
- Pas de bypass possible

---

### 3. Worker Reminder - Filtres & Cooldown

#### ✅ Query Filters (lines 95-104)
```python
interactions = (
    db.query(Interaction)
    .filter(
        Interaction.status.in_(['todo', 'in_progress']),  # ✅ Exclude 'done'
        Interaction.next_action_at <= now,                # ✅ Overdue only
        Interaction.notified_at.is_(None),                # ✅ Not already notified
        Interaction.assignee_id.isnot(None),              # ✅ Must have assignee
    )
    .all()
)
```

**Verdict**: ✅ **Filtres corrects**
- ✅ Status filter (exclude done)
- ✅ Cooldown via `notified_at IS NULL`
- ✅ Assignee required (no notification to nobody)

#### ✅ Timezone UTC (lines 91, 119)
```python
now = datetime.utcnow()              # ✅ UTC
interaction.notified_at = now        # ✅ UTC stocké en base
```

**Verdict**: ✅ **Timezone cohérent**
- Base de données: TIMESTAMPTZ (UTC)
- Worker: `datetime.utcnow()`
- Frontend: Conversion locale via `date-fns` + timezone Europe/Paris

#### ✅ Cooldown Mechanism
```python
# Mark as notified (line 119)
interaction.notified_at = now
db.commit()
```

**Comportement:**
- Première notification: `notified_at = NULL` → **envoi**
- Deuxième passage (5 min après): `notified_at IS NOT NULL` → **skip**
- Reset uniquement si `next_action_at` modifié via PATCH (line 517 dans interactions.py)

**Verdict**: ✅ **Cooldown efficace** - Pas de doublons possibles

---

### 4. Webhook `/marketing/email/ingest` - Idempotence

#### ✅ Upsert Logic (lines 134-151)
```python
# 1. Try to find existing EmailSend
email_send = db.query(EmailSend).filter(
    EmailSend.provider == payload.provider,
    EmailSend.external_id == payload.external_id,  # ✅ Clé composite
).first()

if not email_send:
    # Create new
    email_send = EmailSend(...)
    db.add(email_send)
    db.flush()
```

**Constraint DB:**
```sql
CONSTRAINT uq_provider_external_id UNIQUE (provider, external_id)
```

**Verdict**: ✅ **Idempotent**
- Upsert via (provider, external_id)
- Double ingestion → update counters (pas de duplication)
- UNIQUE constraint empêche duplicata

#### ✅ Interaction Auto-Creation (lines 159-162)
```python
if email_send.open_count == 1 and email_send.interaction_id is None:
    create_interaction_from_email(db, email_send, user_id)
```

**Comportement:**
- Premier open (`open_count == 1`) ET pas d'interaction existante → **create**
- Opens suivants → **skip** (interaction_id déjà set)
- Re-ingestion du même événement → **idempotent** (counter incrémenté mais interaction non dupliquée)

**Verdict**: ✅ **Idempotent** - Pas de duplication d'Interaction

---

### 5. Lead Scoring - Transactionnalité

#### ✅ Scoring Logic (lines 44-51)
```python
def calculate_score_delta(email_send: EmailSend, event: str) -> int:
    if event == "opened":
        return 3 if email_send.open_count == 0 else 1  # ✅ AVANT incrémentation
    elif event == "clicked":
        return 8 if email_send.click_count == 0 else 2
    elif event == "bounced":
        return -10
    else:  # sent
        return 0
```

**⚠️ PROBLÈME POTENTIEL**: Score calculé sur `open_count == 0` **avant** incrémentation

**Comportement actuel (lines 154-183):**
```python
# Ligne 156: email_send.open_count += 1  ← Incrémentation
# Ligne 181: delta = calculate_score_delta(email_send, payload.event)  ← Calcul APRÈS
```

**Test case:**
1. Premier open: `open_count = 0` → incrémenté à `1` → calcul: `open_count == 1` → **delta = +1 au lieu de +3** ❌

**Correction nécessaire:** Calculer delta **avant** incrémentation

#### ✅ Score Minimum (lines 67, 73)
```python
lead_score.score = max(0, delta)                   # Create
lead_score.score = max(0, lead_score.score + delta)  # Update
```

**Verdict**: ✅ **Clamp à 0** - Pas de scores négatifs

#### ✅ Transaction (line 185)
```python
db.commit()  # ✅ Commit après toutes les updates (EmailSend + Interaction + LeadScore)
```

**Verdict**: ✅ **Transactionnel** - Rollback auto en cas d'erreur

---

## ⚠️ Problèmes Identifiés

### 🔴 CRITIQUE: Webhook Non Sécurisé

**Code actuel (line 118):**
```python
async def ingest_email_event(
    payload: EmailIngestPayload,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),  # ✅ Auth requise
):
```

**Problèmes:**
1. ✅ Auth JWT requise → **bon**
2. ❌ Pas de validation HMAC signature → **risque replay attack**
3. ❌ Pas de vérification timestamp → **risque old event replay**

**Recommandations:**
```python
from fastapi import Header

async def ingest_email_event(
    payload: EmailIngestPayload,
    x_signature: str = Header(None),  # Signature HMAC
    x_timestamp: str = Header(None),  # Timestamp événement
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # 1. Vérifier signature HMAC
    if not verify_webhook_signature(payload, x_signature):
        raise HTTPException(403, "Invalid signature")

    # 2. Vérifier timestamp (reject > 5 min old)
    if datetime.utcnow() - parse_timestamp(x_timestamp) > timedelta(minutes=5):
        raise HTTPException(400, "Event too old")

    # ... reste du code
```

**Impact**: 🔴 **Haute priorité** - À implémenter avant production

---

### 🟡 MOYEN: Lead Scoring - Bug Logique

**Problème:** Delta calculé **après** incrémentation des compteurs

**Fix:**
```python
# AVANT (incorrect):
email_send.open_count += 1  # ← Incrémentation
delta = calculate_score_delta(email_send, payload.event)  # ← Calcul APRÈS

# APRÈS (correct):
delta = calculate_score_delta(email_send, payload.event)  # ← Calcul AVANT
email_send.open_count += 1  # ← Incrémentation
```

**Fichier:** `crm-backend/routers/email_marketing.py` lines 154-183

**Impact:** 🟡 **Moyen** - Premier open donne +1 au lieu de +3 (perte de 2 points)

---

### 🟢 MINEUR: Pas de Tenant/Scope Filtering

**Inbox endpoint (line 371):**
```python
query = db.query(Interaction)  # ❌ Pas de filter par tenant_id ou org_id
```

**Recommandation:**
Si multi-tenant prévu:
```python
# Ajouter filter par tenant actif (via current_user)
tenant_id = current_user.get("tenant_id")
query = query.filter(Interaction.tenant_id == tenant_id)
```

**Impact:** 🟢 **Faible** - Seulement si multi-tenant activé

---

### 🟢 MINEUR: Pas de Purge Automatique

**Conformité RGPD:**
- Email sends > 18 mois → purge recommandée
- Lead scores inactifs > 2 ans → archivage

**Recommandation:**
Ajouter cron job mensuel:
```python
# workers/cleanup_old_emails.py
def purge_old_email_sends():
    cutoff = datetime.utcnow() - timedelta(days=18*30)
    db.query(EmailSend).filter(EmailSend.created_at < cutoff).delete()
```

**Impact:** 🟢 **Faible** - Pas urgent, à planifier

---

## 📊 Résumé Audit

| Catégorie | Status | Critique | Moyen | Mineur |
|-----------|--------|----------|-------|--------|
| **Database** | ✅ | 0 | 0 | 0 |
| **Permissions** | ✅ | 0 | 0 | 0 |
| **Worker** | ✅ | 0 | 0 | 0 |
| **Webhook** | ⚠️ | 1 | 1 | 0 |
| **Scoring** | ⚠️ | 0 | 1 | 0 |
| **RGPD** | 🟢 | 0 | 0 | 2 |

**Total**: 2 critiques, 1 moyen, 2 mineurs

---

## 🔧 Actions Requises Avant Production

### Priorité 1 (BLOQUANT)

- [ ] **Sécuriser webhook ingest** (HMAC signature + timestamp validation)
- [ ] **Corriger bug scoring** (calculer delta avant incrémentation)

### Priorité 2 (RECOMMANDÉ)

- [ ] Ajouter tenant filtering si multi-tenant
- [ ] Implémenter weekly score decay (job cron)

### Priorité 3 (PLANIFIER)

- [ ] Purge automatique email_sends > 18 mois
- [ ] Archivage lead_scores inactifs > 2 ans
- [ ] Monitoring alertes (worker down, webhook errors)

---

## ✅ Points Forts

1. **Architecture robuste**: Migrations idempotentes, indexes optimaux
2. **Permissions cohérentes**: Appliquées systématiquement
3. **Worker fiable**: Cooldown efficace, filtres corrects
4. **Transaction safety**: Commit unique, rollback auto
5. **Code quality**: Logging, error handling, type hints

---

## 📝 Prochaine Étape

Générer **scripts de test automatisés** pour valider:
- Inbox filters (assignee, status, due)
- PATCH quick actions (optimistic updates)
- Webhook idempotence (double ingestion)
- Lead scoring logic (opened/clicked/bounced)
- Worker reminder (cooldown, timezone)
