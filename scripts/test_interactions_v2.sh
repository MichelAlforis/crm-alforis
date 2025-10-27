#!/bin/bash
# Test suite pour Interactions V2 + Email Marketing
# Usage: ./scripts/test_interactions_v2.sh

set -e

# Configuration
API_URL="${API_URL:-http://localhost:8000/api/v1}"
TOKEN="${TOKEN:-}"

# Check if TOKEN is set
if [ -z "$TOKEN" ]; then
    echo -e "${RED}ERROR: TOKEN not set${NC}"
    echo "Please set your JWT token:"
    echo "  export TOKEN='your_jwt_token'"
    echo ""
    echo "Or get a token with:"
    echo "  curl -X POST http://localhost:8000/api/v1/auth/login \\"
    echo "    -H 'Content-Type: application/json' \\"
    echo "    -d '{\"username\":\"test@example.com\",\"password\":\"password\"}'"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

log_error() {
    echo -e "${RED}✗ $1${NC}"
}

log_info() {
    echo -e "${YELLOW}→ $1${NC}"
}

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local command="$2"
    local expected_http_code="${3:-200}"

    log_info "Test: $test_name"

    # Run command and capture output + HTTP code
    response=$(eval "$command" -w "\\nHTTP_CODE:%{http_code}" 2>&1)
    http_code=$(echo "$response" | grep "HTTP_CODE:" | sed 's/HTTP_CODE://')
    body=$(echo "$response" | grep -v "HTTP_CODE:")

    # Validate http_code is a number
    if ! [[ "$http_code" =~ ^[0-9]+$ ]]; then
        log_error "$test_name (Invalid HTTP code: $http_code)"
        echo "$body"
        ((TESTS_FAILED++))
        echo ""
        return
    fi

    if [ "$http_code" -eq "$expected_http_code" ]; then
        log_success "$test_name (HTTP $http_code)"
        echo "$body" | jq '.' 2>/dev/null || echo "$body"
        ((TESTS_PASSED++))
    else
        log_error "$test_name (Expected HTTP $expected_http_code, got $http_code)"
        echo "$body"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# ============================================
# 1. INBOX ENDPOINTS
# ============================================

echo "=========================================="
echo "1. INBOX ENDPOINTS TESTS"
echo "=========================================="

# Test 1.1: Get all inbox (non-done)
run_test "1.1 GET /interactions/inbox (all)" \
    "curl -s '$API_URL/interactions/inbox' -H 'Authorization: Bearer $TOKEN'"

# Test 1.2: Get inbox assigned to me
run_test "1.2 GET /interactions/inbox?assignee=me" \
    "curl -s '$API_URL/interactions/inbox?assignee=me' -H 'Authorization: Bearer $TOKEN'"

# Test 1.3: Get inbox overdue
run_test "1.3 GET /interactions/inbox?due=overdue" \
    "curl -s '$API_URL/interactions/inbox?due=overdue' -H 'Authorization: Bearer $TOKEN'"

# Test 1.4: Get inbox today
run_test "1.4 GET /interactions/inbox?due=today" \
    "curl -s '$API_URL/interactions/inbox?due=today' -H 'Authorization: Bearer $TOKEN'"

# Test 1.5: Get inbox by status=todo
run_test "1.5 GET /interactions/inbox?status=todo" \
    "curl -s '$API_URL/interactions/inbox?status=todo' -H 'Authorization: Bearer $TOKEN'"

# ============================================
# 2. QUICK ACTIONS (PATCH)
# ============================================

echo "=========================================="
echo "2. QUICK ACTIONS TESTS"
echo "=========================================="

# Prerequisites: Create test interaction
# macOS compatible date (+1 day)
NEXT_DAY=$(date -u -v+1d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)

INTERACTION_ID=$(curl -s "$API_URL/interactions" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "type": "call",
        "title": "Test Interaction V2",
        "person_id": 1,
        "status": "todo",
        "next_action_at": "'"$NEXT_DAY"'"
    }' | jq -r '.id')

log_info "Created test interaction: ID=$INTERACTION_ID"

# Validate interaction was created
if [ "$INTERACTION_ID" = "null" ] || [ -z "$INTERACTION_ID" ]; then
    log_error "Failed to create test interaction. Check if person_id=1 exists."
fi

# Test 2.1: Update status
run_test "2.1 PATCH /interactions/$INTERACTION_ID/status" \
    "curl -s -X PATCH '$API_URL/interactions/$INTERACTION_ID/status' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"status\": \"in_progress\"}'"

# Test 2.2: Update assignee
run_test "2.2 PATCH /interactions/$INTERACTION_ID/assignee" \
    "curl -s -X PATCH '$API_URL/interactions/$INTERACTION_ID/assignee' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"assignee_id\": 1}'"

# Test 2.3: Update next_action_at
# macOS compatible date (+3 days)
NEW_DATE=$(date -u -v+3d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '+3 days' +%Y-%m-%dT%H:%M:%SZ)
run_test "2.3 PATCH /interactions/$INTERACTION_ID/next-action" \
    "curl -s -X PATCH '$API_URL/interactions/$INTERACTION_ID/next-action' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"next_action_at\": \"'$NEW_DATE'\"}'"

# Test 2.4: Mark as done
run_test "2.4 PATCH /interactions/$INTERACTION_ID/status (done)" \
    "curl -s -X PATCH '$API_URL/interactions/$INTERACTION_ID/status' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{\"status\": \"done\"}'"

# ============================================
# 3. EMAIL MARKETING WEBHOOK
# ============================================

echo "=========================================="
echo "3. EMAIL MARKETING TESTS"
echo "=========================================="

# Test 3.1: Ingest email sent event
EXTERNAL_ID="test_$(date +%s)"
TIMESTAMP_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)

run_test "3.1 POST /marketing/email/ingest (sent)" \
    "curl -s -X POST '$API_URL/marketing/email/ingest' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{
            \"provider\": \"resend\",
            \"external_id\": \"'$EXTERNAL_ID'\",
            \"event\": \"sent\",
            \"occurred_at\": \"'$TIMESTAMP_NOW'\",
            \"person_id\": 1,
            \"subject\": \"Test Email\"
        }'"

# Test 3.2: Ingest email opened event (first open → +3 score)
sleep 1
TIMESTAMP_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
run_test "3.2 POST /marketing/email/ingest (opened, first)" \
    "curl -s -X POST '$API_URL/marketing/email/ingest' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{
            \"provider\": \"resend\",
            \"external_id\": \"'$EXTERNAL_ID'\",
            \"event\": \"opened\",
            \"occurred_at\": \"'$TIMESTAMP_NOW'\",
            \"person_id\": 1,
            \"subject\": \"Test Email\"
        }'"

# Test 3.3: Ingest email opened again (subsequent → +1 score)
sleep 1
TIMESTAMP_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
run_test "3.3 POST /marketing/email/ingest (opened, repeat)" \
    "curl -s -X POST '$API_URL/marketing/email/ingest' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{
            \"provider\": \"resend\",
            \"external_id\": \"'$EXTERNAL_ID'\",
            \"event\": \"opened\",
            \"occurred_at\": \"'$TIMESTAMP_NOW'\",
            \"person_id\": 1,
            \"subject\": \"Test Email\"
        }'"

# Test 3.4: Ingest email clicked event (first click → +8 score)
sleep 1
TIMESTAMP_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
run_test "3.4 POST /marketing/email/ingest (clicked, first)" \
    "curl -s -X POST '$API_URL/marketing/email/ingest' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{
            \"provider\": \"resend\",
            \"external_id\": \"'$EXTERNAL_ID'\",
            \"event\": \"clicked\",
            \"occurred_at\": \"'$TIMESTAMP_NOW'\",
            \"person_id\": 1,
            \"subject\": \"Test Email\"
        }'"

# Test 3.5: Get hot leads (should include person_id=1 with score >= 12)
run_test "3.5 GET /marketing/leads-hot" \
    "curl -s '$API_URL/marketing/leads-hot?threshold=10&limit=10' -H 'Authorization: Bearer $TOKEN'"

# ============================================
# 4. IDEMPOTENCE TESTS
# ============================================

echo "=========================================="
echo "4. IDEMPOTENCE TESTS"
echo "=========================================="

# Test 4.1: Re-ingest same opened event (should be idempotent, no duplicate)
TIMESTAMP_NOW=$(date -u +%Y-%m-%dT%H:%M:%SZ)
run_test "4.1 POST /marketing/email/ingest (idempotence check)" \
    "curl -s -X POST '$API_URL/marketing/email/ingest' \
        -H 'Authorization: Bearer $TOKEN' \
        -H 'Content-Type: application/json' \
        -d '{
            \"provider\": \"resend\",
            \"external_id\": \"'$EXTERNAL_ID'\",
            \"event\": \"opened\",
            \"occurred_at\": \"'$TIMESTAMP_NOW'\",
            \"person_id\": 1,
            \"subject\": \"Test Email\"
        }'"

# ============================================
# 5. LEAD SCORING VALIDATION
# ============================================

echo "=========================================="
echo "5. LEAD SCORING VALIDATION"
echo "=========================================="

# Expected score for person_id=1:
# - First open: +3
# - Second open: +1
# - First click: +8
# - Third open (idempotence): +1
# Total: 13 points

log_info "Expected score for person_id=1: 13 points (3+1+8+1)"
log_info "Verifying actual score..."

ACTUAL_SCORE=$(curl -s "$API_URL/marketing/leads-hot?threshold=0&limit=100" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.items[] | select(.person_id == 1) | .score')

if [ "$ACTUAL_SCORE" -eq 13 ]; then
    log_success "Lead score correct: $ACTUAL_SCORE points"
    ((TESTS_PASSED++))
else
    log_error "Lead score incorrect: expected 13, got $ACTUAL_SCORE"
    ((TESTS_FAILED++))
fi

# ============================================
# SUMMARY
# ============================================

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    log_success "All tests passed! ✨"
    exit 0
else
    log_error "Some tests failed"
    exit 1
fi
