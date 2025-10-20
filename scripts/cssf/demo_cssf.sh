#!/bin/bash
#
# CSSF Luxembourg - Workflow de démonstration complet
#
# Ce script démontre le workflow complet d'import des sociétés de gestion luxembourgeoises:
# 1. Extraction des données CSSF (UCITS + AIFMs)
# 2. Consolidation et enrichissement avec AUM Inverco
# 3. Import dans le CRM avec tier stratégique
# 4. Extraction et assignation des contacts commerciaux
#
# Usage:
#   ./scripts/cssf/demo_cssf.sh --tier 1 --dry-run
#   ./scripts/cssf/demo_cssf.sh --tier 1 --import
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DATA_DIR="$PROJECT_ROOT/data"
CSSF_DATA_DIR="$DATA_DIR/cssf"

# Couleurs pour affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction d'affichage
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Fonction d'aide
show_help() {
    cat << EOF
CSSF Luxembourg - Workflow de démonstration complet

Usage: $0 [OPTIONS]

Options:
    --tier N            Tier stratégique (1=prioritaire, 2=secondaire, 3=opportuniste)
    --dry-run           Mode simulation (pas d'import réel)
    --import            Lancer l'import réel dans le CRM
    --extract-contacts  Extraire les directeurs commerciaux (LinkedIn)
    --help              Afficher cette aide

Exemples:
    # Test avec tier 1 en mode dry-run
    $0 --tier 1 --dry-run

    # Import réel tier 1
    $0 --tier 1 --import

    # Import + extraction contacts
    $0 --tier 1 --import --extract-contacts

    # Test avec tier 2
    $0 --tier 2 --dry-run
EOF
}

# Parse des arguments
TIER=""
MODE=""
EXTRACT_CONTACTS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --tier)
            TIER="$2"
            shift 2
            ;;
        --dry-run)
            MODE="--dry-run"
            shift
            ;;
        --import)
            MODE="--import"
            shift
            ;;
        --extract-contacts)
            EXTRACT_CONTACTS=true
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validation
if [ -z "$TIER" ]; then
    log_error "Tier stratégique requis (--tier)"
    show_help
    exit 1
fi

if [ -z "$MODE" ]; then
    log_error "Mode requis (--dry-run ou --import)"
    show_help
    exit 1
fi

if ! [[ "$TIER" =~ ^[1-3]$ ]]; then
    log_error "Tier doit être 1, 2 ou 3"
    exit 1
fi

# Création des répertoires
mkdir -p "$CSSF_DATA_DIR"

# Bannière
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  CSSF LUXEMBOURG → CRM ALFORIS"
echo "════════════════════════════════════════════════════════════════"
echo "  Tier: $TIER"
echo "  Mode: ${MODE}"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Étape 1: Vérification des données Inverco
log_info "Étape 1/4: Vérification des données Inverco AUM"
INVERCO_FILE="$DATA_DIR/inverco_aum_latest.csv"

if [ -f "$INVERCO_FILE" ]; then
    count=$(wc -l < "$INVERCO_FILE" | xargs)
    log_success "Données Inverco disponibles ($count lignes)"
else
    log_warning "Données Inverco non disponibles - import sans enrichissement AUM"
fi
echo ""

# Étape 2: Préparation des données CSSF
log_info "Étape 2/4: Préparation des données CSSF"
CSSF_FILE="$CSSF_DATA_DIR/cssf_companies_tier${TIER}.csv"

if [ ! -f "$CSSF_FILE" ]; then
    log_warning "Fichier CSSF non trouvé: $CSSF_FILE"
    log_info "Création d'un exemple de fichier CSV..."

    cat > "$CSSF_FILE" << 'EOF'
name,address,city,postal_code,website,registration_number,entity_type,status,registration_date,contacts
"Blackrock Investment Management (Luxembourg) S.A.","35A avenue J.F. Kennedy","Luxembourg","L-1855","www.blackrock.com","B00000","UCITS Management Company","Active","1988-01-15","[]"
"Amundi Luxembourg S.A.","5 allée Scheffer","Luxembourg","L-2520","www.amundi.lu","B00001","UCITS Management Company","Active","1990-03-20","[]"
"DWS Investment S.A.","2 boulevard Konrad Adenauer","Luxembourg","L-1115","www.dws.com","B00002","UCITS Management Company","Active","1992-05-10","[]"
"J.P. Morgan Asset Management (Europe) S.à r.l.","6 route de Trèves","Luxembourg","L-2633","www.jpmorganassetmanagement.lu","B00003","UCITS Management Company","Active","1995-07-01","[]"
"UBS Fund Management (Luxembourg) S.A.","33A avenue J.F. Kennedy","Luxembourg","L-1855","www.ubs.com","B00004","UCITS Management Company","Active","1997-09-15","[]"
EOF

    log_success "Fichier exemple créé: $CSSF_FILE"
    log_warning "ATTENTION: Remplacer ce fichier par les vraies données CSSF avant import réel"
fi

count=$(tail -n +2 "$CSSF_FILE" | wc -l | xargs)
log_success "$count sociétés trouvées dans $CSSF_FILE"
echo ""

# Étape 3: Vérification API CRM
log_info "Étape 3/4: Vérification de l'API CRM"
if curl -s -f http://localhost:8000/api/health > /dev/null 2>&1; then
    log_success "API CRM accessible"
else
    if [ "$MODE" = "--import" ]; then
        log_error "API CRM non accessible - impossible d'importer"
        log_info "Démarrer le backend: cd crm-backend && docker-compose up -d"
        exit 1
    else
        log_warning "API CRM non accessible - mode dry-run uniquement"
    fi
fi
echo ""

# Étape 4: Import dans le CRM
log_info "Étape 4/4: Import dans le CRM"

if [ "$MODE" = "--dry-run" ]; then
    log_warning "MODE DRY-RUN - Aucun import réel"
fi

python3 "$SCRIPT_DIR/cssf_import.py" \
    --file "$CSSF_FILE" \
    --tier "$TIER" \
    $MODE

echo ""

# Étape 5 (optionnelle): Extraction des contacts commerciaux
if [ "$EXTRACT_CONTACTS" = true ]; then
    log_info "Étape 5/5: Extraction des directeurs commerciaux"
    echo ""

    if [ "$MODE" = "--dry-run" ]; then
        log_warning "Extraction de contacts non disponible en mode dry-run"
        log_info "Utilisez --import --extract-contacts pour l'extraction réelle"
    else
        log_info "Lancement de l'extraction LinkedIn..."

        if [ -x "$SCRIPT_DIR/extract_all_sales_directors.sh" ]; then
            "$SCRIPT_DIR/extract_all_sales_directors.sh"
        else
            log_error "Script extract_all_sales_directors.sh non trouvé ou non exécutable"
        fi
    fi

    echo ""
fi

# Résumé final
echo "════════════════════════════════════════════════════════════════"
log_success "Workflow CSSF terminé"
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ "$MODE" = "--dry-run" ]; then
    log_info "Pour lancer l'import réel:"
    echo "  $0 --tier $TIER --import"
    echo ""
    log_info "Pour lancer avec extraction des contacts:"
    echo "  $0 --tier $TIER --import --extract-contacts"
    echo ""
fi

log_info "Prochaines étapes:"
if [ "$EXTRACT_CONTACTS" = true ] && [ "$MODE" = "--import" ]; then
    echo "  1. Vérifier les contacts extraits: $CSSF_DATA_DIR/cssf_sales_contacts_final.csv"
    echo "  2. Vérifier les sociétés importées dans le CRM"
    echo "  3. Enrichir les données manquantes (téléphone, email)"
    echo "  4. Planifier les actions commerciales"
else
    echo "  1. Vérifier les sociétés importées dans le CRM"
    echo "  2. Extraire les contacts commerciaux: $0 --tier $TIER --import --extract-contacts"
    echo "  3. Enrichir les données manquantes (LinkedIn, etc.)"
    echo "  4. Planifier les actions commerciales"
fi
echo ""
