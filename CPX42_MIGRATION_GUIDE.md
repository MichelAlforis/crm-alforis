# 🚀 Migration CPX31 → CPX42 - Guide

**Date:** 31 Octobre 2025
**Serveur actuel:** CPX31 (4 vCPU, 8GB RAM)
**Serveur cible:** CPX42 (8 vCPU, 16GB RAM)

---

## 📊 Comparaison CPX31 vs CPX42

| Métrique | CPX31 | CPX42 | Gain |
|----------|-------|-------|------|
| **CPU** | 4 vCPU | 8 vCPU | **2x** |
| **RAM** | 8GB | 16GB | **2x** |
| **Disk** | 160GB NVMe | 240GB NVMe | +50% |
| **Prix** | ~10€/mois | ~20€/mois | +10€ |

---

## 🎯 Bénéfices Migration

### Ollama (IA locale)
| Feature | CPX31 | CPX42 | Impact |
|---------|-------|-------|--------|
| RAM disponible | 5GB | 12GB | **+140%** |
| CPU dédiés | 2 cores | 4 cores | **2x** |
| Requêtes parallèles | 2 | 4 | **2x throughput** |
| Modèles en mémoire | 1 | 2 | Spécialisation possible |
| Latence moyenne | 300-800ms | 200-500ms | **-40%** |

**Modèles possibles :**
- CPX31: `mistral:7b` (4.3GB) uniquement
- CPX42: `llama2:13b` (7.3GB) OU `mistral:7b + phi:2.7b` (5.9GB)

### Services généraux
| Service | CPX31 | CPX42 | Amélioration |
|---------|-------|-------|--------------|
| Postgres connections | 50 | 100 | +100% |
| Postgres cache | 512MB | 2GB | +300% |
| Celery workers | 2 | 4 | +100% |
| Email sync | 10 min | 5 min | 2x plus rapide |

---

## 📋 Checklist Migration

### Avant Migration (sur CPX31)
- [x] Backup complet DB
- [x] Export `.env` (secrets)
- [x] Noter IP actuelle (DNS update)
- [x] Liste services actifs
- [x] Backup volumes Docker

### Pendant Migration (nouveau CPX42)
- [x] Provisionner CPX42 sur Hetzner ✅ (serveur actuel: 159.69.108.234)
- [x] Installer OS (Ubuntu 22.04) ✅
- [x] Installer Docker + Docker Compose ✅
- [x] Cloner repo CRM ✅ (/srv/crm-alforis)
- [x] Restore `.env` ✅
- [x] Restore DB backup ✅ (migration automatique Alembic)
- [x] Deploy avec `docker-compose.prod.yml` ✅ (avec Ollama intégré)
- [x] Télécharger modèle Ollama (mistral:7b) ✅

### Après Migration
- [x] Update DNS A record vers nouvelle IP ✅ (crm.alforis.fr → 159.69.108.234)
- [ ] Tester OAuth (Gmail + Outlook)
- [ ] Tester Multi-Mail sync
- [x] Tester Ollama suggestions ✅ (mistral:7b opérationnel)
- [ ] Monitorer RAM/CPU 24h
- [ ] Désactiver ancien CPX31

---

## 🛠️ Commandes Migration

### 1. Sur CPX31 (backup)
```bash
# Backup DB
docker compose exec postgres pg_dump -U crm_user crm_db | gzip > backup-$(date +%Y%m%d).sql.gz

# Backup .env
cp .env .env.backup

# Liste volumes
docker volume ls

# Export volumes (si besoin)
docker run --rm -v postgres-data:/data -v $(pwd):/backup alpine tar czf /backup/postgres-data.tar.gz -C /data .
```

### 2. Sur CPX42 (nouveau serveur)
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER

# Clone repo
cd /srv
git clone https://github.com/your-org/crm-alforis.git
cd crm-alforis

# Restore .env
scp root@old-cpx31:/srv/crm-alforis/.env .

# Restore DB backup
scp root@old-cpx31:/srv/crm-alforis/backup-*.sql.gz .
gunzip backup-*.sql.gz

# Deploy base services
docker compose up -d postgres redis

# Restore DB
docker compose exec -T postgres psql -U crm_user crm_db < backup-*.sql

# Deploy avec override CPX42
docker compose -f docker-compose.yml -f docker-compose.cpx42.yml up -d

# Run migration script
./scripts/migrate-to-cpx42.sh
```

### 3. Update DNS
```bash
# Hetzner DNS Panel
A    crm.alforis.fr    NEW_CPX42_IP    60
```

---

## 📈 Performance Attendue CPX42

### Ollama - Latence par modèle
```
mistral:7b (CPX42, 4 cores):
- Génération: ~25-40 tokens/sec (vs 15-30 sur CPX31)
- Latence suggestion: 200-400ms (vs 300-600ms)
- Throughput: 4 requêtes parallèles (vs 2)

llama2:13b (CPX42 uniquement):
- Génération: ~15-25 tokens/sec
- Latence suggestion: 400-600ms
- Qualité: ⭐⭐⭐⭐⭐ (meilleure que mistral:7b)
```

### Celery - Email Sync
```
CPX31 (2 workers):
- 50 emails: ~10 min
- 200 emails: ~40 min

CPX42 (4 workers):
- 50 emails: ~5 min (2x plus rapide)
- 200 emails: ~20 min (2x plus rapide)
```

### Postgres - Queries
```
CPX31 (512MB cache):
- Cold query: ~50-100ms
- Warm query: ~10-20ms

CPX42 (2GB cache):
- Cold query: ~20-50ms (2x plus rapide)
- Warm query: ~5-10ms (2x plus rapide)
```

---

## 💰 Coût vs Performance

### ROI Migration
```
Coût supplémentaire: +10€/mois = +120€/an

Gains:
- Latence IA divisée par 2 → UX améliorée
- Throughput emails 2x → traite 2x plus de clients
- Qualité IA améliorée (llama2:13b) → moins d'erreurs
- Scaling headroom → prêt pour 5x croissance

Break-even: Si CRM génère >10€/mois de valeur supplémentaire
→ ROI immédiat
```

---

## 🔧 Config Recommandée CPX42

### Option A - Qualité Max (1 modèle)
```yaml
# docker-compose.cpx42.yml
ollama:
  environment:
    OLLAMA_MAX_LOADED_MODELS: 1
    OLLAMA_NUM_PARALLEL: 4
  deploy:
    resources:
      limits:
        memory: 10G
        cpus: '4.0'

# .env
OLLAMA_MODEL=llama2:13b
```

**Use case:** Qualité IA maximale, suggestions complexes

### Option B - Spécialisation (2 modèles)
```yaml
# docker-compose.cpx42.yml
ollama:
  environment:
    OLLAMA_MAX_LOADED_MODELS: 2
    OLLAMA_NUM_PARALLEL: 4
  deploy:
    resources:
      limits:
        memory: 12G
        cpus: '4.0'

# .env
OLLAMA_MODEL=mistral:7b              # Suggestions
OLLAMA_MODEL_CLASSIFY=phi:2.7b       # Classification/Intent
```

**Use case:** Pipeline IA optimisé, chaque modèle spécialisé

---

## 🚨 Rollback Plan

Si problème sur CPX42 :

```bash
# 1. Revert DNS vers CPX31
A    crm.alforis.fr    OLD_CPX31_IP    60

# 2. CPX31 doit rester actif 24-48h après migration
# Ne PAS désactiver immédiatement

# 3. Si rollback nécessaire
# Aucune action, CPX31 continue de tourner
```

---

## ✅ Validation Post-Migration

```bash
# 1. Health checks
docker compose ps
# → Tous services "healthy"

# 2. Ollama loaded models
docker compose exec ollama curl http://localhost:11434/api/tags
# → Voir llama2:13b OU mistral:7b + phi:2.7b

# 3. RAM usage
docker stats --no-stream
# → ollama: 7-12GB (normal)

# 4. Test suggestions
curl -X POST http://localhost:8000/api/v1/ai/ollama/suggest \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Suggest a role for CEO at ACME Corp"}'
# → Réponse < 500ms

# 5. Test email sync
# → Flower UI (port 5555), vérifier 4 workers actifs
```

---

## 📝 Timeline Migration

**Downtime estimé:** 15-30 minutes

```
T-0:    Start migration
T+5:    CPX42 provisionné
T+10:   Docker + services installés
T+15:   DB restored
T+20:   DNS updated (propagation 1-5 min)
T+30:   Validation complète
```

---

## 🎉 Après Migration

**Nouvelles capacités débloquées :**
- ✅ IA locale avec llama2:13b (meilleure qualité)
- ✅ 4 requêtes IA parallèles (vs 2)
- ✅ Email sync 2x plus rapide
- ✅ Scaling headroom pour croissance
- ✅ 2 modèles spécialisés possible

**Monitoring 1ère semaine :**
```bash
# RAM usage
watch -n 60 'docker stats --no-stream'

# Ollama latency
docker compose logs -f api | grep ollama

# Celery throughput
docker compose exec flower curl http://localhost:5555/api/workers
```

---

**Prêt pour migration quand prod est propre ! 🚀**
