# ✅ PRE-DEPLOY CHECKLIST - V2 STABLE

**Date** : 2025-10-27  
**Version** : V2 - Chapitre 7 finalisé  
**Serveur** : root@159.69.108.234 (ubuntu-2gb-nbg1-1)  

---

## 📋 VÉRIFICATIONS PRÉ-DÉPLOIEMENT

### 1. Code & Git
- ✅ Branche : `main`
- ✅ Commits pushés : Tous sur origin/main
- ✅ Feature branch supprimée : `feature/chapitre7-workflows-interactions`
- ✅ Tests backend : 238 passing
- ✅ CI/CD : 9/9 jobs green

### 2. Infrastructure locale
- ✅ Docker services : 4/4 healthy
- ✅ Supervisord : API + worker running
- ✅ Database : PostgreSQL opérationnel
- ✅ Redis : Optionnel, fonctionnel

### 3. Serveur de production
- ✅ SSH accessible : `root@159.69.108.234`
- ✅ Hostname : `ubuntu-2gb-nbg1-1`
- ✅ Clé SSH : `~/.ssh/id_rsa_hetzner`
- ⚠️ Docker installé : À vérifier
- ⚠️ Nginx configuré : À vérifier

### 4. Fichiers de configuration
- ✅ `.env` : Présent (dev config)
- ✅ `.env.production.example` : Template disponible
- ✅ `docker-compose.prod.yml` : Présent
- ✅ `scripts/deploy.sh` : Prêt

---

## 🚀 COMMANDES DE DÉPLOIEMENT

### Étape 1 : Setup initial (si première fois)
```bash
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1
./scripts/deploy.sh setup
```

### Étape 2 : Créer .env production sur serveur
```bash
# Se connecter au serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Créer .env à partir de l'exemple
cd /srv/crm-alforis
cp .env.example .env
nano .env  # Éditer les variables

# Variables critiques à configurer :
# - DATABASE_URL
# - JWT_SECRET_KEY
# - ALLOWED_ORIGINS
# - WEBHOOK_SECRET
# - SENTRY_DSN (optionnel)
```

### Étape 3 : Déploiement complet
```bash
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1
./scripts/deploy.sh -v deploy
```

### Étape 4 : Vérifier le déploiement
```bash
# Statut des containers
./scripts/deploy.sh status

# Logs en temps réel
./scripts/deploy.sh logs

# Test API
curl https://crm.alforis.com/api/v1/health
```

### Étape 5 : Configuration SSL (si nécessaire)
```bash
./scripts/deploy.sh setup-ssl
```

---

## 📊 ACTIONS DISPONIBLES

| Action | Description |
|--------|-------------|
| `setup` | Configuration initiale serveur |
| `deploy` | Déploiement complet |
| `deploy-backend` | Backend uniquement |
| `deploy-frontend` | Frontend uniquement |
| `migrate` | Migrations Alembic |
| `backup-db` | Backup PostgreSQL |
| `status` | Statut containers |
| `logs` | Logs temps réel |
| `restart` | Redémarrer services |
| `update` | Pull git + rebuild |

---

## ⚠️ POINTS D'ATTENTION

### Variables .env à configurer
```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/crm_db

# Security
JWT_SECRET_KEY=<générer avec openssl rand -hex 32>
WEBHOOK_SECRET=<générer avec openssl rand -hex 32>

# CORS
ALLOWED_ORIGINS=["https://crm.alforis.com"]

# Email (optionnel)
RESEND_API_KEY=<si webhooks email>

# Monitoring (recommandé)
SENTRY_DSN=<si monitoring actif>
LOG_LEVEL=INFO
```

### Ports exposés
- **80** : HTTP (redirect vers HTTPS)
- **443** : HTTPS (Nginx)
- **8000** : API (interne uniquement)
- **3010** : Frontend (interne uniquement)
- **5432** : PostgreSQL (interne uniquement)

### Volumes Docker
- `postgres-data` : Données PostgreSQL
- `redis-data` : Données Redis (optionnel)
- `api-logs` : Logs API + worker

---

## 🔒 SÉCURITÉ

### Avant déploiement
- ✅ Secrets dans .env (pas committé)
- ✅ JWT_SECRET_KEY unique et sécurisé
- ✅ WEBHOOK_SECRET configuré
- ⚠️ Firewall UFW activé (ports 80, 443, 22)
- ⚠️ SSL Let's Encrypt à configurer

### Après déploiement
- [ ] Vérifier HTTPS fonctionnel
- [ ] Tester endpoints avec Postman
- [ ] Valider webhook HMAC
- [ ] Activer monitoring Sentry
- [ ] Configurer backups quotidiens

---

## 📝 ROLLBACK EN CAS DE PROBLÈME

```bash
# Restaurer version précédente
./scripts/deploy.sh rollback

# Restaurer backup DB
./scripts/deploy.sh restore-db

# Voir logs d'erreur
./scripts/deploy.sh logs-api
```

---

## ✅ POST-DEPLOY VALIDATION

### Tests manuels
1. Health check : `GET /api/v1/health`
2. Login : `POST /api/v1/auth/login`
3. Interactions : `GET /api/v1/interactions/recent`
4. Hot leads : `GET /api/v1/marketing/leads-hot`
5. Dashboard : `https://crm.alforis.com/dashboard`

### Monitoring
- [ ] Supervisord status : API + worker running
- [ ] Logs propres (pas d'erreur critique)
- [ ] Database accessible
- [ ] Worker tourne (loop 5 min)

---

**Prêt pour déploiement ! 🚀**

Commande rapide :
```bash
cd /Users/test/Documents/ALFORIS\ FINANCE/06.\ CRM/V1
./scripts/deploy.sh -v deploy
```
