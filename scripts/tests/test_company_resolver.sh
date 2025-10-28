#!/bin/bash
# Test CompanyResolver via API autofill V2
# Test avec email @mandarine-gestion.com

set -e

API_URL="http://localhost:8000/api/v1"

echo "🔐 Login..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test+qa@alforis.com",
    "password": "TestQA2024!"
  }' | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
  echo "❌ Échec login"
  exit 1
fi

echo "✅ Token obtenu"
echo ""

echo "🧪 Test 1: Autofill avec @mandarine-gestion.com (should resolve company)"
echo "Expected: company_name='Mandarine Gestion', company_website='https://www.mandarine-gestion.com/'"
echo ""

curl -s -X POST "$API_URL/integrations/ai/autofill/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "draft": {
      "first_name": "Sophie",
      "last_name": "Martin",
      "personal_email": "sophie.martin@mandarine-gestion.com"
    }
  }' | python3 -m json.tool

echo ""
echo ""
echo "🧪 Test 2: Autofill avec @gmail.com (should skip company)"
echo "Expected: NO company_name, NO company_website (personal domain)"
echo ""

curl -s -X POST "$API_URL/integrations/ai/autofill/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "draft": {
      "first_name": "Alice",
      "last_name": "Durand",
      "personal_email": "alice.durand@gmail.com"
    }
  }' | python3 -m json.tool

echo ""
echo "✅ Tests terminés"
