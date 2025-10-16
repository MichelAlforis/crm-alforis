#!/bin/bash

# 🔐 CRM AUTH - Test Script
# Usage: ./test_auth.sh

set -e

BASE_URL="http://localhost:8000/api/v1"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=================================="
echo "  🔐 CRM AUTH - Test Script"
echo -e "==================================${NC}"
echo ""

# Vérifier que l'API est accessible
echo -e "${YELLOW}🔍 Vérification que l'API est accessible...${NC}"
if ! curl -s http://localhost:8000/health > /dev/null; then
  echo -e "${RED}❌ L'API n'est pas accessible sur http://localhost:8000${NC}"
  echo "   Lancez: docker-compose up -d"
  exit 1
fi
echo -e "${GREEN}✅ API est accessible${NC}"
echo ""

# 1. TEST LOGIN - Admin
echo -e "${BLUE}1️⃣  Test: Login Admin${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tpmfinance.com","password":"admin123"}')

ADMIN_TOKEN=$(echo $RESPONSE | jq -r '.access_token' 2>/dev/null || echo "null")

if [ "$ADMIN_TOKEN" == "null" ] || [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Admin login successful${NC}"
echo "   Token: ${ADMIN_TOKEN:0:50}..."
echo ""

# 2. TEST LOGIN - User
echo -e "${BLUE}2️⃣  Test: Login User${NC}"
RESPONSE=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@tpmfinance.com","password":"user123"}')

USER_TOKEN=$(echo $RESPONSE | jq -r '.access_token' 2>/dev/null || echo "null")

if [ "$USER_TOKEN" == "null" ] || [ -z "$USER_TOKEN" ]; then
  echo -e "${RED}❌ User login failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ User login successful${NC}"
echo "   Token: ${USER_TOKEN:0:50}..."
echo ""

# 3. TEST GET /me - Admin
echo -e "${BLUE}3️⃣  Test: GET /auth/me (Admin)${NC}"
ME_RESPONSE=$(curl -s -H "Authorization: Bearer $ADMIN_TOKEN" \
     $BASE_URL/auth/me)

ADMIN_EMAIL=$(echo $ME_RESPONSE | jq -r '.email' 2>/dev/null)
ADMIN_IS_ADMIN=$(echo $ME_RESPONSE | jq -r '.is_admin' 2>/dev/null)

if [ "$ADMIN_EMAIL" != "admin@tpmfinance.com" ]; then
  echo -e "${RED}❌ Failed to get user info${NC}"
  echo "Response: $ME_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Admin info retrieved${NC}"
echo "   Email: $ADMIN_EMAIL"
echo "   Is Admin: $ADMIN_IS_ADMIN"
echo ""

# 4. TEST GET /me - User
echo -e "${BLUE}4️⃣  Test: GET /auth/me (User)${NC}"
ME_RESPONSE=$(curl -s -H "Authorization: Bearer $USER_TOKEN" \
     $BASE_URL/auth/me)

USER_EMAIL=$(echo $ME_RESPONSE | jq -r '.email' 2>/dev/null)
USER_IS_ADMIN=$(echo $ME_RESPONSE | jq -r '.is_admin' 2>/dev/null)

echo -e "${GREEN}✅ User info retrieved${NC}"
echo "   Email: $USER_EMAIL"
echo "   Is Admin: $USER_IS_ADMIN"
echo ""

# 5. TEST Protected Route - Create Investor
echo -e "${BLUE}5️⃣  Test: Create Investor (Protected Route)${NC}"
INVESTOR_RESPONSE=$(curl -s -X POST $BASE_URL/investors \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Auth Test Co","email":"authtest@example.com"}')

INVESTOR_ID=$(echo $INVESTOR_RESPONSE | jq -r '.id' 2>/dev/null)

if [ "$INVESTOR_ID" == "null" ] || [ -z "$INVESTOR_ID" ]; then
  echo -e "${RED}❌ Failed to create investor${NC}"
  echo "Response: $INVESTOR_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Investor created successfully${NC}"
echo "   ID: $INVESTOR_ID"
echo ""

# 6. TEST Protected Route - List Investors
echo -e "${BLUE}6️⃣  Test: List Investors (Protected Route)${NC}"
LIST_RESPONSE=$(curl -s -H "Authorization: Bearer $USER_TOKEN" \
     $BASE_URL/investors)

TOTAL=$(echo $LIST_RESPONSE | jq -r '.total' 2>/dev/null)

echo -e "${GREEN}✅ Investors listed successfully${NC}"
echo "   Total count: $TOTAL"
echo ""

# 7. TEST Refresh Token
echo -e "${BLUE}7️⃣  Test: Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  $BASE_URL/auth/refresh)

NEW_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.access_token' 2>/dev/null)

if [ "$NEW_TOKEN" == "null" ] || [ -z "$NEW_TOKEN" ]; then
  echo -e "${RED}❌ Token refresh failed${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token refreshed successfully${NC}"
echo "   New token: ${NEW_TOKEN:0:50}..."
echo ""

# 8. TEST Error Cases
echo -e "${BLUE}8️⃣  Test: Error Cases${NC}"

# Invalid password
echo -n "  Testing invalid password... "
INVALID=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@tpmfinance.com","password":"wrong"}' | jq -r '.detail')

if [[ "$INVALID" == *"incorrect"* ]]; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Missing token
echo -n "  Testing missing token... "
MISSING=$(curl -s $BASE_URL/investors | jq -r '.detail')

if [[ "$MISSING" == *"authenticated"* ]] || [[ "$MISSING" == *"Not authenticated"* ]]; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

# Invalid token
echo -n "  Testing invalid token... "
INVALID_TOKEN=$(curl -s -H "Authorization: Bearer invalid_token" \
  $BASE_URL/investors | jq -r '.detail')

if [[ "$INVALID_TOKEN" == *"invalid"* ]] || [[ "$INVALID_TOKEN" == *"Invalid"* ]]; then
  echo -e "${GREEN}✅${NC}"
else
  echo -e "${RED}❌${NC}"
fi

echo ""
echo -e "${BLUE}=================================="
echo -e "${GREEN}✨ All tests passed!${NC}"
echo -e "${BLUE}==================================${NC}"
echo ""
echo "🔑 Tokens générés pour utilisation manuelle:"
echo ""
echo "Admin Token:"
echo "  export ADMIN_TOKEN=\"$ADMIN_TOKEN\""
echo ""
echo "User Token:"
echo "  export USER_TOKEN=\"$USER_TOKEN\""
echo ""
echo "Utilisation:"
echo "  curl -H \"Authorization: Bearer \$ADMIN_TOKEN\" http://localhost:8000/api/v1/investors"
echo ""