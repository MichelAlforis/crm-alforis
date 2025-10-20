# 🚀 Déploiement - Résumé Rapide

Guide ultra-condensé pour déployer le CRM Alforis en production.

---

## ⚡ TL;DR - Déploiement en 3 commandes

```bash
# 1. Configuration initiale (une seule fois)
./scripts/deploy.sh setup

# 2. Déploiement complet
./scripts/deploy.sh -v deploy

# 3. Configuration SSL (après propagation DNS)
./scripts/deploy.sh setup-ssl crm.alforis.fr contact@alforis.fr
```

**Temps total :** ~15 minutes

---

## 📋 Checklist Pré-Déploiement

- [ ] Fichier `.env` créé et configuré à la racine
- [ ] DNS configuré : `crm.alforis.fr` → `159.69.108.234`
- [ ] Accès SSH au serveur : `ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234`

---

## 🔑 Variables Critiques (.env)

```bash
# Générer des secrets forts
POSTGRES_PASSWORD=$(openssl rand -hex 32)
SECRET_KEY=$(openssl rand -hex 32)

# Configuration production
ENVIRONMENT=production
DEBUG=False
ALLOWED_ORIGINS=["https://crm.alforis.fr"]
NEXT_PUBLIC_API_URL=https://crm.alforis.fr/api/v1
```

---

## 🎯 Commandes Essentielles

```bash
# Déploiement
./scripts/deploy.sh deploy              # Déploiement complet
./scripts/deploy.sh deploy-backend      # Backend uniquement
./scripts/deploy.sh deploy-frontend     # Frontend uniquement

# Gestion
./scripts/deploy.sh status              # État des containers
./scripts/deploy.sh logs                # Logs en temps réel
./scripts/deploy.sh restart             # Redémarrer

# Maintenance
./scripts/deploy.sh backup-db           # Backup base de données
./scripts/deploy.sh clean-docker        # Nettoyer l'espace disque
./scripts/deploy.sh migrate             # Migrations DB
```

---

## ✅ Vérifications Post-Déploiement

```bash
# 1. Containers UP
./scripts/deploy.sh status
# Attendu: 3 containers (postgres, api, frontend) avec status "Up (healthy)"

# 2. API fonctionne
curl https://crm.alforis.fr/api/v1/health
# Attendu: {"status":"ok"}

# 3. Frontend accessible
open https://crm.alforis.fr
# Attendu: Page de connexion s'affiche
```

---

## 🆘 Troubleshooting Rapide

| Problème | Solution Rapide |
|----------|----------------|
| Disque plein | `./scripts/deploy.sh clean-docker` |
| Build échoue | Vérifier `.env` existe et est copié |
| 502 Bad Gateway | `./scripts/deploy.sh restart` |
| Containers unhealthy | `./scripts/deploy.sh logs` pour voir l'erreur |
| SSL expiré | `ssh root@server "certbot renew"` |

---

## 📖 Documentation Complète

Pour des instructions détaillées, consulter :

👉 **[GUIDE_DEPLOIEMENT.md](GUIDE_DEPLOIEMENT.md)** (Guide complet)

Contient :
- Architecture détaillée
- Procédure pas à pas
- Troubleshooting exhaustif
- Best practices

---

## 🔗 Liens Utiles

- **Frontend** : https://crm.alforis.fr
- **API** : https://crm.alforis.fr/api/v1
- **API Docs** : https://crm.alforis.fr/api/v1/docs
- **Health Check** : https://crm.alforis.fr/api/v1/health

---

## 📞 Support

**Logs de déploiement :** `deploy.log` (racine du projet)

**Aide du script :**
```bash
./scripts/deploy.sh -h
```

**Documentation avancée :**
- Guide complet : [`GUIDE_DEPLOIEMENT.md`](GUIDE_DEPLOIEMENT.md)
- Docker Mirrors : [`documentation/DOCKER_REGISTRY_MIRRORS.md`](documentation/DOCKER_REGISTRY_MIRRORS.md)
- Changelog : [`documentation/CHANGELOG_DEPLOYMENT.md`](documentation/CHANGELOG_DEPLOYMENT.md)
