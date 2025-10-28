#!/bin/bash
# Script de test PWA simplifié

echo "🧪 Tests PWA - TPM Finance CRM"
echo "================================"
echo ""

# Test services
echo "[1/4] Vérification des services..."
curl -s http://localhost:8000/health > /dev/null && echo "✅ API OK" || echo "❌ API KO"
curl -s http://localhost:3010 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend KO"
echo ""

# Test manifest
echo "[2/4] Vérification manifest.json..."
curl -s http://localhost:3010/manifest.json | grep -q "TPM Finance CRM" && echo "✅ Manifest valide" || echo "❌ Manifest invalide"
echo ""

# Test Service Worker
echo "[3/4] Vérification Service Worker..."
[ -f "crm-frontend/public/sw.js" ] && echo "✅ Service Worker présent" || echo "❌ Service Worker manquant"
echo ""

# Test composants
echo "[4/4] Vérification composants PWA..."
[ -f "crm-frontend/components/pwa/InstallPrompt.tsx" ] && echo "✅ InstallPrompt.tsx"
[ -f "crm-frontend/components/pwa/OfflineIndicator.tsx" ] && echo "✅ OfflineIndicator.tsx"
[ -f "crm-frontend/components/pwa/PWAManager.tsx" ] && echo "✅ PWAManager.tsx"
[ -f "crm-frontend/components/pwa/PushNotificationManager.tsx" ] && echo "✅ PushNotificationManager.tsx"
[ -f "crm-frontend/hooks/usePushNotifications.ts" ] && echo "✅ usePushNotifications.ts"
[ -f "crm-frontend/hooks/useOfflineSync.ts" ] && echo "✅ useOfflineSync.ts"
echo ""

echo "✅ Tests automatiques terminés!"
echo ""
echo "📋 TESTS MANUELS À EFFECTUER:"
echo ""
echo "1️⃣  Test Mode Offline (le plus simple)"
echo "   → Ouvrir http://localhost:3010 dans Chrome"
echo "   → F12 > Application > Service Workers > Cocher 'Offline'"
echo "   → Vérifier bannière jaune 'Mode hors ligne'"
echo "   → Décocher Offline"
echo "   → Vérifier bannière verte 'Connexion rétablie'"
echo ""
echo "2️⃣  Test Installation PWA"
echo "   → Sur Android Chrome: voir prompt installation"
echo "   → Sur iOS Safari: voir instructions + icône Partager"
echo ""
echo "3️⃣  Test Push Notifications"
echo "   → Se connecter au CRM"
echo "   → Accepter les permissions notifications"
echo "   → Tester via API (voir ci-dessous)"
echo ""
echo "4️⃣  Test Cache & Performance"
echo "   → F12 > Application > Cache Storage"
echo "   → Lighthouse > Progressive Web App > Analyze"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Pour tester les Push Notifications:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# 1. Obtenir un token (se connecter dans le navigateur et copier depuis DevTools)"
echo "# 2. Envoyer une notification test:"
echo ""
echo 'curl -X POST http://localhost:8000/api/v1/push/send \'
echo '  -H "Content-Type: application/json" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN_HERE" \'
echo '  -d '"'"'{'
echo '    "title": "Test PWA",'
echo '    "body": "Notification test réussie !",'
echo '    "url": "/dashboard"'
echo '  }'"'"
echo ""
echo "Documentation complète: checklists/08-pwa.md"
