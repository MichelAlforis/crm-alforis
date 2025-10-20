# Configuration Nginx pour la recherche

## Problème

Le Nginx actuel proxy tous les appels `/api/*` vers le backend FastAPI (port 8000), mais le endpoint `/api/search` est en fait une route Next.js (port 3000).

## Solution

Ajouter une exception dans la configuration Nginx pour `/api/search` AVANT la règle générale `/api/`.

## Configuration à ajouter

```nginx
server {
    listen 443 ssl http2;
    server_name crm.alforis.fr;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/crm.alforis.fr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/crm.alforis.fr/privkey.pem;

    # ... autres configurations SSL ...

    # IMPORTANT: Cette règle DOIT être AVANT la règle /api/ générale
    # Route de recherche Next.js (port 3000)
    location /api/search {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Routes API backend FastAPI (port 8000)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Routes Next.js frontend (port 3000)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Commandes de déploiement

```bash
# 1. Se connecter au serveur
ssh root@62.210.135.58

# 2. Éditer la configuration Nginx
nano /etc/nginx/sites-available/crm.alforis.fr

# 3. Ajouter la location /api/search AVANT la location /api/

# 4. Tester la configuration
nginx -t

# 5. Recharger Nginx
systemctl reload nginx

# 6. Vérifier les logs si problème
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

## Ordre des locations (IMPORTANT)

Nginx traite les locations dans un ordre spécifique. Pour que `/api/search` soit routé vers Next.js (port 3000) et pas FastAPI (port 8000), il faut :

1. **D'ABORD** : `location /api/search` → port 3000
2. **ENSUITE** : `location /api/` → port 8000
3. **ENFIN** : `location /` → port 3000

## Vérification

Après le déploiement, tester :

```bash
# Doit retourner des résultats JSON de recherche
curl -i https://crm.alforis.fr/api/search?q=test

# Doit retourner un 200 ou 401 (si auth requise), pas un 404
```
