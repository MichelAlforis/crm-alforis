#!/bin/bash
# ===========================================
# HEALTH CHECK - INFRASTRUCTURE
# ===========================================
# Teste l'infrastructure Docker, containers, volumes, networks
# Usage: ./03_test_infrastructure.sh

set -e

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
echo -e "${BLUE}  HEALTH CHECK - INFRASTRUCTURE${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ===========================================
# TEST 1: Docker est installé et accessible
# ===========================================
echo -e "${BLUE}[1/10] Checking Docker installation...${NC}"
if command -v docker &> /dev/null; then
    docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
    print_test_result "Docker installed" "PASS" "Version ${docker_version}"
else
    print_test_result "Docker installed" "FAIL" "Docker not found"
    echo -e "${RED}Docker is required. Please install Docker first.${NC}"
    exit 1
fi

# ===========================================
# TEST 2: Docker Compose est installé
# ===========================================
echo -e "${BLUE}[2/10] Checking Docker Compose...${NC}"
if docker compose version &> /dev/null; then
    compose_version=$(docker compose version | awk '{print $4}')
    print_test_result "Docker Compose" "PASS" "Version ${compose_version}"
else
    print_test_result "Docker Compose" "FAIL" "Docker Compose not found"
fi

# ===========================================
# TEST 3: Containers sont en cours d'exécution
# ===========================================
echo -e "${BLUE}[3/10] Checking running containers...${NC}"
expected_containers=("postgres" "api" "frontend")
all_running=true

for container in "${expected_containers[@]}"; do
    container_id=$(docker ps --filter "name=${container}" --format "{{.Names}}" | head -n1)

    if [ ! -z "$container_id" ]; then
        status=$(docker inspect --format='{{.State.Status}}' "$container_id" 2>/dev/null || echo "unknown")

        if [ "$status" = "running" ]; then
            print_test_result "Container ${container}" "PASS" "Running"
        else
            print_test_result "Container ${container}" "FAIL" "Status: ${status}"
            all_running=false
        fi
    else
        print_test_result "Container ${container}" "FAIL" "Not found"
        all_running=false
    fi
done

# ===========================================
# TEST 4: Health checks Docker
# ===========================================
echo -e "${BLUE}[4/10] Checking container health...${NC}"
for container in "${expected_containers[@]}"; do
    container_id=$(docker ps --filter "name=${container}" --format "{{.Names}}" | head -n1)

    if [ ! -z "$container_id" ]; then
        health=$(docker inspect --format='{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "none")

        if [ "$health" = "healthy" ]; then
            print_test_result "Health ${container}" "PASS" "Healthy"
        elif [ "$health" = "none" ]; then
            print_test_result "Health ${container}" "WARN" "No healthcheck configured"
        else
            print_test_result "Health ${container}" "FAIL" "Status: ${health}"
        fi
    fi
done

# ===========================================
# TEST 5: Volumes Docker existent
# ===========================================
echo -e "${BLUE}[5/10] Checking Docker volumes...${NC}"
expected_volumes=("postgres-data" "api-uploads" "api-backups")

for volume in "${expected_volumes[@]}"; do
    if docker volume ls | grep -q "$volume"; then
        volume_size=$(docker volume inspect "$volume" --format '{{.Mountpoint}}' 2>/dev/null | xargs -I {} du -sh {} 2>/dev/null | awk '{print $1}' || echo "unknown")
        print_test_result "Volume ${volume}" "PASS" "Exists (${volume_size})"
    else
        print_test_result "Volume ${volume}" "WARN" "Not found"
    fi
done

# ===========================================
# TEST 6: Network Docker existe
# ===========================================
echo -e "${BLUE}[6/10] Checking Docker network...${NC}"
if docker network ls | grep -q "crm-network"; then
    connected_containers=$(docker network inspect crm-network --format '{{len .Containers}}' 2>/dev/null || echo "0")
    print_test_result "Docker network" "PASS" "crm-network exists (${connected_containers} containers)"
else
    print_test_result "Docker network" "FAIL" "crm-network not found"
fi

# ===========================================
# TEST 7: Variables d'environnement chargées
# ===========================================
echo -e "${BLUE}[7/10] Checking environment variables...${NC}"
api_container=$(docker ps --filter "name=api" --format "{{.Names}}" | head -n1)

if [ ! -z "$api_container" ]; then
    critical_vars=("DATABASE_URL" "SECRET_KEY" "ALLOWED_ORIGINS")
    vars_ok=true

    for var in "${critical_vars[@]}"; do
        value=$(docker exec "$api_container" printenv "$var" 2>/dev/null || echo "")

        if [ ! -z "$value" ]; then
            # Masquer les valeurs sensibles
            masked_value="***"
            if [ "$var" = "ALLOWED_ORIGINS" ]; then
                masked_value="$value"
            fi
            print_test_result "Env var ${var}" "PASS" "Set"
        else
            print_test_result "Env var ${var}" "FAIL" "Not set"
            vars_ok=false
        fi
    done
else
    print_test_result "Environment variables" "WARN" "API container not found"
fi

# ===========================================
# TEST 8: Utilisation des ressources
# ===========================================
echo -e "${BLUE}[8/10] Checking resource usage...${NC}"
if [ ! -z "$api_container" ]; then
    # CPU et mémoire
    stats=$(docker stats --no-stream --format "{{.CPUPerc}}|{{.MemUsage}}" "$api_container" 2>/dev/null || echo "0%|0B / 0B")
    cpu=$(echo "$stats" | cut -d'|' -f1)
    mem=$(echo "$stats" | cut -d'|' -f2)

    print_test_result "Resource usage API" "PASS" "CPU: ${cpu}, MEM: ${mem}"
fi

# ===========================================
# TEST 9: Ports exposés
# ===========================================
echo -e "${BLUE}[9/10] Checking exposed ports...${NC}"
expected_ports=("8000" "3010" "5433")

for port in "${expected_ports[@]}"; do
    if netstat -an 2>/dev/null | grep -q ":${port}" || ss -tuln 2>/dev/null | grep -q ":${port}"; then
        print_test_result "Port ${port}" "PASS" "Listening"
    else
        print_test_result "Port ${port}" "WARN" "Not listening"
    fi
done

# ===========================================
# TEST 10: Espace disque
# ===========================================
echo -e "${BLUE}[10/10] Checking disk space...${NC}"
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ "$disk_usage" -lt 80 ]; then
    print_test_result "Disk space" "PASS" "${disk_usage}% used"
elif [ "$disk_usage" -lt 90 ]; then
    print_test_result "Disk space" "WARN" "${disk_usage}% used (getting full)"
else
    print_test_result "Disk space" "FAIL" "${disk_usage}% used (critically full)"
fi

# ===========================================
# INFORMATIONS SUPPLÉMENTAIRES
# ===========================================
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  INFORMATIONS SYSTÈME${NC}"
echo -e "${BLUE}============================================${NC}"

# Uptime des containers
echo -e "\n${YELLOW}Container Uptime:${NC}"
for container in "${expected_containers[@]}"; do
    container_id=$(docker ps --filter "name=${container}" --format "{{.Names}}" | head -n1)
    if [ ! -z "$container_id" ]; then
        uptime=$(docker inspect --format='{{.State.StartedAt}}' "$container_id" 2>/dev/null | xargs -I {} date -d {} +%s 2>/dev/null || echo "0")
        if [ "$uptime" != "0" ]; then
            current=$(date +%s)
            diff=$((current - uptime))
            hours=$((diff / 3600))
            minutes=$(((diff % 3600) / 60))
            echo "  - ${container}: ${hours}h ${minutes}m"
        fi
    fi
done

# Logs récents avec erreurs
echo -e "\n${YELLOW}Recent Errors (last 10 lines):${NC}"
for container in "${expected_containers[@]}"; do
    container_id=$(docker ps --filter "name=${container}" --format "{{.Names}}" | head -n1)
    if [ ! -z "$container_id" ]; then
        error_lines=$(docker logs --tail 100 "$container_id" 2>&1 | grep -i "error\|exception\|failed" | tail -n5)
        if [ ! -z "$error_lines" ]; then
            echo -e "  ${RED}${container}:${NC}"
            echo "$error_lines" | sed 's/^/    /'
        fi
    fi
done

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
    echo -e "\n${GREEN}✓ Tous les tests infrastructure sont passés!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Certains tests ont échoué. Vérifiez l'infrastructure.${NC}"
    exit 1
fi
