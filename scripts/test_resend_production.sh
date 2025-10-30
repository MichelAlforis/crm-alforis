#!/bin/bash
# ==============================================================================
# 📧 Test Resend Email Integration on Hetzner
# ==============================================================================
# Tests:
# 1. Resend API key configured
# 2. Send test email via password reset flow
# 3. Check logs for errors
# ==============================================================================

set -euo pipefail

SERVER="root@159.69.108.234"
APP_DIR="/srv/crm-alforis"

echo "========================================"
echo "📧 Testing Resend Email Integration"
echo "========================================"
echo "📅 $(date)"
echo ""

# ==============================================================================
# 1. Check Resend API Key
# ==============================================================================
echo "🔑 1. Checking Resend API key configuration..."

RESEND_STATUS=$(ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T api python -c \"
from core.config import settings
import sys

if settings.resend_api_key:
    key = settings.resend_api_key
    masked = key[:7] + '...' + key[-4:] if len(key) > 11 else 're_***'
    print(f'CONFIGURED:{masked}')
else:
    print('MISSING')
    sys.exit(1)
\" 2>&1")

if [[ "$RESEND_STATUS" == CONFIGURED:* ]]; then
    KEY_DISPLAY="${RESEND_STATUS#CONFIGURED:}"
    echo "✅ Resend API key: $KEY_DISPLAY"
else
    echo "❌ Resend API key NOT configured"
    echo ""
    echo "⚙️  To fix:"
    echo "   1. ssh $SERVER"
    echo "   2. cd $APP_DIR"
    echo "   3. nano .env"
    echo "   4. Add: RESEND_API_KEY=re_your_key_here"
    echo "   5. docker compose -f docker-compose.prod.yml restart api"
    exit 1
fi

echo ""

# ==============================================================================
# 2. Check Email Configuration
# ==============================================================================
echo "📝 2. Checking email configuration..."

EMAIL_CONFIG=$(ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml exec -T api python -c \"
from core.config import settings
print(f'FROM: {settings.email_from_address}')
print(f'NAME: {settings.email_from_name}')
\" 2>&1")

echo "$EMAIL_CONFIG"

if echo "$EMAIL_CONFIG" | grep -q "FROM:.*@"; then
    echo "✅ Email from address configured"
else
    echo "⚠️  Email from address might be missing"
fi

echo ""

# ==============================================================================
# 3. Test Password Reset Email (Safe Test)
# ==============================================================================
echo "📧 3. Testing password reset email..."

TEST_EMAIL="${TEST_EMAIL:-test+resend@alforis.com}"

echo "Attempting to send password reset to: $TEST_EMAIL"
echo "(This is safe - it only works if email exists in DB)"

RESET_RESPONSE=$(ssh "$SERVER" "curl -s -X POST 'https://crm.alforis.fr/api/v1/auth/forgot-password' \
  -H 'Content-Type: application/json' \
  -d '{\"email\": \"$TEST_EMAIL\"}'" 2>&1)

echo ""
echo "Response:"
echo "$RESET_RESPONSE" | jq '.' 2>/dev/null || echo "$RESET_RESPONSE"

if echo "$RESET_RESPONSE" | grep -q '"message"'; then
    echo ""
    echo "✅ API responded successfully"
    echo "   (Email sent if user exists)"
else
    echo ""
    echo "⚠️  API response unexpected"
fi

echo ""

# ==============================================================================
# 4. Check API Logs for Resend Activity
# ==============================================================================
echo "📋 4. Checking API logs for Resend activity..."

echo "Recent Resend-related logs:"
ssh "$SERVER" "cd $APP_DIR && docker compose -f docker-compose.prod.yml logs api --tail=50" | grep -i "resend\|password\|email" | tail -10

echo ""

# ==============================================================================
# 5. Verify Resend Dashboard
# ==============================================================================
echo "========================================"
echo "✅ Test Complete!"
echo "========================================"
echo ""
echo "📊 Summary:"
echo "   - Resend API Key: ${RESEND_STATUS#CONFIGURED:}"
echo "   - Test email sent to: $TEST_EMAIL"
echo ""
echo "🔗 Next Steps:"
echo "   1. Check Resend Dashboard: https://resend.com/emails"
echo "   2. Verify email delivery status"
echo "   3. Check inbox for test email (if user exists)"
echo ""
echo "💡 To test with real user:"
echo "   TEST_EMAIL=your.real.email@example.com ./scripts/test_resend_production.sh"
echo ""
echo "⚠️  Note: Email only sent if user exists in database"
echo "   To create test user first, use: /dashboard/settings/users"
echo ""
