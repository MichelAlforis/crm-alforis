#!/bin/bash

###############################################################################
# Download INVERCO AUM data
#
# INVERCO publishes monthly Excel files with AUM for all Spanish SGIICs
# This script attempts to download the latest data
#
# Source: https://www.inverco.es/archivosdb/
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOWNLOAD_DIR="$PROJECT_ROOT/data/inverco"

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

# Create download directory
mkdir -p "$DOWNLOAD_DIR"

echo ""
echo "================================================================"
echo "  📊 INVERCO Data Download"
echo "================================================================"
echo ""

log_info "Download directory: $DOWNLOAD_DIR"

# Get current year and month
CURRENT_YEAR=$(date +%Y)
CURRENT_MONTH=$(date +%m)
PREVIOUS_MONTH=$(date -d "1 month ago" +%m 2>/dev/null || date -v-1m +%m)
PREVIOUS_YEAR=$(date -d "1 month ago" +%Y 2>/dev/null || date -v-1m +%Y)

# Common INVERCO file patterns
INVERCO_BASE_URL="https://www.inverco.es/archivosdb"

# Try different file naming patterns
declare -a URLS=(
    "$INVERCO_BASE_URL/estadisticas_${CURRENT_YEAR}_${CURRENT_MONTH}.xlsx"
    "$INVERCO_BASE_URL/estadisticas${CURRENT_YEAR}${CURRENT_MONTH}.xlsx"
    "$INVERCO_BASE_URL/patrimonio_${CURRENT_YEAR}_${CURRENT_MONTH}.xlsx"
    "$INVERCO_BASE_URL/SGIICs_${CURRENT_YEAR}_${CURRENT_MONTH}.xlsx"
    "$INVERCO_BASE_URL/estadisticas_${PREVIOUS_YEAR}_${PREVIOUS_MONTH}.xlsx"
    "$INVERCO_BASE_URL/estadisticas${PREVIOUS_YEAR}${PREVIOUS_MONTH}.xlsx"
)

# Also try PDF reports
declare -a PDF_URLS=(
    "$INVERCO_BASE_URL/informe_trimestral_${CURRENT_YEAR}_Q4.pdf"
    "$INVERCO_BASE_URL/informe_${CURRENT_YEAR}_12.pdf"
)

log_info "Trying to download INVERCO files..."

DOWNLOADED_FILE=""

# Try Excel files
for url in "${URLS[@]}"; do
    filename=$(basename "$url")
    output_file="$DOWNLOAD_DIR/$filename"

    log_info "Trying: $url"

    if curl -f -s -L -o "$output_file" "$url" 2>/dev/null; then
        # Check if file is actually an Excel file (not an error page)
        if file "$output_file" | grep -q "Microsoft Excel\|Zip archive"; then
            log_success "Downloaded: $filename"
            DOWNLOADED_FILE="$output_file"
            break
        else
            log_warning "File is not Excel format, skipping"
            rm -f "$output_file"
        fi
    else
        log_warning "Failed to download"
    fi
done

# If no Excel found, provide manual instructions
if [ -z "$DOWNLOADED_FILE" ]; then
    echo ""
    log_error "Could not auto-download INVERCO files"
    echo ""
    echo "Please download manually:"
    echo ""
    echo "  1. Visit: https://www.inverco.es/archivosdb/"
    echo "  2. Download the latest Excel file (estadisticas_YYYY_MM.xlsx or similar)"
    echo "  3. Save to: $DOWNLOAD_DIR/"
    echo "  4. Run: python3 scripts/cnmv/parse_inverco_excel.py <downloaded_file>"
    echo ""

    # Open browser (optional)
    if command -v open &> /dev/null; then
        read -p "Open INVERCO website in browser? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open "https://www.inverco.es/archivosdb/"
        fi
    fi

    exit 1
fi

# Parse the downloaded file
echo ""
log_info "Parsing downloaded file..."

if python3 "$SCRIPT_DIR/parse_inverco_excel.py" "$DOWNLOADED_FILE"; then
    log_success "INVERCO data parsed successfully"

    # Show output file
    if [ -f "$PROJECT_ROOT/cnmv_aum_inverco.json" ]; then
        COUNT=$(jq '. | length' "$PROJECT_ROOT/cnmv_aum_inverco.json")
        log_info "Extracted AUM for $COUNT companies"

        echo ""
        echo "================================================================"
        log_success "INVERCO download and parsing completed!"
        echo "================================================================"
        echo ""
        echo "Next steps:"
        echo "  1. Review: $PROJECT_ROOT/cnmv_aum_inverco.json"
        echo "  2. Run enrichment: python3 scripts/cnmv/enrich_cnmv_with_aum.py"
        echo "  3. Or run full import: ./scripts/cnmv/import_cnmv.sh"
        echo ""
    fi
else
    log_error "Failed to parse INVERCO file"
    echo ""
    echo "Try parsing manually with custom columns:"
    echo "  python3 scripts/cnmv/parse_inverco_excel.py \\"
    echo "    \"$DOWNLOADED_FILE\" \\"
    echo "    --sheet \"SheetName\" \\"
    echo "    --name-col \"ColumnName\" \\"
    echo "    --aum-col \"AUMColumnName\""
    echo ""
    exit 1
fi
