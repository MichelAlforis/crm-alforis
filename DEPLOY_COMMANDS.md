# 🚀 Commandes de Déploiement CRM Alforis

## ✅ Configuration Validée
- **Serveur:** root@159.69.108.234
- **Répertoire:** /srv/crm-alforis
- **Branche:** main
- **Compose:** docker-compose.prod.yml

## 📝 Commandes Essentielles

### 1. Déploiement Complet (Git Pull + Build + Migrate + Restart)
```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./scripts/deploy.sh -v update
```

### 2. Backend Seulement (API + Migrations)
```bash
./scripts/deploy.sh -v deploy-backend
```

### 3. Frontend Seulement
```bash
./scripts/deploy.sh -v deploy-frontend
```

### 4. Migrations DB Seulement
```bash
./scripts/deploy.sh migrate
```

### 5. Redémarrage Containers
```bash
./scripts/deploy.sh restart
```

### 6. Voir les Logs
```bash
# Tous les services
./scripts/deploy.sh logs

# API seulement
./scripts/deploy.sh logs-api

# Frontend seulement
./scripts/deploy.sh logs-frontend
```

### 7. Status
```bash
./scripts/deploy.sh status
```

### 8. Backup Base de Données
```bash
./scripts/deploy.sh backup-db
```

## 🔄 Workflow Standard Après Merge

```bash
# 1. Aller dans le projet
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

# 2. S'assurer d'être sur main
git checkout main
git pull origin main

# 3. Déployer sur production
./scripts/deploy.sh -v update

# 4. Vérifier le statut
./scripts/deploy.sh status

# 5. Voir les logs si nécessaire
./scripts/deploy.sh logs-api
```

## ⚠️ Options Importantes

- **-v** : Mode verbose (recommandé pour voir ce qui se passe)
- Sans -v : Mode silencieux (logs dans deploy.log)

## 📊 Vérification Post-Déploiement

```bash
# Via SSH direct
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 "cd /srv/crm-alforis && docker compose ps"

# Via curl
curl -s https://crm.alforis.fr/api/v1/health | jq .
```

## 🎯 Résumé Session Actuelle

**Branche merged:** test/chapitre5-organisations → main  
**Commits:** 12 commits (Chapitre 5 complet)  
**Tests:** 22/22 (100%)  
**Prochaine commande:**

```bash
./scripts/deploy.sh -v update
```
