#!/bin/bash

###############################################################################
# Bootstrap Test User - Créer un utilisateur de test avec JWT token
#
# Usage:
#   ./scripts/bootstrap_test_user.sh
#
# Ce script:
# 1. Génère un hash bcrypt pour le mot de passe test
# 2. Crée/MAJ le rôle admin si nécessaire
# 3. Upsert l'utilisateur test
# 4. Obtient et affiche le JWT token
#
# Résultat:
#   export TOKEN='<jwt_token>'
###############################################################################

set -e

# Configuration
TEST_EMAIL="${TEST_EMAIL:-test+qa@alforis.com}"
TEST_PASSWORD="${TEST_PASSWORD:-Test123!crm}"
API_URL="${API_URL:-http://localhost:8000/api/v1}"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

echo ""
echo "=========================================="
echo "  Bootstrap Test User for Interactions V2"
echo "=========================================="
echo ""

# Vérifier que Docker est opérationnel
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running"
    exit 1
fi

# Vérifier que l'API est accessible
log_info "Checking API health..."
if ! curl -sf "$API_URL/health" > /dev/null 2>&1; then
    log_error "API is not responding at $API_URL"
    log_info "Make sure docker-compose is running: docker-compose up -d"
    exit 1
fi
log_success "API is healthy"

# 1. Générer le hash pbkdf2_sha256 (matching core/security.py)
log_info "Generating pbkdf2_sha256 hash for password: $TEST_PASSWORD"

# Utiliser passlib avec pbkdf2_sha256 (même config que core/security.py)
HASH=$(docker-compose exec -T api python3 -c "
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')
print(pwd_context.hash('$TEST_PASSWORD'))
" 2>/dev/null | tr -d '\r')

if [ -z "$HASH" ]; then
    log_error "Failed to generate password hash"
    exit 1
fi

log_success "Password hash generated"

# 2. Créer le rôle admin si nécessaire
log_info "Ensuring 'admin' role exists..."

docker-compose exec -T postgres psql -U crm_user -d crm_db -v ON_ERROR_STOP=1 > /dev/null 2>&1 <<SQL
DO \$\$
DECLARE rid INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name='admin') THEN
    INSERT INTO roles(name, display_name, level, is_system, created_at)
    VALUES('admin', 'Administrator', 3, true, NOW());
  END IF;
END\$\$;
SQL

if [ $? -eq 0 ]; then
    log_success "Role 'admin' exists"
else
    log_error "Failed to create/verify admin role"
    exit 1
fi

# 3. Upsert l'utilisateur test
log_info "Creating/updating test user: $TEST_EMAIL"

docker-compose exec -T postgres psql -U crm_user -d crm_db -v ON_ERROR_STOP=1 > /dev/null 2>&1 <<SQL
WITH rid AS (SELECT id FROM roles WHERE name='admin' LIMIT 1)
INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser, role_id, created_at)
SELECT
    '$TEST_EMAIL',
    '$HASH',
    'Test QA User',
    true,
    true,
    rid.id,
    NOW()
FROM rid
ON CONFLICT (email) DO UPDATE SET
    hashed_password = EXCLUDED.hashed_password,
    is_active = true,
    is_superuser = true,
    role_id = EXCLUDED.role_id,
    updated_at = NOW();
SQL

if [ $? -eq 0 ]; then
    log_success "Test user created/updated: $TEST_EMAIL"
else
    log_error "Failed to create test user"
    exit 1
fi

# 4. Obtenir le JWT token
log_info "Obtaining JWT token..."

RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")

# Extraire le token (support pour différents formats de réponse)
TOKEN=$(echo "$RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data.get('access_token', ''))
except:
    sys.exit(1)
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
    log_error "Failed to obtain JWT token"
    log_info "API Response: $RESPONSE"
    exit 1
fi

log_success "JWT token obtained"

# 5. Tester le token
log_info "Testing token with /interactions/inbox..."

TEST_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_URL/interactions/inbox")
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_URL/interactions/inbox")

if [ "$HTTP_CODE" = "200" ]; then
    log_success "Token is valid (HTTP 200)"
else
    log_warning "Unexpected HTTP code: $HTTP_CODE (expected 200)"
fi

echo ""
echo "=========================================="
echo "  🎉 Success!"
echo "=========================================="
echo ""
echo "Test user credentials:"
echo "  Email:    $TEST_EMAIL"
echo "  Password: $TEST_PASSWORD"
echo ""
echo "To use this token in your current shell, run:"
echo ""
echo -e "${GREEN}export TOKEN='$TOKEN'${NC}"
echo ""
echo "To run automated tests:"
echo ""
echo -e "${BLUE}./scripts/test_interactions_v2.sh${NC}"
echo ""

# Optionnel: Export automatique si source
if [ "$1" = "--export" ]; then
    export TOKEN="$TOKEN"
    log_success "TOKEN exported to current environment"
fi
