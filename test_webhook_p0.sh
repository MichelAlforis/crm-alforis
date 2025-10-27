#!/bin/bash
# Test script for P0: Webhook datetime serialization fix

set -e

echo "=== P0: Testing Webhook Email Ingest Endpoint ==="

# 1. Generate JWT token
echo "1. Generating JWT token..."
TOKEN=$(docker-compose exec -T api python3 << 'PYTHON'
import sys
sys.path.insert(0, '/app')
from core.security import create_access_token
from datetime import timedelta
token = create_access_token(
    {"sub": "4", "email": "test+qa@alforis.com", "is_admin": True, "name": "Test QA", "role": {"name": "admin", "level": 3}},
    expires_delta=timedelta(hours=1)
)
print(token)
PYTHON
)

echo "✓ Token generated"

# 2. Ensure test person exists
echo "2. Ensuring test person exists..."
docker-compose exec -T postgres psql -U crm_user -d crm_db -c "
INSERT INTO people (id, prenom, nom, email, is_active, created_at)
VALUES (999, 'Webhook', 'Test', 'webhook@test.com', true, NOW())
ON CONFLICT (id) DO NOTHING;
" > /dev/null

echo "✓ Person ID 999 ready"

# 3. Generate HMAC signature
echo "3. Generating HMAC signature..."
SIGNATURE=$(docker exec v1-api-1 python3 << 'PYTHON'
import json, hmac, hashlib

payload = {
    "event": "sent",
    "external_id": "msg_p0_test_001",
    "occurred_at": "2025-10-25T14:30:00Z",
    "person_id": 999,
    "provider": "resend",
    "subject": "P0 Test Email"
}

payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
sig = hmac.new(b"test-webhook-token-123", payload_bytes, hashlib.sha256).hexdigest()
print(sig)
PYTHON
)

echo "✓ Signature: $SIGNATURE"

# 4. Get current timestamp
TIMESTAMP=$(python3 -c "import time; print(int(time.time()))")
echo "✓ Timestamp: $TIMESTAMP"

# 5. Send webhook request
echo "4. Sending webhook POST request..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST 'http://localhost:8000/api/v1/marketing/email/ingest' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Signature: $SIGNATURE" \
  -H "X-Timestamp: $TIMESTAMP" \
  -d '{"event":"sent","external_id":"msg_p0_test_001","occurred_at":"2025-10-25T14:30:00Z","person_id":999,"provider":"resend","subject":"P0 Test Email"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo ""
echo "HTTP Status: $HTTP_CODE"
echo "Response Body:"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
    echo ""
    echo "✅ SUCCESS: Webhook ingest endpoint working!"
    echo "✅ Datetime serialization fix confirmed"
    exit 0
else
    echo ""
    echo "❌ FAILED: Expected 200, got $HTTP_CODE"
    echo "Checking API logs..."
    docker logs v1-api-1 --tail 50 | grep -i "error\|exception" | tail -10
    exit 1
fi
