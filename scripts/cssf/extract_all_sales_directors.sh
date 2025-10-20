#!/bin/bash

###############################################################################
# Extract All Sales Directors - CSSF Luxembourg
#
# Master script pour extraire tous les directeurs commerciaux
# des sociétés de gestion luxembourgeoises
#
# Usage:
#   ./scripts/cssf/extract_all_sales_directors.sh
#
# Environment variables:
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
DATA_DIR="$PROJECT_ROOT/data/cssf"

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
    echo "  👔 Sales Directors Extraction - Luxembourg (CSSF)"
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

    # Check jq (for JSON processing)
    if ! command -v jq &> /dev/null; then
        log_warning "jq not found (optional, for statistics)"
    else
        log_success "jq: $(jq --version)"
    fi

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

    # Ensure data directory exists
    mkdir -p "$DATA_DIR"

    # Check if enriched companies file exists
    if [ ! -f "$DATA_DIR/cssf_companies_enriched.json" ]; then
        log_warning "cssf_companies_enriched.json not found"
        log_info "Creating with Tier 1 companies > 1Bn€..."

        # Check for base CSV
        if [ -f "$DATA_DIR/cssf_companies_tier1.csv" ]; then
            log_info "Using existing tier 1 CSV file"
        else
            log_error "No CSSF data found"
            echo ""
            echo "Please run import first:"
            echo "  ./scripts/cssf/demo_cssf.sh --tier 1 --dry-run"
            echo ""
            exit 1
        fi
    else
        if command -v jq &> /dev/null; then
            COMPANIES_COUNT=$(jq '. | length' "$DATA_DIR/cssf_companies_enriched.json" 2>/dev/null || echo "?")
            log_success "Found $COMPANIES_COUNT enriched companies"
        else
            log_success "Enriched companies file found"
        fi
    fi

    # Check credentials
    echo ""
    log_info "Checking credentials..."

    if [ -z "$LINKEDIN_EMAIL" ] || [ -z "$LINKEDIN_PASSWORD" ]; then
        log_warning "LinkedIn credentials not set"
        log_info "Set LINKEDIN_EMAIL and LINKEDIN_PASSWORD for better results"
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

        if [ -f "$DATA_DIR/cssf_sales_directors_linkedin.json" ]; then
            if command -v jq &> /dev/null; then
                COUNT=$(jq '. | length' "$DATA_DIR/cssf_sales_directors_linkedin.json" 2>/dev/null || echo "?")
                log_info "Found $COUNT contacts from LinkedIn"
            else
                log_info "LinkedIn contacts saved"
            fi
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

    log_warning "Website scraping not yet implemented for Luxembourg"
    log_info "TODO: Create scraper_websites_sales_teams.js"

    # Create empty file to avoid errors
    echo "[]" > "$DATA_DIR/cssf_sales_teams_websites.json"
}

step_hunter() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  STEP 3: Hunter.io Email Enrichment"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    if [ -z "$HUNTER_API_KEY" ]; then
        log_warning "Skipping Hunter.io (no API key)"
        echo "[]" > "$DATA_DIR/cssf_contacts_enriched_hunter.json"
        echo ""
        return 0
    fi

    log_warning "Hunter.io enrichment not yet implemented for Luxembourg"
    log_info "TODO: Create enrich_with_hunter.js"

    # Create empty file to avoid errors
    echo "[]" > "$DATA_DIR/cssf_contacts_enriched_hunter.json"
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

        if [ -f "$DATA_DIR/cssf_sales_contacts_final.csv" ]; then
            COUNT=$(tail -n +2 "$DATA_DIR/cssf_sales_contacts_final.csv" | wc -l | tr -d ' ')
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
    echo "  📊 EXTRACTION SUMMARY - Luxembourg"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    if ! command -v jq &> /dev/null; then
        log_warning "jq not available - skipping detailed statistics"
        echo ""
        return 0
    fi

    # Count from each source
    if [ -f "$DATA_DIR/cssf_sales_directors_linkedin.json" ]; then
        LINKEDIN_COUNT=$(jq '. | length' "$DATA_DIR/cssf_sales_directors_linkedin.json" 2>/dev/null || echo "0")
        echo "LinkedIn contacts: $LINKEDIN_COUNT"
    fi

    if [ -f "$DATA_DIR/cssf_sales_teams_websites.json" ]; then
        WEBSITES_COUNT=$(jq '. | length' "$DATA_DIR/cssf_sales_teams_websites.json" 2>/dev/null || echo "0")
        echo "Website contacts: $WEBSITES_COUNT"
    fi

    if [ -f "$DATA_DIR/cssf_contacts_enriched_hunter.json" ]; then
        HUNTER_COUNT=$(jq '. | length' "$DATA_DIR/cssf_contacts_enriched_hunter.json" 2>/dev/null || echo "0")
        echo "Hunter enriched: $HUNTER_COUNT"
    fi

    if [ -f "$DATA_DIR/cssf_sales_contacts_final.csv" ]; then
        FINAL_COUNT=$(tail -n +2 "$DATA_DIR/cssf_sales_contacts_final.csv" | wc -l | tr -d ' ')
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "TOTAL UNIQUE CONTACTS: $FINAL_COUNT"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi

    echo ""
    log_info "Generated files:"
    [ -f "$DATA_DIR/cssf_sales_directors_linkedin.json" ] && echo "  ✓ cssf_sales_directors_linkedin.json"
    [ -f "$DATA_DIR/cssf_sales_teams_websites.json" ] && echo "  ✓ cssf_sales_teams_websites.json"
    [ -f "$DATA_DIR/cssf_contacts_enriched_hunter.json" ] && echo "  ✓ cssf_contacts_enriched_hunter.json"
    [ -f "$DATA_DIR/cssf_sales_contacts_final.json" ] && echo "  ✓ cssf_sales_contacts_final.json"
    [ -f "$DATA_DIR/cssf_sales_contacts_final.csv" ] && echo "  ✓ cssf_sales_contacts_final.csv"

    echo ""
    echo "📝 Next steps:"
    echo "  1. Review: $DATA_DIR/cssf_sales_contacts_final.csv"
    echo "  2. Import to CRM:"
    echo ""
    echo "     curl -X POST \"http://localhost:8000/api/contacts/bulk\" \\"
    echo "       -H \"Content-Type: application/json\" \\"
    echo "       -d @$DATA_DIR/cssf_sales_contacts_final.json"
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
    echo "  • LinkedIn scraping (Tier 1 companies > 1Bn€)"
    echo "  • Website scraping (sales team pages) - TODO"
    echo "  • Hunter.io enrichment (if API key set) - TODO"
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
