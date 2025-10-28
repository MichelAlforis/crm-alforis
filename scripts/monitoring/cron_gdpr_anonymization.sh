#!/bin/bash
###############################################################################
# Script Cron pour Anonymisation GDPR - CRM Alforis
#
# Exécute l'anonymisation mensuelle des données inactives conformément au RGPD
#
# Installation dans crontab:
#   crontab -e
#   # Ajouter cette ligne (1er de chaque mois à 2h du matin):
#   0 2 1 * * /path/to/crm-backend/scripts/cron_gdpr_anonymization.sh >> /path/to/logs/gdpr_cron.log 2>&1
#
# Ou via systemd timer (recommandé pour production):
#   sudo systemctl enable crm-gdpr-anonymization.timer
#   sudo systemctl start crm-gdpr-anonymization.timer
###############################################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PYTHON="${PROJECT_DIR}/.venv/bin/python3"
ANONYMIZE_SCRIPT="${SCRIPT_DIR}/gdpr_anonymize.py"
LOG_DIR="${PROJECT_DIR}/logs"
BACKUP_DIR="${PROJECT_DIR}/backups/gdpr"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer les dossiers si nécessaire
mkdir -p "$LOG_DIR"
mkdir -p "$BACKUP_DIR"

# Fonction de log
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_DIR}/gdpr_cron.log"
}

log "========================================="
log "GDPR ANONYMIZATION CRON - STARTING"
log "========================================="
log "Date: $(date)"
log "Project: $PROJECT_DIR"
log "Python: $PYTHON"

# Vérifier que Python existe
if [[ ! -f "$PYTHON" ]]; then
    log "ERROR: Python not found at $PYTHON"
    log "Please activate virtual environment or update PYTHON variable"
    exit 1
fi

# Vérifier que le script existe
if [[ ! -f "$ANONYMIZE_SCRIPT" ]]; then
    log "ERROR: Anonymization script not found at $ANONYMIZE_SCRIPT"
    exit 1
fi

# Optionnel: Backup de la base avant anonymisation (RECOMMANDÉ)
# Décommenter si backup PostgreSQL configuré
# log "Creating database backup..."
# pg_dump -h localhost -U crm_user -d crm_prod > "${BACKUP_DIR}/crm_backup_${DATE}.sql"
# log "Backup created: ${BACKUP_DIR}/crm_backup_${DATE}.sql"

# Exécuter l'anonymisation
log "Running GDPR anonymization script..."
cd "$PROJECT_DIR"

if $PYTHON "$ANONYMIZE_SCRIPT" --inactive-months 18 --batch-size 100; then
    log "✓ GDPR anonymization completed successfully"
    EXIT_CODE=0
else
    log "✗ GDPR anonymization failed with errors"
    EXIT_CODE=1
fi

# Nettoyer les anciens backups (garder les 12 derniers mois)
# find "$BACKUP_DIR" -name "crm_backup_*.sql" -mtime +365 -delete

log "========================================="
log "GDPR ANONYMIZATION CRON - FINISHED"
log "Exit code: $EXIT_CODE"
log "========================================="

exit $EXIT_CODE
