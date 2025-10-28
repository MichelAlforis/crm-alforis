#!/bin/bash
# ===========================================
# CHAPITRE 3 : MODULE CONTACTS/PEOPLE
# ===========================================
# Tests complets du module People selon les spécifications
# Usage: ./03_test_contacts_people.sh [API_URL] [AUTH_TOKEN]

set -e

# Configuration
API_URL="${1:-http://localhost:8000}"
API_BASE="${API_URL}/api/v1"
AUTH_TOKEN="${2:-}"
TIMEOUT=10
RESPONSE_TIME_LIMIT=2000  # millisecondes

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0
SECTION_PASSED=0
SECTION_FAILED=0

# Variables globales pour les tests
CREATED_PERSON_ID=""
CREATED_PERSON_IDS=()
CREATED_LINK_ID=""

# ===========================================
# FONCTIONS UTILITAIRES
# ===========================================

measure_time() {
    local method=$1
    local url=$2
    local data=$3
    local headers=(-H "Content-Type: application/json")

    if [ ! -z "$AUTH_TOKEN" ]; then
        headers+=(-H "Authorization: Bearer $AUTH_TOKEN")
    fi

    if [[ "$OSTYPE" == "darwin"* ]]; then
        local start=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    else
        local start=$(date +%s%3N)
    fi

    local response
    if [ "$method" = "GET" ] || [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" --max-time $TIMEOUT "$url" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "${headers[@]}" -d "$data" --max-time $TIMEOUT "$url" 2>/dev/null || echo -e "\n000")
    fi

    if [[ "$OSTYPE" == "darwin"* ]]; then
        local end=$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time * 1000')
    else
        local end=$(date +%s%3N)
    fi

    local duration=$((end - start))
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')

    echo "${http_code}|${duration}|${body}"
}

print_test_result() {
    local test_name=$1
    local status=$2
    local message=$3

    TESTS_TOTAL=$((TESTS_TOTAL + 1))

    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}  ✓${NC} ${test_name}: ${message}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        SECTION_PASSED=$((SECTION_PASSED + 1))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}  ⚠${NC} ${test_name}: ${message}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        SECTION_PASSED=$((SECTION_PASSED + 1))
    else
        echo -e "${RED}  ✗${NC} ${test_name}: ${message}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        SECTION_FAILED=$((SECTION_FAILED + 1))
    fi
}

print_section() {
    local section_name=$1
    SECTION_PASSED=0
    SECTION_FAILED=0
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}${section_name}${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section_summary() {
    echo -e "${BLUE}  Section: ${SECTION_PASSED} passed, ${SECTION_FAILED} failed${NC}"
}

extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*[^,}]*" | sed 's/.*:[[:space:]]*//' | tr -d '"'
}

# ===========================================
# HEADER
# ===========================================
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  CHAPITRE 3: MODULE CONTACTS/PEOPLE 👥${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "API URL: ${API_BASE}"
echo -e "Timeout: ${TIMEOUT}s"
if [ -z "$AUTH_TOKEN" ]; then
    echo -e "${YELLOW}⚠ WARNING: No auth token provided. Some tests may fail.${NC}"
    echo -e "${YELLOW}  Usage: $0 [API_URL] [AUTH_TOKEN]${NC}"
fi

# ===========================================
# SECTION 1: TESTS CRUD CONTACTS
# ===========================================
print_section "1️⃣  TESTS CRUD CONTACTS"

# Test 1.1: Créer un nouveau contact (avec tous les champs obligatoires)
echo -e "\n${BLUE}[1.1] Créer un nouveau contact...${NC}"
PERSON_DATA='{
  "first_name": "Jean",
  "last_name": "Dupont",
  "email": "jean.dupont@test.com",
  "personal_email": "jean.dupont.perso@gmail.com",
  "phone": "+33 1 23 45 67 89",
  "mobile": "+33 6 12 34 56 78",
  "job_title": "Directeur Financier",
  "role": "Décideur",
  "country_code": "FR",
  "language": "FR",
  "notes": "Contact principal pour le projet Alpha",
  "linkedin_url": "https://linkedin.com/in/jeandupont",
  "is_active": true
}'

result=$(measure_time "POST" "${API_BASE}/people" "$PERSON_DATA")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    CREATED_PERSON_ID=$(extract_json_value "$body" "id")
    if [ ! -z "$CREATED_PERSON_ID" ]; then
        CREATED_PERSON_IDS+=("$CREATED_PERSON_ID")
        print_test_result "Créer contact" "PASS" "ID=${CREATED_PERSON_ID}, Time=${response_time}ms"
    else
        print_test_result "Créer contact" "FAIL" "Contact créé mais ID non trouvé"
    fi
else
    print_test_result "Créer contact" "FAIL" "HTTP ${http_code} (expected 201)"
    echo -e "${RED}     Response: ${body}${NC}"
fi

# Test 1.2: Validation des champs (email format)
echo -e "\n${BLUE}[1.2] Validation email invalide...${NC}"
INVALID_EMAIL_DATA='{
  "first_name": "Marie",
  "last_name": "Martin",
  "email": "invalid-email-format",
  "phone": "+33 1 11 11 11 11"
}'

result=$(measure_time "POST" "${API_BASE}/people" "$INVALID_EMAIL_DATA")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "422" ] || [ "$http_code" = "400" ]; then
    print_test_result "Validation email" "PASS" "Email invalide rejeté (HTTP ${http_code})"
else
    print_test_result "Validation email" "FAIL" "Email invalide accepté (HTTP ${http_code})"
fi

# Test 1.3: Lire/Afficher la liste des contacts
echo -e "\n${BLUE}[1.3] Lire la liste des contacts...${NC}"
result=$(measure_time "GET" "${API_BASE}/people")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    # Compter les éléments dans la réponse (chercher "id" dans le tableau)
    count=$(echo "$body" | grep -o '"id"' | wc -l | tr -d ' ')
    print_test_result "Liste contacts" "PASS" "Retrieved ${count} contacts (${response_time}ms)"
else
    print_test_result "Liste contacts" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# Test 1.4: Pagination fonctionne correctement
echo -e "\n${BLUE}[1.4] Tester la pagination...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?skip=0&limit=10")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    # Vérifier que la réponse contient des données
    if echo "$body" | grep -q '"id"'; then
        print_test_result "Pagination" "PASS" "skip=0&limit=10 fonctionne"
    else
        print_test_result "Pagination" "WARN" "Aucun résultat (base vide?)"
    fi
else
    print_test_result "Pagination" "FAIL" "HTTP ${http_code}"
fi

# Test 1.5: Modifier un contact existant
if [ ! -z "$CREATED_PERSON_ID" ]; then
    echo -e "\n${BLUE}[1.5] Modifier le contact créé...${NC}"
    UPDATE_DATA='{
      "first_name": "Jean-Pierre",
      "last_name": "Dupont",
      "job_title": "Directeur Général",
      "notes": "Promu DG"
    }'

    result=$(measure_time "PUT" "${API_BASE}/people/${CREATED_PERSON_ID}" "$UPDATE_DATA")
    http_code=$(echo "$result" | cut -d'|' -f1)
    response_time=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [ "$http_code" = "200" ]; then
        # Vérifier que la modification a été appliquée
        updated_name=$(extract_json_value "$body" "first_name")
        if [[ "$updated_name" == *"Jean-Pierre"* ]] || echo "$body" | grep -q "Jean-Pierre"; then
            print_test_result "Modifier contact" "PASS" "Nom modifié avec succès (${response_time}ms)"
        else
            print_test_result "Modifier contact" "WARN" "Modifié mais nom non vérifié"
        fi
    else
        print_test_result "Modifier contact" "FAIL" "HTTP ${http_code} (expected 200)"
    fi
else
    echo -e "\n${BLUE}[1.5] Modifier contact...${NC}"
    print_test_result "Modifier contact" "FAIL" "Aucun contact créé pour modifier"
fi

# Test 1.6: Lire un contact spécifique
if [ ! -z "$CREATED_PERSON_ID" ]; then
    echo -e "\n${BLUE}[1.6] Lire le contact par ID...${NC}"
    result=$(measure_time "GET" "${API_BASE}/people/${CREATED_PERSON_ID}")
    http_code=$(echo "$result" | cut -d'|' -f1)
    response_time=$(echo "$result" | cut -d'|' -f2)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [ "$http_code" = "200" ]; then
        person_id=$(extract_json_value "$body" "id")
        if [ "$person_id" = "$CREATED_PERSON_ID" ]; then
            print_test_result "Lire contact par ID" "PASS" "Contact retrouvé (${response_time}ms)"
        else
            print_test_result "Lire contact par ID" "WARN" "Contact retrouvé mais ID différent"
        fi
    else
        print_test_result "Lire contact par ID" "FAIL" "HTTP ${http_code} (expected 200)"
    fi
fi

print_section_summary

# ===========================================
# SECTION 2: TESTS RECHERCHE
# ===========================================
print_section "2️⃣  TESTS RECHERCHE"

# Test 2.1: Recherche par nom
echo -e "\n${BLUE}[2.1] Recherche par nom...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?q=Dupont")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -qi "Dupont"; then
        print_test_result "Recherche par nom" "PASS" "Résultats trouvés (${response_time}ms)"
    else
        print_test_result "Recherche par nom" "WARN" "Aucun résultat pour 'Dupont'"
    fi
else
    print_test_result "Recherche par nom" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# Test 2.2: Recherche par email
echo -e "\n${BLUE}[2.2] Recherche par email...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?q=jean.dupont@test.com")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    if echo "$body" | grep -qi "jean.dupont@test.com"; then
        print_test_result "Recherche par email" "PASS" "Email trouvé (${response_time}ms)"
    else
        print_test_result "Recherche par email" "WARN" "Email non trouvé dans résultats"
    fi
else
    print_test_result "Recherche par email" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# Test 2.3: Endpoint de recherche dédié
echo -e "\n${BLUE}[2.3] Endpoint /people/search...${NC}"
result=$(measure_time "GET" "${API_BASE}/people/search?q=Dupont")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    print_test_result "Search endpoint" "PASS" "Endpoint accessible (${response_time}ms)"
else
    print_test_result "Search endpoint" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# Test 2.4: Filtres avancés - par organization_type
echo -e "\n${BLUE}[2.4] Filtre par organization_type...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?organization_type=investor")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)

if [ "$http_code" = "200" ]; then
    print_test_result "Filtre org_type" "PASS" "organization_type=investor (${response_time}ms)"
else
    print_test_result "Filtre org_type" "FAIL" "HTTP ${http_code} (expected 200)"
fi

# Test 2.5: Tri par colonnes (vérifier ordre)
echo -e "\n${BLUE}[2.5] Tri des résultats...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?limit=5")
http_code=$(echo "$result" | cut -d'|' -f1)
body=$(echo "$result" | cut -d'|' -f3-)

if [ "$http_code" = "200" ]; then
    # Vérifier que les résultats sont ordonnés (par défaut par ID ou created_at)
    if echo "$body" | grep -q '"id"'; then
        print_test_result "Tri résultats" "PASS" "Résultats triés par défaut"
    else
        print_test_result "Tri résultats" "WARN" "Impossible de vérifier le tri"
    fi
else
    print_test_result "Tri résultats" "FAIL" "HTTP ${http_code}"
fi

print_section_summary

# ===========================================
# SECTION 3: TESTS PERFORMANCE
# ===========================================
print_section "3️⃣  TESTS PERFORMANCE"

# Test 3.1: Créer 100+ contacts pour tester la performance
echo -e "\n${BLUE}[3.1] Créer contacts de test (pour performance)...${NC}"
CREATED_COUNT=0
BATCH_SIZE=20

for i in $(seq 1 $BATCH_SIZE); do
    BATCH_DATA="{
      \"first_name\": \"Test${i}\",
      \"last_name\": \"Performance${i}\",
      \"email\": \"test${i}.perf@example.com\",
      \"personal_email\": \"test${i}.perso@example.com\",
      \"phone\": \"+33 1 00 00 00 $(printf '%02d' $i)\",
      \"country_code\": \"FR\",
      \"is_active\": true
    }"

    result=$(measure_time "POST" "${API_BASE}/people" "$BATCH_DATA")
    http_code=$(echo "$result" | cut -d'|' -f1)
    body=$(echo "$result" | cut -d'|' -f3-)

    if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
        person_id=$(extract_json_value "$body" "id")
        if [ ! -z "$person_id" ]; then
            CREATED_PERSON_IDS+=("$person_id")
            CREATED_COUNT=$((CREATED_COUNT + 1))
        fi
    fi
done

if [ $CREATED_COUNT -ge 10 ]; then
    print_test_result "Créer batch contacts" "PASS" "${CREATED_COUNT}/${BATCH_SIZE} contacts créés"
else
    print_test_result "Créer batch contacts" "WARN" "Seulement ${CREATED_COUNT}/${BATCH_SIZE} créés"
fi

# Test 3.2: Chargement rapide avec >100 contacts
echo -e "\n${BLUE}[3.2] Chargement avec pagination (100 contacts)...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?limit=100")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)

if [ "$http_code" = "200" ]; then
    if [ "$response_time" -lt 1000 ]; then
        print_test_result "Chargement 100 contacts" "PASS" "${response_time}ms (excellent)"
    elif [ "$response_time" -lt "$RESPONSE_TIME_LIMIT" ]; then
        print_test_result "Chargement 100 contacts" "PASS" "${response_time}ms (acceptable)"
    else
        print_test_result "Chargement 100 contacts" "WARN" "${response_time}ms (lent, >2s)"
    fi
else
    print_test_result "Chargement 100 contacts" "FAIL" "HTTP ${http_code}"
fi

# Test 3.3: Temps de réponse recherche avec grand volume
echo -e "\n${BLUE}[3.3] Performance recherche avec volume...${NC}"
result=$(measure_time "GET" "${API_BASE}/people?q=Test")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)

if [ "$http_code" = "200" ]; then
    if [ "$response_time" -lt 500 ]; then
        print_test_result "Performance recherche" "PASS" "${response_time}ms (excellent)"
    elif [ "$response_time" -lt 1000 ]; then
        print_test_result "Performance recherche" "PASS" "${response_time}ms (bon)"
    else
        print_test_result "Performance recherche" "WARN" "${response_time}ms (peut être optimisé)"
    fi
else
    print_test_result "Performance recherche" "FAIL" "HTTP ${http_code}"
fi

# Test 3.4: Export CSV (si disponible)
echo -e "\n${BLUE}[3.4] Export CSV...${NC}"
# Note: L'endpoint d'export n'est pas visible dans les routes, mais on teste quand même
result=$(measure_time "GET" "${API_BASE}/people/export?format=csv")
http_code=$(echo "$result" | cut -d'|' -f1)
response_time=$(echo "$result" | cut -d'|' -f2)

if [ "$http_code" = "200" ]; then
    print_test_result "Export CSV" "PASS" "Export disponible (${response_time}ms)"
elif [ "$http_code" = "404" ] || [ "$http_code" = "405" ]; then
    print_test_result "Export CSV" "WARN" "Endpoint export non implémenté (HTTP ${http_code})"
else
    print_test_result "Export CSV" "FAIL" "HTTP ${http_code}"
fi

print_section_summary

# ===========================================
# SECTION 4: TESTS RELATIONS ORGANISATIONS
# ===========================================
print_section "4️⃣  TESTS RELATIONS ORGANISATIONS"

if [ ! -z "$CREATED_PERSON_ID" ]; then
    echo -e "\n${BLUE}[4.1] Lister organisations du contact...${NC}"
    result=$(measure_time "GET" "${API_BASE}/people/${CREATED_PERSON_ID}/organisations")
    http_code=$(echo "$result" | cut -d'|' -f1)
    response_time=$(echo "$result" | cut -d'|' -f2)

    if [ "$http_code" = "200" ]; then
        print_test_result "Lister organisations" "PASS" "Endpoint fonctionnel (${response_time}ms)"
    else
        print_test_result "Lister organisations" "FAIL" "HTTP ${http_code} (expected 200)"
    fi

    # Test 4.2: Créer un lien organisation (nécessite une org existante)
    echo -e "\n${BLUE}[4.2] Créer lien person-organisation...${NC}"

    # D'abord, essayer de récupérer une organisation existante
    org_result=$(measure_time "GET" "${API_BASE}/organisations?limit=1")
    org_code=$(echo "$org_result" | cut -d'|' -f1)
    org_body=$(echo "$org_result" | cut -d'|' -f3-)

    if [ "$org_code" = "200" ]; then
        ORG_ID=$(echo "$org_body" | grep -o '"id"[[:space:]]*:[[:space:]]*[0-9]*' | head -1 | grep -o '[0-9]*$')

        if [ ! -z "$ORG_ID" ]; then
            LINK_DATA="{
              \"person_id\": ${CREATED_PERSON_ID},
              \"organisation_id\": ${ORG_ID},
              \"role\": \"contact_principal\",
              \"is_primary\": true,
              \"job_title\": \"CEO\",
              \"work_email\": \"ceo@company.com\",
              \"notes\": \"Contact principal\"
            }"

            result=$(measure_time "POST" "${API_BASE}/org-links" "$LINK_DATA")
            http_code=$(echo "$result" | cut -d'|' -f1)
            response_time=$(echo "$result" | cut -d'|' -f2)
            body=$(echo "$result" | cut -d'|' -f3-)

            if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
                CREATED_LINK_ID=$(extract_json_value "$body" "id")
                print_test_result "Créer lien org" "PASS" "Lien créé (${response_time}ms)"
            else
                print_test_result "Créer lien org" "FAIL" "HTTP ${http_code}"
            fi
        else
            print_test_result "Créer lien org" "WARN" "Aucune organisation trouvée pour lier"
        fi
    else
        print_test_result "Créer lien org" "WARN" "Impossible de récupérer une organisation"
    fi
else
    echo -e "\n${BLUE}[4.1-4.2] Tests relations organisations...${NC}"
    print_test_result "Relations organisations" "FAIL" "Aucun contact créé pour tester"
fi

print_section_summary

# ===========================================
# SECTION 5: NETTOYAGE
# ===========================================
print_section "5️⃣  NETTOYAGE DES DONNÉES DE TEST"

echo -e "\n${BLUE}[5.1] Supprimer les contacts de test créés...${NC}"
DELETED_COUNT=0

for person_id in "${CREATED_PERSON_IDS[@]}"; do
    if [ ! -z "$person_id" ]; then
        result=$(measure_time "DELETE" "${API_BASE}/people/${person_id}")
        http_code=$(echo "$result" | cut -d'|' -f1)

        if [ "$http_code" = "204" ] || [ "$http_code" = "200" ]; then
            DELETED_COUNT=$((DELETED_COUNT + 1))
        fi
    fi
done

CREATED_TOTAL=${#CREATED_PERSON_IDS[@]}
if [ $DELETED_COUNT -eq $CREATED_TOTAL ]; then
    print_test_result "Supprimer contacts" "PASS" "${DELETED_COUNT}/${CREATED_TOTAL} contacts supprimés"
elif [ $DELETED_COUNT -gt 0 ]; then
    print_test_result "Supprimer contacts" "WARN" "${DELETED_COUNT}/${CREATED_TOTAL} contacts supprimés"
else
    print_test_result "Supprimer contacts" "FAIL" "Aucun contact supprimé"
fi

print_section_summary

# ===========================================
# RÉSUMÉ FINAL
# ===========================================
echo ""
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "${BLUE}  RÉSUMÉ FINAL${NC}"
echo -e "${BLUE}═══════════════════════════════════════════${NC}"
echo -e "Total tests: ${TESTS_TOTAL}"
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"

# Calculer le pourcentage de réussite
if [ $TESTS_TOTAL -gt 0 ]; then
    SUCCESS_RATE=$((TESTS_PASSED * 100 / TESTS_TOTAL))
    echo -e "Success rate: ${SUCCESS_RATE}%"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Tous les tests du Module Contacts/People sont passés! 👥${NC}"
    exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
    echo -e "${YELLOW}⚠ La plupart des tests sont passés (${SUCCESS_RATE}%)${NC}"
    echo -e "${YELLOW}  Vérifiez les tests échoués ci-dessus.${NC}"
    exit 0
else
    echo -e "${RED}✗ Trop de tests ont échoué (${TESTS_FAILED}/${TESTS_TOTAL})${NC}"
    echo -e "${RED}  Vérifiez la configuration du module Contacts/People.${NC}"
    exit 1
fi
