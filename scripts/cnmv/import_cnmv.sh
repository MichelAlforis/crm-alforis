#!/bin/bash

###############################################################################
# CNMV Data Import Script
#
# This script automates the complete CNMV data import process:
# 1. Scrapes SGIIC companies from CNMV
# 2. Scrapes entities from CNMV hub
# 3. Extracts contacts from company websites
# 4. Transforms data to CRM format
# 5. Imports to CRM via API
#
# Usage:
#   ./scripts/cnmv/import_cnmv.sh [--scrape-only|--transform-only|--import-only]
#
# Environment variables:
#   CRM_API_URL - CRM API base URL (default: http://localhost:8000)
#   CRM_API_TOKEN - API authentication token
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CRM_API_URL="${CRM_API_URL:-http://localhost:8000}"

# File paths
SGIIC_RAW="$PROJECT_ROOT/cnmv_sgiic_raw.json"
ENTITIES_RAW="$PROJECT_ROOT/cnmv_entities_raw.json"
CONTACTS_RAW="$PROJECT_ROOT/cnmv_contacts_raw.json"
ORGS_CSV="$PROJECT_ROOT/cnmv_organisations.csv"
CONTACTS_CSV="$PROJECT_ROOT/cnmv_contacts.csv"

###############################################################################
# Helper functions
###############################################################################

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

check_node() {
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js found: $(node --version)"
}

check_python() {
    if ! command -v python3 &> /dev/null; then
        log_error "Python 3 is not installed"
        exit 1
    fi
    log_success "Python 3 found: $(python3 --version)"
}

check_puppeteer() {
    if [ ! -d "$PROJECT_ROOT/node_modules/puppeteer" ]; then
        log_warning "Puppeteer not found. Installing..."
        cd "$PROJECT_ROOT"
        npm install puppeteer
        log_success "Puppeteer installed"
    fi
}

###############################################################################
# Scraping functions
###############################################################################

scrape_sgiic() {
    log_info "🇪🇸 Scraping CNMV SGIIC companies..."

    cd "$SCRIPT_DIR"

    if node scraper_cnmv_sgiic.js; then
        log_success "SGIIC scraping completed"

        if [ -f "$SGIIC_RAW" ]; then
            COUNT=$(jq '. | length' "$SGIIC_RAW")
            log_info "Found $COUNT SGIIC companies"
        fi
    else
        log_error "SGIIC scraping failed"
        return 1
    fi
}

scrape_entities() {
    log_info "🇪🇸 Scraping CNMV entities..."

    cd "$SCRIPT_DIR"

    if node scraper_cnmv_entities.js; then
        log_success "Entities scraping completed"

        if [ -f "$ENTITIES_RAW" ]; then
            COUNT=$(jq '. | length' "$ENTITIES_RAW")
            log_info "Found $COUNT entities"
        fi
    else
        log_error "Entities scraping failed"
        return 1
    fi
}

scrape_contacts() {
    log_info "👥 Scraping CNMV contacts..."

    cd "$SCRIPT_DIR"

    if node scraper_cnmv_contacts.js; then
        log_success "Contacts scraping completed"

        if [ -f "$CONTACTS_RAW" ]; then
            COUNT=$(jq '. | length' "$CONTACTS_RAW")
            log_info "Found $COUNT contacts"
        fi
    else
        log_warning "Contacts scraping failed (non-critical)"
    fi
}

scrape_aum() {
    log_info "💰 Scraping AUM data from INVERCO and CNMV..."

    cd "$SCRIPT_DIR"

    if node scraper_cnmv_aum.js; then
        log_success "AUM scraping completed"

        if [ -f "$PROJECT_ROOT/cnmv_aum_raw.json" ]; then
            COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_aum_raw.json")
            log_info "Found AUM for $COUNT companies"
        fi
    else
        log_warning "AUM scraping failed (will use fallback data)"
    fi
}

###############################################################################
# Enrichment function
###############################################################################

enrich_with_aum() {
    log_info "📊 Enriching companies with AUM and Tier classification..."

    cd "$SCRIPT_DIR"

    if python3 enrich_cnmv_with_aum.py; then
        log_success "Data enrichment completed"

        if [ -f "$PROJECT_ROOT/cnmv_enriched_with_aum.json" ]; then
            COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_enriched_with_aum.json")
            log_info "Enriched $COUNT companies"
        fi
    else
        log_error "Data enrichment failed"
        return 1
    fi
}

###############################################################################
# Transformation function
###############################################################################

transform_data() {
    log_info "🔄 Transforming data to CRM format..."

    cd "$SCRIPT_DIR"

    if python3 transform_cnmv_to_crm.py; then
        log_success "Data transformation completed"

        if [ -f "$ORGS_CSV" ]; then
            ORGS_COUNT=$(tail -n +2 "$ORGS_CSV" | wc -l | tr -d ' ')
            log_info "Generated $ORGS_COUNT organisations"
        fi

        if [ -f "$CONTACTS_CSV" ]; then
            CONTACTS_COUNT=$(tail -n +2 "$CONTACTS_CSV" | wc -l | tr -d ' ')
            log_info "Generated $CONTACTS_COUNT contacts"
        fi
    else
        log_error "Data transformation failed"
        return 1
    fi
}

###############################################################################
# Import functions
###############################################################################

csv_to_json() {
    local csv_file="$1"
    local json_file="$2"

    python3 - "$csv_file" "$json_file" << 'PYTHON'
import sys
import csv
import json

csv_file = sys.argv[1]
json_file = sys.argv[2]

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    data = []
    for row in reader:
        # Remove empty values
        cleaned = {k: v for k, v in row.items() if v}
        data.append(cleaned)

with open(json_file, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Converted {len(data)} records")
PYTHON
}

import_organisations() {
    log_info "📤 Importing organisations to CRM..."

    if [ ! -f "$ORGS_CSV" ]; then
        log_error "Organisations CSV not found: $ORGS_CSV"
        return 1
    fi

    # Convert CSV to JSON
    ORGS_JSON="$PROJECT_ROOT/cnmv_organisations.json"
    csv_to_json "$ORGS_CSV" "$ORGS_JSON"

    # Check if API token is set
    if [ -z "$CRM_API_TOKEN" ]; then
        log_warning "CRM_API_TOKEN not set. Skipping import."
        log_info "To import, set CRM_API_TOKEN and run:"
        log_info "  curl -X POST \"$CRM_API_URL/api/v1/imports/organisations/bulk?type_org=fournisseur\" \\"
        log_info "    -H \"Content-Type: application/json\" \\"
        log_info "    -H \"Authorization: Bearer \$CRM_API_TOKEN\" \\"
        log_info "    -d @$ORGS_JSON"
        return 0
    fi

    # Import via API
    RESPONSE=$(curl -s -X POST "$CRM_API_URL/api/v1/imports/organisations/bulk?type_org=fournisseur" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CRM_API_TOKEN" \
        -d @"$ORGS_JSON")

    if [ $? -eq 0 ]; then
        log_success "Organisations import completed"
        echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
    else
        log_error "Organisations import failed"
        return 1
    fi
}

import_contacts() {
    log_info "📤 Importing contacts to CRM..."

    if [ ! -f "$CONTACTS_CSV" ]; then
        log_warning "Contacts CSV not found: $CONTACTS_CSV"
        return 0
    fi

    # Convert CSV to JSON
    CONTACTS_JSON="$PROJECT_ROOT/cnmv_contacts.json"
    csv_to_json "$CONTACTS_CSV" "$CONTACTS_JSON"

    # Check if API token is set
    if [ -z "$CRM_API_TOKEN" ]; then
        log_warning "CRM_API_TOKEN not set. Skipping import."
        log_info "To import, set CRM_API_TOKEN and run:"
        log_info "  curl -X POST \"$CRM_API_URL/api/v1/imports/people/bulk\" \\"
        log_info "    -H \"Content-Type: application/json\" \\"
        log_info "    -H \"Authorization: Bearer \$CRM_API_TOKEN\" \\"
        log_info "    -d @$CONTACTS_JSON"
        return 0
    fi

    # Import via API
    RESPONSE=$(curl -s -X POST "$CRM_API_URL/api/v1/imports/people/bulk" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CRM_API_TOKEN" \
        -d @"$CONTACTS_JSON")

    if [ $? -eq 0 ]; then
        log_success "Contacts import completed"
        echo "$RESPONSE" | jq '.' || echo "$RESPONSE"
    else
        log_error "Contacts import failed"
        return 1
    fi
}

###############################################################################
# Main workflow
###############################################################################

print_banner() {
    echo ""
    echo "================================================================"
    echo "  🇪🇸  CNMV Data Import - Alforis CRM"
    echo "================================================================"
    echo ""
}

main() {
    print_banner

    # Parse arguments
    MODE="${1:-full}"

    # Check dependencies
    check_node
    check_python
    check_puppeteer

    echo ""

    # Execute based on mode
    case "$MODE" in
        --scrape-only)
            log_info "Mode: Scraping only"
            scrape_sgiic
            scrape_entities
            scrape_contacts
            scrape_aum
            ;;

        --enrich-only)
            log_info "Mode: Enrichment only"
            enrich_with_aum
            ;;

        --transform-only)
            log_info "Mode: Transformation only"
            transform_data
            ;;

        --import-only)
            log_info "Mode: Import only"
            import_organisations
            import_contacts
            ;;

        *)
            log_info "Mode: Full workflow with AUM enrichment"

            # Step 1: Scraping
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "  STEP 1: Scraping CNMV Data"
            echo "════════════════════════════════════════════════════════════════"
            scrape_sgiic
            scrape_entities
            scrape_contacts
            scrape_aum

            # Step 2: Enrichment with AUM
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "  STEP 2: AUM Enrichment & Tier Classification"
            echo "════════════════════════════════════════════════════════════════"
            enrich_with_aum

            # Step 3: Transformation
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "  STEP 3: Data Transformation"
            echo "════════════════════════════════════════════════════════════════"
            transform_data

            # Step 4: Import
            echo ""
            echo "════════════════════════════════════════════════════════════════"
            echo "  STEP 4: CRM Import"
            echo "════════════════════════════════════════════════════════════════"
            import_organisations
            import_contacts
            ;;
    esac

    echo ""
    echo "================================================================"
    log_success "CNMV import workflow completed!"
    echo "================================================================"
    echo ""

    log_info "Generated files:"
    [ -f "$SGIIC_RAW" ] && echo "  - $SGIIC_RAW"
    [ -f "$ENTITIES_RAW" ] && echo "  - $ENTITIES_RAW"
    [ -f "$CONTACTS_RAW" ] && echo "  - $CONTACTS_RAW"
    [ -f "$ORGS_CSV" ] && echo "  - $ORGS_CSV"
    [ -f "$CONTACTS_CSV" ] && echo "  - $CONTACTS_CSV"

    echo ""
}

# Run main function
main "$@"
