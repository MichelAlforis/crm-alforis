#!/bin/bash
#
# Setup Automated Database Backups with Cron
#
# This script configures automatic daily backups of the PostgreSQL database.
# Backups run daily at 2 AM using the existing backup_database.sh script.
#
# Usage:
#   ./setup-cron-backup.sh
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/../crm-backend/scripts/backup_database.sh"

echo "🔧 Setting up automated database backups..."
echo ""

# Check if backup script exists
if [[ ! -f "$BACKUP_SCRIPT" ]]; then
    echo "❌ Error: Backup script not found at $BACKUP_SCRIPT"
    exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
echo "✅ Backup script is executable"

# Add cron job (daily at 2 AM)
CRON_JOB="0 2 * * * cd $SCRIPT_DIR/.. && $BACKUP_SCRIPT >> /var/log/crm-backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup_database.sh"; then
    echo "⚠️  Cron job already exists"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep backup_database || true
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job added successfully"
fi

echo ""
echo "========================================="
echo "📅 Backup Schedule:"
echo "   Daily at 2:00 AM"
echo ""
echo "📁 Backup Location:"
echo "   $(dirname "$SCRIPT_DIR")/backups/"
echo ""
echo "📝 Log File:"
echo "   /var/log/crm-backup.log"
echo ""
echo "🔍 To view current cron jobs:"
echo "   crontab -l"
echo ""
echo "🗑️  To remove the cron job:"
echo "   crontab -e"
echo "   (then delete the line with backup_database.sh)"
echo "========================================="
echo ""
echo "✅ Automated backups configured successfully!"
