# ☁️ Backups Offsite Automatiques - €0 ou €3.81/mois

**Date** : 28 Octobre 2025
**Solutions** : 3 options (1 gratuite, 2 payantes low-cost)

---

## 🎯 Objectif

Éviter la perte de données si le serveur principal crash/incendie/ransomware.

**Règle 3-2-1** :
- **3** copies des données
- **2** supports différents (SSD + cloud)
- **1** copie offsite (hors du datacenter)

---

## 💰 OPTION 1 : Backblaze B2 (GRATUIT 10 GB)

**Recommandé pour démarrer !**

### Caractéristiques

- ✅ **10 GB gratuits** (suffisant pour 30+ backups DB compressés)
- ✅ API compatible S3
- ✅ CLI officiel (b2-sdk)
- ✅ Pas de frais de sortie (download gratuit)
- ✅ Chiffrement AES-256

**Coûts au-delà de 10 GB** :
- €0.005/GB/mois (~€0.50 pour 100 GB)
- Download: Gratuit (1 GB/jour), puis €0.01/GB

### Setup (10 minutes)

#### 1. Créer compte Backblaze

https://www.backblaze.com/b2/sign-up.html

**Gratuit forever** (10 GB)

#### 2. Créer bucket

```
1. B2 Cloud Storage → Buckets → Create a Bucket
2. Nom: crm-alforis-backups
3. Files: Private
4. Encryption: Enabled (Server-Side)
5. Object Lock: Disabled
6. Create
```

#### 3. Créer Application Key

```
1. App Keys → Add a New Application Key
2. Name: crm-backup-script
3. Bucket: crm-alforis-backups
4. Permissions: Read and Write
5. Create

→ NOTER:
   - keyID: 001234567890abcdef000001
   - applicationKey: K001abc...xyz789
```

⚠️ **Sauvegarder ces clés maintenant** (affichées qu'une seule fois)

#### 4. Installer B2 CLI

**Sur le serveur** :

```bash
# Python 3 requis
pip3 install b2-sdk

# Vérifier installation
b2 version
```

#### 5. Configurer .env

Ajouter dans `/srv/crm-alforis/.env` :

```env
# Backblaze B2
OFFSITE_METHOD=b2
B2_APPLICATION_KEY_ID=001234567890abcdef000001
B2_APPLICATION_KEY=K001abc...xyz789
B2_BUCKET_NAME=crm-alforis-backups
BACKUP_RETENTION_DAYS=30
```

#### 6. Test manuel

```bash
cd /srv/crm-alforis/crm-backend/scripts

# Test backup offsite
./backup_offsite.sh
```

**Résultat attendu** :
```
✅ Backup local créé: crm_backup_20251028_140000.sql.gz (2.3M)
✅ Upload B2 réussi: b2://crm-alforis-backups/backups/crm_backup_20251028_140000.sql.gz
✅ BACKUP OFFSITE TERMINÉ
```

#### 7. Vérifier sur Backblaze

```
B2 Cloud Storage → Buckets → crm-alforis-backups → Browse Files
→ Doit voir: backups/crm_backup_YYYYMMDD_HHMMSS.sql.gz
```

#### 8. Automatiser (cron)

```bash
# Éditer crontab
crontab -e

# Ajouter (backup quotidien à 3h du matin)
0 3 * * * cd /srv/crm-alforis/crm-backend/scripts && ./backup_offsite.sh >> /var/log/crm-backup.log 2>&1
```

**Logs** :
```bash
tail -f /var/log/crm-backup.log
```

---

## 💰 OPTION 2 : Rsync SSH (GRATUIT si serveur dispo)

**Si tu as un serveur perso/ami/VPS secondaire.**

### Prérequis

- Serveur distant avec SSH
- Espace disque suffisant (20-50 GB)

### Setup (15 minutes)

#### 1. Générer clé SSH

**Sur serveur CRM** :

```bash
ssh-keygen -t ed25519 -f /root/.ssh/id_rsa_backup -N ""
```

#### 2. Copier clé publique sur serveur distant

```bash
ssh-copy-id -i /root/.ssh/id_rsa_backup.pub backup-user@backup-server.com
```

#### 3. Tester connexion

```bash
ssh -i /root/.ssh/id_rsa_backup backup-user@backup-server.com
# Doit se connecter sans password
```

#### 4. Créer répertoire backup distant

```bash
ssh -i /root/.ssh/id_rsa_backup backup-user@backup-server.com \
  "mkdir -p /backups/crm-alforis"
```

#### 5. Configurer .env

```env
# Rsync SSH
OFFSITE_METHOD=rsync
RSYNC_HOST=backup-server.com
RSYNC_USER=backup-user
RSYNC_PATH=/backups/crm-alforis
RSYNC_SSH_KEY=/root/.ssh/id_rsa_backup
BACKUP_RETENTION_DAYS=30
```

#### 6. Test

```bash
cd /srv/crm-alforis/crm-backend/scripts
./backup_offsite.sh
```

#### 7. Cron (idem Option 1)

```bash
crontab -e
0 3 * * * cd /srv/crm-alforis/crm-backend/scripts && ./backup_offsite.sh >> /var/log/crm-backup.log 2>&1
```

---

## 💰 OPTION 3 : Hetzner Storage Box (€3.81/mois - 1 TB)

**Meilleur rapport qualité/prix si > 100 GB.**

### Caractéristiques

- 💶 €3.81/mois pour **1 TB**
- ✅ Datacenter Allemagne (RGPD friendly)
- ✅ Rsync, SFTP, WebDAV, Samba
- ✅ Snapshots automatiques (7 jours)
- ✅ Accès SSH intégré

### Setup (10 minutes)

#### 1. Commander Storage Box

https://www.hetzner.com/storage/storage-box

**Tarif** :
- BX11 : 1 TB → €3.81/mois

#### 2. Activer dans Robot

```
1. Login Hetzner Robot: https://robot.your-server.de
2. Storage Boxes → Votre box
3. Noter:
   - Username: u123456
   - Hostname: u123456.your-storagebox.de
4. Activer SSH: Enable SSH support (port 23)
5. Définir password SSH
```

#### 3. Tester connexion

```bash
ssh -p 23 u123456@u123456.your-storagebox.de
# Login avec password

# Créer répertoire
mkdir -p backups/crm
exit
```

#### 4. Configurer .env

```env
# Hetzner Storage Box
OFFSITE_METHOD=hetzner
HETZNER_STORAGE_USER=u123456
HETZNER_STORAGE_HOST=u123456.your-storagebox.de
HETZNER_STORAGE_PATH=/backups/crm
BACKUP_RETENTION_DAYS=30
```

#### 5. Copier clé SSH (pour éviter password)

```bash
ssh-copy-id -p 23 -i /root/.ssh/id_rsa_backup.pub u123456@u123456.your-storagebox.de
```

#### 6. Test & Cron (idem options précédentes)

---

## 📊 Comparaison Options

| Critère | Backblaze B2 | Rsync SSH | Hetzner Storage Box |
|---------|--------------|-----------|---------------------|
| **Coût** | €0 (10 GB) | €0 (si serveur dispo) | €3.81/mois (1 TB) |
| **Capacité** | 10 GB gratuit | Illimité (selon serveur) | 1 TB |
| **Setup** | 10 min | 15 min | 10 min |
| **Chiffrement** | AES-256 | SSH | SSH + snapshots |
| **Localisation** | USA | Variable | Allemagne (RGPD) |
| **Restauration** | CLI b2 | Rsync | Rsync/SFTP |
| **Snapshots** | Manuel | Manuel | Auto (7 jours) |

**Recommandation** :
- **Démarrage** : Backblaze B2 (gratuit 10 GB)
- **Croissance** : Hetzner (€3.81/mois pour 1 TB)
- **DIY** : Rsync SSH (si serveur secondaire disponible)

---

## 🧪 Tests de Restauration

**IMPORTANT** : Tester la restauration tous les 3 mois !

### Test Backblaze B2

```bash
# 1. Lister backups disponibles
b2 ls --recursive crm-alforis-backups backups/

# 2. Télécharger backup
b2 download-file-by-name crm-alforis-backups \
  backups/crm_backup_20251028_140000.sql.gz \
  /tmp/restore_test.sql.gz

# 3. Décompresser
gunzip /tmp/restore_test.sql.gz

# 4. Restaurer (sur DB de test)
psql -U crm_user -d crm_db_test -f /tmp/restore_test.sql
```

### Test Rsync

```bash
# 1. Lister backups distants
ssh -i /root/.ssh/id_rsa_backup backup-user@backup-server.com \
  "ls -lh /backups/crm-alforis/"

# 2. Télécharger
rsync -avz -e "ssh -i /root/.ssh/id_rsa_backup" \
  backup-user@backup-server.com:/backups/crm-alforis/crm_backup_20251028_140000.sql.gz \
  /tmp/

# 3. Restaurer (idem B2)
```

---

## 📈 Monitoring Backups

### Vérifier backups quotidiens

```bash
# Logs cron
tail -50 /var/log/crm-backup.log

# Derniers backups locaux
ls -lht /srv/crm-alforis/backups/*.gz | head -5

# Espace utilisé
du -sh /srv/crm-alforis/backups
```

### UptimeRobot - Monitor backup

**Monitor cron** (vérifier que backup a tourné) :

1. Créer endpoint heartbeat :

```bash
# Ajouter en fin de backup_offsite.sh
curl -s "https://heartbeat.uptimerobot.com/YOUR_MONITOR_KEY" > /dev/null
```

2. Dans UptimeRobot :
   - Type: **Heartbeat**
   - Name: CRM Backups Daily
   - Interval: **24 hours**
   - Alert if no ping: **Oui**

Si backup échoue → Pas de ping → Alerte email

---

## 🚨 Plan de Disaster Recovery

### Scénario 1 : Serveur détruit (incendie/ransomware)

**Temps de restauration : 2-4 heures**

#### Étape 1 : Nouveau serveur

```bash
# 1. Louer nouveau serveur Hetzner
# 2. Installer Docker + Docker Compose
# 3. Cloner repo CRM
git clone https://github.com/votre-compte/crm-alforis.git /srv/crm-alforis
cd /srv/crm-alforis
```

#### Étape 2 : Récupérer dernier backup

**Backblaze B2** :
```bash
b2 authorize-account YOUR_KEY_ID YOUR_APP_KEY
b2 download-file-by-name crm-alforis-backups \
  backups/LATEST_BACKUP.sql.gz \
  /tmp/restore.sql.gz
gunzip /tmp/restore.sql.gz
```

**Rsync** :
```bash
rsync -avz backup-user@backup-server.com:/backups/crm-alforis/LATEST.sql.gz /tmp/
gunzip /tmp/LATEST.sql.gz
```

#### Étape 3 : Restaurer DB

```bash
# Lancer PostgreSQL
docker compose up -d postgres

# Attendre démarrage (10s)
sleep 10

# Restaurer backup
cat /tmp/restore.sql | docker compose exec -T postgres psql -U crm_user -d postgres

# Vérifier
docker compose exec postgres psql -U crm_user -d crm_db -c "SELECT COUNT(*) FROM users;"
```

#### Étape 4 : Relancer app

```bash
# Lancer tous les services
docker compose -f docker-compose.prod.yml up -d

# Vérifier
curl https://crm.alforis.fr/api/v1/health
```

**RTO (Recovery Time Objective)** : 4 heures
**RPO (Recovery Point Objective)** : 24 heures (backup quotidien)

---

## ✅ Checklist Déploiement

### Backblaze B2 (Recommandé)
- [ ] Compte Backblaze créé (gratuit)
- [ ] Bucket `crm-alforis-backups` créé
- [ ] Application Key générée et sauvegardée
- [ ] b2-cli installé sur serveur
- [ ] Variables `.env` configurées
- [ ] Test manuel réussi (`./backup_offsite.sh`)
- [ ] Cron configuré (quotidien 3h)
- [ ] Test restauration fait (tous les 3 mois)
- [ ] UptimeRobot heartbeat configuré (optionnel)

### Rsync SSH
- [ ] Serveur distant accessible SSH
- [ ] Clé SSH générée et copiée
- [ ] Répertoire distant créé
- [ ] Variables `.env` configurées
- [ ] Test manuel réussi
- [ ] Cron configuré

### Hetzner Storage Box
- [ ] Storage Box commandé (€3.81/mois)
- [ ] SSH activé (port 23)
- [ ] Répertoire créé
- [ ] Variables `.env` configurées
- [ ] Test manuel réussi
- [ ] Cron configuré

---

## 💡 Optimisations Avancées

### 1. Chiffrement backup avant upload

**Chiffrer avec GPG** :

```bash
# Générer clé GPG
gpg --gen-key

# Dans backup_offsite.sh, avant upload:
gpg --encrypt --recipient backup@alforis.fr "$LATEST_BACKUP"

# Upload fichier .gpg
```

### 2. Backup incrémentiel (économie bande passante)

**Avec rsync** :
```bash
rsync -avz --link-dest=PREVIOUS_BACKUP ...
```

### 3. Multi-destination (paranoia mode)

**Backup vers B2 + Hetzner simultanément** :

```bash
# backup_offsite.sh modifié
for METHOD in b2 hetzner; do
    export OFFSITE_METHOD=$METHOD
    # ... upload logic
done
```

### 4. Notification Slack sur échec

**Ajouter** :
```bash
# Si erreur
if [[ $? -ne 0 ]]; then
    curl -X POST $SLACK_WEBHOOK \
      -d '{"text":"🚨 Backup CRM ÉCHOUÉ!"}'
fi
```

---

## 📚 Ressources

### Backblaze B2
- Docs : https://www.backblaze.com/b2/docs/
- CLI : https://github.com/Backblaze/B2_Command_Line_Tool
- Pricing : https://www.backblaze.com/b2/cloud-storage-pricing.html

### Hetzner Storage Box
- Docs : https://docs.hetzner.com/robot/storage-box
- Commander : https://www.hetzner.com/storage/storage-box

### Tools
- b2-sdk : `pip install b2-sdk`
- rsync : Pré-installé Linux
- gpg : Chiffrement

---

**Créé le** : 28 Octobre 2025
**Version** : 1.0
**Coût recommandé** : **€0/mois** (Backblaze B2 - 10 GB gratuits)
