# 🖥️ Commandes à Exécuter sur le Serveur de Production

## État Actuel du Serveur

D'après vos commandes, le serveur a :
- ✅ `docker-compose.prod.yml` présent
- ✅ Services définis : API (ligne 57-58), Frontend (ligne 102-103)
- ⚠️ Seulement 1 `env_file` trouvé (ligne 64) - il manque pour le frontend

---

## 🔧 Commandes de Correction à Exécuter

### 1. Se Connecter au Serveur

```bash
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234
cd /srv/crm-alforis
git pull origin main
docker compose up -d --build

```

---

### 2. Vérifier la Configuration Actuelle

```bash
# Vérifier le contenu complet de docker-compose.prod.yml
cat docker-compose.prod.yml

# Vérifier quels fichiers .env existent
ls -la | grep env

# Vérifier le contenu de .env.production (si existe)
cat .env.production 2>/dev/null || echo "Fichier .env.production manquant"
```

---

### 3. Sauvegarder la Configuration Actuelle

```bash
# Backup avant modification
cp docker-compose.prod.yml docker-compose.prod.yml.backup.$(date +%Y%m%d_%H%M%S)
cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

echo "✅ Backup créé"
```

---

### 4. Télécharger la Nouvelle Configuration

**Option A: Via Git (si le repo est accessible)**

```bash
# Pull les dernières modifications
git pull origin main

# Ou clone si pas encore fait
# git clone <URL_DU_REPO> /srv/crm-alforis
```

**Option B: Copier manuellement depuis votre machine locale**

```bash
# Sur votre machine locale (dans le terminal)
cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

# Copier docker-compose.prod.yml
scp docker-compose.prod.yml root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/

# Copier les fichiers de configuration
scp .env.production.example root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/
scp nginx/crm.alforis.fr.conf root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/nginx/
scp scripts/deploy-production.sh root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/scripts/
scp scripts/check-production-config.sh root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/scripts/

# Copier les Dockerfiles mis à jour
scp crm-backend/Dockerfile root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-backend/
scp crm-frontend/lib/api.ts root@ubuntu-2gb-nbg1-1:/srv/crm-alforis/crm-frontend/lib/
```

---

### 5. Créer le Fichier .env.production

```bash
cd /srv/crm-alforis

# Copier l'exemple
cp .env.production.example .env.production

# Générer les secrets
SECRET_KEY=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -base64 24)

# Éditer le fichier
nano .env.production
```

**Contenu minimal de .env.production:**

```env
# Base de données
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=VOTRE_MOT_DE_PASSE_GENERE
POSTGRES_DB=crm_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5433

# Database URL
DATABASE_URL=postgresql://crm_user:VOTRE_MOT_DE_PASSE_GENERE@postgres:5432/crm_db

# Backend
DEBUG=False
SECRET_KEY=VOTRE_CLE_SECRETE_GENEREE
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
```

**Commande pour générer et insérer automatiquement:**

```bash
# Créer .env.production avec les secrets générés
cat > .env.production << EOF
# Base de données
POSTGRES_USER=crm_user
POSTGRES_PASSWORD=$(openssl rand -base64 24)
POSTGRES_DB=crm_db
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_EXTERNAL_PORT=5433

# Backend
DEBUG=False
SECRET_KEY=$(openssl rand -hex 32)
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

# Construire DATABASE_URL
POSTGRES_PASSWORD=$(grep POSTGRES_PASSWORD .env.production | cut -d'=' -f2)
echo "DATABASE_URL=postgresql://crm_user:${POSTGRES_PASSWORD}@postgres:5432/crm_db" >> .env.production

echo "✅ .env.production créé avec secrets générés"
cat .env.production
```

---

### 6. Vérifier la Configuration

```bash
# Exécuter le script de vérification
chmod +x scripts/check-production-config.sh
./scripts/check-production-config.sh
```

---

### 7. Configurer Nginx

```bash
# Copier la configuration
sudo cp nginx/crm.alforis.fr.conf /etc/nginx/sites-available/crm.alforis.fr

# Créer le lien symbolique
sudo ln -sf /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/crm.alforis.fr

# Supprimer la config par défaut si présente
sudo rm -f /etc/nginx/sites-enabled/default

# Tester la configuration
sudo nginx -t

# Si OK, obtenir un certificat SSL
sudo certbot --nginx -d crm.alforis.fr

# Recharger Nginx
sudo systemctl reload nginx

echo "✅ Nginx configuré"
```

---

### 8. Arrêter les Services Actuels

```bash
# Arrêter tous les conteneurs
docker-compose down

# Vérifier qu'ils sont bien arrêtés
docker ps -a | grep crm
```

---

### 9. Déployer avec la Nouvelle Configuration

```bash
# Rendre le script exécutable
chmod +x scripts/deploy-production.sh

# Lancer le déploiement
./scripts/deploy-production.sh
```

**OU manuellement:**

```bash
# Build les images
docker-compose -f docker-compose.prod.yml build --no-cache

# Démarrer les services
docker-compose -f docker-compose.prod.yml up -d

# Suivre les logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

### 10. Vérifications Post-Déploiement

```bash
# Vérifier l'état des conteneurs
docker-compose -f docker-compose.prod.yml ps

# Tester l'API en local
curl http://localhost:8000/health

# Tester le frontend en local
curl http://localhost:3010

# Tester depuis l'extérieur (depuis votre machine)
curl https://crm.alforis.fr/health
curl https://crm.alforis.fr

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs --tail=50 api
docker-compose -f docker-compose.prod.yml logs --tail=50 frontend

# Vérifier Nginx
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log
```

---

## 🔍 Diagnostic Rapide

### Vérifier la Structure de docker-compose.prod.yml

```bash
cd /srv/crm-alforis

# Vérifier les services
echo "=== SERVICES ==="
grep -E "^  [a-z]+:" docker-compose.prod.yml

# Vérifier les env_file
echo "=== ENV_FILE ==="
grep -n "env_file" docker-compose.prod.yml

# Vérifier les target
echo "=== TARGETS ==="
grep -n "target:" docker-compose.prod.yml

# Vérifier les ports
echo "=== PORTS ==="
grep -A1 "ports:" docker-compose.prod.yml
```

### Si docker-compose.prod.yml est Incorrect

Si le fichier sur le serveur n'a pas les bonnes configurations, vous pouvez le corriger directement :

```bash
# Backup
cp docker-compose.prod.yml docker-compose.prod.yml.old

# Éditer
nano docker-compose.prod.yml
```

**Points à vérifier dans l'éditeur:**

1. **Service API doit avoir:**
   ```yaml
   env_file:
     - .env.production
   ```

2. **Service Frontend doit avoir:**
   ```yaml
   env_file:
     - .env.production
   ```

3. **Les deux services doivent avoir:**
   ```yaml
   build:
     target: production
   ```

4. **Port PostgreSQL:**
   ```yaml
   ports:
     - "127.0.0.1:5433:5432"
   ```

---

## 🆘 Troubleshooting

### Problème: "POSTGRES_PASSWORD doit être défini"

```bash
# Vérifier que .env.production existe et contient POSTGRES_PASSWORD
grep POSTGRES_PASSWORD .env.production

# Si absent, ajouter
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)" >> .env.production
```

### Problème: "502 Bad Gateway"

```bash
# Vérifier que les conteneurs tournent
docker-compose -f docker-compose.prod.yml ps

# Vérifier les logs
docker-compose -f docker-compose.prod.yml logs api
docker-compose -f docker-compose.prod.yml logs frontend

# Vérifier les ports
sudo netstat -tulpn | grep -E ':(8000|3010)'

# Vérifier Nginx
sudo nginx -t
sudo tail -f /var/log/nginx/crm.alforis.fr.error.log
```

### Problème: "Mixed Content" dans le navigateur

```bash
# Vérifier que NEXT_PUBLIC_API_URL utilise HTTPS
grep NEXT_PUBLIC_API_URL .env.production

# Doit être: NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1

# Rebuild le frontend
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml restart frontend
```

### Problème: Certificat SSL manquant

```bash
# Obtenir un certificat
sudo certbot --nginx -d crm.alforis.fr

# Vérifier le certificat
sudo certbot certificates

# Tester le renouvellement
sudo certbot renew --dry-run
```

---

## 📊 Commandes de Monitoring

```bash
# Ressources utilisées
docker stats

# Logs en temps réel
docker-compose -f docker-compose.prod.yml logs -f

# Logs des 100 dernières lignes
docker-compose -f docker-compose.prod.yml logs --tail=100

# Logs d'un service spécifique
docker-compose -f docker-compose.prod.yml logs -f api

# Espace disque
df -h

# État des volumes
docker volume ls
docker volume inspect crm-alforis_postgres-data
```

---

## 🔄 Commandes de Maintenance

```bash
# Redémarrer un service
docker-compose -f docker-compose.prod.yml restart api

# Redémarrer tout
docker-compose -f docker-compose.prod.yml restart

# Reconstruire et redémarrer
docker-compose -f docker-compose.prod.yml up -d --build

# Nettoyer les images inutilisées
docker system prune -a

# Backup de la base de données
docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U crm_user crm_db > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## ✅ Checklist Finale

- [ ] `.env.production` créé avec les bonnes valeurs
- [ ] `docker-compose.prod.yml` charge `.env.production` pour API et Frontend
- [ ] Nginx configuré avec SSL Let's Encrypt
- [ ] Conteneurs démarrés : `docker-compose -f docker-compose.prod.yml ps`
- [ ] API accessible : `curl https://crm.alforis.fr/health`
- [ ] Frontend accessible : `curl https://crm.alforis.fr`
- [ ] Aucune erreur dans les logs
- [ ] Aucune erreur "Mixed Content" dans la console du navigateur

---

## 📞 Contact

Si vous rencontrez des problèmes, envoyez-moi :

```bash
# État des conteneurs
docker-compose -f docker-compose.prod.yml ps

# Logs récents
docker-compose -f docker-compose.prod.yml logs --tail=100

# Configuration Nginx
sudo nginx -t

# Contenu de .env.production (masquer les secrets)
cat .env.production | sed 's/PASSWORD=.*/PASSWORD=***MASKED***/g' | sed 's/SECRET_KEY=.*/SECRET_KEY=***MASKED***/g'
```
