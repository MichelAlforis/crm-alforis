# 🚀 CRM Alforis - PRÊT À DÉPLOYER

**Date de préparation :** 20 octobre 2025
**Statut :** ✅ Tout configuré, en attente de Docker Hub

---

## 📦 Ce qui est prêt

### ✅ Configuration
- [x] `.env` configuré avec mot de passe fort
- [x] `NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1`
- [x] `ALLOWED_ORIGINS=["https://crm.alforis.fr"]`
- [x] `DEBUG=False` (production)
- [x] `ENVIRONMENT=production`
- [x] Code source à jour
- [x] Dockerfiles vérifiés et corrigés

### ✅ Scripts de déploiement
- [x] [scripts/deploy.sh](scripts/deploy.sh) - Script principal
- [x] [scripts/setup-nginx-ssl.sh](scripts/setup-nginx-ssl.sh) - Installation Nginx + SSL
- [x] Registry mirrors configurés sur le serveur

### ✅ Configuration Nginx
- [x] [nginx/crm-alforis.conf](nginx/crm-alforis.conf) - Config complète
- [x] Support HTTPS avec Let's Encrypt
- [x] Proxy vers API (port 8000)
- [x] Proxy vers Frontend (port 3010)
- [x] Headers de sécurité

### ✅ Documentation
- [x] [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - Guide complet
- [x] [POST_DEPLOYMENT_CHECKLIST.md](POST_DEPLOYMENT_CHECKLIST.md) - Vérifications
- [x] [scripts/README-DEPLOY.md](scripts/README-DEPLOY.md) - Doc du script

### ✅ Infrastructure serveur
- [x] Serveur : 159.69.108.234 (Hetzner)
- [x] Répertoire : /srv/crm-alforis
- [x] Docker installé
- [x] Registry mirrors configurés
- [x] Firewall configuré (80, 443, 22)

---

## ⏸️ Blocage actuel

**Docker Hub est DOWN (503 Service Unavailable)**

- Incident depuis : 20 oct 2025, 00:16 PDT
- Cause : Problème avec leur cloud provider
- Statut : En cours de résolution
- Suivi : https://www.dockerstatus.com/

**Impact :** Impossible de télécharger les images Docker (`python:3.11-slim`, `node:20-alpine`)

---

## 🎯 Dès que Docker Hub revient

### Commande unique à lancer :

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"
./scripts/deploy.sh -v deploy
```

**Ce que ça fait :**
1. ✅ Copie le code sur le serveur
2. ✅ Copie le `.env` sur le serveur
3. ✅ Build les images Docker
4. ✅ Lance les containers
5. ✅ Exécute les migrations DB
6. ✅ Affiche le statut

**Durée estimée :** 5-10 minutes

---

## 📋 Après le déploiement

### 1. Configurer DNS
Créer un enregistrement A :
```
Type : A
Nom : crm.alforis.fr
Valeur : 159.69.108.234
TTL : 3600
```

### 2. Installer Nginx + SSL
```bash
# Depuis votre Mac
cat scripts/setup-nginx-ssl.sh | \
  ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'bash -s'
```

### 3. Vérifier
Ouvrir : **https://crm.alforis.fr**

### 4. Créer l'admin
Voir [POST_DEPLOYMENT_CHECKLIST.md](POST_DEPLOYMENT_CHECKLIST.md) section 7

---

## 🔍 Vérifier le statut Docker Hub

```bash
# Depuis votre Mac
curl -s https://www.dockerstatus.com/ | grep -i "operational\|disruption"
```

**OU** aller sur : https://www.dockerstatus.com/

Quand vous voyez **"All Systems Operational"**, vous pouvez déployer !

---

## 🚀 Commandes rapides

### Tester la connexion SSH
```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'echo "✅ SSH OK"'
```

### Vérifier l'état du serveur
```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 \
  'cd /srv/crm-alforis && docker compose -f docker-compose.prod.yml ps'
```

### Voir les logs
```bash
./scripts/deploy.sh logs
# OU
./scripts/deploy.sh logs-api
```

### Redémarrer
```bash
./scripts/deploy.sh restart
```

---

## 📁 Structure des fichiers

```
V1/
├── .env                                    # ✅ Configuré (production)
├── .env.example                            # Template
├── docker-compose.prod.yml                 # ✅ Corrigé
├── scripts/
│   ├── deploy.sh                           # ✅ Script principal
│   ├── setup-nginx-ssl.sh                  # ✅ Setup Nginx + SSL
│   └── README-DEPLOY.md                    # Documentation
├── nginx/
│   └── crm-alforis.conf                    # ✅ Config Nginx
├── crm-backend/
│   ├── Dockerfile                          # ✅ Corrigé (healthchecks)
│   └── ...
├── crm-frontend/
│   ├── Dockerfile                          # ✅ OK
│   └── ...
├── DEPLOYMENT_CHECKLIST.md                 # ✅ Guide complet
├── POST_DEPLOYMENT_CHECKLIST.md            # ✅ Vérifications
└── READY_TO_DEPLOY.md                      # ✅ Ce fichier
```

---

## ✅ Corrections apportées aujourd'hui

### Docker Compose
- ✅ Healthcheck PostgreSQL : `pg_isready` au lieu de HTTP
- ✅ Healthcheck API : `/api/v1/health` au lieu de `/health`
- ✅ Chargement natif de `.env` à la racine

### Dockerfiles
- ✅ Healthchecks backend : Python au lieu de curl
- ✅ Healthchecks corrigés : `/api/v1/health`

### Fichier .env
- ✅ Mot de passe PostgreSQL fort (64 chars)
- ✅ `NEXT_PUBLIC_API_URL` corrigé (syntaxe simple)
- ✅ `DATABASE_URL` synchronisé avec `POSTGRES_PASSWORD`
- ✅ `ALLOWED_ORIGINS` au format JSON array
- ✅ `DEBUG=False` pour production

### Infrastructure
- ✅ Registry mirrors configurés (Google Cloud)
- ✅ Chemin serveur : `/srv/crm-alforis`

---

## 🎓 Ce que vous avez appris

1. **Docker Registry Mirrors** : Comment contourner Docker Hub down
2. **Healthchecks Docker** : Importance et syntaxe correcte
3. **Variables d'environnement** : `.env` natif Docker Compose
4. **Déploiement sans PM2** : Docker gère tout (restart, healthchecks)
5. **Nginx + SSL** : Configuration production complète

---

## 📞 Support

**En cas de problème :**
1. Vérifier les logs : `tail -f deploy.log`
2. Voir [POST_DEPLOYMENT_CHECKLIST.md](POST_DEPLOYMENT_CHECKLIST.md) section "Dépannage"
3. Contacter le support Hetzner si problème serveur

---

## 🎯 Prochaine action

**Surveillez Docker Hub** : https://www.dockerstatus.com/

**Dès qu'il est rétabli, lancez :**
```bash
./scripts/deploy.sh -v deploy
```

---

**Tout est prêt ! Le CRM n'attend plus que Docker Hub revienne ! 🚀**

---

**CRM Alforis v1.0**
Préparé le 20 octobre 2025
Production-Ready ✅
