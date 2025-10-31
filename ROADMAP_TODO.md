# 🎯 CRM - Roadmap TODO Priorisée

**Date:** 31 Octobre 2025
**Version:** v8.7.0
**Base:** Post-déploiement production

---

## 🚨 P0 - CRITIQUE (Bloquant / Sécurité)

### 1. OAuth Apps Configuration (1h)
**Status:** ❌ BLOQUANT Multi-Mail
**Impact:** Gmail + Outlook non connectables
**Effort:** 1h

- [ ] Google Cloud Console - Create OAuth app
- [ ] Azure Portal - Create OAuth app
- [ ] Test connexion Gmail
- [ ] Test connexion Outlook

### 2. FLOWER_AUTH Sécurité (15min)
**Status:** ⚠️ Flower accessible sans auth
**Impact:** Celery monitoring exposé publiquement
**Effort:** 15min

```bash
# .env
FLOWER_BASIC_AUTH=admin:PASSWORD_SECURE
```

### 3. Fix Pydantic Errors (30min)
**Status:** ⚠️ Erreurs logs API
**Impact:** Reloads constants, warnings
**Effort:** 30min

```
autofill_hitl.py: "Config" and "model_config" cannot be used together
→ Fix: Merge to model_config only
```

### 4. CSRF Protection OAuth (30min)
**Status:** ⚠️ Multiple TODO "Vérifier state CSRF"
**Impact:** Security flaw OAuth callbacks
**Effort:** 30min

```python
# integrations/outlook.py, email_sync.py
# TODO: Vérifier state CSRF
→ Implement state validation
```

---

## ⭐ P1 - IMPORTANT (Performance / UX)

### 5. Backup Automatique DB (1h)
**Status:** ❌ Pas de backup auto
**Impact:** Risque perte données
**Effort:** 1h

```bash
# Cron quotidien
0 3 * * * /srv/crm/scripts/backup-db.sh
```

### 6. Rate Limiting API (1h)
**Status:** ❌ Pas de rate limit
**Impact:** Abuse possible
**Effort:** 1h

```python
# slowapi
@limiter.limit("100/minute")
```

### 7. Health Checks Améliorés (1h)
**Status:** ⚠️ Health checks basiques
**Impact:** Monitoring insuffisant
**Effort:** 1h

- [ ] Check DB connectivity
- [ ] Check Redis connectivity
- [ ] Check Celery workers alive
- [ ] Check disk space

### 8. Error Tracking (Sentry) (2h)
**Status:** ❌ Pas de tracking erreurs
**Impact:** Bugs invisibles en prod
**Effort:** 2h

```python
# sentry-sdk
sentry_sdk.init(dsn="...")
```

### 9. Logs Centralisés (2h)
**Status:** ⚠️ Logs éparpillés
**Impact:** Debug difficile
**Effort:** 2h

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
