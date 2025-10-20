# Déploiement - Fix Search 404

## ✅ Fait (Local)
- ✅ Route `/api/search` créée dans [crm-frontend/app/api/search/route.ts](crm-frontend/app/api/search/route.ts)
- ✅ Frontend mis à jour pour appeler `/api/search`
- ✅ Commit & push vers GitHub
- ✅ Documentation Nginx créée

## 🚀 À faire (Serveur Production)

### Étape 1 : Configuration Nginx

```bash
# Se connecter au serveur
ssh root@62.210.135.58

# Éditer la configuration Nginx
nano /etc/nginx/sites-available/crm.alforis.fr
```

**Ajouter cette section AVANT la section `location /api/`** :

```nginx
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
```

**Ordre final des locations** (du haut vers le bas) :
1. `location /api/search` → port 3000 (Next.js)
2. `location /api/` → port 8000 (FastAPI)
3. `location /` → port 3000 (Next.js)

```bash
# Tester la config Nginx
nginx -t

# Si OK, recharger Nginx
systemctl reload nginx
```

### Étape 2 : Déployer le Frontend

```bash
# Toujours connecté au serveur
cd ~/crm-alforis/V1

# Pull les dernières modifications
git pull

# Rebuild le frontend avec la nouvelle route
cd crm-frontend
npm run build

# Redémarrer le container frontend
cd ~/crm-alforis/V1
docker-compose restart frontend

# Vérifier que le container démarre bien
docker-compose ps
docker-compose logs -f frontend
```

### Étape 3 : Vérification

```bash
# Test 1: Vérifier que la route existe
curl -i https://crm.alforis.fr/api/search?q=test

# Devrait retourner:
# - HTTP 200 avec JSON si non authentifié mais route OK
# - HTTP 401 si authentification requise (normal)
# - PAS HTTP 404

# Test 2: Vérifier les logs Nginx
tail -20 /var/log/nginx/access.log | grep search

# Test 3: Tester dans le navigateur
# Aller sur https://crm.alforis.fr/dashboard
# Utiliser la barre de recherche en haut
# → Ne devrait plus avoir d'erreur 404 dans la console
```

## 🔍 Troubleshooting

### Si toujours 404 sur /api/search

1. Vérifier l'ordre des locations dans Nginx :
```bash
grep -A5 "location /api" /etc/nginx/sites-available/crm.alforis.fr
```

2. Vérifier que le frontend écoute bien sur port 3000 :
```bash
netstat -tuln | grep 3000
# ou
ss -tuln | grep 3000
```

3. Vérifier les logs du container frontend :
```bash
docker-compose logs --tail=50 frontend
```

### Si erreur Nginx

```bash
# Vérifier la syntaxe
nginx -t

# Voir les logs d'erreur
tail -50 /var/log/nginx/error.log
```

### Si le build Next.js échoue

```bash
# Vérifier Node version (doit être >= 18)
node -v

# Nettoyer et rebuild
rm -rf .next node_modules
npm install
npm run build
```

## 📋 Commandes rapides (copier-coller)

```bash
# 1. Configuration Nginx
ssh root@62.210.135.58
nano /etc/nginx/sites-available/crm.alforis.fr
# → Ajouter la section location /api/search AVANT location /api/
nginx -t && systemctl reload nginx

# 2. Déploiement frontend
cd ~/crm-alforis/V1
git pull
cd crm-frontend && npm run build && cd ..
docker-compose restart frontend
docker-compose logs -f frontend

# 3. Test
curl -i https://crm.alforis.fr/api/search?q=test
```

## ⚠️ Note importante

La configuration Nginx est **CRITIQUE**. Si `location /api/search` est APRÈS `location /api/`, Nginx routera vers FastAPI (port 8000) qui ne connaît pas cette route → 404.

L'ordre DOIT être :
```nginx
location /api/search { ... }  # Spécifique en premier
location /api/ { ... }        # Générique ensuite
```
