# Production Quick Start - CRM Alforis Finance

## 🚀 Déploiement Rapide

### 1. Configuration Initiale

```bash
# Cloner ou télécharger le projet
cd /Users/test/Documents/ALFORIS FINANCE/06. CRM/V1

# Créer les fichiers .env de production
cp .env.production.example .env.production
cp crm-backend/.env.production.example crm-backend/.env.production.local
cp crm-frontend/.env.production.example crm-frontend/.env.production.local

# Générer les secrets
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env.production
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env.production
```

### 2. Éditer les Variables d'Environnement

**Dans `.env.production`:**
```env
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
ALLOWED_ORIGINS=["https://crm.alforis.fr"]
DEBUG=False
```

**Dans `crm-frontend/.env.production.local`:**
```env
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
```

**Dans `crm-backend/.env.production.local`:**
```env
ALLOWED_ORIGINS=["https://crm.alforis.fr"]
DEBUG=False
```

### 3. Configuration Nginx

```bash
# Copier la configuration
sudo cp nginx/crm.alforis.fr.conf /etc/nginx/sites-available/crm.alforis.fr
sudo ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/

# Obtenir un certificat SSL
sudo certbot --nginx -d crm.alforis.fr

# Recharger Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### 4. Déploiement

```bash
# Utiliser le script de déploiement automatique
./scripts/deploy-production.sh
```

## 🔍 Vérifications

### Test Rapide

```bash
# API
curl https://crm.alforis.fr/health

# Login
curl -X POST https://crm.alforis.fr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'
```

### Vérifier les Logs

```bash
# Tous les logs
docker-compose -f docker-compose.prod.yml logs -f

# Seulement l'API
docker-compose -f docker-compose.prod.yml logs -f api

# Nginx
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log
```

## ⚠️ Problèmes Fréquents

| Problème | Solution |
|----------|----------|
| **502 Bad Gateway** | Vérifier que les conteneurs sont démarrés: `docker-compose -f docker-compose.prod.yml ps` |
| **Mixed Content** | Vérifier `NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1` |
| **CORS Error** | Vérifier `ALLOWED_ORIGINS=["https://crm.alforis.fr"]` dans le backend |
| **SSL Error** | Renouveler le certificat: `sudo certbot renew` |

## 📚 Documentation Complète

Voir [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md) pour la documentation complète.

## 🛠️ Commandes Utiles

```bash
# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Rebuild et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Arrêter tout
docker-compose -f docker-compose.prod.yml down

# Backup de la base de données
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U crm_user crm_db > backup.sql
```
