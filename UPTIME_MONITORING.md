# 📊 Uptime Monitoring - CRM Alforis

**Service:** UptimeRobot (Free Tier)
**URL:** https://uptimerobot.com
**Status Page:** https://stats.uptimerobot.com/XXXXX (à configurer)

---

## 🎯 Configuration UptimeRobot (Gratuit)

### **Compte configuré:**
- ✅ API Key: `u3159160-3f0c5991ccd43d96137f9b1a`
- ✅ Dashboard: https://uptimerobot.com/dashboard

### **Plan Gratuit inclut:**
- ✅ 50 monitors
- ✅ Check interval: 5 minutes
- ✅ Alertes: Email, SMS, Slack, Webhook
- ✅ Status page publique
- ✅ SSL monitoring (via script custom - voir ci-dessous)
- ✅ 90 jours d'historique

---

## 📍 Endpoints à Monitorer

### **1. API Health Check (Critique)**
- **URL:** `https://crm.alforis.fr/api/v1/health`
- **Type:** HTTP(s)
- **Interval:** 5 minutes
- **Expected:** HTTP 200 + `{"status":"ok"}`
- **Alert:** Email + Slack

### **2. API Health Detailed (Monitoring)**
- **URL:** `https://crm.alforis.fr/api/v1/health/detailed`
- **Type:** HTTP(s) - Keyword
- **Interval:** 5 minutes
- **Expected:** HTTP 200 + keyword `"healthy"` or `"degraded"`
- **Alert:** Email si "unhealthy"

### **3. Frontend (Public)**
- **URL:** `https://crm.alforis.fr`
- **Type:** HTTP(s)
- **Interval:** 5 minutes
- **Expected:** HTTP 200
- **Alert:** Email + Slack

### **4. Database Health (Interne)**
- **URL:** `https://crm.alforis.fr/api/v1/health/detailed`
- **Type:** HTTP(s) - Keyword
- **Interval:** 5 minutes
- **Expected:** keyword `"database":{"status":"healthy"`
- **Alert:** Email immédiat

### **5. SSL Certificate (Custom Script)**
- **Script:** `scripts/check-ssl-expiry.sh`
- **Domain:** `crm.alforis.fr`
- **Check:** Quotidien à 9h (cron)
- **Alert:** Email si < 10 jours, critique si < 3 jours
- **Note:** UptimeRobot gratuit ne supporte pas SSL monitoring direct, utiliser script custom

---

## 🔔 Configuration Alertes

### **Alert Contacts (à créer):**

1. **Email Admin**
   - Email: `infra@alforis.fr`
   - Type: Email
   - Alert when: Down

2. **Slack #alerts**
   - Webhook: `https://hooks.slack.com/services/...`
   - Alert when: Down + Up

3. **SMS (optionnel)**
   - Phone: +33 X XX XX XX XX
   - Alert when: Down (critique seulement)

### **Escalation:**
```
1. Down detected → Attendre 1 check (5min)
2. Encore down → Email immédiat
3. Encore down après 3 checks (15min) → Slack
4. Down > 30min → SMS (optionnel)
```

---

## 📊 Status Page Publique

### **URL:** https://stats.uptimerobot.com/XXXXX

**Affiche:**
- ✅ Uptime 30/60/90 jours
- ✅ Response time average
- ✅ Incidents récents
- ✅ Maintenance planifiée

**Configuration:**
```
Title: CRM Alforis - System Status
Logo: Upload Alforis logo
Custom Domain: status.crm.alforis.fr (optionnel)
Services to show:
  - API Health Check
  - Frontend
  - Database
Show:
  - Uptime percentage
  - Response times
  - Incident history (30 days)
```

---

## 🚀 Setup Instructions

### **Étape 1: Créer compte UptimeRobot**
```bash
1. Aller sur https://uptimerobot.com
2. Sign up (gratuit)
3. Confirmer email
```

### **Étape 2: Ajouter monitors**

#### **Monitor 1: API Health**
```
Monitor Type: HTTP(s)
Friendly Name: CRM API Health
URL: https://crm.alforis.fr/api/v1/health
Monitoring Interval: 5 minutes
Monitor Timeout: 30 seconds
Alert Contacts: Email Admin, Slack #alerts

Advanced Settings:
  - Keyword Type: Exists
  - Keyword Value: "ok"
  - HTTP Method: GET
  - Follow Redirects: Yes
```

#### **Monitor 2: API Health Detailed**
```
Monitor Type: HTTP(s) - Keyword
Friendly Name: CRM API Health Detailed
URL: https://crm.alforis.fr/api/v1/health/detailed
Monitoring Interval: 5 minutes
Keyword: "status":"healthy"
Alert Contacts: Email Admin
```

#### **Monitor 3: Frontend**
```
Monitor Type: HTTP(s)
Friendly Name: CRM Frontend
URL: https://crm.alforis.fr
Monitoring Interval: 5 minutes
Alert Contacts: Email Admin, Slack #alerts
```

#### **Monitor 4: Database**
```
Monitor Type: HTTP(s) - Keyword
Friendly Name: CRM Database
URL: https://crm.alforis.fr/api/v1/health/detailed
Monitoring Interval: 5 minutes
Keyword: "database":{"status":"healthy"
Alert Contacts: Email Admin (immediate)
```

#### **Monitor 5: SSL Certificate (Custom Script)**

**Note:** UptimeRobot Free ne supporte pas SSL expiration monitoring.
Solution: Script custom `scripts/check-ssl-expiry.sh`

**Setup Cron:**
```bash
# 1. Rendre le script exécutable
chmod +x scripts/check-ssl-expiry.sh

# 2. Tester
./scripts/check-ssl-expiry.sh

# 3. Ajouter au cron (quotidien à 9h)
crontab -e
# Ajouter:
0 9 * * * cd /path/to/crm && ./scripts/check-ssl-expiry.sh >> /var/log/ssl-check.log 2>&1

# 4. Configurer email
export SSL_ALERT_EMAIL=infra@alforis.fr
```

**Script vérifie:**
- ✅ Date d'expiration via OpenSSL
- ✅ Compatible macOS + Linux
- ⚠️  Alert si < 10 jours
- 🚨 Critical si < 3 jours
- ✅ Email automatique
```

### **Étape 3: Configurer Slack Webhook (optionnel)**

1. Aller dans Slack Workspace Settings
2. Apps → Incoming Webhooks
3. Create New Webhook
4. Copier URL: `https://hooks.slack.com/services/T.../B.../xxx`
5. Dans UptimeRobot → Alert Contacts → Add Webhook
   - Friendly Name: Slack #alerts
   - URL: (coller webhook)
   - POST Format:
     ```json
     {
       "text": "*{{monitorFriendlyName}}* is {{monitorAlertType}}\nReason: {{alertDetails}}\nDuration: {{monitorAlertDuration}}"
     }
     ```

### **Étape 4: Créer Status Page**

```
1. UptimeRobot Dashboard → Status Pages
2. Create Status Page
3. Configure:
   - Page URL: stats.uptimerobot.com/XXXXX (auto-généré)
   - Page Title: CRM Alforis Status
   - Logo: Upload Alforis logo
   - Select Monitors: All 5 monitors
   - Show Uptime: 30 days
   - Show Response Times: Yes
4. Save → Get public URL
```

---

## 📈 Métriques à Surveiller

### **Uptime Target:**
- 🎯 **99.9%** = 43 minutes downtime/mois max
- ⚠️ **99%** = 7 heures downtime/mois
- 🔴 **< 99%** = Problème critique

### **Response Time Target:**
- 🎯 **< 500ms** = Excellent
- ⚠️ **500ms-1s** = Acceptable
- 🔴 **> 1s** = À optimiser

### **Incidents:**
- 📊 Tracker tous les incidents
- 🕐 MTTR (Mean Time To Recovery) < 30 min
- 📝 Post-mortem pour incidents > 1h

---

## 🔧 Maintenance Windows

Pour éviter les fausses alertes pendant la maintenance:

```
UptimeRobot → Monitors → (select) → Pause Monitoring
Durée: 1-2 heures
Raison: "Database maintenance" ou "Server upgrade"
```

**Maintenance recommandée:**
- 🌙 Dimanche 2h-4h du matin (trafic minimal)
- 📧 Prévenir users 24h avant (si > 15min downtime)

---

## 📞 Runbook - Que faire si Down?

### **Si API down:**
```bash
1. Check status page: https://stats.uptimerobot.com/XXXXX
2. SSH serveur: ssh user@server
3. Check containers:
   docker compose ps
   docker compose logs api --tail=50
4. Restart si nécessaire:
   docker compose restart api
5. Check health:
   curl https://crm.alforis.fr/api/v1/health
```

### **Si Database unhealthy:**
```bash
1. Check Postgres:
   docker compose logs postgres --tail=50
2. Check connections:
   docker compose exec postgres psql -U crm_user -c "SELECT count(*) FROM pg_stat_activity;"
3. Restart si nécessaire:
   docker compose restart postgres
```

### **Si Frontend down:**
```bash
1. Check Caddy:
   docker compose logs caddy --tail=50
2. Restart Caddy:
   docker compose restart caddy
```

---

## 💡 Alternatives (si besoin)

### **Autres services gratuits:**

1. **Pingdom** (Free tier)
   - 1 monitor gratuit
   - Check: 1 minute
   - Alertes: Email

2. **Freshping** (Free tier)
   - 50 monitors gratuits
   - Check: 1 minute
   - Status page incluse

3. **StatusCake** (Free tier)
   - 10 monitors gratuits
   - Check: 5 minutes
   - Alertes: Email + SMS

4. **Better Uptime** (Paid - $10/mois)
   - Monitoring + incident management
   - Status page branded
   - Intégrations Slack/Teams/PagerDuty

---

## ✅ Checklist Setup

- [x] Créer compte UptimeRobot (API Key: u3159160-...)
- [ ] Ajouter 4 monitors (API, API detailed, Frontend, Database)
- [ ] Configurer alert contacts (Email: infra@alforis.fr)
- [ ] (Optionnel) Configurer Slack webhook
- [ ] Créer status page publique
- [ ] Tester alertes (pause 1 monitor)
- [x] Setup SSL check script (scripts/check-ssl-expiry.sh)
- [ ] Configurer cron pour SSL check quotidien
- [ ] Documenter runbook
- [ ] Ajouter status page URL dans README
- [ ] Configurer maintenance windows

---

**Temps estimé:** 30 minutes
**Coût:** Gratuit (UptimeRobot Free tier)
**Maintenance:** 0 (automatique)
