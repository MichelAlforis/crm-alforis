# 🚀 Guide de Déploiement - Alforis CRM

Guide complet pour déployer le CRM Alforis en production avec Docker, Nginx et SSL.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Architecture](#architecture)
3. [Déploiement Initial](#déploiement-initial)
4. [Configuration DNS](#configuration-dns)
5. [Nginx + SSL](#nginx--ssl)
6. [Vérifications Post-Déploiement](#vérifications-post-déploiement)
7. [Opérations Courantes](#opérations-courantes)
8. [Troubleshooting](#troubleshooting)

---

## 🔧 Prérequis

### Sur votre machine locale

- **SSH** : Accès SSH au serveur avec clé privée
- **rsync** : Pour la synchronisation des fichiers
- **Git** : Pour le versioning

### Sur le serveur (Hetzner)

- **OS** : Ubuntu 24.04 LTS
- **RAM** : Minimum 2GB (recommandé 4GB+)
- **Disque** : Minimum 20GB libre
- **Ports ouverts** : 22 (SSH), 80 (HTTP), 443 (HTTPS)

### Credentials

```bash
# Serveur
IP: 159.69.108.234
Clé SSH: ~/.ssh/id_rsa_hetzner
User: root

# Domaine
crm.alforis.fr → 159.69.108.234
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Internet (HTTPS)                │
│            https://crm.alforis.fr            │
└───────────────────┬─────────────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Nginx (Reverse    │
         │      Proxy + SSL)   │
         │   Port 80/443       │
         └──────┬──────┬───────┘
                │      │
    ┌───────────▼──┐  │
    │  Frontend    │  │
    │  Next.js     │  │
    │  Port 3010   │  │
    └──────────────┘  │
                      │
              ┌───────▼────────┐
              │  API (FastAPI) │
              │  Port 8000     │
              └───────┬────────┘
                      │
              ┌───────▼────────┐
              │  PostgreSQL    │
              │  Port 5432     │
              └────────────────┘
```

### Stack Technique

- **Frontend** : Next.js 14 (SSR/SSG)
- **Backend** : FastAPI (Python 3.11)
- **Base de données** : PostgreSQL 16
- **Containerisation** : Docker + Docker Compose
- **Proxy** : Nginx
- **SSL** : Let's Encrypt (Certbot)

---

## 🚀 Déploiement Initial

### Étape 1 : Préparation locale

```bash
# 1. Cloner le projet
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

# 2. Créer le fichier .env à la racine
cp .env.example .env

# 3. Configurer les variables d'environnement
nano .env
```

**Variables critiques dans `.env` :**

```bash
# Base de données
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=<générer avec: openssl rand -hex 32>
POSTGRES_DB=crm_db
DATABASE_URL=postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB}

# API Security
SECRET_KEY=<générer avec: openssl rand -hex 32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=production
DEBUG=False

# CORS
ALLOWED_ORIGINS=["https://crm.alforis.fr"]

# Frontend
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
```

### Étape 2 : Configuration initiale du serveur

```bash
# Installation Docker, Nginx, Certbot, Firewall
./scripts/deploy.sh setup
```

**Ce que fait cette commande :**
- ✅ Installe Docker + Docker Compose
- ✅ Installe Nginx
- ✅ Installe Certbot (Let's Encrypt)
- ✅ Configure le firewall (UFW)
- ✅ Crée le répertoire `/srv/crm-alforis`

### Étape 3 : Premier déploiement

```bash
# Déploiement complet avec verbose
./scripts/deploy.sh -v deploy
```

**Ce que fait cette commande :**
1. ✅ Vérifie l'espace disque (nettoie si >85%)
2. ✅ Sauvegarde la base de données (si existante)
3. ✅ Crée un backup du code actuel
4. ✅ Synchronise les fichiers (rsync)
5. ✅ Copie le fichier `.env`
6. ✅ Build les images Docker (API + Frontend)
7. ✅ Démarre les containers
8. ✅ Exécute les migrations Alembic
9. ✅ Affiche le statut final

**Temps estimé :** 5-10 minutes (selon la vitesse réseau et CPU)

---

## 🌐 Configuration DNS

### Chez votre registrar (OVH, Gandi, Cloudflare, etc.)

Créez un enregistrement DNS de type **A** :

```
Type:  A
Nom:   crm
Valeur: 159.69.108.234
TTL:   300 (ou Auto)
```

**Résultat attendu :** `crm.alforis.fr` → `159.69.108.234`

### Vérification DNS

```bash
# Via dig
dig +short crm.alforis.fr

# Via nslookup
nslookup crm.alforis.fr

# Sortie attendue: 159.69.108.234
```

⏰ **Délai de propagation** : 5-60 minutes selon le registrar

---

## 🔒 Nginx + SSL

### Configuration automatique

Une fois le DNS propagé :

```bash
./scripts/deploy.sh setup-ssl crm.alforis.fr contact@alforis.fr
```

**Ce que fait cette commande :**
1. ✅ Copie la configuration Nginx
2. ✅ Vérifie la résolution DNS
3. ✅ Obtient un certificat SSL Let's Encrypt
4. ✅ Configure HTTPS avec redirect HTTP → HTTPS
5. ✅ Active les headers de sécurité (HSTS, X-Frame-Options)
6. ✅ Configure l'auto-renouvellement SSL

### Configuration manuelle (si nécessaire)

```bash
# Sur le serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Copier la config Nginx
cp /srv/crm-alforis/nginx/crm-alforis.conf /etc/nginx/sites-available/crm.alforis.fr
ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/

# Tester la config
nginx -t

# Recharger Nginx
systemctl reload nginx

# Obtenir le certificat SSL
certbot --nginx -d crm.alforis.fr --email contact@alforis.fr --agree-tos --non-interactive --redirect
```

### Vérification SSL

```bash
# Test HTTPS
curl -I https://crm.alforis.fr

# Vérifier le certificat
echo | openssl s_client -connect crm.alforis.fr:443 -servername crm.alforis.fr 2>/dev/null | openssl x509 -noout -dates
```

---

## ✅ Vérifications Post-Déploiement

### 1. État des containers

```bash
./scripts/deploy.sh status
```

**Sortie attendue :**
```
NAME                     IMAGE                  STATUS
crm-alforis-postgres-1   postgres:16-alpine     Up (healthy)
crm-alforis-api-1        crm-alforis-api        Up (healthy)
crm-alforis-frontend-1   crm-alforis-frontend   Up (healthy)
```

### 2. Test API

```bash
# Health check
curl https://crm.alforis.fr/api/v1/health

# Sortie attendue: {"status":"ok"}
```

### 3. Test Frontend

Ouvrir dans un navigateur : **https://crm.alforis.fr**

**Vérifications visuelles :**
- ✅ Page de connexion s'affiche
- ✅ Pas d'erreur console (F12)
- ✅ Cadenas HTTPS vert dans la barre d'adresse

### 4. Test Base de Données

```bash
# Connexion à PostgreSQL
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml exec postgres psql -U crm_user -d crm_db

# Dans psql
\dt  -- Liste des tables
SELECT version();  -- Version PostgreSQL
\q   -- Quitter
```

### 5. Créer un utilisateur admin

```bash
# Se connecter au serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis

# Créer un admin via Python
docker compose -f docker-compose.prod.yml exec api python << 'EOF'
from models.user import User
from database import SessionLocal
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
db = SessionLocal()

admin = User(
    email="admin@alforis.fr",
    username="admin",
    first_name="Admin",
    last_name="Alforis",
    password=pwd_context.hash("ChangeMe123!"),
    role="admin",
    is_active=True
)

db.add(admin)
db.commit()
print(f"✅ Admin créé : {admin.email}")
db.close()
EOF
```

**Connexion initiale :**
- Email : `admin@alforis.fr`
- Mot de passe : `ChangeMe123!`
- ⚠️ **CHANGEZ CE MOT DE PASSE IMMÉDIATEMENT**

### 6. Vérifier les logs

```bash
# Tous les containers
./scripts/deploy.sh logs

# API uniquement
./scripts/deploy.sh logs-api

# Frontend uniquement
./scripts/deploy.sh logs-frontend
```

### 7. Backup automatique

```bash
# Créer un backup manuel
./scripts/deploy.sh backup-db

# Configurer backup automatique (cron)
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
crontab -e

# Ajouter cette ligne (backup quotidien à 3h du matin)
0 3 * * * cd /srv/crm-alforis && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U crm_user crm_db | gzip > /opt/backups/db_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz
```

---

## 🔄 Opérations Courantes

### Déploiement Backend uniquement

```bash
# Redéployer l'API sans toucher au frontend
./scripts/deploy.sh deploy-backend
```

### Déploiement Frontend uniquement

```bash
# Redéployer Next.js sans toucher à l'API
./scripts/deploy.sh deploy-frontend
```

### Migrations de base de données

```bash
# Exécuter les migrations Alembic
./scripts/deploy.sh migrate
```

### Redémarrer les services

```bash
# Redémarrer tous les containers
./scripts/deploy.sh restart

# Arrêter
./scripts/deploy.sh stop

# Démarrer
./scripts/deploy.sh start
```

### Mise à jour depuis Git

```bash
# Pull + rebuild + migrate
./scripts/deploy.sh update
```

### Restaurer un backup

```bash
# Lister les backups disponibles et restaurer
./scripts/deploy.sh restore-db
```

### Nettoyer Docker

```bash
# Libérer de l'espace disque (images/volumes non utilisés)
./scripts/deploy.sh clean-docker
```

---

## 🆘 Troubleshooting

### Problème : Disque plein (100%)

**Symptôme :** Build Docker échoue avec `No space left on device`

**Solution :**
```bash
# Nettoyer Docker
./scripts/deploy.sh clean-docker

# Vérifier l'espace
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'df -h'

# Nettoyer les logs
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'journalctl --vacuum-time=7d'
```

### Problème : Erreurs ESLint/TypeScript au build

**Symptôme :** Build frontend échoue sur des erreurs `@typescript-eslint/no-explicit-any`

**Solution :** Déjà configuré dans `next.config.js` :
```javascript
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true }
```

### Problème : Docker Hub indisponible (503)

**Symptôme :** `failed to resolve: registry.docker.io: 503 Service Unavailable`

**Solutions :**

1. **Attendre la résolution** : Vérifier https://www.dockerstatus.com/

2. **Utiliser les mirrors** (déjà configuré sur le serveur) :
```bash
# Vérifier la config
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'cat /etc/docker/daemon.json'

# Redémarrer Docker
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'systemctl restart docker'
```

3. **Builder localement et pousser** :
```bash
# Sur votre machine locale
docker buildx build --platform linux/amd64 -t alforis-crm:latest .
docker save alforis-crm:latest | gzip > alforis-crm.tar.gz
scp -i ~/.ssh/id_rsa_hetzner alforis-crm.tar.gz root@159.69.108.234:/tmp/
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'docker load < /tmp/alforis-crm.tar.gz'
```

### Problème : Containers unhealthy

**Symptôme :** `docker compose ps` montre `(unhealthy)`

**Solution :**
```bash
# Vérifier les logs
./scripts/deploy.sh logs-api

# Vérifier le healthcheck
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml exec api curl http://localhost:8000/api/v1/health

# Redémarrer le service problématique
docker compose -f docker-compose.prod.yml restart api
```

### Problème : Certificat SSL expiré

**Symptôme :** Erreur navigateur "Certificate expired"

**Solution :**
```bash
# Renouveler manuellement
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
certbot renew --force-renewal
systemctl reload nginx

# Vérifier le renouvellement automatique
systemctl status certbot.timer
```

### Problème : Erreur 502 Bad Gateway

**Symptôme :** Nginx retourne 502 au lieu de la page

**Causes possibles :**
1. Containers arrêtés
2. Ports incorrects dans Nginx
3. Healthcheck échoue

**Solution :**
```bash
# 1. Vérifier containers
./scripts/deploy.sh status

# 2. Vérifier ports dans Nginx
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cat /etc/nginx/sites-enabled/crm.alforis.fr | grep proxy_pass
# Doit afficher:
#   proxy_pass http://localhost:3010;  (frontend)
#   proxy_pass http://localhost:8000;  (api)

# 3. Tester les ports localement sur le serveur
curl http://localhost:3010  # Frontend
curl http://localhost:8000/api/v1/health  # API

# 4. Redémarrer Nginx
systemctl restart nginx
```

### Problème : Migrations Alembic échouent

**Symptôme :** `alembic upgrade head` retourne une erreur

**Solution :**
```bash
# Se connecter au container API
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml exec api bash

# Vérifier l'historique des migrations
alembic current
alembic history

# Réinitialiser à une version spécifique
alembic downgrade <revision_id>
alembic upgrade head

# En dernier recours : réinitialiser complètement
alembic stamp head
```

### Problème : Variables d'environnement non chargées

**Symptôme :** Containers démarrent mais erreurs de connexion DB

**Solution :**
```bash
# Vérifier que .env existe sur le serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'ls -la /srv/crm-alforis/.env'

# Vérifier le contenu (sans afficher les secrets)
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'grep -v PASSWORD /srv/crm-alforis/.env'

# Re-copier .env
scp -i ~/.ssh/id_rsa_hetzner .env root@159.69.108.234:/srv/crm-alforis/.env

# Redémarrer containers
./scripts/deploy.sh restart
```

---

## 📊 Monitoring et Logs

### Logs en temps réel

```bash
# Tous les services
./scripts/deploy.sh logs

# API uniquement
./scripts/deploy.sh logs-api

# Frontend uniquement
./scripts/deploy.sh logs-frontend

# PostgreSQL
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Métriques Docker

```bash
# Utilisation CPU/RAM par container
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
docker stats
```

### Espace disque

```bash
# Espace total
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'df -h'

# Espace utilisé par Docker
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'docker system df'
```

---

## 🔐 Sécurité

### Firewall (UFW)

```bash
# Vérifier les règles
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'ufw status'

# Règles actives:
# - 22/tcp (SSH)
# - 80/tcp (HTTP)
# - 443/tcp (HTTPS)
```

### Secrets

- ⚠️ **NE JAMAIS** commiter `.env` dans Git
- ✅ Utiliser des mots de passe de 32+ caractères (hex)
- ✅ Changer les credentials par défaut
- ✅ Stocker `.env` dans un gestionnaire de secrets (1Password, Vault)

### Headers de sécurité

Déjà configurés dans Nginx :
```nginx
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self' https:
```

---

## 📝 Checklist Déploiement

### Avant de déployer
- [ ] `.env` configuré avec secrets forts
- [ ] DNS configuré et propagé
- [ ] Backup des données existantes (si applicable)
- [ ] Tests locaux passés (`npm test`, `pytest`)

### Pendant le déploiement
- [ ] `./scripts/deploy.sh setup` réussi
- [ ] `./scripts/deploy.sh deploy` réussi
- [ ] Containers `healthy`
- [ ] Migrations exécutées

### Après le déploiement
- [ ] `./scripts/deploy.sh setup-ssl` réussi
- [ ] HTTPS fonctionne (https://crm.alforis.fr)
- [ ] API accessible (`/api/v1/health` → 200)
- [ ] Frontend s'affiche correctement
- [ ] Utilisateur admin créé
- [ ] Backup automatique configuré (cron)
- [ ] Monitoring en place (logs, alertes)
- [ ] Documentation mise à jour

---

## 📞 Support

### Logs de déploiement

Tous les déploiements sont loggés dans `deploy.log` (racine du projet).

### Commandes utiles

```bash
# Résumé de l'état complet
./scripts/deploy.sh status

# Aide complète du script
./scripts/deploy.sh -h

# Version avec logs verbeux
./scripts/deploy.sh -v <action>
```

### Ressources

- **Docker Compose** : https://docs.docker.com/compose/
- **FastAPI** : https://fastapi.tiangolo.com/
- **Next.js** : https://nextjs.org/docs
- **Let's Encrypt** : https://letsencrypt.org/docs/
- **Nginx** : https://nginx.org/en/docs/

---

## 🎉 Félicitations !

Votre CRM Alforis est maintenant déployé en production !

**URLs finales :**
- Frontend : https://crm.alforis.fr
- API : https://crm.alforis.fr/api/v1
- Docs API : https://crm.alforis.fr/api/v1/docs

**Prochaines étapes :**
1. Créer des utilisateurs
2. Importer les données (organisations, contacts)
3. Configurer les workflows
4. Former les utilisateurs
