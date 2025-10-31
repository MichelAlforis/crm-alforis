#!/bin/bash
#
# Automated PostgreSQL Backup Script
#
# Features:
# - Full database dump with compression
# - Automatic rotation (keeps last 7 daily, 4 weekly, 3 monthly backups)
# - Upload to S3/Backblaze B2 (optional)
# - Slack/Email notifications on failure
# - Backup validation
#
# Usage:
#   ./backup-db.sh
#
# Cron example (daily at 2 AM):
#   0 2 * * * /path/to/backup-db.sh >> /var/log/backup-db.log 2>&1
#

set -euo pipefail

# ===== Configuration =====
BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_PORT="${POSTGRES_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-crm_db}"
DB_USER="${POSTGRES_USER:-crm_user}"
DB_PASSWORD="${POSTGRES_PASSWORD:-crm_password}"

# Retention policy
DAILY_RETENTION=7      # Keep 7 daily backups
WEEKLY_RETENTION=4     # Keep 4 weekly backups (28 days)
MONTHLY_RETENTION=3    # Keep 3 monthly backups (90 days)

# Optional: S3/B2 upload
S3_ENABLED="${BACKUP_S3_ENABLED:-false}"
S3_BUCKET="${BACKUP_S3_BUCKET:-}"
S3_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"
S3_ACCESS_KEY="${BACKUP_S3_ACCESS_KEY:-}"
S3_SECRET_KEY="${BACKUP_S3_SECRET_KEY:-}"

# Notifications
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"
NOTIFICATION_EMAIL="${BACKUP_EMAIL:-}"

# ===== Functions =====

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

send_notification() {
    local status="$1"
    local message="$2"

    # Slack notification
    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -s -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"🗄️ CRM Backup $status: $message\"}" \
            || true
    fi

    # Email notification (requires mailx/sendmail)
    if [[ -n "$NOTIFICATION_EMAIL" ]] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "CRM Backup $status" "$NOTIFICATION_EMAIL" || true
    fi
}

# ===== Main Backup Logic =====

log "Starting PostgreSQL backup for database: $DB_NAME"

# Create backup directory
mkdir -p "$BACKUP_DIR"/{daily,weekly,monthly}

# Generate backup filename with timestamp
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
DAY_OF_WEEK=$(date +'%u')  # 1 = Monday, 7 = Sunday
DAY_OF_MONTH=$(date +'%d')

# Determine backup type
if [[ "$DAY_OF_MONTH" == "01" ]]; then
    BACKUP_TYPE="monthly"
    BACKUP_FILE="$BACKUP_DIR/monthly/${DB_NAME}_monthly_${TIMESTAMP}.sql.gz"
elif [[ "$DAY_OF_WEEK" == "7" ]]; then
    BACKUP_TYPE="weekly"
    BACKUP_FILE="$BACKUP_DIR/weekly/${DB_NAME}_weekly_${TIMESTAMP}.sql.gz"
else
    BACKUP_TYPE="daily"
    BACKUP_FILE="$BACKUP_DIR/daily/${DB_NAME}_daily_${TIMESTAMP}.sql.gz"
fi

log "Backup type: $BACKUP_TYPE"
log "Backup file: $BACKUP_FILE"

# Perform backup with pg_dump
export PGPASSWORD="$DB_PASSWORD"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --format=plain \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    | gzip > "$BACKUP_FILE"; then

    log "✅ Backup completed successfully"

    # Validate backup (check if file is not empty and is valid gzip)
    if [[ -s "$BACKUP_FILE" ]] && gzip -t "$BACKUP_FILE" 2>/dev/null; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log "Backup size: $BACKUP_SIZE"

        # Create latest symlink
        ln -sf "$BACKUP_FILE" "$BACKUP_DIR/latest_${BACKUP_TYPE}.sql.gz"

    else
        error "Backup validation failed"
        send_notification "FAILED" "Backup validation failed for $DB_NAME"
        exit 1
    fi
else
    error "Backup failed"
    send_notification "FAILED" "Backup failed for $DB_NAME"
    exit 1
fi

# ===== Rotation: Delete old backups =====

log "Applying retention policy..."

# Daily backups: keep last 7
if [[ -d "$BACKUP_DIR/daily" ]]; then
    find "$BACKUP_DIR/daily" -name "*.sql.gz" -type f -mtime +${DAILY_RETENTION} -delete
    DAILY_COUNT=$(find "$BACKUP_DIR/daily" -name "*.sql.gz" -type f | wc -l)
    log "Daily backups: $DAILY_COUNT (retention: $DAILY_RETENTION days)"
fi

# Weekly backups: keep last 4
if [[ -d "$BACKUP_DIR/weekly" ]]; then
    find "$BACKUP_DIR/weekly" -name "*.sql.gz" -type f -mtime +$((WEEKLY_RETENTION * 7)) -delete
    WEEKLY_COUNT=$(find "$BACKUP_DIR/weekly" -name "*.sql.gz" -type f | wc -l)
    log "Weekly backups: $WEEKLY_COUNT (retention: $WEEKLY_RETENTION weeks)"
fi

# Monthly backups: keep last 3
if [[ -d "$BACKUP_DIR/monthly" ]]; then
    find "$BACKUP_DIR/monthly" -name "*.sql.gz" -type f -mtime +$((MONTHLY_RETENTION * 30)) -delete
    MONTHLY_COUNT=$(find "$BACKUP_DIR/monthly" -name "*.sql.gz" -type f | wc -l)
    log "Monthly backups: $MONTHLY_COUNT (retention: $MONTHLY_RETENTION months)"
fi

# ===== Optional: Upload to S3/B2 =====

if [[ "$S3_ENABLED" == "true" ]] && [[ -n "$S3_BUCKET" ]]; then
    log "Uploading backup to S3/B2..."

    if command -v aws &> /dev/null || command -v s3cmd &> /dev/null; then
        # Try aws-cli first
        if command -v aws &> /dev/null; then
            AWS_ACCESS_KEY_ID="$S3_ACCESS_KEY" \
            AWS_SECRET_ACCESS_KEY="$S3_SECRET_KEY" \
            aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/backups/${BACKUP_TYPE}/" \
                ${S3_ENDPOINT:+--endpoint-url "$S3_ENDPOINT"} \
                && log "✅ Uploaded to S3/B2" \
                || error "S3/B2 upload failed"
        fi
    else
        log "⚠️  S3 upload skipped: aws-cli or s3cmd not installed"
    fi
fi

# ===== Final Summary =====

TOTAL_BACKUPS=$(find "$BACKUP_DIR" -name "*.sql.gz" -type f | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "========================================="
log "Backup Summary:"
log "  Type: $BACKUP_TYPE"
log "  File: $BACKUP_FILE"
log "  Size: $BACKUP_SIZE"
log "  Total backups: $TOTAL_BACKUPS"
log "  Total disk usage: $TOTAL_SIZE"
log "========================================="

send_notification "SUCCESS" "Backup completed for $DB_NAME ($BACKUP_SIZE)"

log "✅ Backup process completed successfully"
