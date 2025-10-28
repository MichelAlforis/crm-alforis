#!/bin/bash
# ===========================================
# Script de diagnostic : Stabilité Uvicorn
# ===========================================
# Vérifie que le reload ne se déclenche pas de manière intempestive

set -euo pipefail

cd "$(dirname "$0")/.."

echo "🔍 Diagnostic de stabilité Uvicorn"
echo "=================================="
echo ""

# 1. Vérifier que le conteneur tourne
echo "1️⃣  État du conteneur API"
if ! docker compose ps api | grep -q "Up"; then
    echo "   ❌ Le conteneur API n'est pas démarré"
    exit 1
fi
echo "   ✅ Conteneur UP"
echo ""

# 2. Vérifier RestartCount
echo "2️⃣  Restart Count (doit être 0)"
RESTART_COUNT=$(docker inspect v1-api-1 --format='{{.RestartCount}}')
if [ "$RESTART_COUNT" -eq 0 ]; then
    echo "   ✅ RestartCount = $RESTART_COUNT"
else
    echo "   ⚠️  RestartCount = $RESTART_COUNT (le conteneur a redémarré)"
fi
echo ""

# 3. Vérifier la commande active
echo "3️⃣  Commande Uvicorn active"
docker inspect -f '{{json .Config.Cmd}}' v1-api-1 | python3 -c "
import sys, json
cmd = json.load(sys.stdin)
excludes = [arg for arg in cmd if '--reload-exclude' in ' '.join(cmd[max(0, cmd.index(arg)-1):cmd.index(arg)+2])]
print(f'   Exclusions configurées: {len(excludes)}')
if len(excludes) >= 8:
    print('   ✅ Toutes les exclusions sont présentes')
else:
    print(f'   ⚠️  Seulement {len(excludes)} exclusions trouvées (attendu: 10)')
"
echo ""

# 4. Vérifier les démarrages récents
echo "4️⃣  Activité reload (dernières 60s)"
RECENT_STARTS=0
if docker compose logs --since 65s api 2>&1 | grep -q "Started server process"; then
    RECENT_STARTS=$(docker compose logs --since 65s api 2>&1 | grep "Started server process" | wc -l | xargs)
fi

case "$RECENT_STARTS" in
    0)
        echo "   ✅ Aucun reload détecté"
        ;;
    1)
        echo "   ℹ️  1 démarrage (normal si conteneur vient d'être créé)"
        ;;
    *)
        echo "   ⚠️  $RECENT_STARTS démarrages (reload intempestif détecté!)"
        echo ""
        echo "   Derniers logs:"
        docker compose logs --tail=20 api | grep -E "(Started|Shutting|Will watch|detected)" | tail -10
        ;;
esac
echo ""

# 5. Vérifier le healthcheck
echo "5️⃣  Healthcheck API"
if curl -sf http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    echo "   ✅ API répond correctement"
else
    echo "   ❌ API ne répond pas"
    exit 1
fi
echo ""

# 6. Vérifier l'override
echo "6️⃣  Configuration override macOS"
if [ -f "docker-compose.override.yml" ]; then
    echo "   ✅ docker-compose.override.yml présent"
    if grep -q "reload-exclude" docker-compose.override.yml; then
        echo "   ✅ Exclusions configurées dans l'override"
    else
        echo "   ⚠️  Pas d'exclusions dans l'override"
    fi
else
    echo "   ⚠️  docker-compose.override.yml absent (reloads possibles)"
fi
echo ""

# 7. Test de stabilité (optionnel)
if [ "${1:-}" = "--monitor" ]; then
    echo "7️⃣  Monitoring en temps réel (30s)"
    echo "   Appuyez sur Ctrl+C pour arrêter"
    echo ""
    START_TIME=$(date +%s)
    docker compose logs --follow api &
    LOGS_PID=$!
    sleep 30
    kill $LOGS_PID 2>/dev/null || true

    END_TIME=$(date +%s)
    ELAPSED=$((END_TIME - START_TIME))
    RELOADS=$(docker compose logs --since ${ELAPSED}s api 2>&1 | grep -c "Started server process" || echo 0)

    echo ""
    echo "   Reloads détectés sur $ELAPSED s: $RELOADS"
    if [ "$RELOADS" -eq 0 ]; then
        echo "   ✅ Système stable"
    else
        echo "   ⚠️  Reloads intempestifs détectés"
    fi
fi

echo ""
echo "=================================="
echo "✅ Diagnostic terminé"
echo ""
echo "Commandes utiles:"
echo "  - Voir les logs:     docker compose logs -f api"
echo "  - Redémarrer:        docker compose restart api"
echo "  - Rebuild complet:   docker compose up -d --force-recreate api"
echo "  - Monitor 30s:       $0 --monitor"
