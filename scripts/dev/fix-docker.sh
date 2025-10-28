#!/bin/bash
# ===========================================
# FIX DOCKER DESKTOP - Script de dépannage
# ===========================================
# Redémarre Docker Desktop proprement et attend qu'il soit prêt

echo "🔧 Fix Docker Desktop"
echo ""

# Arrêt propre
echo "1️⃣  Arrêt de Docker Desktop..."
osascript -e 'quit app "Docker"' 2>/dev/null
sleep 3

# Nettoyage du socket s'il est bloqué
if [ -S ~/.docker/run/docker.sock ]; then
  echo "2️⃣  Nettoyage du socket..."
  rm -f ~/.docker/run/docker.sock 2>/dev/null || true
fi

# Redémarrage
echo "3️⃣  Démarrage de Docker Desktop..."
open -a Docker
echo ""

# Attente intelligente avec barre de progression
echo "4️⃣  Attente de la disponibilité (max 90s)..."
for i in {1..45}; do
  if docker info >/dev/null 2>&1; then
    echo ""
    echo "✅ Docker Desktop est prêt !"
    echo ""
    docker info | grep -E "Server Version|Operating System|CPUs|Total Memory" || true
    echo ""
    echo "Vous pouvez maintenant lancer: npm run dev"
    exit 0
  fi

  # Barre de progression
  progress=$((i * 100 / 45))
  bar=$(printf "%0.s█" $(seq 1 $((progress / 5))))
  spaces=$(printf "%0.s " $(seq 1 $((20 - progress / 5))))
  printf "\r  [%s%s] %d%% (%ds)" "$bar" "$spaces" "$progress" $((i * 2))

  sleep 2
done

echo ""
echo ""
echo "❌ Docker ne répond toujours pas après 90s"
echo ""
echo "Solutions manuelles:"
echo "  1. Ouvrez Docker Desktop depuis le Finder/Applications"
echo "  2. Vérifiez les erreurs dans l'interface Docker Desktop"
echo "  3. Redémarrez votre Mac si le problème persiste"
exit 1
