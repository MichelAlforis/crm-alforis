#!/bin/bash

# Script de lancement des tests CRM Backend

set -e

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}🧪 CRM Backend Tests${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Vérifier que pytest est installé
if ! command -v pytest &> /dev/null; then
    echo -e "${YELLOW}⚠️  pytest n'est pas installé${NC}"
    echo "Installation..."
    pip install -r requirements-test.txt
fi

# Parse arguments
TEST_PATH=""
COVERAGE=true
PARALLEL=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cov)
            COVERAGE=false
            shift
            ;;
        --parallel|-n)
            PARALLEL=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            TEST_PATH="$1"
            shift
            ;;
    esac
done

# Construire la commande pytest
CMD="pytest"

if [[ "$VERBOSE" = true ]]; then
    CMD="$CMD -v"
fi

if [[ "$COVERAGE" = true ]]; then
    CMD="$CMD --cov=. --cov-report=html --cov-report=term-missing"
fi

if [[ "$PARALLEL" = true ]]; then
    CMD="$CMD -n auto"
fi

if [[ -n "$TEST_PATH" ]]; then
    CMD="$CMD $TEST_PATH"
fi

# Lancer les tests
echo -e "${GREEN}🚀 Lancement des tests...${NC}"
echo -e "${BLUE}Commande: $CMD${NC}"
echo ""

$CMD

# Afficher le résumé
echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Tests terminés!${NC}"
echo -e "${GREEN}================================${NC}"

if [[ "$COVERAGE" = true ]]; then
    echo ""
    echo -e "${BLUE}📊 Rapport coverage:${NC} htmlcov/index.html"
    echo -e "${YELLOW}Ouvrir: open htmlcov/index.html${NC}"
fi
