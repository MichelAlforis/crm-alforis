#!/bin/bash
# ===========================================
# MASTER HEALTH CHECK - CRM ALFORIS
# ===========================================
# Script principal qui exécute tous les tests de santé
# Usage: ./run_health_check.sh [production|staging|local]

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration par défaut
ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration des URLs selon l'environnement
case "$ENVIRONMENT" in
    production)
        API_URL="https://crm.alforis.fr/api/v1"
        FRONTEND_URL="https://crm.alforis.fr"
        ;;
    staging)
        API_URL="https://staging-crm.alforis.fr/api/v1"
        FRONTEND_URL="https://staging-crm.alforis.fr"
        ;;
    local)
        API_URL="http://localhost:8000/api/v1"
        FRONTEND_URL="http://localhost:3010"
        ;;
    *)
        echo -e "${RED}Environment invalide: ${ENVIRONMENT}${NC}"
        echo -e "Usage: $0 [production|staging|local]"
        exit 1
        ;;
esac

# Fonction pour afficher un en-tête
print_header() {
    local title=$1
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}  ${BOLD}${title}${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Fonction pour exécuter un script et capturer le résultat
run_test_script() {
    local script=$1
    local description=$2
    shift 2
    local args=("$@")

    echo -e "${BLUE}▶ ${description}...${NC}"

    if [ -f "$script" ]; then
        if bash "$script" "${args[@]}" 2>&1; then
            echo -e "${GREEN}✓ ${description} - OK${NC}"
            return 0
        else
            echo -e "${RED}✗ ${description} - ÉCHEC${NC}"
            return 1
        fi
    else
        echo -e "${RED}✗ Script not found: $script${NC}"
        return 1
    fi
}

# Afficher la bannière
clear
echo -e "${CYAN}"
cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║       🏥  HEALTH CHECK - CRM ALFORIS FINANCE  🏥         ║
║                                                           ║
║        Infrastructure & Santé du Système                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "${BOLD}Environnement:${NC} ${ENVIRONMENT}"
echo -e "${BOLD}API URL:${NC} ${API_URL}"
echo -e "${BOLD}Frontend URL:${NC} ${FRONTEND_URL}"
echo -e "${BOLD}Date:${NC} $(date '+%Y-%m-%d %H:%M:%S')"

# Variables pour le rapport
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# ===========================================
# CHAPITRE 1: INFRASTRUCTURE
# ===========================================
print_header "CHAPITRE 1: Infrastructure & Docker"

if run_test_script "${SCRIPT_DIR}/03_test_infrastructure.sh" "Infrastructure Docker"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ===========================================
# CHAPITRE 2: BACKEND API
# ===========================================
print_header "CHAPITRE 2: Backend API"

# Attendre que l'API soit prête (max 30s)
echo -e "${YELLOW}⏳ Attente de la disponibilité de l'API...${NC}"
for i in {1..30}; do
    if curl -s --max-time 2 "${API_URL}/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API disponible${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ API non disponible après 30s${NC}"
    fi
    sleep 1
done

if run_test_script "${SCRIPT_DIR}/01_test_backend_api.sh" "Backend API Tests" "${API_URL%/api/v1}"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ===========================================
# CHAPITRE 3: FRONTEND
# ===========================================
print_header "CHAPITRE 3: Frontend Next.js"

# Attendre que le frontend soit prêt (max 30s)
echo -e "${YELLOW}⏳ Attente de la disponibilité du Frontend...${NC}"
for i in {1..30}; do
    if curl -s --max-time 2 "${FRONTEND_URL}" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend disponible${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Frontend non disponible après 30s${NC}"
    fi
    sleep 1
done

if run_test_script "${SCRIPT_DIR}/02_test_frontend.sh" "Frontend Tests" "${FRONTEND_URL}"; then
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# ===========================================
# RAPPORT FINAL
# ===========================================
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

print_header "RAPPORT FINAL"

echo -e "${BOLD}Durée totale:${NC} ${DURATION}s"
echo -e "${BOLD}Tests exécutés:${NC} ${TOTAL_TESTS}"
echo -e "${GREEN}${BOLD}Tests réussis:${NC} ${PASSED_TESTS}"
echo -e "${RED}${BOLD}Tests échoués:${NC} ${FAILED_TESTS}"

# Calcul du pourcentage de succès
if [ $TOTAL_TESTS -gt 0 ]; then
    SUCCESS_RATE=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
else
    SUCCESS_RATE=0
fi

echo ""
echo -e "${BOLD}Taux de réussite:${NC} ${SUCCESS_RATE}%"

# Barre de progression
echo -n "["
for i in $(seq 1 50); do
    if [ $((i * 2)) -le $SUCCESS_RATE ]; then
        echo -n "${GREEN}█${NC}"
    else
        echo -n " "
    fi
done
echo "]"

echo ""

# Message final
if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}${BOLD}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    ✓  TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS!  ✓        ║
║                                                           ║
║      Le système CRM est en bonne santé! 🎉               ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}"
    cat << "EOF"
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║    ✗  CERTAINS TESTS ONT ÉCHOUÉ  ✗                      ║
║                                                           ║
║      Vérifiez les détails ci-dessus pour corriger        ║
║      les problèmes identifiés.                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    echo -e "\n${YELLOW}Actions recommandées:${NC}"
    echo -e "  1. Vérifiez les logs Docker: ${CYAN}docker compose logs${NC}"
    echo -e "  2. Vérifiez les variables d'environnement: ${CYAN}docker compose config${NC}"
    echo -e "  3. Redémarrez les services si nécessaire: ${CYAN}docker compose restart${NC}"
    echo ""

    exit 1
fi
