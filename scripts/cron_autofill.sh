#!/bin/bash
# ==============================================================================
# 🔄 Cron Autofill Job - Automated Email Processing
# ==============================================================================
# Schedule: Run every hour on Hetzner
# Crontab entry: 0 * * * * /srv/crm-alforis/scripts/cron_autofill.sh >> /var/log/crm_autofill.log 2>&1
#
# What it does:
# - Fetch unparsed emails from last 24h
# - Parse signatures with AI
# - Detect email intent
# - Auto-apply high confidence suggestions (≥92%)
# - Create manual review tasks for low confidence
# ==============================================================================

set -euo pipefail

# Configuration
DAYS_BACK=${1:-1}  # Default: last 24 hours
MAX_EMAILS=${2:-50}  # Default: 50 emails per run
AUTO_APPLY_THRESHOLD=${3:-0.92}  # Default: 92% confidence
API_URL="${API_URL:-http://localhost:8000}"

# Get admin token from environment or fail
if [ -z "${ADMIN_TOKEN:-}" ]; then
    echo "❌ ERROR: ADMIN_TOKEN not set in environment"
    exit 1
fi

# ==============================================================================
# 🚀 Run the autofill job
# ==============================================================================

echo "========================================"
echo "🔄 Starting Autofill Cron Job"
echo "========================================"
echo "📅 $(date)"
echo "⚙️  Config: days_back=$DAYS_BACK, max_emails=$MAX_EMAILS, threshold=$AUTO_APPLY_THRESHOLD"
echo ""

# Call the API
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/api/v1/autofill-jobs/run-now" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
        \"days_back\": $DAYS_BACK,
        \"max_emails\": $MAX_EMAILS,
        \"auto_apply_threshold\": $AUTO_APPLY_THRESHOLD
    }")

# Extract HTTP code and body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

# Check status
if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Job completed successfully!"
    echo ""

    # Parse and display metrics
    echo "$BODY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    print(data.get('summary', ''))

    metrics = data.get('metrics', {})
    print('\n📊 Key Metrics:')
    print(f'   Emails: {metrics.get(\"emails_processed\", 0)}')
    print(f'   Signatures: {metrics.get(\"signatures_parsed\", 0)}')
    print(f'   Intents: {metrics.get(\"intents_detected\", 0)}')
    print(f'   Auto-applied: {metrics.get(\"auto_applied\", 0)}')
    print(f'   Manual review: {metrics.get(\"manual_review\", 0)}')
    print(f'   Errors: {metrics.get(\"errors\", 0)}')
    print(f'   Time: {metrics.get(\"processing_time_ms\", 0) / 1000:.1f}s')
else:
    print('❌ Job failed:', data)
"
else
    echo "❌ HTTP Error: $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ Cron job finished: $(date)"
echo "========================================"
