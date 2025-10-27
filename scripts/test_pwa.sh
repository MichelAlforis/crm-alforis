#!/bin/bash
# Script de test PWA - Chapitre 8
# Vérifie toutes les fonctionnalités Progressive Web App

set -e

echo "🧪 Tests PWA - TPM Finance CRM"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:3010"

echo -e "${BLUE}📋 Pré-requis${NC}"
echo "- Navigateur: Chrome, Edge ou Safari"
echo "- Services Docker running"
echo "- Compte utilisateur créé"
echo ""

# Test 1: Services running
echo -e "${YELLOW}[TEST 1/6]${NC} Vérification des services..."
if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ API disponible${NC} ($API_URL)"
else
    echo -e "${RED}❌ API non disponible${NC}"
    exit 1
fi

if curl -s "$FRONTEND_URL" > /dev/null; then
    echo -e "${GREEN}✅ Frontend disponible${NC} ($FRONTEND_URL)"
else
    echo -e "${RED}❌ Frontend non disponible${NC}"
    exit 1
fi
echo ""

# Test 2: Manifest.json
echo -e "${YELLOW}[TEST 2/6]${NC} Vérification manifest.json..."
MANIFEST=$(curl -s "$FRONTEND_URL/manifest.json")
if echo "$MANIFEST" | grep -q "TPM Finance CRM"; then
    echo -e "${GREEN}✅ Manifest.json valide${NC}"
    echo "   - Name: $(echo "$MANIFEST" | grep -o '"name":"[^"]*"' | head -1)"
    echo "   - Icons: $(echo "$MANIFEST" | grep -c '"src"') icônes trouvées"
    echo "   - Shortcuts: $(echo "$MANIFEST" | grep -c '"url"') raccourcis"
else
    echo -e "${RED}❌ Manifest.json invalide${NC}"
fi
echo ""

# Test 3: Service Worker
echo -e "${YELLOW}[TEST 3/6]${NC} Vérification Service Worker..."
if [ -f "crm-frontend/public/sw.js" ]; then
    echo -e "${GREEN}✅ Service Worker présent${NC} (crm-frontend/public/sw.js)"
    SW_SIZE=$(wc -c < crm-frontend/public/sw.js)
    echo "   - Taille: $SW_SIZE bytes"
else
    echo -e "${RED}❌ Service Worker manquant${NC}"
fi
echo ""

# Test 4: Push Notifications API
echo -e "${YELLOW}[TEST 4/6]${NC} Vérification API Push Notifications..."

# Get token (à adapter selon ton système d'auth)
echo "   ℹ️  Authentification requise pour tester l'API"
echo "   → Endpoint: POST $API_URL/api/v1/push/subscribe"
echo "   → Headers: Authorization: Bearer <token>"
echo ""

# Test 5: Build production (optionnel)
echo -e "${YELLOW}[TEST 5/6]${NC} Vérification configuration PWA..."
if grep -q "withPWA" crm-frontend/next.config.js; then
    echo -e "${GREEN}✅ PWA configuré dans next.config.js${NC}"
    echo "   - Plugin: @ducanh2912/next-pwa"
    echo "   - Destination: public/"
else
    echo -e "${RED}❌ Configuration PWA manquante${NC}"
fi
echo ""

# Test 6: Composants PWA
echo -e "${YELLOW}[TEST 6/6]${NC} Vérification composants PWA..."

COMPONENTS=(
    "crm-frontend/components/pwa/InstallPrompt.tsx"
    "crm-frontend/components/pwa/OfflineIndicator.tsx"
    "crm-frontend/components/pwa/PWAManager.tsx"
    "crm-frontend/components/pwa/PushNotificationManager.tsx"
)

for component in "${COMPONENTS[@]}"; do
    if [ -f "$component" ]; then
        echo -e "${GREEN}✅ $(basename "$component")${NC}"
    else
        echo -e "${RED}❌ $(basename "$component") manquant${NC}"
    fi
done
echo ""

# Instructions manuelles
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📱 Tests Manuels à Effectuer${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${YELLOW}1️⃣  Test Installation PWA (Android Chrome)${NC}"
echo "   1. Ouvrir Chrome sur Android"
echo "   2. Naviguer vers $FRONTEND_URL"
echo "   3. Se connecter au CRM"
echo "   4. Attendre le prompt 'Ajouter à l'écran d'accueil'"
echo "   5. Cliquer sur 'Installer'"
echo "   6. Vérifier l'icône sur l'écran d'accueil"
echo ""

echo -e "${YELLOW}2️⃣  Test Installation PWA (iOS Safari)${NC}"
echo "   1. Ouvrir Safari sur iOS"
echo "   2. Naviguer vers $FRONTEND_URL"
echo "   3. Se connecter au CRM"
echo "   4. Voir les instructions d'installation iOS"
echo "   5. Appuyer sur le bouton Partager"
echo "   6. Sélectionner 'Sur l'écran d'accueil'"
echo "   7. Appuyer sur 'Ajouter'"
echo ""

echo -e "${YELLOW}3️⃣  Test Mode Offline${NC}"
echo "   1. Ouvrir l'app dans Chrome"
echo "   2. Se connecter et naviguer dans le CRM"
echo "   3. Ouvrir DevTools (F12)"
echo "   4. Aller dans 'Application' > 'Service Workers'"
echo "   5. Cocher 'Offline'"
echo "   6. ✅ Vérifier bannière jaune 'Mode hors ligne'"
echo "   7. Naviguer dans l'app (pages cachées doivent fonctionner)"
echo "   8. Décocher 'Offline'"
echo "   9. ✅ Vérifier bannière verte 'Connexion rétablie'"
echo ""

echo -e "${YELLOW}4️⃣  Test Push Notifications${NC}"
echo "   1. Se connecter au CRM"
echo "   2. Attendre le prompt de notifications"
echo "   3. Cliquer sur 'Activer'"
echo "   4. Accepter les permissions navigateur"
echo "   5. Tester l'envoi via API:"
echo ""
echo "   curl -X POST '$API_URL/api/v1/push/send' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -H 'Authorization: Bearer <YOUR_TOKEN>' \\"
echo "     -d '{
echo "       \"title\": \"Test PWA\","
echo "       \"body\": \"Notification test réussie !\","
echo "       \"url\": \"/dashboard\""
echo "     }'"
echo ""
echo "   6. ✅ Vérifier réception de la notification"
echo "   7. Cliquer sur la notification"
echo "   8. ✅ Vérifier que l'app s'ouvre sur /dashboard"
echo ""

echo -e "${YELLOW}5️⃣  Test Cache Strategies${NC}"
echo "   1. Ouvrir DevTools (F12)"
echo "   2. Aller dans 'Application' > 'Cache Storage'"
echo "   3. ✅ Vérifier présence des caches:"
echo "      - workbox-runtime"
echo "      - google-fonts-webfonts"
echo "      - static-image-assets"
echo "      - static-js-assets"
echo "      - static-style-assets"
echo "      - api-cache"
echo "   4. Aller dans 'Network' tab"
echo "   5. Recharger la page (Ctrl+R)"
echo "   6. ✅ Vérifier colonnes 'Size' indiquent '(disk cache)' ou '(service worker)'"
echo ""

echo -e "${YELLOW}6️⃣  Test Performance (Lighthouse)${NC}"
echo "   1. Build production:"
echo "      cd crm-frontend && npm run build && npm start"
echo "   2. Ouvrir Chrome"
echo "   3. Naviguer vers $FRONTEND_URL"
echo "   4. Ouvrir DevTools (F12)"
echo "   5. Aller dans 'Lighthouse' tab"
echo "   6. Sélectionner 'Progressive Web App'"
echo "   7. Cliquer sur 'Analyze page load'"
echo "   8. ✅ Vérifier score PWA > 90"
echo "   9. ✅ Vérifier 'Installable'"
echo "   10. ✅ Vérifier 'Fast and reliable'"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}🔍 Debug Tools${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Chrome DevTools Application Tab:"
echo "  • Service Workers: État et debug SW"
echo "  • Manifest: Validation manifest.json"
echo "  • Storage > Local Storage: Queue offline sync"
echo "  • Cache Storage: Contenu des caches"
echo ""
echo "Console logs à surveiller:"
echo "  • [PWA] Service Worker ready"
echo "  • [PWA] Network: Online/Offline"
echo "  • [Push] Subscription status"
echo "  • [OfflineSync] Queue management"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Tests automatiques terminés !${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📖 Documentation complète: checklists/08-pwa.md"
echo ""
