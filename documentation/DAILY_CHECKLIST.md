# ☀️ CRM AI - Daily Checklist (30 seconds)

**Purpose:** Quick health check of AI automation systems
**Frequency:** Every morning before 9:00 AM
**Time Required:** ~30 seconds

---

## ✅ Quick Checks (Terminal)

```bash
# 1. API Health (5s)
curl -s https://crm.alforis.fr/api/v1/health | jq

# 2. Last Cron Run (5s)
tail -30 /var/log/crm_autofill.log | grep -E "(✅|❌)"

# 3. Container Status (5s)
docker compose ps | grep -E "(api|frontend|postgres)"

# 4. Disk Space (5s)
df -h / | tail -1
```

**Expected:**
```
✅ {"status": "ok"}
✅ Job completed successfully
✅ All containers "Up"
✅ Disk usage <80%
```

---

## 📊 Dashboard Check (15s)

Open: https://crm.alforis.fr/dashboard/ai/intelligence

### Green Indicators (All Good ✅)
- **Taux de Succès:** ≥70% (green)
- **Cache Hit Rate:** ≥80% (green)
- **Emails Traités (24h):** >0
- **Erreurs:** 0

### Yellow Indicators (Watch ⚠️)
- **Taux de Succès:** 50-70% (orange)
- **Cache Hit Rate:** 60-80% (orange)
- **Avg Processing Time:** 5-10s

### Red Indicators (Action Required 🚨)
- **Taux de Succès:** <50% (red)
- **Cache Hit Rate:** <60% (red)
- **Errors >5**
- **Processing Time >10s**

---

## 🚨 Action Items (If Red)

### If Parsing Success Rate <50%
```bash
# Check AI models status
docker compose logs api | grep -i "AI\|mistral\|ollama" | tail -20

# Verify API keys loaded
docker compose exec api python -c "from core.config import settings; print('Keys OK' if settings.anthropic_api_key else 'Missing')"
```

**Fix:**
- Restart API container: `docker compose restart api`
- Check AI provider status (Mistral/OpenAI)
- Verify .env has API keys

### If Cache Hit Rate <60%
```bash
# Check ai_memory table
docker compose exec postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM ai_memory;"
```

**Fix:**
- Normal if <24h after deployment
- Clear old cache if >1000 entries: Check with team first

### If Containers Down
```bash
# Restart failed containers
docker compose up -d

# Check logs for crash reason
docker compose logs api --tail=50
```

---

## 📝 Weekly Tasks (Monday Morning)

- [ ] Review cron log summary: `grep "📊" /var/log/crm_autofill.log | tail -20`
- [ ] Check total emails processed (last 7 days): Dashboard → Timeline tab
- [ ] Verify database backup exists: `ls -lh ~/backups/ | tail -7`
- [ ] Review ai_feedback entries: Check Training Dashboard (when implemented)

---

## 📞 Escalation

**If All Red:**
1. Take screenshot of dashboard
2. Run: `docker compose logs api --tail=100 > ~/debug.log`
3. Contact: DevOps team
4. Consider rollback if <24h after deployment

**If Partial Red (1-2 indicators):**
1. Monitor for 1 hour
2. Check if self-resolves (cache warming, API rate limits)
3. Document in #tech-alerts channel

---

## 🎯 Success Metrics (Weekly)

**Target KPIs:**
- ✅ Uptime: 99.9%
- ✅ Avg signature parsing: 85%+
- ✅ Cache hit rate: 90%+
- ✅ Emails auto-processed: 200-500/day
- ✅ Zero data loss incidents

**Review Every Friday:**
- Compare this week vs last week
- Identify trends (improving/degrading)
- Adjust cron frequency if needed

---

**Last Updated:** 2025-10-30
**Owner:** DevOps Team
**Stakeholders:** Product, Data Science
