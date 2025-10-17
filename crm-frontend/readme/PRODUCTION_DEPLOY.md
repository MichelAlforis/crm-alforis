# Guide de Déploiement en Production - CRM Alforis Finance

## Problèmes Résolus

### 🔴 Problèmes identifiés
1. **Frontend hardcodé sur localhost** - Le frontend tentait d'appeler `http://localhost:8000` depuis le navigateur
2. **Mixed Content** - Requêtes HTTP depuis une page HTTPS (bloquées par le navigateur)
3. **CORS et Same-Origin Policy** - Pas de proxy configuré pour `/api`
4. **Pas de certificat SSL** - Nécessaire pour `crm.alforis.fr`

### ✅ Solutions implémentées
1. **Chemins relatifs en production** - Le frontend utilise maintenant `/api/v1` au lieu de `http://localhost:8000/api/v1`
2. **Configuration Nginx** - Proxy inverse qui route `/api` vers le backend et le reste vers le frontend
3. **Variables d'environnement** - Configuration séparée dev/prod
4. **SSL/TLS** - Configuration pour Let's Encrypt

---

## Architecture en Production

```
Internet (HTTPS)
    ↓
crm.alforis.fr:443 (Nginx)
    ├─→ /api/* → Backend FastAPI (127.0.0.1:8000)
    ├─→ /health → Backend FastAPI (127.0.0.1:8000/health)
    ├─→ /docs → Swagger UI (127.0.0.1:8000/docs)
    └─→ /* → Frontend Next.js (127.0.0.1:3010)
```

---

## Étapes de Déploiement

### 1. Prérequis Serveur

```bash
# Installer les dépendances système
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx certbot python3-certbot-nginx docker.io docker-compose git

# Démarrer et activer les services
sudo systemctl start docker
sudo systemctl enable docker
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. Configuration SSL avec Let's Encrypt

```bash
# Obtenir un certificat SSL pour crm.alforis.fr
sudo certbot --nginx -d crm.alforis.fr

# Le certificat sera automatiquement renouvelé
# Vérifier le renouvellement automatique
sudo certbot renew --dry-run
```

### 3. Configuration Nginx

```bash
# Copier la configuration Nginx
sudo cp nginx/crm.alforis.fr.conf /etc/nginx/sites-available/crm.alforis.fr

# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/

# Supprimer la configuration par défaut si présente
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

### 4. Configuration des Variables d'Environnement

```bash
# À la racine du projet
cp .env.production.example .env.production

# Éditer et remplir les valeurs
nano .env.production

# IMPORTANT: Générer des secrets forts
# Secret JWT:
openssl rand -hex 32

# Mot de passe PostgreSQL:
openssl rand -base64 24
```

**Variables à configurer dans `.env.production`:**
- `POSTGRES_PASSWORD` - Mot de passe fort pour PostgreSQL
- `SECRET_KEY` - Clé secrète pour JWT (32+ caractères)
- `ALLOWED_ORIGINS` - `["https://crm.alforis.fr"]`
- `DEBUG` - `False`
- `ENVIRONMENT` - `production`
- `NEXT_PUBLIC_API_URL` - `https://crm.alforis.fr/api/v1`

### 5. Configuration Backend

```bash
# Créer le fichier .env.production.local pour le backend
cp crm-backend/.env.production.example crm-backend/.env.production.local
nano crm-backend/.env.production.local
```

### 6. Configuration Frontend

```bash
# Créer le fichier .env.production.local pour le frontend
cp crm-frontend/.env.production.example crm-frontend/.env.production.local
nano crm-frontend/.env.production.local
```

**Contenu:**
```env
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
```

### 7. Build et Déploiement avec Docker

```bash
# Build les images de production
docker-compose -f docker-compose.prod.yml build

# Lancer les conteneurs
docker-compose -f docker-compose.prod.yml up -d

# Vérifier que tout fonctionne
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### 8. Initialisation de la Base de Données

```bash
# Entrer dans le conteneur backend
docker-compose -f docker-compose.prod.yml exec api bash

# Appliquer les migrations
alembic upgrade head

# Créer un utilisateur admin
python scripts/create_admin.py

# Sortir du conteneur
exit
```

---

## Vérifications Post-Déploiement

### 1. Test de Connectivité

```bash
# Test HTTPS
curl -I https://crm.alforis.fr

# Test API Health
curl https://crm.alforis.fr/health

# Test API avec authentification
curl -X POST https://crm.alforis.fr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"votre_mot_de_passe"}'
```

### 2. Vérifier les Logs

```bash
# Logs Nginx
sudo tail -f /var/log/nginx/crm.alforis.fr.access.log
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log

# Logs Docker
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f postgres
```

### 3. Tester dans le Navigateur

1. Ouvrir `https://crm.alforis.fr`
2. Vérifier qu'il n'y a **aucune erreur dans la console** (F12)
3. Tester la connexion
4. Vérifier que les requêtes API passent bien par `/api/v1` (Network tab)

### 4. Vérifier le SSL

```bash
# Test SSL avec OpenSSL
openssl s_client -connect crm.alforis.fr:443 -servername crm.alforis.fr

# Test SSL avec SSL Labs (recommandé)
# https://www.ssllabs.com/ssltest/analyze.html?d=crm.alforis.fr
```

---

## Maintenance

### Mise à Jour du Code

```bash
# Pull les dernières modifications
git pull origin main

# Rebuild et redémarrer
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Vérifier que tout fonctionne
docker-compose -f docker-compose.prod.yml ps
```

### Backup de la Base de Données

```bash
# Backup manuel
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U crm_user crm_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restauration
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user crm_db < backup_20250117_120000.sql
```

### Monitoring

```bash
# Vérifier l'utilisation des ressources
docker stats

# Vérifier l'état des conteneurs
docker-compose -f docker-compose.prod.yml ps

# Vérifier les logs d'erreurs
docker-compose -f docker-compose.prod.yml logs --tail=100 api | grep ERROR
```

---

## Troubleshooting

### Problème: "Mixed Content" ou "Failed to fetch"

**Cause:** Le frontend essaie encore d'appeler `http://` depuis une page `https://`

**Solution:**
1. Vérifier que `NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1` dans `.env.production.local`
2. Rebuild le frontend: `docker-compose -f docker-compose.prod.yml build frontend`
3. Redémarrer: `docker-compose -f docker-compose.prod.yml restart frontend`

### Problème: "502 Bad Gateway"

**Cause:** Nginx ne peut pas joindre le backend ou le frontend

**Solution:**
```bash
# Vérifier que les services tournent
docker-compose -f docker-compose.prod.yml ps

# Vérifier les ports
sudo netstat -tulpn | grep -E ':(3010|8000)'

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log
```

### Problème: CORS Error

**Cause:** Le backend refuse les requêtes du frontend

**Solution:**
1. Vérifier `ALLOWED_ORIGINS` dans `crm-backend/.env.production.local`
2. Doit contenir: `["https://crm.alforis.fr"]`
3. Redémarrer l'API: `docker-compose -f docker-compose.prod.yml restart api`

### Problème: Certificat SSL expiré

**Solution:**
```bash
# Renouveler manuellement
sudo certbot renew

# Recharger Nginx
sudo systemctl reload nginx
```

---

## Sécurité

### Checklist de Sécurité

- [ ] `DEBUG=False` dans `.env.production`
- [ ] Secret JWT fort (32+ caractères aléatoires)
- [ ] Mot de passe PostgreSQL fort
- [ ] Certificat SSL valide et auto-renouvelable
- [ ] CORS limité à `https://crm.alforis.fr` uniquement
- [ ] Headers de sécurité configurés dans Nginx
- [ ] Firewall configuré (ufw/iptables)
- [ ] Backups automatiques de la base de données
- [ ] Logs rotatifs configurés
- [ ] Monitoring en place

### Configuration Firewall (UFW)

```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH (IMPORTANT: avant d'activer UFW!)
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier les règles
sudo ufw status
```

---

## Performance

### Optimisations Recommandées

1. **Caching Nginx**
   - Assets statiques mis en cache (configuré dans nginx/crm.alforis.fr.conf)
   - Cache navigateur configuré avec headers appropriés

2. **Compression**
   ```nginx
   # Ajouter dans /etc/nginx/nginx.conf (si pas déjà présent)
   gzip on;
   gzip_vary on;
   gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
   ```

3. **Rate Limiting** (protection DDoS)
   ```nginx
   # Ajouter dans /etc/nginx/nginx.conf
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

   # Dans le location /api/
   limit_req zone=api_limit burst=20 nodelay;
   ```

---

## Support

Pour toute question ou problème:
1. Vérifier les logs: `docker-compose -f docker-compose.prod.yml logs -f`
2. Consulter ce guide de déploiement
3. Contacter l'équipe technique Alforis Finance
