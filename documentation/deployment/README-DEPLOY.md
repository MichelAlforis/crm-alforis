# 🚀 Guide de Déploiement - CRM Alforis

Script de déploiement Docker automatisé pour le CRM Alforis.

ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

## 📋 Pré-requis

### Local
- SSH configuré avec accès au serveur
- `rsync` installé (recommandé)
- Fichiers `.env.production` configurés

### Serveur
- Ubuntu 20.04+ ou Debian 11+
- Docker et Docker Compose installés
- Nginx (pour reverse proxy)
- Certificat SSL (Let's Encrypt)

## 🔧 Configuration Initiale

### 1. Créer le fichier d'environnement

**⚠️ Docker Compose charge automatiquement `.env` à la racine (comportement natif)**

**Fichier unique** : `.env` (racine)
```bash
cp .env.example .env
nano .env
```

**Variables importantes :**

**PostgreSQL :**
- `POSTGRES_USER=crm_user`
- `POSTGRES_PASSWORD` : Mot de passe fort (32+ caractères)
- `POSTGRES_DB=crm_db`
- `POSTGRES_EXTERNAL_PORT=5433`

**Backend API :**
- `SECRET_KEY` : Générer avec `python3 -c "import secrets; print(secrets.token_urlsafe(64))"`
- `DATABASE_URL=postgresql://crm_user:PASSWORD@postgres:5432/crm_db`
- `ALLOWED_ORIGINS=["https://crm.votre-domaine.com"]`
- `SENDGRID_API_KEY` : Pour les emails
- `API_PORT=8000`

**Frontend :**
- `NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1`
- `FRONTEND_PORT=3010`

**Autres :**
- `REDIS_URL=redis://redis:6379/0`
- `SENTRY_DSN` : Monitoring (optionnel)

### 2. Configuration SSH

Créer une clé SSH dédiée (si pas déjà fait) :
```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa_hetzner
ssh-copy-id -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
```

### 3. Variables d'environnement (optionnel)

Personnaliser le script :
```bash
export SSH_KEY="$HOME/.ssh/id_rsa_hetzner"
export SERVER="root@159.69.108.234"
export REMOTE_DIR="/srv/crm-alforis"
export COMPOSE_FILE="docker-compose.prod.yml"
```

## 🚀 Utilisation

### Première installation

```bash
# 1. Configuration serveur (Docker, Nginx, firewall)
./scripts/deploy.sh setup

# 2. Déploiement complet
./scripts/deploy.sh -v deploy
```

### Déploiements courants

```bash
# Déploiement complet
./scripts/deploy.sh deploy

# Backend uniquement
./scripts/deploy.sh deploy-backend

# Frontend uniquement
./scripts/deploy.sh deploy-frontend

# Migrations DB uniquement
./scripts/deploy.sh migrate
```

### Gestion des containers

```bash
# Statut
./scripts/deploy.sh status

# Logs
./scripts/deploy.sh logs
./scripts/deploy.sh logs-api
./scripts/deploy.sh logs-frontend

# Redémarrage
./scripts/deploy.sh restart

# Arrêt
./scripts/deploy.sh stop

# Démarrage
./scripts/deploy.sh start
```

### Base de données

```bash
# Backup
./scripts/deploy.sh backup-db

# Restaurer
./scripts/deploy.sh restore-db
```

### Mises à jour

```bash
# Mise à jour depuis git
./scripts/deploy.sh update

# Rollback
./scripts/deploy.sh rollback
```

## 🔒 Sécurité

### Fichiers .env

⚠️ **IMPORTANT** : Les fichiers `.env.production` sont :
- **Exclus de git** (`.gitignore`)
- **Copiés séparément** via SCP lors du déploiement
- **Ne doivent JAMAIS être commités**

Le script copie automatiquement :
- `crm-backend/.env.production` → Serveur
- `crm-frontend/.env.production` → Serveur

### Bonnes pratiques

1. **SECRET_KEY** : Générer une clé unique
   ```bash
   python3 -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

2. **Mots de passe** : Utiliser des mots de passe forts (32+ caractères)

3. **CORS** : Autoriser uniquement vos domaines
   ```bash
   ALLOWED_ORIGINS=["https://crm.alforis.com"]
   ```

4. **Backups** : Sauvegarder régulièrement
   ```bash
   # Ajouter au crontab
   0 2 * * * cd /opt/alforis-crm && ./scripts/deploy.sh backup-db
   ```

## 📁 Structure des fichiers

```
V1/
├── scripts/
│   ├── deploy.sh                          # Script principal
│   └── README-DEPLOY.md                   # Ce fichier
├── crm-backend/
│   ├── .env.production.example            # Template
│   └── .env.production                    # ⚠️ Ne pas commiter !
├── crm-frontend/
│   ├── .env.production.example            # Template
│   └── .env.production                    # ⚠️ Ne pas commiter !
└── docker-compose.prod.yml                # Config Docker production
```

## 🔄 Workflow de Déploiement

### Déploiement complet (`deploy`)

1. ✅ Vérification connexion SSH
2. ✅ Vérification fichiers `.env.production`
3. 💾 Backup base de données
4. 💾 Backup répertoire application
5. 📤 Copie fichiers (rsync, exclus `.env`)
6. 📤 Copie séparée des `.env.production`
7. 🔨 Build images Docker
8. 🚀 Démarrage containers
9. 🗄️ Migrations Alembic
10. ✅ Affichage statut

### Déploiement backend uniquement

1. 📤 Copie fichiers backend (exclus `.env`)
2. 📤 Copie séparée de `.env.production`
3. 🔨 Rebuild image API
4. 🔄 Restart container API
5. 🗄️ Migrations

### Déploiement frontend uniquement

1. 📤 Copie fichiers frontend (exclus `.env`)
2. 📤 Copie séparée de `.env.production`
3. 🔨 Rebuild image frontend
4. 🔄 Restart container frontend

## 🆘 Dépannage

### Erreur : "Fichiers .env.production manquants"

```bash
# Vérifier présence des fichiers
ls -la crm-backend/.env.production
ls -la crm-frontend/.env.production

# Les créer depuis les templates
cp crm-backend/.env.production.example crm-backend/.env.production
cp crm-frontend/.env.production.example crm-frontend/.env.production
```

### Erreur : "Connexion SSH impossible"

```bash
# Tester connexion
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Vérifier permissions clé
chmod 600 ~/.ssh/id_rsa_hetzner
```

### Erreur : "Build échoué"

```bash
# Voir les logs détaillés
./scripts/deploy.sh -v deploy

# Consulter deploy.log
tail -f deploy.log
```

### Containers ne démarrent pas

```bash
# Statut détaillé
./scripts/deploy.sh status

# Logs spécifiques
./scripts/deploy.sh logs-api
./scripts/deploy.sh logs-frontend

# Redémarrer
./scripts/deploy.sh restart
```

## 📊 Monitoring

### Logs

```bash
# Tous les logs en temps réel
./scripts/deploy.sh logs

# API uniquement
./scripts/deploy.sh logs-api

# Frontend uniquement
./scripts/deploy.sh logs-frontend

# Sur le serveur directement
ssh root@159.69.108.234
cd /opt/alforis-crm
docker compose -f docker-compose.prod.yml logs -f
```

### Health Checks

```bash
# Via curl
curl https://api.votre-domaine.com/api/v1/health

# Statut containers
./scripts/deploy.sh status
```

## 🎯 Options du script

```bash
-v    Mode verbose (affiche tous les détails)
-h    Affiche l'aide
```

**Exemples :**
```bash
./scripts/deploy.sh -v deploy    # Déploiement avec détails
./scripts/deploy.sh -h           # Aide
```

## 📝 Notes

- Les logs sont sauvegardés dans `deploy.log`
- Les backups DB sont dans `/opt/backups/` sur le serveur
- Le script utilise `rsync` si disponible, sinon `scp`
- Mode verbose (`-v`) recommandé pour le debug

---

**CRM Alforis v1.0** - Déploiement Docker
Dernière mise à jour : Octobre 2024
