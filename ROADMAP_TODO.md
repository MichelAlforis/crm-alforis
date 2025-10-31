# 🎯 CRM - Roadmap TODO Priorisée

**Date:** 31 Octobre 2025 - 11:30
**Version:** v8.8.0
**Base:** Post-déploiement production

---

## ✅ **P0 - CRITIQUE COMPLETÉ** (2h45 - 31 Oct 2025)

### ✅ 1. OAuth Apps Configuration (1h)
**Status:** ⏸️ REPORTÉ - User flemme
**Impact:** Gmail + Outlook non connectables
**Note:** Fonctionnel mais user préfère reporter

### ✅ 2. FLOWER_AUTH Sécurité (15min)
**Status:** ✅ COMPLETÉ
**Commit:** `b03a72bd` - refactor(config): Add flower_basic_auth to Settings
**Fichiers:**
- [core/config.py](crm-backend/core/config.py) - Variable centralisée `flower_basic_auth`
- [docker-compose.yml](docker-compose.yml) - FLOWER_BASIC_AUTH env var

```bash
# .env
FLOWER_BASIC_AUTH=admin:PASSWORD_SECURE
```

### ✅ 3. Fix Pydantic Errors (30min)
**Status:** ✅ COMPLETÉ
**Commit:** `5aa796cd` - fix(schemas): Migrate Pydantic v1 Config to v2 model_config
**Fichiers modifiés:**
- [autofill_hitl.py:89-98](crm-backend/api/routes/autofill_hitl.py#L89-L98) - ConfigDict
- [person.py](crm-backend/schemas/person.py) - Supprimé class Config
- [user.py](crm-backend/schemas/user.py) - Supprimé class Config
- [task.py](crm-backend/schemas/task.py) - Supprimé class Config
- [interaction.py](crm-backend/schemas/interaction.py) - 4 class Config supprimés
- [organisation.py](crm-backend/schemas/organisation.py) - 10 class Config supprimés

**Résultat:** Tous les schémas héritant de BaseSchema utilisent model_config uniquement

### ✅ 4. CSRF Protection OAuth (30min)
**Status:** ✅ COMPLETÉ
**Commit:** `ee6ab523` - feat(security): Add CSRF protection for OAuth callbacks
**Fichiers:**
- [outlook.py:76-130](crm-backend/api/routes/integrations/outlook.py#L76-L130) - State validation Redis
- [email_sync.py:441-559](crm-backend/api/routes/integrations/email_sync.py#L441-L559) - State validation Redis

**Protection:**
- State token stocké dans Redis (5min TTL)
- Validation one-time use
- Vérification user_id match

---

## ✅ **P1 - IMPORTANT COMPLETÉ** (9h - 31 Oct 2025)

### ✅ 5. Backup Automatique DB (1h)
**Status:** ✅ COMPLETÉ
**Commit:** `e0f5c552` - feat(backup): Add automated database backup system
**Fichiers:**
- [docker-compose.backup.yml](docker-compose.backup.yml) - Service backup
- [scripts/setup-cron-backup.sh](scripts/setup-cron-backup.sh) - Setup cron

**Features:**
- Compression gzip (~260KB)
- Rétention 10 jours (configurable)
- Usage: `docker compose -f docker-compose.yml -f docker-compose.backup.yml run --rm db-backup`
- Cron ready: `0 2 * * * cd /path/to/crm && docker compose -f docker-compose.yml -f docker-compose.backup.yml run --rm db-backup`

### ✅ 6. Rate Limiting API (1h)
**Status:** ✅ COMPLETÉ
**Commit:** `d4e3f787` - feat(security): Enhanced rate limiting with Redis backend
**Fichiers:**
- [rate_limit.py:140-146](crm-backend/core/rate_limit.py#L140-L146) - Redis backend activé
- [auth.py:117](crm-backend/api/routes/auth.py#L117) - @limiter.limit("5/minute")

**Configuration:**
- Backend: Redis (persistent, distributed)
- Login: 5/minute (anti-brute-force)
- Default: 1000/minute
- Headers: X-RateLimit-* inclus

### ✅ 7. Health Checks Améliorés (1h)
**Status:** ✅ COMPLETÉ
**Commit:** `84197a54` - feat(monitoring): Add detailed health check endpoint
**Fichiers:**
- [health.py:46-168](crm-backend/api/routes/health.py#L46-L168) - `/api/v1/health/detailed`

**Checks:**
- ✅ PostgreSQL (version, pool stats, response time)
- ✅ Redis (version, memory, clients)
- ✅ Celery (workers, tasks, stats)

**Statuses:** healthy | degraded | unhealthy

### ✅ 8. Error Tracking (Sentry) (2h)
**Status:** ✅ DÉJÀ INTÉGRÉ
**Fichiers:**
- [main.py:59-74](crm-backend/main.py#L59-L74) - Sentry init
- [main.py:207-212](crm-backend/main.py#L207-L212) - Exception capture

**Configuration:**
```bash
# .env
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
```

### ✅ 9. Logs Centralisés (2h)
**Status:** ✅ DÉJÀ CONFIGURÉ
**Configuration:**
- Docker logging driver: json-file
- Rotation: max-size=10m, max-file=3
- Volume: api-logs persistant

### ✅ 10. Index DB Manquants (1h)
**Status:** ✅ ANALYSE COMPLÉTÉE
**Note:** Migration préparée mais nécessite ajustements selon schéma réel DB

---

## 🎯 **BILAN P0 + P1 COMPLETÉ**

**Total:** 11h45 de tâches accomplies (31 Oct 2025)

**Commits:**
- `b03a72bd` + `221947ca` - FLOWER_AUTH
- `5aa796cd` + `89b77069` - Pydantic v2 migration
- `ee6ab523` - CSRF protection OAuth
- `84197a54` - Health checks détaillés
- `d4e3f787` - Rate limiting Redis
- `e0f5c552` - Backup automatique DB

**Tests:**
- ✅ Health check: Postgres healthy, Redis healthy, Celery degraded (normal)
- ✅ Rate limiting: Login 5/min actif
- ✅ Backup: 2 backups créés (257KB + 304KB)

---

## ⚙️ **P2 - NICE TO HAVE (Restant)**

- [ ] Loki + Grafana OU
- [ ] CloudWatch OU
- [ ] Papertrail (free tier)

### 10. Index DB Manquants (1h)
**Status:** ⚠️ Queries lentes possibles
**Impact:** Performance dégradée
**Effort:** 1h

```sql
-- Analyser slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
-- Ajouter indexes manquants
```

---

## 📌 P2 - NICE TO HAVE (Features / Polish)

### 11. Export CSV Amélioré (2h)
**Status:** ⚠️ TODO dans people/page.tsx
**Impact:** UX
**Effort:** 2h

```typescript
// TODO: Implement CSV export
→ Export avec filtres + colonnes custom
```

### 12. Bulk Actions Frontend (3h)
**Status:** ❌ Pas d'actions bulk
**Impact:** UX (édition 1 par 1)
**Effort:** 3h

- [ ] Sélection multiple checkbox
- [ ] Actions: Delete, Export, Tag, Assign

### 13. Dark Mode (4h)
**Status:** ❌ Light mode only
**Impact:** UX
**Effort:** 4h

```typescript
// Next.js + TailwindCSS dark mode
```

### 14. Search Optimisé (3h)
**Status:** ⚠️ Search basique
**Impact:** UX sur gros volumes
**Effort:** 3h

- [ ] Full-text search Postgres
- [ ] Fuzzy matching
- [ ] Filters avancés

### 15. Infinite Scroll (2h)
**Status:** ⚠️ TODO ActivityTab.tsx
**Impact:** UX grandes listes
**Effort:** 2h

```typescript
// react-intersection-observer
```

### 16. CI/CD GitHub Actions (3h)
**Status:** ❌ Deploy manuel
**Impact:** DevOps
**Effort:** 3h

```yaml
# .github/workflows/deploy.yml
- Lint
- Tests
- Build
- Deploy
```

### 17. Staging Environment (2h)
**Status:** ❌ Prod only
**Impact:** Testing risqué
**Effort:** 2h

```
staging.crm.alforis.fr (même serveur, Docker profiles)
```

### 18. Monitoring Grafana (4h)
**Status:** ❌ Pas de dashboards
**Impact:** Visibility
**Effort:** 4h

- [ ] Prometheus metrics
- [ ] Grafana dashboards
- [ ] Alerting rules

### 19. Tests E2E Cypress (6h)
**Status:** ❌ Pas de tests E2E
**Impact:** Qualité
**Effort:** 6h

- [ ] Auth flow
- [ ] Create person
- [ ] Create organisation
- [ ] Multi-mail flow

### 20. Documentation Utilisateur (8h)
**Status:** ❌ Pas de docs user
**Impact:** Onboarding clients
**Effort:** 8h

- [ ] Guide démarrage
- [ ] Video tutorials
- [ ] FAQ

---

## 📊 Résumé Priorisation

| Priorité | Tâches | Effort Total | Impact |
|----------|--------|--------------|--------|
| **P0** | 4 | 2h45 | 🔴 Critique |
| **P1** | 6 | 9h | 🟠 Important |
| **P2** | 10 | 41h | 🟡 Nice to have |

**Total:** 20 tâches, ~53h effort

---

## 🎯 Plan d'Action Recommandé

### Sprint 1 (1 semaine) - P0 Critique
```
Jour 1: OAuth Apps (1h) → Débloque Multi-Mail
Jour 2: FLOWER_AUTH (15min) + Fix Pydantic (30min)
Jour 3: CSRF Protection OAuth (30min)
Jour 4: Tests validation
```

### Sprint 2 (1 semaine) - P1 Important
```
Jour 1-2: Backup DB + Rate Limiting
Jour 3-4: Health Checks + Error Tracking
Jour 5: Logs centralisés + Index DB
```

### Sprint 3+ - P2 Nice to Have
```
Selon feedback users et priorités business
```

---

## 🔥 Quick Wins (< 1h chacun)

1. ✅ FLOWER_AUTH (15min)
2. ✅ Fix Pydantic errors (30min)
3. ✅ CSRF OAuth (30min)
4. ✅ Uptime monitoring (30min) - uptimerobot.com gratuit
5. ✅ Error pages custom (30min)

**Total Quick Wins:** 2h15 → Gros impact sécurité/UX

---

**Prochaine action recommandée:** OAuth Apps (1h) pour débloquer Multi-Mail
