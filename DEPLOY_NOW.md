# 🚀 Déploiement Acte IV - Guide Rapide

**Version:** v8.5.1
**Prêt à déployer:** ✅ OUI
**Temps estimé:** 15-20 minutes

---

## 🎯 Commandes de Déploiement

### Option 1: Script Automatisé (Recommandé)

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./scripts/deploy_hetzner.sh
```

**Ce que fait le script:**
1. ✅ Backup automatique de la DB
2. ✅ Pull du code (v8.5.1)
3. ✅ Migrations DB (routing_rules, ai_feedback)
4. ✅ Rebuild containers
5. ✅ Health checks
6. ✅ Vérification des nouvelles routes

**Durée:** ~15 minutes

---

### Option 2: Manuel (Step by Step)

Si tu préfères tout contrôler manuellement:

```bash
# 1. Connecter à Hetzner
ssh root@159.69.108.234
cd /srv/crm-alforis

# 2. Backup DB (CRITIQUE!)
mkdir -p ~/backups
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U crm_user crm_db | gzip > ~/backups/crm_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Vérifier backup
ls -lh ~/backups/ | tail -1

# 3. Pull code
git fetch origin
git log -1 --oneline  # Voir version actuelle
git pull origin main
git log -1 --oneline  # Doit montrer: 9cd68f16

# 4. Migrations DB
docker compose -f docker-compose.prod.yml exec -T api alembic current
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Vérifier nouvelles tables
docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db -c "\dt routing_rules"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db -c "\dt ai_feedback"

# 5. Rebuild containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Attendre 30 secondes pour le startup
sleep 30

# 6. Health check
curl -s https://crm.alforis.fr/api/v1/health | jq
docker compose -f docker-compose.prod.yml ps
```

---

## ✅ Vérifications Post-Déploiement

### 1. API Health

```bash
curl -s https://crm.alforis.fr/api/v1/health
# Attendu: {"status": "ok"}
```

### 2. Nouvelles Routes

```bash
curl -s https://crm.alforis.fr/api/v1/docs
# Ouvrir dans navigateur, chercher:
# - /api/v1/email-intelligence/metrics
# - /api/v1/autofill-jobs/start
```

### 3. Frontend Dashboards

**Dashboard Intelligence:**
- URL: https://crm.alforis.fr/dashboard/ai/intelligence
- ✅ Page charge
- ✅ KPI cards affichés
- ✅ Onglets fonctionnent

**Batch Autofill:**
- URL: https://crm.alforis.fr/dashboard/ai/autofill
- ✅ Configuration visible
- ✅ Stats globales affichées

### 4. Test Resend (Email)

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./scripts/test_resend_production.sh
```

**Ou manuellement sur Hetzner:**

```bash
ssh root@159.69.108.234

# Vérifier clé Resend
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml exec api python -c "from core.config import settings; print('✅ SET' if settings.resend_api_key else '❌ MISSING')"

# Si MISSING, ajouter dans .env:
nano .env
# Ajouter: RESEND_API_KEY=re_votre_clé_ici
# Ctrl+X, Y, Enter

# Redémarrer API
docker compose -f docker-compose.prod.yml restart api

# Tester email
curl -X POST "https://crm.alforis.fr/api/v1/auth/forgot-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test+qa@alforis.com"}'
```

**Vérifier:**
- Dashboard Resend: https://resend.com/emails
- Logs: `docker compose logs api | grep -i resend`

---

## 🔄 Setup Cron Job (Après tests)

Une fois que tout fonctionne:

```bash
ssh root@159.69.108.234

# 1. Créer token admin
# (Via UI: /dashboard/settings/api-keys ou login API)

# 2. Tester script manuellement
export ADMIN_TOKEN="votre_token_ici"
/srv/crm-alforis/scripts/cron_autofill.sh 20 7

# Si OK, ajouter au crontab
crontab -e

# Ajouter ligne (exécute chaque heure):
0 * * * * ADMIN_TOKEN="votre_token" /srv/crm-alforis/scripts/cron_autofill.sh 50 1 >> /var/log/crm_autofill.log 2>&1

# Vérifier cron installé
crontab -l
```

**Paramètres:**
- `50` = max 50 emails par heure
- `1` = dernières 24h

---

## 🚨 Rollback (Si Problème)

Si quelque chose ne va pas:

```bash
ssh root@159.69.108.234
cd /srv/crm-alforis

# Rollback code
git reset --hard v8.4.0

# Rollback DB (1 migration en arrière)
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1

# Rebuild
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# Vérifier
curl -s https://crm.alforis.fr/api/v1/health
```

---

## 📊 KPIs à Monitorer (Semaine 1)

Checklist quotidienne (30s):

```bash
# Health check
curl -s https://crm.alforis.fr/api/v1/health

# Cron log
ssh root@159.69.108.234 "tail -20 /var/log/crm_autofill.log | grep '✅'"

# Dashboard KPIs
# Ouvrir: https://crm.alforis.fr/dashboard/ai/intelligence
```

**Seuils attendus:**
- ✅ Parsing ≥70%
- ✅ Cache hit ≥80% (après 24h)
- ✅ Auto-apply 10-15%
- ✅ Erreurs = 0

---

## 🎯 Checklist Complète

### Avant Déploiement
- [x] Code poussé sur Git (v8.5.1)
- [x] Migrations DB créées
- [x] Tests locaux passés
- [x] Scripts de déploiement prêts
- [x] Documentation complète

### Pendant Déploiement
- [ ] Backup DB créé
- [ ] Code pulled (9cd68f16)
- [ ] Migrations exécutées
- [ ] Tables vérifiées (routing_rules, ai_feedback)
- [ ] Containers rebuilt
- [ ] Health checks OK

### Après Déploiement
- [ ] API /health = ok
- [ ] Nouvelles routes visibles dans /docs
- [ ] Dashboard Intelligence accessible
- [ ] Dashboard Autofill accessible
- [ ] Resend configuré et testé
- [ ] Cron job configuré (optionnel jour 1)

### Jour 2-7
- [ ] Checklist matinale quotidienne
- [ ] Monitoring KPIs
- [ ] Ajuster thresholds si besoin
- [ ] Documenter anomalies

---

## 📞 Support

**Logs:**
```bash
ssh root@159.69.108.234

# API
docker compose logs api --tail=100

# Cron
tail -50 /var/log/crm_autofill.log

# DB
docker compose logs postgres --tail=50
```

**Debug:**
```bash
# Vérifier tables
docker compose exec postgres psql -U crm_user -d crm_db -c "\dt"

# Vérifier routes
curl -s https://crm.alforis.fr/api/v1/openapi.json | jq '.paths | keys'

# Vérifier containers
docker compose ps
```

---

## 🎉 C'est Parti!

**Pour déployer maintenant:**

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./scripts/deploy_hetzner.sh
```

Ou si tu veux d'abord juste tester Resend:

```bash
./scripts/test_resend_production.sh
```

**Bonne chance! 🚀**

---

**Questions?** Voir:
- [ACTE_IV_DEPLOYMENT.md](documentation/ACTE_IV_DEPLOYMENT.md) - Guide détaillé
- [DAILY_CHECKLIST.md](documentation/DAILY_CHECKLIST.md) - Checklist quotidienne
