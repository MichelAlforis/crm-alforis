# 📊 Configuration Monitoring Gratuit - CRM Alforis

**Coût : €0/mois**
**Solution : UptimeRobot (gratuit) + endpoint healthcheck avancé**

---

## 🎯 Objectif

Surveiller la disponibilité du CRM et être alerté en cas de panne **AVANT** que les clients ne s'en rendent compte.

---

## 1️⃣ UPTIMEROBOT - Configuration (5 minutes)

### Créer un compte gratuit

1. **Aller sur** : https://uptimerobot.com
2. **S'inscrire** (gratuit forever pour 50 monitors)
3. **Plan gratuit** :
   - 50 monitors (largement suffisant)
   - Vérification toutes les 5 minutes
   - Alertes email illimitées
   - Alertes SMS/Slack/Webhook

### Créer les monitors

#### Monitor 1 : Site Web Principal

```
Type: HTTPS
URL: https://crm.alforis.fr
Nom: CRM Alforis - Frontend
Interval: 5 minutes
Alert Contacts: votre-email@alforis.fr
```

#### Monitor 2 : API Backend Health

```
Type: HTTPS
URL: https://crm.alforis.fr/api/v1/health
Nom: CRM Alforis - API Health
Interval: 5 minutes
Keyword: "ok"  (vérifie que la réponse contient "ok")
Alert Contacts: votre-email@alforis.fr
```

#### Monitor 3 : API Advanced Health

```
Type: HTTPS
URL: https://crm.alforis.fr/api/v1/monitoring/health
Nom: CRM Alforis - DB + Redis
Interval: 5 minutes
Keyword: "db_connected"
Alert Contacts: votre-email@alforis.fr
```

#### Monitor 4 : WebSocket

```
Type: HTTP(s)
URL: https://crm.alforis.fr/ws/notifications
Nom: CRM Alforis - WebSocket
Interval: 5 minutes
Alert Contacts: votre-email@alforis.fr
```

### Configurer les alertes

**Paramètres d'alerte** :
- ✅ Email : votre-email@alforis.fr
- ✅ Webhook (optionnel) : vers Slack/Discord
- ⚙️ Sensibilité : 2 échecs consécutifs (10 minutes) avant alerte

**Template email d'alerte** :
```
🚨 ALERTE CRM ALFORIS

Monitor: *monitorFriendlyName*
Statut: DOWN
Durée: *uptimeDuration*
Raison: *alertDetails*

Vérifier : *monitorURL*

---
UptimeRobot - crm.alforis.fr
```

---

## 2️⃣ ENDPOINT HEALTHCHECK AVANCÉ (Déjà implémenté ✅)

### Endpoint actuel : `/api/v1/monitoring/health`

**Déjà fonctionnel dans votre code !**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-28T14:30:00Z",
  "services": {
    "database": {
      "status": "up",
      "response_time_ms": 12
    },
    "redis": {
      "status": "up",
      "response_time_ms": 3
    },
    "api": {
      "status": "up",
      "version": "1.0.0"
    }
  },
  "system": {
    "cpu_percent": 15.2,
    "memory_percent": 42.3,
    "disk_percent": 38.1
  }
}
```

### Endpoint additionnel : Healthcheck détaillé

Créons un nouvel endpoint pour UptimeRobot avec keywords simples.

**Fichier** : `/api/v1/monitoring/health/simple`

**Réponse si tout OK** :
```
OK - db_connected - redis_connected - api_healthy
```

**Réponse si problème** :
```
ERROR - db_disconnected
```

---

## 3️⃣ PAGE STATUS PUBLIQUE (Optionnel mais recommandé)

### Option 1 : UptimeRobot Status Page (Gratuit)

**Avantage** : Intégré UptimeRobot, mise à jour auto

**Créer une status page** :
1. Dans UptimeRobot, aller sur "Status Pages"
2. Créer une nouvelle page
3. URL personnalisée : `status-crm-alforis` (devient `stats.uptimerobot.com/status-crm-alforis`)
4. Ajouter vos 4 monitors

**Customisation** :
- Logo Alforis Finance
- Couleurs personnalisées
- Historique 90 jours
- Incidents automatiques

**Publier** :
- CNAME : `status.crm.alforis.fr` → `stats.uptimerobot.com`

### Option 2 : Upptime (GitHub Pages - 100% gratuit)

**Avantage** : Open-source, GitHub-hosted, zero coût

**Setup (10 minutes)** :
1. Fork repo : https://github.com/upptime/upptime
2. Éditer `.upptimerc.yml` :
```yaml
sites:
  - name: CRM Alforis Frontend
    url: https://crm.alforis.fr
  - name: CRM Alforis API
    url: https://crm.alforis.fr/api/v1/health
    expectedStatusCodes:
      - 200
```
3. GitHub Actions s'exécutent toutes les 5 min
4. Status page auto-générée sur : `votre-compte.github.io/upptime`

**CNAME** : `status.crm.alforis.fr` → `votre-compte.github.io`

---

## 4️⃣ ALERTES AVANCÉES (Optionnelles)

### Slack Integration (Gratuit)

**UptimeRobot → Slack** :
1. Créer Slack Incoming Webhook : https://api.slack.com/messaging/webhooks
2. Dans UptimeRobot, "My Settings" → "Add Alert Contact"
3. Type: Webhook
4. URL: Votre Slack webhook URL

**Format message** :
```
🚨 *CRM Alforis DOWN*
Monitor: Frontend HTTPS
Status: DOWN depuis 10 minutes
URL: https://crm.alforis.fr
```

### Discord Integration (Gratuit)

**UptimeRobot → Discord** :
1. Dans Discord, Server Settings → Integrations → Webhooks
2. Créer webhook pour canal #alerts
3. Copier URL
4. Dans UptimeRobot, ajouter Webhook alert contact
5. URL Discord webhook : `https://discord.com/api/webhooks/...`

### PagerDuty (Payant mais puissant)

Pour alertes critiques (appels téléphoniques, SMS) :
- PagerDuty : €19/utilisateur/mois
- Escalation automatique (si pas de réponse en 5 min, appeler le CTO)

**Recommandé pour production sérieuse.**

---

## 5️⃣ MÉTRIQUES & DASHBOARDS

### Grafana + Prometheus (Auto-hébergé - Gratuit)

**Pour métriques avancées** (CPU, RAM, requêtes/sec) :

#### Ajouter dans `docker-compose.prod.yml` :

```yaml
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    ports:
      - "127.0.0.1:9090:9090"
    networks:
      - crm-network

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana-data:/var/lib/grafana
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - crm-network
    depends_on:
      - prometheus
```

#### `prometheus.yml` :

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'crm-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']
```

**Accès Grafana** : http://localhost:3000

**Dashboards pré-configurés** :
- FastAPI metrics
- PostgreSQL performance
- Redis cache hit rate
- Docker container stats

---

## 6️⃣ CHECKLIST DE MISE EN PRODUCTION

### Avant lancement commercial :

- [ ] **UptimeRobot configuré** (4 monitors minimum)
- [ ] **Alertes email actives** (votre email + équipe)
- [ ] **Healthcheck avancé testé** (`/api/v1/monitoring/health`)
- [ ] **Status page publique** (Upptime ou UptimeRobot)
- [ ] **Webhook Slack/Discord** (optionnel mais recommandé)
- [ ] **Tests d'alerte** (simuler panne, vérifier réception email)
- [ ] **Documentation incidents** (Playbook dans INCIDENT_RESPONSE.md)
- [ ] **Grafana configuré** (optionnel pour métriques avancées)

### Tests à faire :

#### Test 1 : Arrêter API

```bash
docker-compose stop api
```

**Attendu** : Alerte UptimeRobot en <10 minutes

#### Test 2 : Arrêter PostgreSQL

```bash
docker-compose stop postgres
```

**Attendu** : `/monitoring/health` retourne "degraded", alerte UptimeRobot

#### Test 3 : Surcharge CPU

```bash
# Simuler charge élevée
docker exec -it v1-api-1 stress --cpu 4 --timeout 60s
```

**Attendu** : Métriques Grafana montrent pic CPU

---

## 7️⃣ COÛT TOTAL

| Service | Coût | Commentaire |
|---------|------|-------------|
| **UptimeRobot** | €0/mois | Gratuit forever (50 monitors) |
| **Upptime** | €0/mois | GitHub Pages gratuit |
| **Grafana + Prometheus** | €0/mois | Auto-hébergé |
| **Slack/Discord webhooks** | €0/mois | Gratuit |
| **PagerDuty** (optionnel) | €19/mois | Si besoin alertes téléphoniques |

**TOTAL : €0/mois** (ou €19 si PagerDuty)

---

## 8️⃣ PROCHAINES ÉTAPES

### Semaine 1 : Setup basique
1. Créer compte UptimeRobot
2. Configurer 4 monitors
3. Tester alertes email

### Semaine 2 : Status page
4. Setup Upptime (GitHub Pages)
5. CNAME `status.crm.alforis.fr`

### Semaine 3 : Métriques avancées (optionnel)
6. Déployer Prometheus + Grafana
7. Créer dashboards

### Semaine 4 : Alertes avancées (optionnel)
8. Intégrer Slack/Discord
9. Tester escalation

---

## 📚 RESSOURCES

### UptimeRobot
- Docs : https://uptimerobot.com/api/
- Status pages : https://uptimerobot.com/help/status-pages/

### Upptime
- GitHub : https://github.com/upptime/upptime
- Demo : https://demo.upptime.js.org

### Grafana
- Docs : https://grafana.com/docs/
- Dashboards : https://grafana.com/grafana/dashboards/

### Prometheus
- Docs : https://prometheus.io/docs/
- Exporters : https://prometheus.io/docs/instrumenting/exporters/

---

**Créé le** : 28 Octobre 2025
**Version** : 1.0
**Coût** : €0/mois
