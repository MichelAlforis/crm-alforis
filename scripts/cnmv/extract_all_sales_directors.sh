#!/bin/bash

###############################################################################
# Extract All Sales Directors - CNMV
#
# Master script pour extraire tous les directeurs commerciaux
# des sociétés de gestion espagnoles
#
# Usage:
#   ./scripts/cnmv/extract_all_sales_directors.sh
#
# Environment variables required:
#   LINKEDIN_EMAIL (optional) - LinkedIn login
#   LINKEDIN_PASSWORD (optional) - LinkedIn password
#   HUNTER_API_KEY (optional) - Hunter.io API key
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo -e "${CYAN}▶${NC} $1"
}

print_banner() {
    echo ""
    echo "================================================================"
    echo "  👔 Sales Directors Extraction - CNMV"
    echo "================================================================"
    echo ""
}

check_dependencies() {
    log_step "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js first."
        exit 1
    fi
    log_success "Node.js: $(node --version)"

    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 not found. Please install Python 3 first."
        exit 1
    fi
    log_success "Python 3: $(python3 --version)"

    # Check Puppeteer
    if [ ! -d "$PROJECT_ROOT/node_modules/puppeteer" ]; then
        log_warning "Puppeteer not found. Installing..."
        cd "$PROJECT_ROOT"
        npm install puppeteer
        log_success "Puppeteer installed"
    fi

    echo ""
}

check_prerequisites() {
    log_step "Checking prerequisites..."

    # Check if enriched companies file exists
    if [ ! -f "$PROJECT_ROOT/cnmv_enriched_with_aum.json" ]; then
        log_error "cnmv_enriched_with_aum.json not found"
        echo ""
        echo "Please run enrichment first:"
        echo "  ./scripts/cnmv/download_inverco_data.sh"
        echo "  python3 scripts/cnmv/enrich_cnmv_with_aum.py"
        echo ""
        exit 1
    fi

    COMPANIES_COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_enriched_with_aum.json")
    log_success "Found $COMPANIES_COUNT enriched companies"

    # Check credentials
    echo ""
    log_info "Checking credentials..."

    if [ -z "$LINKEDIN_EMAIL" ] || [ -z "$LINKEDIN_PASSWORD" ]; then
        log_warning "LinkedIn credentials not set"
        log_info "Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD for better LinkedIn results"
        log_info "Without credentials: limited to ~3 results per search"
    else
        log_success "LinkedIn credentials configured"
    fi

    if [ -z "$HUNTER_API_KEY" ]; then
        log_warning "HUNTER_API_KEY not set"
        log_info "Set HUNTER_API_KEY for email enrichment"
        log_info "Get your key at: https://hunter.io"
    else
        log_success "Hunter.io API key configured"
    fi

    echo ""
}

step_linkedin() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  STEP 1: LinkedIn Sales Directors"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    log_step "Scraping LinkedIn for sales directors..."

    cd "$SCRIPT_DIR"

    if node scraper_linkedin_sales_directors.js; then
        log_success "LinkedIn scraping completed"

        if [ -f "$PROJECT_ROOT/cnmv_sales_directors.json" ]; then
            COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_sales_directors.json")
            log_info "Found $COUNT contacts from LinkedIn"
        fi
    else
        log_warning "LinkedIn scraping failed (non-critical)"
    fi
}

step_websites() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  STEP 2: Website Sales Teams"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    log_step "Scraping company websites for sales teams..."

    cd "$SCRIPT_DIR"

    if node scraper_websites_sales_teams.js; then
        log_success "Website scraping completed"

        if [ -f "$PROJECT_ROOT/cnmv_sales_teams_websites.json" ]; then
            COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_sales_teams_websites.json")
            log_info "Found $COUNT contacts from websites"
        fi
    else
        log_warning "Website scraping failed (non-critical)"
    fi
}

step_hunter() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  STEP 3: Hunter.io Email Enrichment"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    if [ -z "$HUNTER_API_KEY" ]; then
        log_warning "Skipping Hunter.io (no API key)"
        echo ""
        return 0
    fi

    log_step "Enriching contacts with Hunter.io..."

    cd "$SCRIPT_DIR"

    if node enrich_with_hunter.js; then
        log_success "Hunter.io enrichment completed"

        if [ -f "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json" ]; then
            COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json")
            WITH_EMAIL=$(jq '[.[] | select(.email != null and .email != "")] | length' "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json")
            log_info "Enriched $COUNT contacts ($WITH_EMAIL with email)"
        fi
    else
        log_warning "Hunter.io enrichment failed (non-critical)"
    fi
}

step_consolidate() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  STEP 4: Consolidation"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    log_step "Consolidating all sources..."

    cd "$SCRIPT_DIR"

    if python3 consolidate_sales_contacts.py; then
        log_success "Consolidation completed"

        if [ -f "$PROJECT_ROOT/cnmv_sales_contacts_final.csv" ]; then
            COUNT=$(tail -n +2 "$PROJECT_ROOT/cnmv_sales_contacts_final.csv" | wc -l | tr -d ' ')
            log_info "Generated $COUNT unique contacts"
        fi
    else
        log_error "Consolidation failed"
        return 1
    fi
}

generate_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  📊 EXTRACTION SUMMARY"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Count from each source
    if [ -f "$PROJECT_ROOT/cnmv_sales_directors.json" ]; then
        LINKEDIN_COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_sales_directors.json")
        echo "LinkedIn contacts: $LINKEDIN_COUNT"
    fi

    if [ -f "$PROJECT_ROOT/cnmv_sales_teams_websites.json" ]; then
        WEBSITES_COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_sales_teams_websites.json")
        echo "Website contacts: $WEBSITES_COUNT"
    fi

    if [ -f "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json" ]; then
        HUNTER_COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json")
        echo "Hunter enriched: $HUNTER_COUNT"
    fi

    if [ -f "$PROJECT_ROOT/cnmv_sales_contacts_final.csv" ]; then
        FINAL_COUNT=$(tail -n +2 "$PROJECT_ROOT/cnmv_sales_contacts_final.csv" | wc -l | tr -d ' ')
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "TOTAL UNIQUE CONTACTS: $FINAL_COUNT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi

    echo ""
    log_info "Generated files:"
    [ -f "$PROJECT_ROOT/cnmv_sales_directors.json" ] && echo "  ✓ cnmv_sales_directors.json"
    [ -f "$PROJECT_ROOT/cnmv_sales_teams_websites.json" ] && echo "  ✓ cnmv_sales_teams_websites.json"
    [ -f "$PROJECT_ROOT/cnmv_contacts_enriched_hunter.json" ] && echo "  ✓ cnmv_contacts_enriched_hunter.json"
    [ -f "$PROJECT_ROOT/cnmv_sales_contacts_final.json" ] && echo "  ✓ cnmv_sales_contacts_final.json"
    [ -f "$PROJECT_ROOT/cnmv_sales_contacts_final.csv" ] && echo "  ✓ cnmv_sales_contacts_final.csv"

    echo ""
    echo "📝 Next steps:"
    echo "  1. Review: $PROJECT_ROOT/cnmv_sales_contacts_final.csv"
    echo "  2. Import to CRM:"
    echo ""
    echo "     curl -X POST \"http://localhost:8000/api/v1/imports/people/bulk\" \\"
    echo "       -H \"Content-Type: application/json\" \\"
    echo "       -H \"Authorization: Bearer \$CRM_API_TOKEN\" \\"
    echo "       -d @$PROJECT_ROOT/cnmv_sales_contacts_final.json"
    echo ""
}

main() {
    print_banner

    # Check dependencies
    check_dependencies

    # Check prerequisites
    check_prerequisites

    # Confirm before starting
    echo "Ready to start extraction:"
    echo "  • LinkedIn scraping (Tier 1-2 companies)"
    echo "  • Website scraping (sales team pages)"
    echo "  • Hunter.io enrichment (if API key set)"
    echo "  • Consolidation"
    echo ""

    read -p "Continue? (y/n) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cancelled by user"
        exit 0
    fi

    # Run extraction pipeline
    step_linkedin
    step_websites
    step_hunter
    step_consolidate

    # Generate summary
    generate_summary

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    log_success "Sales directors extraction completed!"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
}

# Run main
main "$@"
