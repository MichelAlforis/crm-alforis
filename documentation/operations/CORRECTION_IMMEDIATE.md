# ⚡ CORRECTION IMMÉDIATE - Serveur de Production

## 🎯 Actions à Faire MAINTENANT sur le Serveur

### 📍 Vous êtes ici : `root@ubuntu-2gb-nbg1-1:/srv/crm-alforis`

---

## 🔴 Problème Identifié

D'après vos commandes :
```bash
grep -n 'env_file' docker-compose.prod.yml
# Résultat: 64:    env_file:
```

❌ **Il n'y a qu'UN SEUL `env_file` dans docker-compose.prod.yml**
❌ **Le service frontend ne charge pas .env.production**

---

## ✅ Solution en 5 Minutes

### Étape 1: Backup (10 secondes)

```bash
cd /srv/crm-alforis
cp docker-compose.prod.yml docker-compose.prod.yml.backup
cp .env.production .env.production.backup 2>/dev/null || true
```

### Étape 2: Télécharger les Nouveaux Fichiers (2 minutes)

**DEPUIS VOTRE MACHINE LOCALE**, ouvrez un terminal et exécutez :

```bash
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

# Copier le docker-compose.prod.yml corrigé
scp docker-compose.prod.yml root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/

# Copier le fichier d'exemple .env
scp .env.production.example root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/

# Copier les fichiers frontend corrigés
scp crm-frontend/lib/api.ts root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-frontend/lib/
scp crm-frontend/app/api/search/route.ts root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-frontend/app/api/

# Copier les Dockerfiles mis à jour
scp crm-backend/Dockerfile root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-backend/
scp crm-frontend/Dockerfile root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-frontend/

# Copier la config Nginx
scp -r nginx root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/
```

### Étape 3: Créer/Vérifier .env.production (1 minute)

**RETOUR SUR LE SERVEUR** :

```bash
cd /srv/crm-alforis

# Si .env.production n'existe pas, le créer
if [ ! -f .env.production ]; then
    cat > .env.production << 'EOF'
# Base de données
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=CHANGE_ME_SECRET_PASSWORD
POSTGRES_DB=crm_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5433

# Backend
DEBUG=False
SECRET_KEY=CHANGE_ME_SECRET_KEY_32_CHARS
ALLOWED_ORIGINS=["https://crm.alforis.fr"]
API_PORT=8000

# Frontend
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
FRONTEND_PORT=3010

# JWT
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Environnement
ENVIRONMENT=production
MAX_UPLOAD_SIZE_MB=10
EOF
fi

# Générer les secrets
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Remplacer dans le fichier
sed -i "s/CHANGE_ME_SECRET_KEY_32_CHARS/$SECRET_KEY/" .env.production
sed -i "s/CHANGE_ME_SECRET_PASSWORD/$POSTGRES_PASSWORD/" .env.production

# Construire DATABASE_URL
echo "DATABASE_URL=postgresql://crm_user:${POSTGRES_PASSWORD}@postgres:5432/crm_db" >> .env.production

# Vérifier
echo "✅ Fichier .env.production créé:"
cat .env.production
```

### Étape 4: Vérifier docker-compose.prod.yml (30 secondes)

```bash
# Vérifier que les env_file sont présents
echo "=== Vérification env_file ==="
grep -n "env_file:" docker-compose.prod.yml

# Vous devriez voir 2 lignes maintenant:
# - Une pour l'API (ligne ~77)
# - Une pour le Frontend (ligne ~130)

# Vérifier le contenu complet
cat docker-compose.prod.yml | grep -A2 "env_file:"
```

**Si vous voyez toujours qu'une seule ligne**, éditez manuellement :

```bash
nano docker-compose.prod.yml
```

Et ajoutez dans le service `frontend` (vers ligne 130) :

```yaml
  frontend:
    build:
      context: ./crm-frontend
      dockerfile: Dockerfile
      target: production
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://crm.alforis.fr/api/v1}
    restart: always
    depends_on:
      api:
        condition: service_healthy
    env_file:            # ← AJOUTER CETTE LIGNE
      - .env.production  # ← ET CELLE-CI
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL:-https://crm.alforis.fr/api/v1}
      # ... reste de la config
```

### Étape 5: Redéployer (2 minutes)

```bash
# Arrêter les services
docker-compose -f docker-compose.prod.yml down

# Rebuild sans cache
docker-compose -f docker-compose.prod.yml build --no-cache

# Démarrer
docker-compose -f docker-compose.prod.yml up -d

# Vérifier
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🧪 Tests de Validation

### Test 1: Vérifier les Conteneurs

```bash
docker-compose -f docker-compose.prod.yml ps

# Doit montrer 3 services "Up":
# - postgres
# - api
# - frontend
```

### Test 2: Tester l'API

```bash
curl http://localhost:8000/health

# Doit retourner: {"status":"healthy"}
```

### Test 3: Tester le Frontend

```bash
curl -I http://localhost:3010

# Doit retourner: HTTP/1.1 200 OK
```

### Test 4: Tester depuis l'Extérieur

**DEPUIS VOTRE MACHINE LOCALE** :

```bash
curl https://crm.alforis.fr/health
curl -I https://crm.alforis.fr
```

### Test 5: Vérifier dans le Navigateur

1. Ouvrir `https://crm.alforis.fr`
2. Ouvrir la console (F12)
3. Onglet "Network"
4. Vérifier que les requêtes API vont vers `/api/v1` (pas `localhost:8000`)
5. Vérifier qu'il n'y a **AUCUNE erreur "Mixed Content"**

---

## 🔍 Diagnostic Rapide

### Si l'API ne démarre pas

```bash
# Voir les logs de l'API
docker-compose -f docker-compose.prod.yml logs api

# Erreur commune: "POSTGRES_PASSWORD doit être défini"
# Solution: vérifier que .env.production contient POSTGRES_PASSWORD
grep POSTGRES_PASSWORD .env.production
```

### Si le Frontend ne démarre pas

```bash
# Voir les logs du Frontend
docker-compose -f docker-compose.prod.yml logs frontend

# Erreur commune: Variable NEXT_PUBLIC_API_URL non définie
# Solution: vérifier que .env.production contient NEXT_PUBLIC_API_URL
grep NEXT_PUBLIC_API_URL .env.production
```

### Si Nginx retourne 502 Bad Gateway

```bash
# Vérifier que les services tournent
docker-compose -f docker-compose.prod.yml ps

# Vérifier les ports
sudo netstat -tulpn | grep -E ':(8000|3010)'

# Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# Voir les logs Nginx
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log
```

---

## 📊 État Actuel vs État Souhaité

### ❌ Avant (Problème)

```yaml
# docker-compose.prod.yml
services:
  api:
    env_file:
      - ./crm-backend/.env.production.local  # ← Fichier n'existe pas
    # ...

  frontend:
    # ← MANQUE env_file !
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}  # ← Variable non définie
```

```javascript
// crm-frontend/lib/api.ts
const API_BASE_URL = 'http://localhost:8000/api/v1'  // ← PROBLÈME!
```

### ✅ Après (Corrigé)

```yaml
# docker-compose.prod.yml
services:
  api:
    env_file:
      - .env.production  # ← Charge le fichier à la racine
    # ...

  frontend:
    env_file:
      - .env.production  # ← AJOUTÉ!
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}  # ← Défini dans .env.production
```

```javascript
// crm-frontend/lib/api.ts
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/v1'  // Production: chemin relatif
  : 'http://localhost:8000/api/v1'  // Dev: localhost
```

---

## ✅ Checklist Finale

Cochez au fur et à mesure :

- [ ] Backup fait de `docker-compose.prod.yml` et `.env.production`
- [ ] Nouveaux fichiers copiés depuis la machine locale
- [ ] `.env.production` créé avec secrets générés
- [ ] `docker-compose.prod.yml` a 2 `env_file` (API + Frontend)
- [ ] Services arrêtés : `docker-compose down`
- [ ] Images rebuildées : `docker-compose build --no-cache`
- [ ] Services démarrés : `docker-compose up -d`
- [ ] 3 conteneurs "Up" : `docker-compose ps`
- [ ] API répond : `curl http://localhost:8000/health`
- [ ] Frontend répond : `curl http://localhost:3010`
- [ ] Site accessible : `https://crm.alforis.fr`
- [ ] Aucune erreur "Mixed Content" dans la console

---

## 🆘 Besoin d'Aide ?

Envoyez-moi ces informations :

```bash
# État des conteneurs
docker-compose -f docker-compose.prod.yml ps

# Logs récents
docker-compose -f docker-compose.prod.yml logs --tail=50

# Configuration
grep -n "env_file" docker-compose.prod.yml

# Variables d'environnement (masquées)
cat .env.production | sed 's/PASSWORD=.*/PASSWORD=***/' | sed 's/SECRET_KEY=.*/SECRET_KEY=***/'
```

---

## 📚 Documentation Complète

- **Guide complet** : [PRODUCTION_DEPLOY.md](PRODUCTION_DEPLOY.md)
- **Commandes serveur** : [SERVEUR_COMMANDES.md](SERVEUR_COMMANDES.md)
- **Résumé bugfix** : [BUGFIX_PRODUCTION.md](BUGFIX_PRODUCTION.md)
