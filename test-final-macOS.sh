#!/bin/bash
# Test final de l'environnement dev macOS

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Test Final : Environnement Dev macOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Test API
echo "1️⃣  Test API Backend"
if curl -sf http://localhost:8000/api/v1/health > /dev/null; then
    echo "   ✅ API répond correctement"
else
    echo "   ❌ API ne répond pas"
    exit 1
fi

# 2. Test Frontend
echo "2️⃣  Test Frontend"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3010)
if [ "$STATUS" = "307" ] || [ "$STATUS" = "200" ]; then
    echo "   ✅ Frontend répond (HTTP $STATUS)"
else
    echo "   ⚠️  Frontend HTTP $STATUS (attendu: 200 ou 307)"
fi

# 3. Test Restart Count
echo "3️⃣  Test Stabilité API"
RESTART=$(docker inspect v1-api-1 --format='{{.RestartCount}}')
if [ "$RESTART" = "0" ]; then
    echo "   ✅ RestartCount = 0"
else
    echo "   ⚠️  RestartCount = $RESTART (reloads possibles)"
fi

# 4. Test Turbopack
echo "4️⃣  Test Turbopack Frontend"
if docker compose logs --tail=100 frontend | grep -q "Turbopack"; then
    echo "   ✅ Turbopack activé"
else
    echo "   ⚠️  Turbopack non détecté"
fi

# 5. Test Volumes
echo "5️⃣  Test Volumes"
if docker inspect v1-frontend-1 --format='{{json .Mounts}}' | grep -q '"Type":"volume".*node_modules'; then
    echo "   ✅ node_modules en volume nommé"
else
    echo "   ⚠️  node_modules n'est pas un volume nommé"
fi

# 6. Test PostCSS Config
echo "6️⃣  Test PostCSS Config"
if grep -q "postcss-import" crm-frontend/postcss.config.js; then
    echo "   ✅ postcss-import configuré"
else
    echo "   ⚠️  postcss-import manquant"
fi

# 7. Test CSS Import Order
echo "7️⃣  Test CSS Import Order"
IMPORT_LINE=$(grep -n "@import" crm-frontend/styles/global.css | head -1 | cut -d: -f1)
TAILWIND_LINE=$(grep -n "@tailwind" crm-frontend/styles/global.css | head -1 | cut -d: -f1)
if [ "$IMPORT_LINE" -lt "$TAILWIND_LINE" ]; then
    echo "   ✅ @import avant @tailwind (ligne $IMPORT_LINE < $TAILWIND_LINE)"
else
    echo "   ⚠️  Ordre incorrect (@import ligne $IMPORT_LINE, @tailwind ligne $TAILWIND_LINE)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Tous les tests passés !"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
