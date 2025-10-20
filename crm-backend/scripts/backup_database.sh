#!/bin/bash

# =============================================================================
# Script de Backup PostgreSQL pour CRM
# =============================================================================

set -e  # Arrêter en cas d'erreur

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="crm_backup_${TIMESTAMP}.sql"

# Variables d'environnement (depuis .env ou docker-compose)
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_EXTERNAL_PORT:-5433}"
DB_NAME="${POSTGRES_DB:-crm_db}"
DB_USER="${POSTGRES_USER:-crm_user}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🗄️  BACKUP BASE DE DONNÉES CRM${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "📅 Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "🗄️  Base: ${DB_NAME}"
echo -e "📁 Destination: ${BACKUP_DIR}/${BACKUP_FILE}"
echo ""

# Créer le répertoire de backup s'il n'existe pas
mkdir -p "${BACKUP_DIR}"

# Vérifier si Docker est utilisé
if docker ps | grep -q "crm-postgres\|postgres"; then
    echo -e "${YELLOW}📦 Détection de Docker...${NC}"

    # Trouver le nom du container postgres
    CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep -E 'crm-postgres|postgres' | head -1)

    if [[ -z "$CONTAINER_NAME" ]]; then
        echo -e "${RED}❌ Container PostgreSQL non trouvé${NC}"
        exit 1
    fi

    echo -e "${GREEN}✅ Container trouvé: ${CONTAINER_NAME}${NC}"
    echo -e "${YELLOW}📥 Création du backup...${NC}"

    # Backup via Docker
    docker exec -t "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" \
        --clean --if-exists --create \
        > "${BACKUP_DIR}/${BACKUP_FILE}"

else
    echo -e "${YELLOW}🖥️  Mode local (sans Docker)${NC}"
    echo -e "${YELLOW}📥 Création du backup...${NC}"

    # Backup en local
    PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
        -h "${DB_HOST}" \
        -p "${DB_PORT}" \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --clean --if-exists --create \
        > "${BACKUP_DIR}/${BACKUP_FILE}"
fi

# Vérifier si le backup a réussi
if [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo ""
    echo -e "${GREEN}✅ Backup créé avec succès!${NC}"
    echo -e "${GREEN}📦 Taille: ${BACKUP_SIZE}${NC}"
    echo -e "${GREEN}📁 Fichier: ${BACKUP_DIR}/${BACKUP_FILE}${NC}"

    # Compresser le backup
    echo ""
    echo -e "${YELLOW}📦 Compression du backup...${NC}"
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"

    COMPRESSED_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo -e "${GREEN}✅ Backup compressé: ${COMPRESSED_SIZE}${NC}"

    # Garder seulement les 10 derniers backups
    echo ""
    echo -e "${YELLOW}🧹 Nettoyage des anciens backups...${NC}"
    cd "${BACKUP_DIR}"
    ls -t crm_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm
    BACKUP_COUNT=$(ls crm_backup_*.sql.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ ${BACKUP_COUNT} backups conservés${NC}"

    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}✅ BACKUP TERMINÉ${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "📝 Pour restaurer ce backup:"
    echo -e "   ${BLUE}./scripts/restore_database.sh ${BACKUP_FILE}.gz${NC}"

else
    echo ""
    echo -e "${RED}❌ Erreur: Le backup a échoué${NC}"
    exit 1
fi
