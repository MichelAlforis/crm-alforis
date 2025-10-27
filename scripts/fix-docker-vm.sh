#!/usr/bin/env bash
set -euo pipefail

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Fix Docker VM (sans perdre les données)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Basé sur la solution ChatGPT pour redémarrer la VM LinuxKit
# sans faire de factory reset
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "━━━ Fix Docker VM (sans perte de données) ━━━"
echo ""

# 1. Fermer Docker Desktop proprement
echo "🔄 Fermeture de Docker Desktop..."
osascript -e 'quit app "Docker"' 2>/dev/null || true
sleep 2

# 2. Tuer les processus backend
echo "🛑 Arrêt des processus backend..."
pkill -f com.docker.backend 2>/dev/null || true
pkill -f vpnkit 2>/dev/null || true
pkill -f dockerd 2>/dev/null || true
sleep 1

# 3. Supprimer les fichiers de lock
echo "🧹 Suppression des fichiers de lock..."
rm -f ~/Library/Containers/com.docker.docker/Data/docker-api.sock
rm -f ~/.docker/run/docker.sock
rm -f ~/Library/Containers/com.docker.docker/Data/backend.sock
rm -f ~/Library/Containers/com.docker.docker/Data/docker.pid
rm -f ~/Library/Containers/com.docker.docker/Data/vms/0/data/DockerDesktop.lock
echo "✅ Locks supprimés"
echo ""

# 4. Relancer Docker Desktop
echo "🚀 Redémarrage de Docker Desktop..."
open -a Docker
echo ""

# 5. Attendre que le daemon soit prêt
echo "⏳ Attente du daemon (30s max)..."
for i in {1..30}; do
  if docker info >/dev/null 2>&1; then
    echo ""
    echo "✅ Daemon opérationnel après ${i}s"
    echo ""
    docker info | grep -E "Server Version|Operating System|CPUs|Total Memory"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Docker VM redémarré avec succès!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  fi
  printf "\r⏳ %ds/30s..." "$i"
  sleep 1
done

echo ""
echo "⚠️  Daemon pas encore prêt après 30s"
echo "   Essayez d'attendre encore 10-20 secondes, puis:"
echo "   docker info"
echo ""
echo "   Si ça ne fonctionne toujours pas, essayez:"
echo "   ./scripts/fix-docker-daemon.sh --hard"
