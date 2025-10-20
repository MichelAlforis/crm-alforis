#!/bin/bash

###############################################################################
# Demo Workflow CNMV
#
# Démontre tout le workflow avec explications
###############################################################################

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  🇪🇸 CNMV Complete Workflow Demo"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}Ce workflow complet va :${NC}"
echo ""
echo "  📊 PARTIE 1 : Import données CNMV + AUM"
echo "    1. Télécharger les données INVERCO (AUM de toutes les SGIIC)"
echo "    2. Scraper les SGIIC depuis CNMV"
echo "    3. Scraper les entités CNMV"
echo "    4. Enrichir avec les AUM"
echo "    5. Classifier par Tier (1: ≥1Md€, 2: ≥500M€, 3: <500M€)"
echo "    6. Transformer pour le CRM"
echo ""
echo "  👔 PARTIE 2 : Extraction directeurs commerciaux"
echo "    7. Scraper LinkedIn (directeurs commerciaux)"
echo "    8. Scraper sites web (équipes commerciales)"
echo "    9. Enrichir avec Hunter.io (emails)"
echo "    10. Consolider tous les contacts"
echo ""
echo -e "${YELLOW}⚠️  Note sur les credentials :${NC}"
echo "  • LinkedIn : optionnel, améliore les résultats (set LINKEDIN_EMAIL/PASSWORD)"
echo "  • Hunter.io : optionnel, pour enrichissement emails (set HUNTER_API_KEY)"
echo "  • Sans credentials : workflow fonctionnel mais résultats limités"
echo ""

read -p "Continuer avec la démo ? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Demo annulée"
    exit 0
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  PARTIE 1 : Import données CNMV + AUM"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Check if we should try to download INVERCO
echo -e "${BLUE}1. Téléchargement données INVERCO${NC}"
echo ""
echo "INVERCO publie les AUM de toutes les SGIIC espagnoles."
echo "Le script va essayer de télécharger automatiquement."
echo ""

read -p "Essayer de télécharger INVERCO ? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    ./scripts/cnmv/download_inverco_data.sh || {
        echo ""
        echo -e "${YELLOW}⚠️  Téléchargement automatique échoué${NC}"
        echo "Vous pouvez télécharger manuellement depuis:"
        echo "  https://www.inverco.es/archivosdb/"
        echo ""
        echo "Puis parser avec:"
        echo "  python3 scripts/cnmv/parse_inverco_excel.py <fichier.xlsx>"
        echo ""
    }
else
    echo "Téléchargement INVERCO ignoré"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${BLUE}Note importante :${NC}"
echo ""
echo "Pour une démo complète, les scrapers LinkedIn et sites web nécessitent:"
echo "  • Puppeteer installé (npm install puppeteer)"
echo "  • Connexion internet"
echo "  • ~10-20 minutes d'exécution"
echo ""
echo "Les scrapers vont contacter des sites externes et peuvent être"
echo "bloqués par des CAPTCHAs ou rate limiting."
echo ""
echo -e "${GREEN}RECOMMANDATION :${NC}"
echo "  • Pour tester rapidement : utiliser les données d'exemple"
echo "  • Pour production réelle : lancer les scrapers en mode complet"
echo ""

read -p "Lancer les scrapers réels maintenant ? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  📋 RÉSUMÉ DES SCRIPTS DISPONIBLES"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    echo -e "${GREEN}Import CNMV + AUM :${NC}"
    echo "  ./scripts/cnmv/download_inverco_data.sh"
    echo "  ./scripts/cnmv/import_cnmv.sh"
    echo ""

    echo -e "${GREEN}Extraction directeurs commerciaux :${NC}"
    echo "  ./scripts/cnmv/extract_all_sales_directors.sh"
    echo ""

    echo -e "${GREEN}Ou étape par étape :${NC}"
    echo ""
    echo "  # Scrapers données"
    echo "  node scripts/cnmv/scraper_cnmv_sgiic.js"
    echo "  node scripts/cnmv/scraper_cnmv_entities.js"
    echo "  node scripts/cnmv/scraper_cnmv_aum.js"
    echo ""
    echo "  # Enrichissement"
    echo "  python3 scripts/cnmv/enrich_cnmv_with_aum.py"
    echo ""
    echo "  # Directeurs commerciaux"
    echo "  node scripts/cnmv/scraper_linkedin_sales_directors.js"
    echo "  node scripts/cnmv/scraper_websites_sales_teams.js"
    echo "  node scripts/cnmv/enrich_with_hunter.js"
    echo "  python3 scripts/cnmv/consolidate_sales_contacts.py"
    echo ""

    echo -e "${BLUE}Documentation complète :${NC}"
    echo "  • IMPORT_CNMV_README.md"
    echo "  • INVERCO_AUM_README.md"
    echo "  • EXTRACTION_DIRECTEURS_COMMERCIAUX.md"
    echo ""

    echo "═══════════════════════════════════════════════════════════════"
    echo ""

    exit 0
fi

echo ""
echo "Lancement du workflow complet..."
echo ""

# Run full workflow
./scripts/cnmv/import_cnmv.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  PARTIE 2 : Extraction directeurs commerciaux"
echo "════════════════════════════════════════════════════════════════"
echo ""

./scripts/cnmv/extract_all_sales_directors.sh

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ WORKFLOW COMPLET TERMINÉ"
echo "════════════════════════════════════════════════════════════════"
echo ""
