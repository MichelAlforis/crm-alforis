# 📊 Monitoring CRM TPM Finance - Prometheus + Grafana

## 🎯 Vue d'ensemble

Stack de monitoring complet basé sur **Prometheus** (collecte de métriques) et **Grafana** (visualisation).

### Architecture

```
┌─────────────────┐
│   FastAPI API   │
│   /metrics      │──┐
└─────────────────┘  │
                     │ scrape
┌─────────────────┐  │ every 10s
│   Prometheus    │◄─┘
│   :9090         │
└────────┬────────┘
         │
         │ query
         ▼
┌─────────────────┐
│    Grafana      │
│    :3001        │
└─────────────────┘
```

## 🚀 Démarrage rapide

### 1. Lancer les services

```bash
# Démarrer Prometheus + Grafana
docker compose up -d prometheus grafana

# Vérifier les logs
docker compose logs -f prometheus grafana
```

### 2. Accès aux interfaces

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001
  - Username: `admin` (par défaut)
  - Password: `admin` (par défaut - changez-le!)

### 3. Explorer les métriques

**Dans Prometheus** (http://localhost:9090):
- Allez dans **Graph**
- Requêtes de test:
  ```promql
  system_cpu_percent
  system_memory_percent
  tasks_created_last_24h
  organisations_total
  ```

**Dans Grafana** (http://localhost:3001):
- Dashboard **"CRM TPM Finance - Overview"** déjà provisionné
- Explore → Prometheus → Requêtes PromQL

## 📈 Métriques disponibles

### Système
- `system_cpu_percent` - Usage CPU (%)
- `system_memory_percent` - Usage RAM (%)
- `system_memory_used_bytes` - RAM utilisée (bytes)
- `system_memory_total_bytes` - RAM totale (bytes)
- `system_disk_percent` - Usage disque (%)
- `system_disk_used_bytes` - Disque utilisé (bytes)
- `system_disk_total_bytes` - Disque total (bytes)

### Base de données
- `db_connections_active` - Connexions PostgreSQL actives
- `db_query_duration_seconds` - Durée des requêtes (histogram)

### Cache Redis
- `cache_hits_total` - Nombre de cache hits (counter)
- `cache_misses_total` - Nombre de cache misses (counter)
- `cache_keys_count` - Nombre de clés en cache
- `cache_memory_bytes` - Mémoire cache utilisée (bytes)

### Tâches
- `tasks_total{status="..."}` - Nombre total de tâches par statut
- `tasks_created_last_24h` - Tâches créées (24h)
- `tasks_completed_last_24h` - Tâches complétées (24h)
- `tasks_failed_last_24h` - Tâches échouées (24h)

### Interactions
- `interactions_total` - Nombre total d'interactions
- `interactions_created_last_24h` - Interactions créées (24h)

### Emails
- `emails_sent_total{status="..."}` - Emails envoyés par statut
- `emails_opened_total` - Emails ouverts (counter)

### Business
- `organisations_total` - Nombre d'organisations
- `people_total` - Nombre de personnes
- `users_total` - Nombre d'utilisateurs
- `active_users_last_24h` - Utilisateurs actifs (24h)

### HTTP
- `http_requests_total{method, endpoint, status}` - Requêtes HTTP (counter)
- `http_request_duration_seconds{method, endpoint}` - Durée requêtes (histogram)

## 🚨 Alerting

### Règles configurées

**Système** (dans `alerts.yml`):
- ⚠️ **HighCPUUsage**: CPU > 90% pendant 5min
- 🔴 **CriticalCPUUsage**: CPU > 95% pendant 2min
- ⚠️ **HighMemoryUsage**: RAM > 90% pendant 5min
- 🔴 **CriticalMemoryUsage**: RAM > 95% pendant 2min
- ⚠️ **DiskSpaceRunningOut**: Disque > 85% pendant 10min
- 🔴 **DiskSpaceCritical**: Disque > 95% pendant 5min

**Base de données**:
- ⚠️ **HighDatabaseConnections**: > 40 connexions pendant 5min
- ⚠️ **HighTaskFailureRate**: > 10% d'échec pendant 5min

**Cache**:
- ℹ️ **LowCacheHitRate**: Hit rate < 50% pendant 10min
- ℹ️ **HighCacheMemory**: > 500MB pendant 5min

**Business**:
- ℹ️ **NoUserActivity**: Pas d'interactions pendant 2h
- ⚠️ **EmailsSendingFailed**: > 0.1 emails/s échouent

**Disponibilité**:
- 🔴 **ServiceDown**: API inaccessible pendant 1min
- ⚠️ **PrometheusTargetDown**: Target inaccessible pendant 2min

### Vérifier les alertes actives

**Prometheus UI**: http://localhost:9090/alerts

**PromQL**:
```promql
ALERTS{alertstate="firing"}
```

## 🎨 Dashboards Grafana

### Dashboard principal: "CRM TPM Finance - Overview"

8 panels:
1. **CPU Usage** (Gauge) - Temps réel
2. **Memory Usage** (Gauge) - Temps réel
3. **Disk Usage** (Gauge) - Temps réel
4. **Database Connections** (Timeseries) - Evolution
5. **Tasks (Last 24h)** (Timeseries) - Created/Completed/Failed
6. **Business Entities** (Timeseries) - Orgs/People/Users
7. **Memory Usage (Bytes)** (Timeseries) - RAM + Cache
8. **Cache Performance** (Timeseries) - Hits vs Misses

**Refresh**: Auto-refresh toutes les 10s

### Créer un nouveau dashboard

1. Grafana UI → **Dashboards** → **New Dashboard**
2. Add Panel → Query: `system_cpu_percent`
3. Visualisation: Gauge / Time series / Stat / etc.
4. Save Dashboard

## 📝 Requêtes PromQL utiles

### CPU moyen sur 5min
```promql
avg_over_time(system_cpu_percent[5m])
```

### Taux de succès des tâches (24h)
```promql
(tasks_completed_last_24h / tasks_created_last_24h) * 100
```

### Cache hit rate
```promql
(
  rate(cache_hits_total[5m]) /
  (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
) * 100
```

### Top 5 endpoints HTTP les plus lents (p95)
```promql
topk(5, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])))
```

### Prédiction disque plein (dans 7 jours)
```promql
predict_linear(system_disk_percent[1d], 7*24*3600) > 95
```

## 🔧 Configuration

### Variables d'environnement (.env)

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=super_secret_password_change_me
GRAFANA_ROOT_URL=http://localhost:3001

# Prometheus (optionnel - config dans prometheus.yml)
```

### Modifier les seuils d'alerting

Éditez `monitoring/alerts.yml`:

```yaml
- alert: HighCPUUsage
  expr: system_cpu_percent > 90  # Changez le seuil ici
  for: 5m                        # Changez la durée ici
```

Puis rechargez Prometheus:
```bash
docker compose restart prometheus
```

### Ajouter une nouvelle métrique

1. **Backend** - Ajoutez dans `crm-backend/api/routes/prometheus_metrics.py`:
   ```python
   from prometheus_client import Counter

   new_metric = Counter('new_metric_total', 'Description')
   new_metric.inc()  # Incrémenter
   ```

2. **Prometheus** scrape automatiquement `/api/v1/metrics`

3. **Grafana** - Créez un panel avec query: `new_metric_total`

## 🔒 Sécurité

### Production

⚠️ **Important**: En production, protégez les endpoints:

1. **Prometheus** (port 9090):
   - Accessible uniquement via VPN/bastion
   - Ou ajoutez Basic Auth

2. **Grafana** (port 3001):
   - Changez le mot de passe admin (`GRAFANA_ADMIN_PASSWORD`)
   - Activez HTTPS via reverse proxy (nginx/Caddy)
   - Configurez OAuth (Google/GitHub) si besoin

3. **/metrics endpoint**:
   - Actuellement public (pour scraping Prometheus)
   - Option: Ajouter authentification ou IP whitelist

### Exemple nginx reverse proxy

```nginx
location /grafana/ {
    proxy_pass http://localhost:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /prometheus/ {
    auth_basic "Restricted";
    auth_basic_user_file /etc/nginx/.htpasswd;
    proxy_pass http://localhost:9090/;
}
```

## 📦 Volumes Docker

Données persistées dans volumes nommés:
- `prometheus-data` - Métriques time-series (30 jours de rétention)
- `grafana-data` - Dashboards, users, config Grafana

## 🛠️ Troubleshooting

### Prometheus ne scrape pas les métriques

1. Vérifiez que l'API est accessible:
   ```bash
   curl http://localhost:8000/api/v1/metrics
   ```

2. Vérifiez les targets Prometheus:
   http://localhost:9090/targets
   - Status doit être **UP**
   - Si DOWN: vérifiez le réseau Docker (service `api` accessible depuis `prometheus`)

3. Logs Prometheus:
   ```bash
   docker compose logs prometheus | grep -i error
   ```

### Grafana ne se connecte pas à Prometheus

1. Vérifiez la datasource:
   Grafana → Configuration → Data sources → Prometheus
   - URL: `http://prometheus:9090`
   - Test connexion

2. Vérifiez le réseau:
   ```bash
   docker compose exec grafana ping prometheus
   ```

### Métriques manquantes

1. Vérifiez que `prometheus-client` est installé:
   ```bash
   docker compose exec api pip list | grep prometheus
   ```

2. Vérifiez l'endpoint `/metrics`:
   ```bash
   curl http://localhost:8000/api/v1/metrics | grep -i "system_cpu"
   ```

3. Si métrique absente: collecteur non exécuté ou erreur silencieuse

### Dashboard vide

1. Vérifiez la time range (en haut à droite de Grafana)
2. Vérifiez que Prometheus a des données:
   ```promql
   up{job="crm-api"}
   ```
3. Si `up == 0`: problème de scraping

## 📚 Ressources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)

## 🎯 TODO / Améliorations futures

- [ ] Alertmanager pour notifications (Slack/Email/PagerDuty)
- [ ] Exporters additionnels:
  - [ ] Redis exporter (métriques avancées)
  - [ ] PostgreSQL exporter (query stats détaillées)
  - [ ] Node exporter (métriques système avancées)
- [ ] Dashboards additionnels:
  - [ ] Email marketing performance
  - [ ] AI Agent metrics
  - [ ] API endpoints breakdown
- [ ] Tracing distribué (Jaeger/Tempo)
- [ ] Logs centralisés (Loki + Promtail)
