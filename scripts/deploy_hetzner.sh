#!/bin/bash
# ==============================================================================
# 🚀 Deploy Acte IV to Hetzner Production
# ==============================================================================
# Usage: ./scripts/deploy_hetzner.sh
# ==============================================================================

set -euo pipefail

SERVER="root@159.69.108.234"
APP_DIR="/srv/crm-alforis"
BACKUP_DIR="$HOME/backups"

echo "========================================"
echo "🚀 Déploiement Acte IV sur Hetzner"
echo "========================================"
echo "📅 $(date)"
echo ""

# ==============================================================================
# 1. Pre-flight checks
# ==============================================================================
echo "🔍 1. Pre-flight checks..."

# Check SSH connection
if ! ssh -o ConnectTimeout=5 "$SERVER" "echo 'Connected'" &>/dev/null; then
    echo "❌ Cannot connect to $SERVER"
    echo "💡 Make sure you have SSH access configured"
    exit 1
fi

echo "✅ SSH connection OK"
echo ""

# ==============================================================================
# 2. Backup Database
# ==============================================================================
echo "💾 2. Backing up database..."

ssh "$SERVER" "mkdir -p $BACKUP_DIR"

BACKUP_FILE="crm_db_$(date +%Y%m%d_%H%M%S).sql.gz"

ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U crm_user crm_db | gzip > $BACKUP_DIR/$BACKUP_FILE"

echo "✅ Backup created: $BACKUP_FILE"

# Verify backup size
BACKUP_SIZE=$(ssh "$SERVER" "ls -lh $BACKUP_DIR/$BACKUP_FILE | awk '{print \$5}'")
echo "   Size: $BACKUP_SIZE"
echo ""

# ==============================================================================
# 3. Pull latest code
# ==============================================================================
echo "📦 3. Pulling latest code..."

ssh "$SERVER" << 'ENDSSH'
cd /srv/crm-alforis

# Show current version
echo "Current version:"
git log -1 --oneline

# Pull latest
git fetch origin
git pull origin main

echo ""
echo "New version:"
git log -1 --oneline
ENDSSH

echo "✅ Code updated"
echo ""

# ==============================================================================
# 4. Run Database Migrations
# ==============================================================================
echo "🗄️  4. Running database migrations..."

ssh "$SERVER" << 'ENDSSH'
cd /srv/crm-alforis

# Check current migration
echo "Current migration:"
docker compose -f docker-compose.prod.yml exec -T api alembic current

# Run migrations
echo ""
echo "Running upgrade..."
docker compose -f docker-compose.prod.yml exec -T api alembic upgrade head

# Verify new tables exist
echo ""
echo "Verifying new tables..."
docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db -c "\dt routing_rules" 2>&1 | grep -q "routing_rules" && echo "✅ routing_rules table exists" || echo "⚠️  routing_rules table NOT found"
docker compose -f docker-compose.prod.yml exec -T postgres psql -U crm_user -d crm_db -c "\dt ai_feedback" 2>&1 | grep -q "ai_feedback" && echo "✅ ai_feedback table exists" || echo "⚠️  ai_feedback table NOT found"
ENDSSH

echo "✅ Migrations completed"
echo ""

# ==============================================================================
# 5. Rebuild containers
# ==============================================================================
echo "🔨 5. Rebuilding containers..."

ssh "$SERVER" << 'ENDSSH'
cd /srv/crm-alforis

# Stop containers
echo "Stopping containers..."
docker compose -f docker-compose.prod.yml down

# Rebuild and start
echo "Building and starting..."
docker compose -f docker-compose.prod.yml up -d --build

# Wait for startup
echo "Waiting for services to start (30s)..."
sleep 30
ENDSSH

echo "✅ Containers rebuilt"
echo ""

# ==============================================================================
# 6. Health checks
# ==============================================================================
echo "🏥 6. Health checks..."

echo "Checking container status..."
ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml ps"

echo ""
echo "Testing API health..."
HEALTH_STATUS=$(ssh "$SERVER" "curl -s https://crm.alforis.fr/api/v1/health | jq -r '.status' 2>/dev/null || echo 'error'")

if [ "$HEALTH_STATUS" = "ok" ]; then
    echo "✅ API health: OK"
else
    echo "❌ API health: FAILED ($HEALTH_STATUS)"
    echo ""
    echo "📋 Recent API logs:"
    ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml logs api --tail=20"
    exit 1
fi

echo ""
echo "Testing new endpoints..."

# Check if new routes exist
ROUTES=$(ssh "$SERVER" "curl -s https://crm.alforis.fr/api/v1/openapi.json 2>/dev/null" | jq -r '.paths | keys[]' | grep -E "(email-intelligence|autofill-jobs)" | wc -l)

if [ "$ROUTES" -gt 0 ]; then
    echo "✅ New routes found ($ROUTES endpoints)"
else
    echo "⚠️  New routes not found in OpenAPI"
fi

echo ""

# ==============================================================================
# 7. Test Resend Integration
# ==============================================================================
echo "📧 7. Testing Resend email integration..."

# Check if RESEND_API_KEY is set
RESEND_KEY=$(ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T api python -c \"from core.config import settings; print('SET' if settings.resend_api_key else 'MISSING')\" 2>/dev/null")

if [ "$RESEND_KEY" = "SET" ]; then
    echo "✅ Resend API key configured"
else
    echo "⚠️  Resend API key NOT configured"
    echo "   Add to .env: RESEND_API_KEY=re_..."
fi

echo ""

# ==============================================================================
# 8. Smoke tests summary
# ==============================================================================
echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "📊 Summary:"
echo "   - Database backup: $BACKUP_FILE"
echo "   - API health: $HEALTH_STATUS"
echo "   - New routes: $ROUTES endpoints"
echo "   - Resend API: $RESEND_KEY"
echo ""
echo "🔗 Next Steps:"
echo "   1. Open: https://crm.alforis.fr/dashboard/ai/intelligence"
echo "   2. Open: https://crm.alforis.fr/dashboard/ai/autofill"
echo "   3. Test batch job manually (see ACTE_IV_DEPLOYMENT.md)"
echo "   4. Configure cron job for hourly autofill"
echo ""
echo "📚 Documentation:"
echo "   - Deployment guide: documentation/ACTE_IV_DEPLOYMENT.md"
echo "   - Daily checklist: documentation/DAILY_CHECKLIST.md"
echo ""
echo "🚨 Rollback (if needed):"
echo "   ssh $SERVER 'cd $APP_DIR && git reset --hard v8.4.0 && docker compose -f docker-compose.prod.yml down && docker compose -f docker-compose.prod.yml up -d --build'"
echo ""
echo "========================================"
echo "🎉 Acte IV deployed successfully!"
echo "========================================"
