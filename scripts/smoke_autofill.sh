#!/bin/bash
# scripts/smoke_autofill.sh
# Smoke test pour l'autofill V2

set -e

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧪 Smoke Test - Autofill V2${NC}"
echo "================================"

# Config
API_BASE="${API_BASE:-http://localhost:8000}"
TOKEN="${AUTH_TOKEN:-}"

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ AUTH_TOKEN non défini${NC}"
  echo "Usage: AUTH_TOKEN='Bearer <jwt>' $0"
  exit 1
fi

# Helper
call_api() {
  local method=$1
  local endpoint=$2
  local data=$3

  echo -e "\n${YELLOW}→ $method $endpoint${NC}"

  response=$(curl -s -w "\n%{http_code}" \
    -X "$method" \
    "$API_BASE$endpoint" \
    -H "Content-Type: application/json" \
    -H "Authorization: $TOKEN" \
    ${data:+-d "$data"})

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ $http_code${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    return 0
  else
    echo -e "${RED}✗ $http_code${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
    return 1
  fi
}

# ============================================
# Test 1: Autofill basique (Person)
# ============================================
echo -e "\n${YELLOW}Test 1: Autofill Person (Alice Durand @ acme.com)${NC}"

PAYLOAD_PERSON='{
  "entity_type": "person",
  "draft": {
    "first_name": "Alice",
    "last_name": "Durand",
    "personal_email": "alice.durand@acme.com"
  },
  "context": {
    "budget_mode": "normal",
    "outlook_enabled": true
  }
}'

if call_api POST "/api/v1/integrations/ai/autofill/v2" "$PAYLOAD_PERSON"; then
  echo -e "${GREEN}✓ Test 1 réussi${NC}"
else
  echo -e "${RED}✗ Test 1 échoué${NC}"
  exit 1
fi

# ============================================
# Test 2: Autofill Organisation
# ============================================
echo -e "\n${YELLOW}Test 2: Autofill Organisation (ACME Corp)${NC}"

PAYLOAD_ORG='{
  "entity_type": "organisation",
  "draft": {
    "nom": "ACME Corporation",
    "email": "contact@acme.fr"
  },
  "context": {
    "budget_mode": "low"
  }
}'

if call_api POST "/api/v1/integrations/ai/autofill/v2" "$PAYLOAD_ORG"; then
  echo -e "${GREEN}✓ Test 2 réussi${NC}"
else
  echo -e "${RED}✗ Test 2 échoué${NC}"
  exit 1
fi

# ============================================
# Test 3: Mode urgence (rules only)
# ============================================
echo -e "\n${YELLOW}Test 3: Mode urgence (rules only)${NC}"

PAYLOAD_EMERGENCY='{
  "entity_type": "person",
  "draft": {
    "first_name": "Bob",
    "last_name": "Martin",
    "personal_email": "bob@example.de"
  },
  "context": {
    "budget_mode": "emergency"
  }
}'

if call_api POST "/api/v1/integrations/ai/autofill/v2" "$PAYLOAD_EMERGENCY"; then
  echo -e "${GREEN}✓ Test 3 réussi${NC}"
else
  echo -e "${RED}✗ Test 3 échoué${NC}"
  exit 1
fi

# ============================================
# Résumé
# ============================================
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Tous les tests ont réussi !${NC}"
echo -e "${GREEN}================================${NC}"

echo -e "\n${YELLOW}📊 Prochaines étapes:${NC}"
echo "1. Vérifier les logs autofill_logs: SELECT * FROM autofill_logs ORDER BY created_at DESC LIMIT 10;"
echo "2. Tester l'UI: http://localhost:3000/dashboard/people/new"
echo "3. Activer debug: NEXT_PUBLIC_DEBUG_AUTOFILL=1 dans .env.local"
