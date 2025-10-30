# 🚀 Quick Start - Sécurité €0/mois

**Pour : Michel**
**Date : 28 Octobre 2025**
**Temps : 30 minutes**

---

## ⚡ Déploiement Express (Production)

### 1. DNS (5 min)

Chez ton registraire (OVH, Gandi, etc.) :

```
Type  Nom              Valeur
A     crm.alforis.fr   159.69.108.234
```

**Vérifier** :
```bash
dig crm.alforis.fr +short
# Doit afficher : 159.69.108.234
```

---

### 2. Serveur (15 min)

```bash
# 1. SSH sur le serveur
ssh root@159.69.108.234

# 2. Aller dans le projet
cd /srv/crm-alforis

# 3. Pull dernières modifs
git pull origin main

# 4. Éditer .env
nano .env
```

**Ajouter** :
```env
DOMAIN=crm.alforis.fr
```

```bash
# 5. Appliquer migration 2FA
docker compose -f docker-compose.prod.yml run --rm api alembic upgrade head

# 6. Rebuild avec Caddy
docker compose -f docker-compose.prod.yml up -d --build caddy

# 7. Vérifier certificat SSL obtenu
docker compose logs caddy | grep "certificate obtained"
```

**Résultat attendu** :
```
✅ [crm.alforis.fr] certificate obtained successfully
```

---

### 3. Test HTTPS (2 min)

```bash
# Test 1 : Site accessible en HTTPS
curl -I https://crm.alforis.fr
# Doit retourner : 200 OK

# Test 2 : HTTP redirige vers HTTPS
curl -I http://crm.alforis.fr
# Doit retourner : 301 → https://crm.alforis.fr

# Test 3 : API fonctionne
curl https://crm.alforis.fr/api/v1/health
# Doit retourner : {"status":"ok"}
```

✅ **SSL/TLS opérationnel !**

---

### 4. UptimeRobot (5 min)

1. **Créer compte** : https://uptimerobot.com (gratuit)

2. **Add Monitor** (x2 minimum) :

**Monitor 1** :
```
Type: HTTPS
URL: https://crm.alforis.fr
Nom: CRM Frontend
Interval: 5 minutes
```

**Monitor 2** :
```
Type: HTTPS
URL: https://crm.alforis.fr/api/v1/health
Nom: CRM API
Interval: 5 minutes
Keyword: "ok"
```

3. **Add Alert Contact** : Ton email

4. **Test** : Clique "Force Check" → doit être UP

✅ **Monitoring actif !**

---

### 5. Test 2FA (3 min)

```bash
# 1. Login
TOKEN=$(curl -X POST https://crm.alforis.fr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@alforis.com","password":"test123"}' \
  | jq -r '.access_token')

# 2. Setup 2FA
curl -X POST https://crm.alforis.fr/api/v1/auth/2fa/setup \
  -H "Authorization: Bearer $TOKEN" | jq

# Résultat attendu :
# {
#   "secret": "JBSWY3...",
#   "qr_code_url": "/api/v1/auth/2fa/qrcode?secret=...",
#   ...
# }
```

✅ **2FA opérationnel !**

---

## 📊 Checklist Finale

- [ ] DNS `crm.alforis.fr` → serveur
- [ ] HTTPS fonctionne (certificat Let's Encrypt)
- [ ] UptimeRobot configuré (2+ monitors)
- [ ] Alertes email testées
- [ ] 2FA API accessible

**Temps total : ~30 min**

---

## 🆘 Troubleshooting

### Erreur : "certificate obtain failed"

**Cause** : DNS pas encore propagé

**Solution** :
```bash
# Attendre 30 min puis relancer
docker compose restart caddy
```

### Erreur : "migration failed"

**Cause** : Conflit migration

**Solution** :
```bash
# Vérifier révision actuelle
docker compose exec api alembic current

# Forcer upgrade
docker compose exec api alembic upgrade head
```

### Erreur : "UptimeRobot DOWN"

**Cause** : Firewall bloque port 443

**Solution** :
```bash
# Vérifier ports ouverts
sudo ufw status

# Ouvrir HTTPS si nécessaire
sudo ufw allow 443/tcp
```

---

## 📚 Docs Complètes

- **SSL/TLS** : Voir `Caddyfile` (config complète)
- **2FA** : Voir `ZERO_COST_SECURITY_IMPLEMENTATION.md`
- **Monitoring** : Voir `UPTIME_MONITORING_SETUP.md`

---

**Besoin d'aide ?** Relis `ZERO_COST_SECURITY_IMPLEMENTATION.md` (guide complet 400+ lignes)
