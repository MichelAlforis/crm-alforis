#!/bin/bash
# ===========================================
# HEALTH CHECK - BACKEND API
# ===========================================
# Teste tous les endpoints backend et la connexion DB/Redis
# Usage: ./01_test_backend_api.sh [API_URL]

set -e

# Configuration
API_URL="${1:-http://localhost:8000}"
API_BASE="${API_URL}/api/v1"
TIMEOUT=10
RESPONSE_TIME_LIMIT=2000  # millisecondes

# Couleurs pour output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Fonction utilitaire pour mesurer le temps de réponse
measure_time() {
    local url=$1
    # Compatible macOS et Linux
    if [[ "$OSTYPE" == "darwin"* ]]; then
        local start=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    else
        local start=$(date +%s%3N)
    fi

    local response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo -e "\n000")

    if [[ "$OSTYPE" == "darwin"* ]]; then
        local end=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    else
        local end=$(date +%s%3N)
    fi

    local duration=$((end - start))
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')  # Supprimer la dernière ligne (compatible macOS)

    echo "${http_code}|${duration}|${body}"
}

# Fonction pour afficher le résultat d'un test
print_test_result() {
    local test_name=$1
    local status=$2
    local message=$3

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✓${NC} ${test_name}: ${message}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} ${test_name}: ${message}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}✗${NC} ${test_name}: ${message}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  HEALTH CHECK - BACKEND API${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "API URL: ${API_BASE}"
echo -e "Timeout: ${TIMEOUT}s"
echo -e "Response time limit: ${RESPONSE_TIME_LIMIT}ms"
echo ""

# ===========================================
# TEST 1: /api/v1/health
# ===========================================
echo -e "${BLUE}[1/6] Testing /health endpoint...${NC}"
result=$(measure_time "${API_BASE}/health")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    status=$(echo "$body" | grep -o '"status"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)

    if [ "$status" = "healthy" ] || [ "$status" = "ok" ]; then
        if [ "$response_time" -lt "$RESPONSE_TIME_LIMIT" ]; then
            print_test_result "Health endpoint" "PASS" "Status: ${status}, Time: ${response_time}ms"
        else
            print_test_result "Health endpoint" "WARN" "Status: ${status}, Time: ${response_time}ms (slow)"
        fi
    else
        print_test_result "Health endpoint" "FAIL" "Unexpected status: ${status}"
    fi
else
    print_test_result "Health endpoint" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# ===========================================
# TEST 2: /api/v1/ready (readiness check)
# ===========================================
echo -e "${BLUE}[2/6] Testing /ready endpoint...${NC}"
result=$(measure_time "${API_BASE}/ready")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    db_status=$(echo "$body" | grep -o '"db"[[:space:]]*:[[:space:]]*[a-z]*' | awk '{print $NF}')
    redis_status=$(echo "$body" | grep -o '"redis"[[:space:]]*:[[:space:]]*[a-z]*' | awk '{print $NF}')

    if [ "$db_status" = "true" ]; then
        print_test_result "Database connection" "PASS" "PostgreSQL connected (${response_time}ms)"
    else
        print_test_result "Database connection" "FAIL" "PostgreSQL not connected"
    fi

    # Redis peut être optionnel selon ENABLE_REDIS_EVENTS
    if [ ! -z "$redis_status" ]; then
        if [ "$redis_status" = "true" ]; then
            print_test_result "Redis connection" "PASS" "Redis connected"
        else
            print_test_result "Redis connection" "WARN" "Redis not connected (may be disabled)"
        fi
    fi
else
    print_test_result "Readiness endpoint" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# ===========================================
# TEST 3: Vérifier temps de réponse global
# ===========================================
echo -e "${BLUE}[3/6] Testing overall response time...${NC}"
if [ "$response_time" -lt 500 ]; then
    print_test_result "Response time" "PASS" "${response_time}ms (excellent)"
elif [ "$response_time" -lt "$RESPONSE_TIME_LIMIT" ]; then
    print_test_result "Response time" "PASS" "${response_time}ms (good)"
else
    print_test_result "Response time" "WARN" "${response_time}ms (slow, should be < ${RESPONSE_TIME_LIMIT}ms)"
fi

# ===========================================
# TEST 4: Test CORS headers
# ===========================================
echo -e "${BLUE}[4/6] Testing CORS headers...${NC}"
cors_headers=$(curl -s -I -X OPTIONS "${API_BASE}/health" 2>/dev/null | grep -i "access-control")
if [ ! -z "$cors_headers" ]; then
    print_test_result "CORS headers" "PASS" "CORS configured"
else
    print_test_result "CORS headers" "WARN" "No CORS headers found"
fi

# ===========================================
# TEST 5: Test connexion API (sans auth)
# ===========================================
echo -e "${BLUE}[5/6] Testing API connectivity...${NC}"
result=$(measure_time "${API_BASE}/")
http_code=$(echo "$result" | cut -d'|' -f1)

if [ "$http_code" = "200" ] || [ "$http_code" = "404" ]; then
    print_test_result "API connectivity" "PASS" "API is reachable (HTTP ${http_code})"
else
    print_test_result "API connectivity" "FAIL" "API unreachable (HTTP ${http_code})"
fi

# ===========================================
# TEST 6: Vérifier les logs backend (si accessible)
# ===========================================
echo -e "${BLUE}[6/6] Checking backend logs...${NC}"
if command -v docker &> /dev/null; then
    container_name=$(docker ps --filter "name=api" --format "{{.Names}}" | head -n1)

    if [ ! -z "$container_name" ]; then
        # Vérifier les erreurs dans les dernières lignes
        error_count=$(docker logs --tail 50 "$container_name" 2>&1 | grep -i "error\|exception\|failed" | wc -l)

        if [ "$error_count" -eq 0 ]; then
            print_test_result "Backend logs" "PASS" "No errors in recent logs"
        else
            print_test_result "Backend logs" "WARN" "Found ${error_count} error(s) in recent logs"
            echo -e "${YELLOW}   Run: docker logs ${container_name} --tail 50${NC}"
        fi
    else
        print_test_result "Backend logs" "WARN" "Docker container not found (running outside Docker?)"
    fi
else
    print_test_result "Backend logs" "WARN" "Docker not available, skipping log check"
fi

# ===========================================
# RÉSUMÉ
# ===========================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  RÉSUMÉ${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Total tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ Tous les tests backend sont passés!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Certains tests ont échoué. Vérifiez la configuration.${NC}"
    exit 1
fi
