#!/bin/bash

# Script de sauvegarde de la base de données PostgreSQL
# Usage: ./scripts/backup.sh

set -e

BACKUP_DIR="./backups"
DB_USER="crm_user"
DB_NAME="crm_db"
DB_HOST="${DB_HOST:-postgres}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/crm_backup_$TIMESTAMP.sql.gz"

echo "🔄 Démarrage de la sauvegarde..."

# Créer le dossier de backup s'il n'existe pas
mkdir -p "$BACKUP_DIR"

# Effectuer la sauvegarde
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password | gzip > "$BACKUP_FILE"

echo "✅ Sauvegarde complétée: $BACKUP_FILE"

# Garder seulement les 10 dernières sauvegardes
echo "🧹 Nettoyage des anciennes sauvegardes..."
ls -t "$BACKUP_DIR"/crm_backup_*.sql.gz | tail -n +11 | xargs -r rm

echo "✨ Sauvegarde terminée avec succès!"