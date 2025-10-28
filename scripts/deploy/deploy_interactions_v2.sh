#!/bin/bash
# Script de déploiement Interactions V2 + Email Marketing
# Usage: ./scripts/deploy_interactions_v2.sh [--production]

set -e

# Configuration
ENV="${1:---staging}"
if [ "$ENV" = "--production" ]; then
    echo "🚀 DEPLOYING TO PRODUCTION"
    COMPOSE_FILE="docker-compose.prod.yml"
else
    echo "🧪 DEPLOYING TO STAGING"
    COMPOSE_FILE="docker-compose.yml"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_step() {
    echo -e "${GREEN}▶ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}  $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
    exit 1
}

# ============================================
# 1. PRE-DEPLOYMENT CHECKS
# ============================================

log_step "1. Pre-deployment checks"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
fi

# Check if required env vars are set
if [ -z "$WEBHOOK_SECRET" ]; then
    log_info "⚠️  WEBHOOK_SECRET not set. Webhook signature validation will be skipped."
    log_info "   Set it with: export WEBHOOK_SECRET=your_secret_here"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$ENV" = "--production" ] && [ "$CURRENT_BRANCH" != "main" ]; then
    log_error "Production deployment must be from 'main' branch (current: $CURRENT_BRANCH)"
fi

log_info "✓ Pre-checks passed"

# ============================================
# 2. BACKUP DATABASE
# ============================================

log_step "2. Backing up database"

BACKUP_FILE="backups/db_backup_$(date +%Y%m%d_%H%M%S).sql"
mkdir -p backups

docker-compose -f $COMPOSE_FILE exec -T postgres pg_dump \
    -U crm_user crm_db > "$BACKUP_FILE" 2>/dev/null || log_error "Database backup failed"

log_info "✓ Backup saved to: $BACKUP_FILE"

# ============================================
# 3. BUILD NEW IMAGES
# ============================================

log_step "3. Building Docker images"

docker-compose -f $COMPOSE_FILE build api || log_error "API build failed"

log_info "✓ Images built"

# ============================================
# 4. RUN DATABASE MIGRATIONS
# ============================================

log_step "4. Running database migrations"

log_info "Migration 1/2: add_interactions_v2_fields"
docker-compose -f $COMPOSE_FILE exec -T api \
    alembic upgrade interactions_v2 || log_error "Migration 1 failed"

log_info "Migration 2/2: add_email_sends_lead_scores"
docker-compose -f $COMPOSE_FILE exec -T api \
    alembic upgrade email_marketing_lite || log_error "Migration 2 failed"

log_info "✓ Migrations completed"

# ============================================
# 5. RESTART API SERVICE
# ============================================

log_step "5. Restarting API service"

docker-compose -f $COMPOSE_FILE restart api

# Wait for API to be healthy
log_info "Waiting for API to be ready..."
sleep 5

API_HEALTH=$(docker-compose -f $COMPOSE_FILE exec -T api \
    curl -s http://localhost:8000/health | jq -r '.status' 2>/dev/null || echo "unhealthy")

if [ "$API_HEALTH" != "healthy" ]; then
    log_error "API health check failed"
fi

log_info "✓ API is healthy"

# ============================================
# 6. SETUP REMINDER WORKER
# ============================================

log_step "6. Setting up reminder worker"

# Create cron job for reminder worker
CRON_ENTRY="*/5 * * * * cd /app && python -m workers.reminder_worker --once >> /var/log/reminder_worker.log 2>&1"

log_info "Cron job to add (every 5 minutes):"
echo "$CRON_ENTRY"

# Option 1: Via cron (manual setup required)
log_info "To enable cron job:"
log_info "  docker-compose exec api bash"
log_info "  echo \"$CRON_ENTRY\" | crontab -"
log_info "  service cron start"

# Option 2: Via supervisord (recommended for production)
if [ -f "docker/supervisord.conf" ]; then
    log_info "Or use supervisord (recommended):"
    log_info "  Restart containers with supervisord profile"
fi

# ============================================
# 7. RUN SMOKE TESTS
# ============================================

log_step "7. Running smoke tests"

# Get JWT token (assuming test user exists)
TOKEN=${TEST_JWT_TOKEN:-"your_test_token"}

# Test 1: Inbox endpoint
log_info "Test 1/5: GET /interactions/inbox"
INBOX_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:8000/api/v1/interactions/inbox" \
    -H "Authorization: Bearer $TOKEN")

if [ "$INBOX_STATUS" -ne 200 ]; then
    log_error "Inbox endpoint returned $INBOX_STATUS (expected 200)"
fi

# Test 2: Hot leads endpoint
log_info "Test 2/5: GET /marketing/leads-hot"
LEADS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:8000/api/v1/marketing/leads-hot" \
    -H "Authorization: Bearer $TOKEN")

if [ "$LEADS_STATUS" -ne 200 ]; then
    log_error "Hot leads endpoint returned $LEADS_STATUS (expected 200)"
fi

# Test 3: Database tables exist
log_info "Test 3/5: Verify database tables"
TABLES=$(docker-compose -f $COMPOSE_FILE exec -T postgres psql -U crm_user crm_db -t -c \
    "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('email_sends', 'lead_scores');" \
    | tr -d ' ' | grep -c 'email_sends\|lead_scores')

if [ "$TABLES" -ne 2 ]; then
    log_error "Email marketing tables not found in database"
fi

# Test 4: Indexes exist
log_info "Test 4/5: Verify indexes"
INDEXES=$(docker-compose -f $COMPOSE_FILE exec -T postgres psql -U crm_user crm_db -t -c \
    "SELECT indexname FROM pg_indexes WHERE tablename='crm_interactions' AND indexname LIKE 'idx_interactions_%';" \
    | grep -c 'idx_interactions')

if [ "$INDEXES" -lt 3 ]; then
    log_error "Interaction indexes not found (expected >= 3)"
fi

# Test 5: Worker can run
log_info "Test 5/5: Test reminder worker"
WORKER_OUTPUT=$(docker-compose -f $COMPOSE_FILE exec -T api \
    python -m workers.reminder_worker --once 2>&1)

if echo "$WORKER_OUTPUT" | grep -q "Error"; then
    log_error "Worker encountered errors: $WORKER_OUTPUT"
fi

log_info "✓ All smoke tests passed"

# ============================================
# 8. DEPLOY FRONTEND (if applicable)
# ============================================

log_step "8. Deploying frontend"

if [ -f "crm-frontend/.env.production" ]; then
    docker-compose -f $COMPOSE_FILE build frontend || log_error "Frontend build failed"
    docker-compose -f $COMPOSE_FILE restart frontend
    log_info "✓ Frontend deployed"
else
    log_info "⊘ Frontend deployment skipped (no .env.production found)"
fi

# ============================================
# 9. FINAL VERIFICATION
# ============================================

log_step "9. Final verification"

# Check all services are running
SERVICES_UP=$(docker-compose -f $COMPOSE_FILE ps --services --filter "status=running" | wc -l)
SERVICES_TOTAL=$(docker-compose -f $COMPOSE_FILE ps --services | wc -l)

log_info "Services running: $SERVICES_UP/$SERVICES_TOTAL"

if [ "$SERVICES_UP" -lt "$SERVICES_TOTAL" ]; then
    log_error "Some services are not running"
fi

# ============================================
# DEPLOYMENT COMPLETE
# ============================================

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Configure webhook in Resend/Sendgrid:"
echo "   URL: https://your-domain.com/api/v1/marketing/email/ingest"
echo "   Headers: Authorization: Bearer <token>"
if [ -n "$WEBHOOK_SECRET" ]; then
    echo "            X-Signature: <hmac_signature>"
fi
echo "   Body: JSON payload with email events"
echo ""
echo "2. Enable reminder worker:"
echo "   docker-compose exec api bash"
echo "   echo '$CRON_ENTRY' | crontab -"
echo "   service cron start"
echo ""
echo "3. Monitor logs:"
echo "   docker-compose logs -f api"
echo "   docker-compose logs -f frontend"
echo ""
echo "4. Run full test suite:"
echo "   ./scripts/test_interactions_v2.sh"
echo ""

if [ "$ENV" = "--production" ]; then
    echo "⚠️  PRODUCTION DEPLOYMENT - Monitor carefully!"
fi
