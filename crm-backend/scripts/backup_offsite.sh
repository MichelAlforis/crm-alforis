#!/bin/bash

# =============================================================================
# Script Backup Offsite GRATUIT - CRM Alforis
# =============================================================================
#
# Options gratuites:
# 1. Backblaze B2 (10 GB gratuits) - Recommandé
# 2. rsync vers serveur distant (SSH)
# 3. Hetzner Storage Box (€3.81/mois pour 1TB)
#
# Configuration via variables d'environnement ou .env
# =============================================================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Méthode de backup offsite (b2, rsync, ou hetzner)
OFFSITE_METHOD=${OFFSITE_METHOD:-"b2"}

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}☁️  BACKUP OFFSITE AUTOMATIQUE - CRM ALFORIS${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "📁 Source: ${BACKUP_DIR}"
echo -e "☁️  Méthode: ${OFFSITE_METHOD}"
echo -e "🗓️  Rétention: ${RETENTION_DAYS} jours"
echo ""

# =============================================================================
# Étape 1 : Créer backup local
# =============================================================================

echo -e "${YELLOW}📥 Étape 1/3 : Création backup local...${NC}"

# Appeler le script de backup existant
if [[ -f "./backup_database.sh" ]]; then
    bash ./backup_database.sh
else
    echo -e "${RED}❌ Erreur: backup_database.sh introuvable${NC}"
    exit 1
fi

# Trouver le dernier backup créé
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/crm_backup_*.sql.gz 2>/dev/null | head -1)

if [[ -z "$LATEST_BACKUP" ]]; then
    echo -e "${RED}❌ Erreur: Aucun backup trouvé${NC}"
    exit 1
fi

BACKUP_SIZE=$(du -h "$LATEST_BACKUP" | cut -f1)
echo -e "${GREEN}✅ Backup local créé: ${LATEST_BACKUP} (${BACKUP_SIZE})${NC}"
echo ""

# =============================================================================
# Étape 2 : Envoi offsite selon la méthode choisie
# =============================================================================

echo -e "${YELLOW}📤 Étape 2/3 : Envoi vers stockage offsite...${NC}"

case "$OFFSITE_METHOD" in

  # ---------------------------------------------------------------------------
  # OPTION 1 : Backblaze B2 (10 GB gratuits)
  # ---------------------------------------------------------------------------
  "b2")
    echo -e "${BLUE}☁️  Upload vers Backblaze B2...${NC}"

    # Vérifier si b2 CLI est installé
    if ! command -v b2 &> /dev/null; then
        echo -e "${YELLOW}⚠️  Installation b2-cli nécessaire...${NC}"
        echo -e "${YELLOW}   pip install b2-sdk${NC}"
        exit 1
    fi

    # Vérifier les credentials B2
    if [[ -z "$B2_APPLICATION_KEY_ID" ]] || [[ -z "$B2_APPLICATION_KEY" ]]; then
        echo -e "${RED}❌ Erreur: Variables B2_APPLICATION_KEY_ID et B2_APPLICATION_KEY manquantes${NC}"
        echo ""
        echo -e "${YELLOW}📝 Configuration requise dans .env:${NC}"
        echo -e "   B2_APPLICATION_KEY_ID=votre_key_id"
        echo -e "   B2_APPLICATION_KEY=votre_application_key"
        echo -e "   B2_BUCKET_NAME=crm-alforis-backups"
        echo ""
        echo -e "${BLUE}👉 Créer compte gratuit: https://www.backblaze.com/b2/sign-up.html${NC}"
        exit 1
    fi

    # Authentification B2
    b2 authorize-account "$B2_APPLICATION_KEY_ID" "$B2_APPLICATION_KEY" > /dev/null 2>&1

    if [[ $? -ne 0 ]]; then
        echo -e "${RED}❌ Erreur: Authentification B2 échouée${NC}"
        exit 1
    fi

    # Upload vers B2
    BUCKET_NAME=${B2_BUCKET_NAME:-"crm-alforis-backups"}
    B2_FILE_NAME="backups/$(basename $LATEST_BACKUP)"

    b2 upload-file "$BUCKET_NAME" "$LATEST_BACKUP" "$B2_FILE_NAME"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Upload B2 réussi: b2://${BUCKET_NAME}/${B2_FILE_NAME}${NC}"
    else
        echo -e "${RED}❌ Erreur: Upload B2 échoué${NC}"
        exit 1
    fi

    # Nettoyage anciens backups B2 (> RETENTION_DAYS jours)
    echo -e "${YELLOW}🧹 Nettoyage anciens backups B2...${NC}"
    CUTOFF_DATE=$(date -d "${RETENTION_DAYS} days ago" +%s 2>/dev/null || date -v-${RETENTION_DAYS}d +%s)

    b2 ls --recursive "$BUCKET_NAME" backups/ | while read -r line; do
        FILE_DATE=$(echo "$line" | awk '{print $1}')
        FILE_NAME=$(echo "$line" | awk '{print $NF}')
        FILE_TIMESTAMP=$(date -d "$FILE_DATE" +%s 2>/dev/null || date -j -f "%Y-%m-%d" "$FILE_DATE" +%s)

        if [[ $FILE_TIMESTAMP -lt $CUTOFF_DATE ]]; then
            echo -e "${YELLOW}   Suppression: $FILE_NAME${NC}"
            b2 delete-file-version "$FILE_NAME" > /dev/null 2>&1
        fi
    done

    echo -e "${GREEN}✅ Nettoyage B2 terminé${NC}"
    ;;

  # ---------------------------------------------------------------------------
  # OPTION 2 : rsync vers serveur distant (SSH)
  # ---------------------------------------------------------------------------
  "rsync")
    echo -e "${BLUE}🔄 Rsync vers serveur distant...${NC}"

    # Vérifier configuration SSH
    if [[ -z "$RSYNC_HOST" ]] || [[ -z "$RSYNC_USER" ]] || [[ -z "$RSYNC_PATH" ]]; then
        echo -e "${RED}❌ Erreur: Variables RSYNC_HOST, RSYNC_USER, RSYNC_PATH manquantes${NC}"
        echo ""
        echo -e "${YELLOW}📝 Configuration requise dans .env:${NC}"
        echo -e "   RSYNC_HOST=backup.exemple.com"
        echo -e "   RSYNC_USER=backup-user"
        echo -e "   RSYNC_PATH=/backups/crm-alforis"
        echo -e "   RSYNC_SSH_KEY=/root/.ssh/id_rsa_backup (optionnel)"
        exit 1
    fi

    # Options SSH
    SSH_KEY=${RSYNC_SSH_KEY:-""}
    SSH_OPTS=""
    if [[ -n "$SSH_KEY" ]]; then
        SSH_OPTS="-e \"ssh -i $SSH_KEY\""
    fi

    # Rsync avec compression et progress
    rsync -avz --progress $SSH_OPTS \
        "$LATEST_BACKUP" \
        "${RSYNC_USER}@${RSYNC_HOST}:${RSYNC_PATH}/"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Rsync réussi: ${RSYNC_USER}@${RSYNC_HOST}:${RSYNC_PATH}/$(basename $LATEST_BACKUP)${NC}"
    else
        echo -e "${RED}❌ Erreur: Rsync échoué${NC}"
        exit 1
    fi

    # Nettoyage distant via SSH
    echo -e "${YELLOW}🧹 Nettoyage anciens backups distants...${NC}"
    ssh $SSH_OPTS "${RSYNC_USER}@${RSYNC_HOST}" \
        "find ${RSYNC_PATH} -name 'crm_backup_*.sql.gz' -type f -mtime +${RETENTION_DAYS} -delete"

    echo -e "${GREEN}✅ Nettoyage distant terminé${NC}"
    ;;

  # ---------------------------------------------------------------------------
  # OPTION 3 : Hetzner Storage Box (€3.81/mois)
  # ---------------------------------------------------------------------------
  "hetzner")
    echo -e "${BLUE}📦 Upload vers Hetzner Storage Box...${NC}"

    # Configuration similaire à rsync
    HETZNER_USER=${HETZNER_STORAGE_USER}
    HETZNER_HOST=${HETZNER_STORAGE_HOST:-"u123456.your-storagebox.de"}
    HETZNER_PATH=${HETZNER_STORAGE_PATH:-"/backups/crm"}

    if [[ -z "$HETZNER_USER" ]]; then
        echo -e "${RED}❌ Erreur: Variable HETZNER_STORAGE_USER manquante${NC}"
        exit 1
    fi

    # Rsync via SSH (Storage Box supporte rsync)
    rsync -avz --progress -e "ssh -p 23" \
        "$LATEST_BACKUP" \
        "${HETZNER_USER}@${HETZNER_HOST}:${HETZNER_PATH}/"

    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✅ Upload Hetzner réussi${NC}"
    else
        echo -e "${RED}❌ Erreur: Upload Hetzner échoué${NC}"
        exit 1
    fi
    ;;

  *)
    echo -e "${RED}❌ Erreur: Méthode offsite invalide: ${OFFSITE_METHOD}${NC}"
    echo -e "${YELLOW}   Méthodes supportées: b2, rsync, hetzner${NC}"
    exit 1
    ;;
esac

echo ""

# =============================================================================
# Étape 3 : Vérification et rapport
# =============================================================================

echo -e "${YELLOW}📊 Étape 3/3 : Génération rapport...${NC}"

# Statistiques
LOCAL_BACKUPS=$(ls ${BACKUP_DIR}/crm_backup_*.sql.gz 2>/dev/null | wc -l)
TOTAL_SIZE=$(du -sh ${BACKUP_DIR} 2>/dev/null | cut -f1)

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ BACKUP OFFSITE TERMINÉ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "📊 Statistiques:"
echo -e "   📦 Backups locaux: ${LOCAL_BACKUPS}"
echo -e "   💾 Espace utilisé: ${TOTAL_SIZE}"
echo -e "   ☁️  Méthode: ${OFFSITE_METHOD}"
echo -e "   🗓️  Rétention: ${RETENTION_DAYS} jours"
echo ""
echo -e "📝 Dernier backup:"
echo -e "   ${BLUE}$(basename $LATEST_BACKUP)${NC} (${BACKUP_SIZE})"
echo ""

# Enregistrer rapport
REPORT_FILE="${BACKUP_DIR}/backup_report_${TIMESTAMP}.txt"
cat > "$REPORT_FILE" <<EOF
CRM ALFORIS - RAPPORT BACKUP OFFSITE
=====================================

Date: $(date '+%Y-%m-%d %H:%M:%S')
Méthode: ${OFFSITE_METHOD}
Backup: $(basename $LATEST_BACKUP)
Taille: ${BACKUP_SIZE}
Rétention: ${RETENTION_DAYS} jours
Statut: SUCCESS

$(case "$OFFSITE_METHOD" in
  "b2") echo "Destination: b2://${B2_BUCKET_NAME}/backups/";;
  "rsync") echo "Destination: ${RSYNC_USER}@${RSYNC_HOST}:${RSYNC_PATH}/";;
  "hetzner") echo "Destination: ${HETZNER_USER}@${HETZNER_HOST}:${HETZNER_PATH}/";;
esac)

Backups locaux conservés: ${LOCAL_BACKUPS}
Espace total: ${TOTAL_SIZE}
EOF

echo -e "${GREEN}📄 Rapport sauvegardé: ${REPORT_FILE}${NC}"
echo ""

# Optionnel : Envoyer notification email/Slack
if command -v curl &> /dev/null && [[ -n "$SLACK_WEBHOOK_URL" ]]; then
    curl -X POST "$SLACK_WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\":\"✅ Backup CRM réussi: $(basename $LATEST_BACKUP) (${BACKUP_SIZE}) → ${OFFSITE_METHOD}\"}" \
        > /dev/null 2>&1
fi

exit 0
