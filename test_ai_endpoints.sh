#!/bin/bash
# Test des 3 endpoints AI Statistics
# Usage: ./test_ai_endpoints.sh

set -e

API_BASE="http://localhost:8000/api/v1"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Using existing test token...${NC}"
# Token valide de test (non expiré si généré récemment)
# Pour un vrai test, utilisez: curl -X POST "$API_BASE/auth/login" avec vos credentials
TOKEN=""

# Essayer de se connecter avec le compte admin@alforis.com
for CREDS in '{"email":"admin@alforis.com","password":"AdminAlforis2024!"}' '{"email":"test+qa@alforis.com","password":"TestQA2024!"}'; do
  LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "$CREDS" 2>/dev/null || echo '{}')

  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")

  if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✅ Logged in successfully${NC}"
    break
  fi
done

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Failed to get token. Response:${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtained${NC}"
echo ""

# Test 1: /stats
echo -e "${BLUE}📊 Test 1: GET /ai/autofill/stats?days=14${NC}"
STATS_RESPONSE=$(curl -s "$API_BASE/ai/autofill/stats?days=14" \
  -H "Authorization: Bearer $TOKEN")

if echo "$STATS_RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Valid JSON response${NC}"
  echo "$STATS_RESPONSE" | python3 -m json.tool | head -40
else
  echo -e "${RED}❌ Invalid response:${NC}"
  echo "$STATS_RESPONSE"
fi

echo ""

# Test 2: /timeline
echo -e "${BLUE}📈 Test 2: GET /ai/autofill/stats/timeline?days=7${NC}"
TIMELINE_RESPONSE=$(curl -s "$API_BASE/ai/autofill/stats/timeline?days=7" \
  -H "Authorization: Bearer $TOKEN")

if echo "$TIMELINE_RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Valid JSON response${NC}"
  echo "$TIMELINE_RESPONSE" | python3 -m json.tool | head -30
else
  echo -e "${RED}❌ Invalid response:${NC}"
  echo "$TIMELINE_RESPONSE"
fi

echo ""

# Test 3: /leaderboard
echo -e "${BLUE}🏆 Test 3: GET /ai/autofill/stats/leaderboard${NC}"
LEADERBOARD_RESPONSE=$(curl -s "$API_BASE/ai/autofill/stats/leaderboard" \
  -H "Authorization: Bearer $TOKEN")

if echo "$LEADERBOARD_RESPONSE" | python3 -m json.tool > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Valid JSON response${NC}"
  echo "$LEADERBOARD_RESPONSE" | python3 -m json.tool | head -30
else
  echo -e "${RED}❌ Invalid response:${NC}"
  echo "$LEADERBOARD_RESPONSE"
fi

echo ""
echo -e "${GREEN}✅ All tests completed${NC}"
