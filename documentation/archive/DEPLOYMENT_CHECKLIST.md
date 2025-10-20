# 🚀 Checklist Déploiement CRM Alforis

## 📋 Configuration DNS

### Enregistrements A à créer chez votre registrar

```
Type    Nom              Valeur
A       crm.alforis.fr   159.69.108.234
```

**OU si vous utilisez un sous-domaine API séparé :**
```
Type    Nom                  Valeur
A       crm.alforis.fr       159.69.108.234
A       api.crm.alforis.fr   159.69.108.234
```

## 🔧 Configuration Nginx (sur le serveur)

### Option 1 : API sur le même domaine (RECOMMANDÉ)

`/etc/nginx/sites-available/crm-alforis`

```nginx
# Frontend + API sur crm.alforis.fr
server {
    listen 80;
    server_name crm.alforis.fr;

    # Frontend Next.js
    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts pour API
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Option 2 : Sous-domaine API séparé

```nginx
# Frontend
server {
    listen 80;
    server_name crm.alforis.fr;

    location / {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# API Backend
server {
    listen 80;
    server_name api.crm.alforis.fr;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔐 SSL Let's Encrypt

### Installation
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### Obtenir les certificats
```bash
# Option 1 (un seul domaine)
sudo certbot --nginx -d crm.alforis.fr

# Option 2 (avec sous-domaine API)
sudo certbot --nginx -d crm.alforis.fr -d api.crm.alforis.fr
```

### Auto-renouvellement
```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement est automatique via systemd timer
sudo systemctl status certbot.timer
```

## ⚙️ Variables d'environnement `.env`

Votre fichier `.env` actuel (local) :

```bash
# PostgreSQL
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=bb1beaafd1e08ea0bc61c7013acc4da563d6af6bbaee5739  # ⚠️ CHANGER EN PROD
POSTGRES_DB=crm_db

# Backend
DATABASE_URL=postgresql://crm_user:bb1beaafd1e08ea0bc61c7013acc4da563d6af6bbaee5739@postgres:5432/crm_db
SECRET_KEY=0ba376a6d5e576b7fe45aedcb300ebad181a90cf9504e0414b0251af6712a9fe  # ✅ OK
DEBUG=False  # ✅ OK pour prod
ENVIRONMENT=production  # ✅ OK

# CORS
ALLOWED_ORIGINS=["https://crm.alforis.fr"]  # ✅ OK

# Frontend
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1  # ✅ OK (Option 1)
# OU
# NEXT_PUBLIC_API_URL=https://api.crm.alforis.fr/api/v1  # Option 2

# Ports internes Docker
API_PORT=8000
FRONTEND_PORT=3010
```

**⚠️ ATTENTION : Changez le POSTGRES_PASSWORD avant le déploiement !**

```bash
# Générer un nouveau mot de passe fort
openssl rand -hex 32
```

## 📦 Étapes de déploiement

### 1. Préparer le serveur (première fois uniquement)
```bash
./scripts/deploy.sh setup
```

### 2. Configurer Nginx sur le serveur
```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

# Créer la config
sudo nano /etc/nginx/sites-available/crm-alforis

# Copier-coller la configuration ci-dessus

# Activer
sudo ln -s /etc/nginx/sites-available/crm-alforis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Obtenir les certificats SSL
```bash
sudo certbot --nginx -d crm.alforis.fr
```

### 4. Éditer le `.env` local
```bash
# Sur votre Mac
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

# Éditer avec VSCode
code .env

# Vérifier les valeurs importantes
cat .env | grep -E "NEXT_PUBLIC_API_URL|ALLOWED_ORIGINS|DEBUG|POSTGRES_PASSWORD"
```

### 5. Déployer !
```bash
./scripts/deploy.sh -v deploy
```

### 6. Vérifier le déploiement
```bash
# Sur le serveur
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234

cd /srv/crm-alforis

# Statut des containers
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f --tail=50
```

## ✅ Checklist finale

- [ ] DNS configuré (A record pour crm.alforis.fr)
- [ ] Nginx configuré sur le serveur
- [ ] SSL Let's Encrypt installé
- [ ] `.env` local édité avec les bonnes valeurs
- [ ] `POSTGRES_PASSWORD` changé (fort, 32+ chars)
- [ ] `NEXT_PUBLIC_API_URL` correct
- [ ] `ALLOWED_ORIGINS` correct
- [ ] `DEBUG=False`
- [ ] `ENVIRONMENT=production`
- [ ] Déploiement réussi
- [ ] Containers démarrés (docker ps)
- [ ] API accessible : `https://crm.alforis.fr/api/v1/health`
- [ ] Frontend accessible : `https://crm.alforis.fr`

## 🔄 Mises à jour futures

```bash
# Après modification du code
./scripts/deploy.sh deploy

# Backend uniquement
./scripts/deploy.sh deploy-backend

# Frontend uniquement
./scripts/deploy.sh deploy-frontend

# Voir les logs
./scripts/deploy.sh logs
```

## 🆘 Dépannage

### API ne répond pas
```bash
ssh root@159.69.108.234
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml logs api --tail=100
```

### Frontend ne charge pas
```bash
docker compose -f docker-compose.prod.yml logs frontend --tail=100
```

### Vérifier les healthchecks
```bash
docker compose -f docker-compose.prod.yml ps
# Statut doit être "healthy"
```

### Redémarrer tout
```bash
./scripts/deploy.sh restart
```

---

**CRM Alforis** - Production Ready ✅
Serveur : `159.69.108.234` (Hetzner)
Domaine : `crm.alforis.fr`
