#!/bin/bash
# ===========================================
# HEALTH CHECK - FRONTEND
# ===========================================
# Teste le frontend Next.js, les assets et la console
# Usage: ./02_test_frontend.sh [FRONTEND_URL]

set -e

# Configuration
FRONTEND_URL="${1:-http://localhost:3010}"
TIMEOUT=10

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Fonction pour mesurer le temps de réponse
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

# Fonction pour afficher le résultat
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
echo -e "${BLUE}  HEALTH CHECK - FRONTEND${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "Frontend URL: ${FRONTEND_URL}"
echo -e "Timeout: ${TIMEOUT}s"
echo ""

# ===========================================
# TEST 1: Page principale charge correctement
# ===========================================
echo -e "${BLUE}[1/7] Testing main page load...${NC}"
result=$(measure_time "${FRONTEND_URL}")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    if [ "$response_time" -lt 3000 ]; then
        print_test_result "Main page" "PASS" "Loaded in ${response_time}ms"
    else
        print_test_result "Main page" "WARN" "Loaded in ${response_time}ms (slow)"
    fi
else
    print_test_result "Main page" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# ===========================================
# TEST 2: Vérifier le HTML contient Next.js
# ===========================================
echo -e "${BLUE}[2/7] Checking Next.js markers...${NC}"
if echo "$body" | grep -q "next" || echo "$body" | grep -q "_next"; then
    print_test_result "Next.js detection" "PASS" "Next.js app detected"
else
    print_test_result "Next.js detection" "WARN" "Next.js markers not found in HTML"
fi

# ===========================================
# TEST 3: Vérifier que les assets Next.js sont accessibles
# ===========================================
echo -e "${BLUE}[3/7] Testing Next.js assets...${NC}"
# Chercher les scripts _next dans le HTML
next_scripts=$(echo "$body" | grep -o '/_next/[^"]*\.js' | head -n1)

if [ ! -z "$next_scripts" ]; then
    asset_url="${FRONTEND_URL}${next_scripts}"
    result=$(measure_time "$asset_url")
    http_code=$(echo "$result" | cut -d'|' -f1)

    if [ "$http_code" = "200" ]; then
        print_test_result "Next.js assets" "PASS" "Assets are accessible"
    else
        print_test_result "Next.js assets" "FAIL" "Assets return HTTP ${http_code}"
    fi
else
    print_test_result "Next.js assets" "WARN" "No Next.js scripts found in HTML"
fi

# ===========================================
# TEST 4: Vérifier le favicon
# ===========================================
echo -e "${BLUE}[4/7] Testing favicon...${NC}"
result=$(measure_time "${FRONTEND_URL}/favicon.ico")
http_code=$(echo "$result" | cut -d'|' -f1)

if [ "$http_code" = "200" ]; then
    print_test_result "Favicon" "PASS" "Favicon accessible"
elif [ "$http_code" = "304" ]; then
    print_test_result "Favicon" "PASS" "Favicon cached"
else
    print_test_result "Favicon" "WARN" "Favicon HTTP ${http_code}"
fi

# ===========================================
# TEST 5: Vérifier manifest.json (PWA)
# ===========================================
echo -e "${BLUE}[5/7] Testing PWA manifest...${NC}"
result=$(measure_time "${FRONTEND_URL}/manifest.json")
http_code=$(echo "$result" | cut -d'|' -f1)

if [ "$http_code" = "200" ]; then
    print_test_result "PWA manifest" "PASS" "PWA configured"
else
    print_test_result "PWA manifest" "WARN" "No PWA manifest (HTTP ${http_code})"
fi

# ===========================================
# TEST 6: Vérifier les headers de sécurité
# ===========================================
echo -e "${BLUE}[6/7] Checking security headers...${NC}"
headers=$(curl -s -I "${FRONTEND_URL}" 2>/dev/null)

security_score=0
total_headers=4

if echo "$headers" | grep -qi "x-frame-options"; then
    security_score=$((security_score + 1))
fi

if echo "$headers" | grep -qi "x-content-type-options"; then
    security_score=$((security_score + 1))
fi

if echo "$headers" | grep -qi "strict-transport-security"; then
    security_score=$((security_score + 1))
fi

if echo "$headers" | grep -qi "content-security-policy"; then
    security_score=$((security_score + 1))
fi

if [ $security_score -ge 3 ]; then
    print_test_result "Security headers" "PASS" "${security_score}/${total_headers} headers present"
elif [ $security_score -ge 1 ]; then
    print_test_result "Security headers" "WARN" "${security_score}/${total_headers} headers present"
else
    print_test_result "Security headers" "WARN" "No security headers found"
fi

# ===========================================
# TEST 7: Vérifier les logs frontend (si accessible)
# ===========================================
echo -e "${BLUE}[7/7] Checking frontend logs...${NC}"
if command -v docker &> /dev/null; then
    container_name=$(docker ps --filter "name=frontend" --format "{{.Names}}" | head -n1)

    if [ ! -z "$container_name" ]; then
        # Vérifier les erreurs dans les dernières lignes
        error_count=$(docker logs --tail 50 "$container_name" 2>&1 | grep -i "error\|exception\|failed" | grep -v "Failed to load resource" | wc -l)

        if [ "$error_count" -eq 0 ]; then
            print_test_result "Frontend logs" "PASS" "No errors in recent logs"
        else
            print_test_result "Frontend logs" "WARN" "Found ${error_count} error(s) in recent logs"
            echo -e "${YELLOW}   Run: docker logs ${container_name} --tail 50${NC}"
        fi
    else
        print_test_result "Frontend logs" "WARN" "Docker container not found"
    fi
else
    print_test_result "Frontend logs" "WARN" "Docker not available, skipping log check"
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
    echo -e "\n${GREEN}✓ Tous les tests frontend sont passés!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Certains tests ont échoué. Vérifiez la configuration.${NC}"
    exit 1
fi
