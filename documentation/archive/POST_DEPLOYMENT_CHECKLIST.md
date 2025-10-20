# ✅ Checklist Post-Déploiement CRM Alforis

## 📋 Après le déploiement réussi

Une fois que Docker Hub est revenu et que `./scripts/deploy.sh deploy` a réussi, suivez cette checklist.

---

## 1️⃣ Vérifier les Containers Docker

### Sur le serveur
```bash
ssh root@159.69.108.234

cd /srv/crm-alforis

# Vérifier que tous les containers sont UP et healthy
docker compose -f docker-compose.prod.yml ps
```

**Résultat attendu :**
```
NAME        STATUS                    PORTS
postgres    Up 2 minutes (healthy)    127.0.0.1:5433->5432/tcp
api         Up 1 minute (healthy)     127.0.0.1:8000->8000/tcp
frontend    Up 1 minute (healthy)     127.0.0.1:3010->3010/tcp
redis       Up 2 minutes (healthy)    6379/tcp
```

✅ Tous les containers doivent être **"healthy"**

### Si un container est "unhealthy" :
```bash
# Voir les logs
docker compose -f docker-compose.prod.yml logs api --tail=50
docker compose -f docker-compose.prod.yml logs frontend --tail=50
docker compose -f docker-compose.prod.yml logs postgres --tail=50

# Redémarrer si nécessaire
docker compose -f docker-compose.prod.yml restart api
```

---

## 2️⃣ Vérifier l'API Backend

### Test local (sur le serveur)
```bash
# Health check
curl http://localhost:8000/api/v1/health
```

**Résultat attendu :**
```json
{"status":"ok"}
```

### Test complet
```bash
# Readiness (DB + Redis)
curl http://localhost:8000/api/v1/ready

# Documentation API
curl http://localhost:8000/docs
```

✅ L'API doit répondre sur le port 8000

---

## 3️⃣ Vérifier le Frontend

### Test local (sur le serveur)
```bash
curl -I http://localhost:3010
```

**Résultat attendu :**
```
HTTP/1.1 200 OK
...
```

✅ Le frontend doit répondre sur le port 3010

---

## 4️⃣ Configurer Nginx + SSL

### Copier la configuration Nginx
```bash
# Depuis votre Mac
scp -i ~/.ssh/id_rsa_hetzner \
  nginx/crm-alforis.conf \
  root@159.69.108.234:/etc/nginx/sites-available/crm-alforis
```

### Lancer le script d'installation SSL
```bash
# Depuis votre Mac
cat scripts/setup-nginx-ssl.sh | \
  ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 'bash -s'
```

**OU manuellement sur le serveur :**
```bash
ssh root@159.69.108.234

# Installation
apt update
apt install -y nginx certbot python3-certbot-nginx

# Copier la config
# (fichier déjà copié ci-dessus)

# Activer
ln -s /etc/nginx/sites-available/crm-alforis /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# Obtenir le certificat SSL
certbot --nginx -d crm.alforis.fr --email contact@alforis.fr
```

✅ SSL doit être actif et HTTPS forcé

---

## 5️⃣ Vérifier l'accès Public

### Depuis votre Mac
```bash
# Health check public
curl https://crm.alforis.fr/api/v1/health

# Frontend
curl -I https://crm.alforis.fr

# Vérifier le certificat SSL
curl -vI https://crm.alforis.fr 2>&1 | grep -E '(subject|issuer|expire)'
```

**Résultats attendus :**
- ✅ API répond en HTTPS
- ✅ Frontend accessible en HTTPS
- ✅ Certificat SSL valide (Let's Encrypt)
- ✅ Redirection HTTP → HTTPS fonctionne

### Test dans le navigateur
Ouvrir : **https://crm.alforis.fr**

✅ Le CRM doit s'afficher sans erreur SSL

---

## 6️⃣ Vérifier la Base de Données

### Sur le serveur
```bash
# Se connecter à PostgreSQL
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U crm_user -d crm_db

# Vérifier les tables
\dt

# Vérifier un utilisateur (si créé)
SELECT id, email, username, is_active FROM users LIMIT 5;

# Quitter
\q
```

✅ Les tables doivent exister (migrations appliquées)

---

## 7️⃣ Créer l'Utilisateur Admin Initial

### Sur le serveur
```bash
cd /srv/crm-alforis

# Exécuter le script de création admin
docker compose -f docker-compose.prod.yml exec api python3 << 'EOF'
from core.database import SessionLocal
from models.user import User
from models.role import Role, UserRole
from core.security import get_password_hash

db = SessionLocal()

# Créer rôle admin si n'existe pas
admin_role = db.query(Role).filter(Role.name == "ADMIN").first()
if not admin_role:
    admin_role = Role(
        name="ADMIN",
        display_name="Administrateur",
        level=3,
        is_system=True
    )
    db.add(admin_role)
    db.flush()

# Créer admin user
admin = db.query(User).filter(User.email == "admin@alforis.fr").first()
if not admin:
    admin = User(
        email="admin@alforis.fr",
        username="admin",
        full_name="Administrateur Alforis",
        hashed_password=get_password_hash("ChangeMe2024!"),
        role_id=admin_role.id,
        is_active=True,
        is_superuser=True
    )
    db.add(admin)
    db.commit()
    print("✅ Admin user created: admin@alforis.fr / ChangeMe2024!")
else:
    print("ℹ️  Admin user already exists")
EOF
```

**Identifiants admin :**
- Email : `admin@alforis.fr`
- Mot de passe : `ChangeMe2024!` (à changer immédiatement)

✅ Connexion admin doit fonctionner

---

## 8️⃣ Tester les Fonctionnalités

### Se connecter au CRM
1. Ouvrir https://crm.alforis.fr
2. Se connecter avec admin@alforis.fr
3. Vérifier les pages :
   - ✅ Dashboard
   - ✅ Organisations
   - ✅ Contacts
   - ✅ Tâches
   - ✅ Paramètres

### Tester les opérations CRUD
1. Créer une organisation
2. Créer un contact
3. Créer une tâche
4. Vérifier que tout se sauvegarde

✅ Toutes les fonctionnalités de base doivent fonctionner

---

## 9️⃣ Configurer les Backups Automatiques

### Sur le serveur
```bash
# Créer le script de backup
cat > /opt/backup-crm.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
cd /srv/crm-alforis
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U crm_user crm_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Garder seulement 7 derniers backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "✅ Backup completed: $DATE"
EOF

chmod +x /opt/backup-crm.sh

# Tester
/opt/backup-crm.sh

# Ajouter au crontab (tous les jours à 2h du matin)
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-crm.sh >> /var/log/crm-backup.log 2>&1") | crontab -
```

✅ Backups automatiques configurés

---

## 🔟 Monitoring et Logs

### Logs Nginx
```bash
# Accès
tail -f /var/log/nginx/crm-alforis-access.log

# Erreurs
tail -f /var/log/nginx/crm-alforis-error.log
```

### Logs Docker
```bash
# Tous les logs
docker compose -f docker-compose.prod.yml logs -f --tail=100

# API uniquement
docker compose -f docker-compose.prod.yml logs -f api --tail=100

# Frontend uniquement
docker compose -f docker-compose.prod.yml logs -f frontend --tail=100
```

### Monitoring système
```bash
# Utilisation disque
df -h

# Utilisation mémoire/CPU
docker stats

# Espace Docker
docker system df
```

✅ Vérifier régulièrement les logs

---

## 🚨 Dépannage

### Problème : API ne répond pas
```bash
# Vérifier les logs
docker compose logs api --tail=100

# Vérifier la connexion DB
docker compose exec api python -c "from core.database import engine; engine.connect(); print('✅ DB OK')"

# Redémarrer
docker compose restart api
```

### Problème : Frontend ne charge pas
```bash
# Vérifier les variables d'environnement
docker compose exec frontend printenv | grep NEXT_PUBLIC

# Rebuild si nécessaire
docker compose build frontend --no-cache
docker compose up -d frontend
```

### Problème : Certificat SSL invalide
```bash
# Renouveler le certificat
certbot renew --force-renewal

# Vérifier
certbot certificates
```

---

## ✅ Checklist Finale

- [ ] Containers Docker UP et healthy
- [ ] API accessible (http://localhost:8000/api/v1/health)
- [ ] Frontend accessible (http://localhost:3010)
- [ ] Nginx configuré
- [ ] SSL actif (HTTPS fonctionne)
- [ ] DNS pointe vers le serveur
- [ ] https://crm.alforis.fr accessible publiquement
- [ ] Migrations DB appliquées
- [ ] Utilisateur admin créé
- [ ] Connexion admin fonctionne
- [ ] Fonctionnalités CRUD testées
- [ ] Backups automatiques configurés
- [ ] Logs vérifiés (pas d'erreurs critiques)

---

## 📞 Support

**Logs :** `/var/log/nginx/` et `docker compose logs`
**Documentation :** `documentation/`
**Backup :** `/opt/backups/crm/`

---

**CRM Alforis v1.0** - Production Ready ✅
