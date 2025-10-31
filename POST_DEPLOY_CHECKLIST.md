# 📋 POST-DEPLOYMENT CHECKLIST

**Date:** 31 Octobre 2025
**Version déployée:** v8.7.0
**Serveur:** 159.69.108.234 (Hetzner CPX31)

---

## ✅ Vérifications Immédiates (5 min)

### 1. Services Docker
```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Check all services
docker compose ps

# Should see:
# ✅ api (healthy)
# ✅ frontend (healthy)
# ✅ postgres (healthy)
# ✅ redis (healthy)
# ✅ celery-worker (healthy)
# ✅ celery-beat (unhealthy is OK)
# ✅ flower (unhealthy is OK)
```

### 2. API Health
```bash
# From server
curl http://localhost:8000/api/v1/health
# Expected: {"status":"ok"}

# From browser
https://crm.alforis.fr/api/v1/health
```

### 3. Frontend
```bash
# From browser
https://crm.alforis.fr
# Expected: Login page appears
```

### 4. Database Migrations
```bash
# Check current migration
docker compose exec api alembic current

# Should show:
# - ai_user_pref_001 (head)
# - 45a3cf76f466 (head)
```

---

## ✅ Nouvelles Features (10 min)

### 5. Ollama Integration
```bash
# Health check
curl https://crm.alforis.fr/api/v1/ai/ollama/health

# Expected:
{
  "status": "healthy",
  "redis": "connected",
  "cache_keys": 0,
  "memory_used_mb": X.XX
}
```

### 6. AI Learning Endpoints
```bash
# Get your token first (login via UI)
TOKEN="your_jwt_token_here"

# Check learning stats
curl https://crm.alforis.fr/api/v1/ai/learning/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 7. Celery Flower UI
```bash
# From browser (if configured)
https://crm.alforis.fr/flower/

# Or via SSH tunnel
ssh -i ~/.ssh/id_rsa_hetzner -L 5555:localhost:5555 root@159.69.108.234
# Then open: http://localhost:5555
```

### 8. Check Celery Tasks
```bash
# Check active tasks
docker compose exec api celery -A celery_app inspect active

# Check scheduled tasks (beat)
docker compose exec api celery -A celery_app inspect scheduled
```

---

## ✅ Logs Review (5 min)

### 9. API Logs
```bash
# Check for errors
docker compose logs api --tail=100 | grep -i "error\|failed\|traceback"

# Should be clean (no critical errors)
```

### 10. Celery Worker Logs
```bash
# Check worker activity
docker compose logs celery-worker --tail=50

# Look for:
# - "Task tasks.email_sync.sync_all_active_accounts_task" (every 10 min)
# - No "ModuleNotFoundError"
```

### 11. Frontend Logs
```bash
docker compose logs frontend --tail=50

# Should show:
# - "ready - started server on 0.0.0.0:3010"
# - No build errors
```

---

## ⚠️ Known Issues (à ignorer)

### Services "Unhealthy" (Normal)
- ✅ **celery-beat**: Pas de healthcheck → unhealthy OK
- ✅ **flower**: Pas de healthcheck → unhealthy OK

### Warnings SQLAlchemy (Non-bloquants)
```
SAWarning: relationship 'User.configured_email_accounts' will copy column...
```
→ Warning informatif, pas d'impact fonctionnel

---

## 🔧 Tests Fonctionnels (15 min)

### 12. Login
- [ ] Aller sur https://crm.alforis.fr
- [ ] Se connecter avec un compte test
- [ ] Vérifier redirection vers dashboard

### 13. Context Menu (Phase 2B)
- [ ] Ouvrir une fiche personne
- [ ] Clic droit sur champ "role"
- [ ] Vérifier apparition du Context Menu
- [ ] Sélectionner une suggestion
- [ ] Vérifier toast "Suggestion appliquée"

### 14. AI Learning Tracking
- [ ] Après avoir utilisé Context Menu
- [ ] Vérifier tracking dans logs API:
```bash
docker compose logs api | grep "AILearning"
# Should see: "[AILearning] Tracked choice: user=X, field=role, action=accept"
```

### 15. Multi-Mail (si OAuth configuré)
- [ ] Aller dans Paramètres > Comptes Email
- [ ] Cliquer "Connecter Gmail" ou "Connecter Outlook"
- [ ] Flow OAuth complet
- [ ] Vérifier sync dans Flower

---

## 📊 Métriques Serveur (5 min)

### 16. Resources Usage
```bash
# CPU + Memory
docker stats --no-stream

# Disk usage
df -h
du -sh /var/lib/docker
```

### 17. Database Size
```bash
docker compose exec postgres psql -U crm_user -d crm_db -c "
SELECT
  pg_size_pretty(pg_database_size('crm_db')) as db_size,
  (SELECT count(*) FROM crm_interactions) as interactions,
  (SELECT count(*) FROM email_messages) as emails,
  (SELECT count(*) FROM email_threads) as threads,
  (SELECT count(*) FROM ai_user_preferences) as ai_prefs
"
```

### 18. Redis Cache
```bash
docker compose exec redis redis-cli INFO memory
docker compose exec redis redis-cli DBSIZE
```

---

## 🚨 Rollback Plan (si problème)

### Si le déploiement a cassé quelque chose:

```bash
# 1. Revenir au commit précédent
cd /srv/crm-alforis  # ou ton path
git log --oneline -5
git reset --hard e5663665  # commit avant aujourd'hui

# 2. Rebuild
docker compose down
docker compose build
docker compose up -d

# 3. Vérifier
curl http://localhost:8000/api/v1/health
```

---

## 📝 Notes Deployment

**Date déploiement:** _________________

**Déployé par:** ChatGPT (avec debug :'D)

**Commits déployés:** 10 commits (e5663665 → 75e18f9d)

**Issues rencontrées:**
-
-

**Solutions appliquées:**
-
-

**Tests OK:**
- [ ] API Health
- [ ] Frontend
- [ ] Ollama Integration
- [ ] AI Learning
- [ ] Celery Worker
- [ ] Migrations

**Prochaines étapes:**
1. Configurer OAuth (Google + Azure)
2. Tester Multi-Mail avec vrai compte
3. Monitorer Celery pendant 24h

---

**✅ Checklist complétée:** _____ / _____ (Date: __________)
