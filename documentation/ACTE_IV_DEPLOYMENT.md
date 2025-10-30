# 🚀 Acte IV - Deployment Guide

**Version:** v8.5.0
**Date:** 30 Octobre 2025
**Status:** ✅ Ready for Production

---

## 📋 Pre-Deployment Checklist

- [x] All 4 options of Acte IV.2 implemented
- [x] Database migrations created (routing_rules, ai_feedback, ai_accuracy_metrics)
- [x] API endpoints registered
- [x] Frontend dashboards created
- [x] Local testing passed
- [ ] Production deployment on Hetzner
- [ ] Smoke tests on production
- [ ] Cron job configured

---

## 🏗️ Deployment Steps (Hetzner)

### 1. Connect to Server

```bash
ssh root@159.69.108.234
cd /srv/crm-alforis
```

### 2. Backup Database (CRITICAL)

```bash
# Create backup before deployment
docker compose -f docker-compose.prod.yml exec postgres pg_dump -U crm_user crm_db | gzip > ~/backups/crm_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Verify backup created
ls -lh ~/backups/ | tail -1
```

### 3. Pull Latest Code

```bash
# Fetch latest from main
git fetch origin
git log --oneline -5  # Verify v8.5.0 is there

# Pull and verify
git pull origin main
git log -1 --oneline  # Should show: 6c5b5532 feat(ai): Acte IV.2
```

### 4. Run Database Migrations

```bash
# Check current migration status
docker compose -f docker-compose.prod.yml exec api alembic current

# Run migrations
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Verify new tables exist
docker compose -f docker-compose.prod.yml exec postgres psql -U crm_user -d crm_db -c "\dt routing_rules"
docker compose -f docker-compose.prod.yml exec postgres psql -U crm_user -d crm_db -c "\dt ai_feedback"
```

Expected output:
```
             List of relations
 Schema |      Name      | Type  |   Owner
--------+----------------+-------+-----------
 public | routing_rules  | table | crm_user
 public | ai_feedback    | table | crm_user
```

### 5. Rebuild and Deploy

```bash
# Stop current containers
docker compose -f docker-compose.prod.yml down

# Rebuild with latest code
docker compose -f docker-compose.prod.yml up -d --build

# Monitor logs during startup (Ctrl+C to exit)
docker compose -f docker-compose.prod.yml logs -f api
```

Look for:
```
✅ "Application startup complete"
✅ "Uvicorn running on http://0.0.0.0:8000"
✅ No ERROR or FAILED messages
```

### 6. Health Checks

```bash
# Basic health
curl -s https://crm.alforis.fr/api/v1/health | jq

# Extended readiness
curl -s https://crm.alforis.fr/api/v1/ready | jq

# Check new routes exist
curl -s https://crm.alforis.fr/api/v1/openapi.json | jq '.paths | keys' | grep -E "(email-intelligence|autofill-jobs)"
```

Expected:
```json
{
  "status": "ok"
}
```

And:
```
"/api/v1/email-intelligence/metrics"
"/api/v1/autofill-jobs/start"
"/api/v1/autofill-jobs/run-now"
```

---

## ✅ Smoke Tests

### Test 1: API Documentation

```bash
# Open in browser
https://crm.alforis.fr/api/v1/docs
```

Verify routes visible:
- ✅ `GET /api/v1/email-intelligence/metrics`
- ✅ `POST /api/v1/autofill-jobs/start`
- ✅ `GET /api/v1/autofill-jobs/stats`

### Test 2: Dashboard Email Intelligence

```bash
# Open in browser
https://crm.alforis.fr/dashboard/ai/intelligence
```

Expected:
- ✅ Page loads without errors
- ✅ KPI cards display (may show 0 initially)
- ✅ Time window selector works
- ✅ Tabs switch correctly

### Test 3: Batch Autofill Dashboard

```bash
# Open in browser
https://crm.alforis.fr/dashboard/ai/autofill
```

Expected:
- ✅ Configuration sliders work
- ✅ "Lancer le Job" button visible
- ✅ Statistics cards display

### Test 4: Run Small Batch Job

```bash
# Get admin token (replace with actual login)
TOKEN=$(curl -s -X POST "https://crm.alforis.fr/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alforis.com","password":"your-password"}' \
  | jq -r '.access_token')

# Run small test job (10 emails, 7 days)
curl -s -X POST "https://crm.alforis.fr/api/v1/autofill-jobs/run-now" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days_back": 7, "max_emails": 10, "auto_apply_threshold": 0.92}' \
  | jq '.summary'
```

Expected:
```
📧 Emails processed: 10
✍️  Signatures parsed: X (+ Y cached)
🎯 Intents detected: X (+ Y cached)
✅ Auto-applied: X
👤 Manual review: Y
```

---

## ⏰ Configure Cron Job

### Setup Hourly Autofill Job

```bash
# Make script executable
chmod +x /srv/crm-alforis/scripts/cron_autofill.sh

# Set admin token in environment (SECURE METHOD)
# Add to /etc/environment or use systemd EnvironmentFile
export ADMIN_TOKEN="your-admin-token-here"

# Test script manually first
/srv/crm-alforis/scripts/cron_autofill.sh 20 7
```

Expected output:
```
========================================
🔄 Starting Autofill Cron Job
========================================
📅 2025-10-30 12:00:00
⚙️  Config: days_back=20, max_emails=50, threshold=0.92

✅ Job completed successfully!

📊 Batch Autofill Pipeline - Summary
📧 Emails processed: 20
...
```

### Add to Crontab

```bash
# Edit crontab
crontab -e

# Add line (runs every hour at :00)
0 * * * * ADMIN_TOKEN="your-token" /srv/crm-alforis/scripts/cron_autofill.sh 50 1 >> /var/log/crm_autofill.log 2>&1
```

Parameters:
- `50` = max 50 emails per run
- `1` = last 1 day (24h)

### Monitor Cron Logs

```bash
# Watch logs in real-time
tail -f /var/log/crm_autofill.log

# Check last run
tail -50 /var/log/crm_autofill.log

# Rotate logs weekly
# Add to /etc/logrotate.d/crm-autofill:
/var/log/crm_autofill.log {
    weekly
    rotate 4
    compress
    delaycompress
    missingok
    notifempty
}
```

---

## 📊 Monitoring & Alerts

### Daily Checklist (30 seconds)

```bash
# 1. Check API health
curl -s https://crm.alforis.fr/api/v1/health

# 2. Check cron log for errors
tail -20 /var/log/crm_autofill.log | grep -E "(ERROR|❌|FAIL)"

# 3. Check container status
docker compose ps | grep -E "(api|frontend|postgres)"

# 4. Check disk usage
df -h | grep "/$"
```

### KPIs to Monitor

Open: https://crm.alforis.fr/dashboard/ai/intelligence

**Green (Healthy):**
- ✅ Signature success rate ≥70%
- ✅ Cache hit rate ≥80% (after 24h)
- ✅ Avg processing time <5s
- ✅ Intent detection rate ≥70%

**Orange (Warning):**
- ⚠️ Signature success rate 50-70%
- ⚠️ Cache hit rate 60-80%
- ⚠️ Avg processing time 5-10s
- ⚠️ Intent detection rate 50-70%

**Red (Critical):**
- 🚨 Signature success rate <50%
- 🚨 Cache hit rate <60%
- 🚨 Avg processing time >10s
- 🚨 Intent detection rate <50%
- 🚨 Error rate >5%

### Alert Setup (Optional)

Add to cron script (lines 20-25):

```bash
# Alert if success rate < 50%
if [ "$SUCCESS_RATE" -lt 50 ]; then
    echo "🚨 ALERT: Signature parsing success rate below 50%" | mail -s "CRM AI Alert" admin@alforis.com
fi
```

---

## 🔄 Rollback Procedure

If deployment fails or causes issues:

### Quick Rollback

```bash
# 1. Rollback code
cd /srv/crm-alforis
git reset --hard v8.4.0  # Previous stable version
git log -1 --oneline  # Verify

# 2. Rollback database (if needed)
docker compose -f docker-compose.prod.yml exec api alembic downgrade -1

# 3. Rebuild containers
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build

# 4. Verify health
curl -s https://crm.alforis.fr/api/v1/health
```

### Full Database Restore (Last Resort)

```bash
# Restore from backup
gunzip < ~/backups/crm_db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U crm_user crm_db
```

---

## 🔐 Security Considerations

### PII Protection

- ✅ Email bodies NOT logged in ERROR logs
- ✅ Signatures masked in logs: `user@*****.com`
- ✅ API keys encrypted in database (Fernet AES-256)
- ✅ Tokens stored in environment variables (not code)

### Rate Limiting

- ✅ 2s delay between AI API calls
- ✅ Max 50 emails per cron run (configurable)
- ✅ Auto-apply only ≥92% confidence

### RGPD Compliance

- ✅ Ollama (local) prioritized in cascade
- ✅ Mistral (EU/Paris) 2nd choice
- ✅ Email data not sent to AI without consent
- ✅ Cache prevents redundant API calls

---

## 📈 Expected Performance

**Hardware:**
- Server: Hetzner CPX31 (4 vCPU, 8GB RAM)
- Database: PostgreSQL 14

**Benchmarks:**
- Batch 50 emails: ~10-15 min (with cache: ~2-3 min)
- Avg signature parsing: 3-8s first time, 0ms cached
- Avg intent detection: 1-3s first time, 0ms cached
- Cache hit rate: 80-90% after 24h

**Capacity:**
- Max ~500-1000 emails/day with hourly cron
- Database: ~1MB per 1000 emails processed
- Disk usage: ~50MB logs per month

---

## 🎯 Go/No-Go Criteria

**GO (Deploy to Production):**
- ✅ All health checks pass
- ✅ Batch 10 emails completes successfully
- ✅ No 5xx errors in logs
- ✅ Dashboards load correctly
- ✅ Database backup completed

**NO-GO (Rollback):**
- ❌ Health endpoint returns error
- ❌ Database migration fails
- ❌ Batch job crashes after 3 attempts
- ❌ 5xx error rate >1%
- ❌ Frontend dashboard broken

---

## 📞 Support

**Logs:**
```bash
# API logs
docker compose logs api --tail=100

# Cron logs
tail -50 /var/log/crm_autofill.log

# Database logs
docker compose logs postgres --tail=50
```

**Debugging:**
```bash
# Check if new tables exist
docker compose exec postgres psql -U crm_user -d crm_db -c "\dt"

# Check API routes
curl -s https://crm.alforis.fr/api/v1/openapi.json | jq '.paths | keys'

# Test intent detection manually
curl -X POST "https://crm.alforis.fr/api/v1/ai/detect-intent" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"email_body": "Bonjour, pouvez-vous me faire un devis?"}'
```

---

**Deployment Date:** _____________________
**Deployed By:** _____________________
**Go-Live Confirmation:** ⬜ Approved ⬜ Rollback
