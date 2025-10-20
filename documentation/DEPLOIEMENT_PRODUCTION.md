# 🚀 Guide de Déploiement Production - CRM Alforis

**Date:** 21 Octobre 2024
**Version:** 1.0.0
**Statut:** Production-Ready ✅

---

## 📋 Pré-requis

### Infrastructure Minimale

- **Serveur** : 2 vCPU, 4 GB RAM minimum
- **Système** : Ubuntu 20.04+ ou Debian 11+
- **Docker** : 20.10+
- **Docker Compose** : 2.0+
- **Domaine** : Avec certificat SSL (Let's Encrypt recommandé)

### Ports Requis

- `80` : HTTP (redirection vers HTTPS)
- `443` : HTTPS
- `5432` : PostgreSQL (si externe)
- `6379` : Redis (si externe)

---

## 🏗️ Architecture Production

```
┌─────────────────┐
│  Load Balancer  │  (Nginx / Caddy / Traefik)
│   + SSL/TLS     │
└────────┬────────┘
         │
    ┌────┴────────────────────┐
    │                         │
┌───▼────────┐      ┌────────▼───┐
│  Frontend  │      │   Backend  │
│  Next.js   │      │   FastAPI  │
│  (Port 80) │      │ (Port 8000)│
└────────────┘      └──────┬─────┘
                           │
                ┌──────────┴──────────┐
                │                     │
         ┌──────▼─────┐      ┌───────▼────┐
         │ PostgreSQL │      │   Redis    │
         │ (Port 5432)│      │ (Port 6379)│
         └────────────┘      └────────────┘
```

---

## 📦 Étape 1 : Préparation du Serveur

### 1.1 Installation Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

### 1.2 Configuration Firewall

```bash
# UFW
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# Or iptables
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

---

## 🔧 Étape 2 : Configuration de l'Application

### 2.1 Cloner le Repository

```bash
cd /opt
sudo git clone https://github.com/votre-org/crm-alforis.git
cd crm-alforis
```

### 2.2 Variables d'Environnement Backend

Créer `.env.production` dans `crm-backend/` :

```bash
# Database
DATABASE_URL=postgresql://crm_user:STRONG_PASSWORD@postgres:5432/crm_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Redis
REDIS_URL=redis://redis:6379/0

# Security
SECRET_KEY=GENERER_CLE_SECRETE_LONGUE_64_CHARS_MINIMUM
JWT_EXPIRATION_HOURS=24
CORS_ORIGINS=https://votre-domaine.com

# Email (SendGrid)
SENDGRID_API_KEY=SG.votre_cle_api
SENDGRID_FROM_EMAIL=noreply@votre-domaine.com
SENDGRID_FROM_NAME="CRM Alforis"

# Sentry (optionnel)
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production

# Features
ENABLE_WEBHOOKS=true
ENABLE_EMAIL_AUTOMATION=true
```

**Générer SECRET_KEY** :
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(64))"
```

### 2.3 Variables d'Environnement Frontend

Créer `.env.production` dans `crm-frontend/` :

```bash
# API
NEXT_PUBLIC_API_URL=https://api.votre-domaine.com/api/v1

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

## 🐳 Étape 3 : Configuration Docker Production

### 3.1 docker-compose.prod.yml

Utiliser le fichier `docker-compose.prod.yml` fourni :

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: crm_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: crm_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  api:
    build:
      context: ./crm-backend
      dockerfile: Dockerfile.prod
    restart: always
    env_file:
      - ./crm-backend/.env.production
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    ports:
      - "8000:8000"
    volumes:
      - ./crm-backend/logs:/app/logs

  frontend:
    build:
      context: ./crm-frontend
      dockerfile: Dockerfile.prod
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    restart: always
    ports:
      - "3000:3000"
    depends_on:
      - api

volumes:
  postgres_data:
  redis_data:
```

### 3.2 Dockerfiles Production

**Backend** (`crm-backend/Dockerfile.prod`) :

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**Frontend** (`crm-frontend/Dockerfile.prod`) :

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
```

---

## 🚢 Étape 4 : Déploiement

### 4.1 Build et Lancement

```bash
cd /opt/crm-alforis

# Build images
docker compose -f docker-compose.prod.yml build

# Start services
docker compose -f docker-compose.prod.yml up -d

# Vérifier les logs
docker compose -f docker-compose.prod.yml logs -f
```

### 4.2 Migrations Database

```bash
# Exécuter les migrations Alembic
docker compose -f docker-compose.prod.yml exec api alembic upgrade head

# Vérifier la base
docker compose -f docker-compose.prod.yml exec postgres psql -U crm_user -d crm_db -c "\dt"
```

### 4.3 Créer Utilisateur Admin Initial

```bash
docker compose -f docker-compose.prod.yml exec api python -c "
from core.database import SessionLocal
from models.user import User
from models.role import Role, UserRole
from core.security import get_password_hash

db = SessionLocal()

# Créer rôle admin
admin_role = db.query(Role).filter(Role.name == UserRole.ADMIN).first()
if not admin_role:
    admin_role = Role(name=UserRole.ADMIN, display_name='Administrator', level=3, is_system=True)
    db.add(admin_role)
    db.flush()

# Créer admin user
admin = User(
    email='admin@votre-domaine.com',
    username='admin',
    full_name='Administrator',
    hashed_password=get_password_hash('ChangeMe123!'),
    role=admin_role,
    is_active=True,
    is_superuser=True
)
db.add(admin)
db.commit()
print('✅ Admin user created: admin@votre-domaine.com / ChangeMe123!')
"
```

---

## 🔒 Étape 5 : Configuration Reverse Proxy (Nginx)

### 5.1 Installation Nginx + Certbot

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

### 5.2 Configuration Nginx

Créer `/etc/nginx/sites-available/crm-alforis` :

```nginx
# Frontend
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
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
    server_name api.votre-domaine.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts pour API lentes
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### 5.3 Activer SSL avec Let's Encrypt

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/crm-alforis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtenir certificats SSL
sudo certbot --nginx -d votre-domaine.com -d api.votre-domaine.com

# Auto-renewal
sudo certbot renew --dry-run
```

---

## 📊 Étape 6 : Monitoring & Maintenance

### 6.1 Health Checks

```bash
# API Health
curl https://api.votre-domaine.com/api/v1/health

# Database
docker compose exec postgres pg_isready -U crm_user

# Redis
docker compose exec redis redis-cli ping
```

### 6.2 Logs

```bash
# API logs
docker compose logs -f api --tail=100

# Frontend logs
docker compose logs -f frontend --tail=100

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### 6.3 Backups Automatiques

Créer `/opt/crm-alforis/scripts/backup.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/crm"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T postgres pg_dump -U crm_user crm_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads (si applicable)
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz ./uploads/

# Garder seulement 7 derniers backups
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +7 -delete

echo "✅ Backup completed: $DATE"
```

Ajouter au crontab :
```bash
sudo crontab -e
# Backup quotidien à 2h du matin
0 2 * * * /opt/crm-alforis/scripts/backup.sh >> /var/log/crm-backup.log 2>&1
```

---

## 🔄 Étape 7 : Mises à Jour

### 7.1 Mise à Jour de l'Application

```bash
cd /opt/crm-alforis

# Pull latest code
git pull origin main

# Rebuild & restart
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Run migrations
docker compose -f docker-compose.prod.yml exec api alembic upgrade head
```

### 7.2 Rollback en Cas de Problème

```bash
# Revenir à la version précédente
git checkout <previous-commit>
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

# Restaurer backup database
gunzip < /opt/backups/crm/db_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T postgres psql -U crm_user crm_db
```

---

## ✅ Checklist Déploiement

- [ ] Serveur provisionné avec Docker installé
- [ ] Domaines configurés (DNS A records)
- [ ] Variables d'environnement configurées (.env.production)
- [ ] SSL/TLS configuré (Let's Encrypt)
- [ ] Base de données créée et migrations appliquées
- [ ] Utilisateur admin créé
- [ ] Backups automatiques configurés
- [ ] Monitoring actif (logs, health checks)
- [ ] Firewall configuré
- [ ] Tests E2E passés
- [ ] Documentation mise à jour

---

## 🆘 Troubleshooting

### Problème : API ne démarre pas

```bash
# Vérifier les logs
docker compose logs api

# Vérifier la connexion database
docker compose exec api python -c "from core.database import engine; engine.connect()"
```

### Problème : Frontend ne se connecte pas à l'API

- Vérifier `NEXT_PUBLIC_API_URL` dans `.env.production`
- Vérifier CORS dans backend (`CORS_ORIGINS`)
- Vérifier certificat SSL

### Problème : Performance lente

```bash
# Augmenter workers backend
# Dans docker-compose.prod.yml : CMD ["uvicorn", "main:app", "--workers", "8"]

# Vérifier load
docker stats

# Optimiser PostgreSQL (augmenter pool size)
# Dans .env : DATABASE_POOL_SIZE=50
```

---

## 📞 Support

**Documentation complète** : `/documentation/`
**Issues** : GitHub Issues
**Email** : support@votre-domaine.com

---

**CRM Alforis v1.0.0** - Production-Ready ✅
Dernière mise à jour : 21 Octobre 2024
