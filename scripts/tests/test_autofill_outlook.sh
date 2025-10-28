#!/bin/bash
# Test de l'autofill V2 avec Outlook configuré

set -e

API_URL="http://localhost:8000/api/v1"

echo "🔐 Login..."
TOKEN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test+qa@alforis.com", "password": "TestQA2024!"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Échec login"
  exit 1
fi

echo "✅ Token obtenu"
echo ""

echo "🧪 Test 1: Autofill basique (email français)"
curl -s -X POST "$API_URL/integrations/ai/autofill/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "person",
    "draft": {
      "first_name": "Sophie",
      "last_name": "Martin",
      "personal_email": "sophie.martin@wanadoo.fr"
    }
  }' | python3 -m json.tool

echo ""
echo "🧪 Test 2: Autofill entreprise (TLD .com)"
curl -s -X POST "$API_URL/integrations/ai/autofill/v2" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "entity_type": "company",
    "draft": {
      "company_name": "Acme Corp",
      "company_domain": "acme-corp.com"
    }
  }' | python3 -m json.tool

echo ""
echo "✅ Tests terminés"
