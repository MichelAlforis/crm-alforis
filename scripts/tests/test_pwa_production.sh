#!/bin/bash
# Build et test PWA en mode production
# Le mode dev ne cache RIEN (NetworkOnly strategy)

set -e

echo "🏗️  Build PWA en mode Production"
echo "=================================="
echo ""
echo "⚠️  Le mode dev ne cache RIEN !"
echo "   → SW utilise NetworkOnly strategy"
echo "   → Aucun cache = aucune fonctionnalité offline"
echo ""
echo "Pour tester offline, il FAUT builder en production."
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd crm-frontend

echo -e "${YELLOW}[1/4]${NC} Nettoyage..."
rm -rf .next
rm -rf public/sw.js public/workbox-*.js

echo -e "${YELLOW}[2/4]${NC} Build production..."
echo "   (Cela peut prendre 1-2 minutes)"
npm run build

echo ""
echo -e "${YELLOW}[3/4]${NC} Vérification du Service Worker..."
if [ -f "public/sw.js" ]; then
    SW_SIZE=$(wc -c < public/sw.js)
    echo -e "${GREEN}✅ Service Worker généré${NC} ($SW_SIZE bytes)"

    # Vérifier les stratégies de cache
    if grep -q "CacheFirst\|NetworkFirst\|StaleWhileRevalidate" public/sw.js; then
        echo -e "${GREEN}✅ Stratégies de cache configurées${NC}"
    else
        echo -e "${YELLOW}⚠️  Stratégies de cache manquantes${NC}"
    fi
else
    echo -e "${RED}❌ Service Worker NON généré${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}[4/4]${NC} Démarrage serveur production..."
echo "   Serveur sur http://localhost:3010"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Build terminé !${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "📱 Pour tester le mode offline :"
echo ""
echo "1. Ouvrir http://localhost:3010"
echo "2. F12 > Application > Service Workers"
echo "3. Attendre que SW soit 'activated'"
echo "4. Naviguer dans l'app (2-3 pages)"
echo "5. Cocher 'Offline'"
echo "6. ✅ Les pages visitées chargent depuis le cache !"
echo ""
echo "Appuyer sur Ctrl+C pour arrêter le serveur"
echo ""

npm start
