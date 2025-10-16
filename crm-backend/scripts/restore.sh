#!/bin/bash

# Script de restauration de la base de données PostgreSQL
# Usage: ./scripts/restore.sh <backup_file>

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./scripts/restore.sh <backup_file>"
    echo "Fichiers disponibles:"
    ls -lh ./backups/crm_backup_*.sql.gz 2>/dev/null || echo "Aucune sauvegarde trouvée"
    exit 1
fi

BACKUP_FILE="$1"
DB_USER="crm_user"
DB_NAME="crm_db"
DB_HOST="${DB_HOST:-postgres}"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Fichier non trouvé: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  Attention: Cette opération va remplacer la base de données existante!"
echo "Fichier à restaurer: $BACKUP_FILE"
read -p "Continuer? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restauration annulée"
    exit 1
fi

echo "🔄 Restauration en cours..."

# Restaurer la sauvegarde
gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-password

echo "✅ Restauration complétée!"