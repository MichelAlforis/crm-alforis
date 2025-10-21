#!/bin/bash

# Script de vérification PWA
# Usage: ./verify-pwa.sh

echo "🔍 Vérification de la configuration PWA..."
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Compteurs
PASS=0
FAIL=0

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $2 - MANQUANT: $1"
        ((FAIL++))
    fi
}

check_in_file() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} $3"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $3 - Non trouvé dans $1"
        ((FAIL++))
    fi
}

echo "📦 Fichiers de configuration:"
check_file "next.config.js" "next.config.js existe"
check_file "public/manifest.json" "manifest.json existe"
check_file ".gitignore" ".gitignore existe"

echo ""
echo "🔧 Configuration next.config.js:"
check_in_file "next.config.js" "withPWA" "withPWA configuré"
check_in_file "next.config.js" "runtimeCaching" "Stratégies de cache configurées"

echo ""
echo "📱 Composants PWA:"
check_file "components/pwa/InstallPrompt.tsx" "InstallPrompt component"
check_file "components/pwa/OfflineIndicator.tsx" "OfflineIndicator component"
check_file "hooks/useOnlineStatus.ts" "useOnlineStatus hook"

echo ""
echo "🎨 Layout et métadonnées:"
check_in_file "app/layout.tsx" "manifest:" "Manifest référencé dans layout"
check_in_file "app/layout.tsx" "appleWebApp" "Apple Web App configuré"
check_in_file "app/dashboard/layout.tsx" "InstallPrompt" "InstallPrompt intégré"
check_in_file "app/dashboard/layout.tsx" "OfflineIndicator" "OfflineIndicator intégré"

echo ""
echo "🏗️  Build artifacts:"
if [ -f "public/sw.js" ]; then
    SIZE=$(ls -lh public/sw.js | awk '{print $5}')
    echo -e "${GREEN}✓${NC} Service Worker généré (${SIZE})"
    ((PASS++))
else
    echo -e "${YELLOW}⚠${NC}  Service Worker non généré - Exécuter 'npm run build'"
fi

echo ""
echo "📋 Manifest.json:"
if [ -f "public/manifest.json" ]; then
    if command -v jq &> /dev/null; then
        NAME=$(jq -r '.name' public/manifest.json 2>/dev/null)
        ICONS=$(jq '.icons | length' public/manifest.json 2>/dev/null)
        SHORTCUTS=$(jq '.shortcuts | length' public/manifest.json 2>/dev/null)

        echo -e "${GREEN}✓${NC} Nom: $NAME"
        echo -e "${GREEN}✓${NC} Icônes: $ICONS"
        echo -e "${GREEN}✓${NC} Raccourcis: $SHORTCUTS"
        ((PASS+=3))
    else
        echo -e "${YELLOW}⚠${NC}  jq non installé - impossible de valider le JSON"
    fi
fi

echo ""
echo "📦 Dépendances:"
check_in_file "package.json" "@ducanh2912/next-pwa" "next-pwa installé"

echo ""
echo "═══════════════════════════════════════"
echo -e "Résultats: ${GREEN}${PASS} ✓${NC} | ${RED}${FAIL} ✗${NC}"

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🎉 Configuration PWA complète !${NC}"
    echo ""
    echo "Prochaines étapes:"
    echo "1. npm run build  - Générer le service worker"
    echo "2. npm start      - Tester en production"
    echo "3. Ouvrir http://localhost:3010 dans Chrome"
    echo "4. DevTools → Application → Service Workers"
    exit 0
else
    echo -e "${RED}❌ Erreurs détectées dans la configuration${NC}"
    exit 1
fi
