# 🐛 BUGFIX - Configuration Production

## Problèmes Identifiés et Résolus

### 🔴 Problème Principal
Le frontend en HTTPS tentait d'appeler `http://localhost:8000` depuis le navigateur, causant:
- **Mixed Content**: Requêtes HTTP bloquées depuis une page HTTPS
- **Connexion refusée**: `localhost:8000` n'est pas accessible depuis le navigateur client
- **CORS**: Pas de proxy configuré pour gérer `/api`

---

## ✅ Solutions Implémentées

### 1. **Frontend - Chemins Relatifs en Production**

**Fichier modifié:** [crm-frontend/lib/api.ts](crm-frontend/lib/api.ts#L64-68)

```typescript
// Avant (❌ PROBLÈME)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Après (✅ CORRIGÉ)
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/v1'  // Production: chemin relatif (Nginx proxy)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')  // Dev: localhost
```

**Résultat:**
- En développement: Continue d'utiliser `http://localhost:8000/api/v1`
- En production: Utilise `/api/v1` (géré par Nginx)

---

### 2. **Configuration Nginx - Proxy Reverse**

**Fichier créé:** [nginx/crm.alforis.fr.conf](nginx/crm.alforis.fr.conf)

Architecture mise en place:
```
Internet (HTTPS)
    ↓
crm.alforis.fr:443 (Nginx)
    ├─→ /api/* → Backend FastAPI (127.0.0.1:8000)
    └─→ /* → Frontend Next.js (127.0.0.1:3010)
```

**Points clés:**
- Redirection HTTP → HTTPS
- Certificat SSL Let's Encrypt
- Proxy `/api` vers le backend
- Headers de sécurité (HSTS, X-Frame-Options, etc.)
- Support WebSocket pour Next.js Hot Reload

---

### 3. **Variables d'Environnement Production**

**Fichiers créés:**
- [.env.production.example](.env.production.example)
- [crm-frontend/.env.production.example](crm-frontend/.env.production.example)
- [crm-backend/.env.production.example](crm-backend/.env.production.example)

**Configuration clé:**
```env
# Frontend
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1

# Backend
ALLOWED_ORIGINS=["https://crm.alforis.fr"]
DEBUG=False
```

---

### 4. **Docker Multi-Stage Builds**

**Fichiers modifiés:**
- [crm-backend/Dockerfile](crm-backend/Dockerfile) - Ajout stage `production`
- [crm-frontend/Dockerfile](crm-frontend/Dockerfile) - Déjà optimisé

**Fichier créé:**
- [docker-compose.prod.yml](docker-compose.prod.yml)

**Optimisations production:**
- 4 workers Uvicorn pour l'API
- Build optimisé Next.js
- Healthchecks robustes
- Logs limités (rotation automatique)

---

### 5. **Scripts de Déploiement**

**Fichier créé:** [scripts/deploy-production.sh](scripts/deploy-production.sh)

Automatise:
- Vérifications préliminaires
- Backup de la base de données
- Build et déploiement
- Tests de connectivité
- Application des migrations

---

## 📁 Fichiers Créés/Modifiés

### Fichiers Créés (8)
1. ✅ `nginx/crm.alforis.fr.conf` - Configuration Nginx
2. ✅ `.env.production.example` - Variables d'environnement racine
3. ✅ `crm-frontend/.env.production.example` - Env frontend
4. ✅ `crm-backend/.env.production.example` - Env backend
5. ✅ `docker-compose.prod.yml` - Docker Compose production
6. ✅ `scripts/deploy-production.sh` - Script de déploiement
7. ✅ `PRODUCTION_DEPLOY.md` - Guide complet
8. ✅ `PRODUCTION_QUICKSTART.md` - Guide rapide

### Fichiers Modifiés (3)
1. ✅ `crm-frontend/lib/api.ts` - Chemins relatifs en prod
2. ✅ `crm-frontend/app/api/search/route.ts` - Variable d'env corrigée
3. ✅ `crm-backend/Dockerfile` - Multi-stage build

---

## 🚀 Comment Déployer

### Option 1: Script Automatique (Recommandé)
```bash
./scripts/deploy-production.sh
```

### Option 2: Manuel
```bash
# 1. Configurer les variables d'environnement
cp .env.production.example .env.production
nano .env.production

# 2. Configurer Nginx
sudo cp nginx/crm.alforis.fr.conf /etc/nginx/sites-available/crm.alforis.fr
sudo ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/
sudo certbot --nginx -d crm.alforis.fr

# 3. Déployer avec Docker
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🧪 Tests de Validation

### 1. Vérifier que le frontend n'appelle plus localhost

Ouvrir la console du navigateur (F12) sur `https://crm.alforis.fr` et vérifier:
- ✅ Aucune erreur "Mixed Content"
- ✅ Toutes les requêtes API utilisent `/api/v1` (pas `http://localhost:8000`)

### 2. Vérifier le proxy Nginx

```bash
# Doit retourner 200 OK
curl -I https://crm.alforis.fr/api/v1/health

# Doit retourner les données de l'API
curl https://crm.alforis.fr/api/v1/organisations
```

### 3. Vérifier le SSL

```bash
# Test certificat
openssl s_client -connect crm.alforis.fr:443 -servername crm.alforis.fr

# Test SSL Labs (recommandé)
# https://www.ssllabs.com/ssltest/analyze.html?d=crm.alforis.fr
```

---

## 📊 Avant / Après

### Avant ❌
```javascript
// Frontend appelait directement
fetch('http://localhost:8000/api/v1/organisations')
// ❌ Mixed Content Error
// ❌ Connection Refused
// ❌ CORS Error
```

### Après ✅
```javascript
// Frontend appelle via chemin relatif
fetch('/api/v1/organisations')
// ✅ Nginx proxy vers http://127.0.0.1:8000/api/v1/organisations
// ✅ Pas de Mixed Content
// ✅ Pas de CORS (same-origin)
// ✅ HTTPS de bout en bout
```

---

## 🔒 Sécurité

### Checklist Appliquée
- ✅ HTTPS obligatoire (redirection HTTP → HTTPS)
- ✅ Certificat SSL Let's Encrypt
- ✅ Headers de sécurité (HSTS, X-Frame-Options, etc.)
- ✅ CORS limité au domaine de production
- ✅ `DEBUG=False` en production
- ✅ Secrets forts (JWT, PostgreSQL)
- ✅ User non-root dans les conteneurs
- ✅ Logs rotatifs configurés

---

## 📚 Documentation

- **Guide Complet**: [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md)
- **Quick Start**: [PRODUCTION_QUICKSTART.md](PRODUCTION_QUICKSTART.md)

---

## 🎯 Résumé

Le problème principal était que le frontend tentait d'appeler directement `http://localhost:8000` depuis le navigateur client, ce qui est impossible en production. La solution consiste à:

1. **Utiliser des chemins relatifs** (`/api/v1`) dans le frontend en production
2. **Configurer Nginx** pour proxifier ces requêtes vers le backend
3. **Séparer les configurations** dev/prod avec des variables d'environnement appropriées

Maintenant, toutes les requêtes passent par HTTPS via Nginx, qui fait le routage interne vers les services appropriés.

---

## 🆘 Support

En cas de problème:
1. Consulter [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md) section "Troubleshooting"
2. Vérifier les logs: `docker-compose -f docker-compose.prod.yml logs -f`
3. Vérifier Nginx: `sudo tail -f /var/log/nginx/crm.alforis.fr.error.log`
