#!/bin/bash
# ===========================================
# SCRIPT DE DÉMARRAGE PROPRE - NEXT.JS
# ===========================================
# Compatible Docker + local
# Nettoie les caches avant démarrage

PORT=${PORT:-3010}

echo "🔍 Environnement détecté..."
if [ -f /.dockerenv ]; then
  echo "   📦 Exécution dans Docker"
  DOCKER_ENV=true
else
  echo "   💻 Exécution en local"
  DOCKER_ENV=false
fi

# --- Vérification du port (LOCAL UNIQUEMENT) ---
if [ "$DOCKER_ENV" = false ]; then
  echo "🔍 Vérification du port $PORT..."

  if command -v lsof >/dev/null 2>&1; then
    PID=$(lsof -t -i:$PORT 2>/dev/null)

    if [ -n "$PID" ]; then
      echo "⚠️  Port $PORT déjà utilisé par le processus $PID. Suppression..."
      kill -9 $PID 2>/dev/null
      sleep 1
      echo "✅ Processus $PID tué."
    else
      echo "✅ Aucun processus ne bloque le port $PORT."
    fi
  else
    echo "⚠️  Commande 'lsof' non disponible. Vérification du port ignorée."
  fi
fi

# --- Nettoyage des fichiers système (macOS) ---
echo "🧹 Suppression des fichiers .DS_Store..."
find . -name ".DS_Store" -type f -delete 2>/dev/null || true
echo "✅ Tous les fichiers .DS_Store ont été supprimés."

# --- Nettoyage Next.js ---
echo "🧹 Nettoyage Next.js (.next + cache)..."
if command -v npx >/dev/null 2>&1; then
  npx next clean 2>/dev/null || rm -rf .next
else
  rm -rf .next
fi
rm -rf node_modules/.cache 2>/dev/null || true
echo "✅ Build et cache Next.js supprimés."

# --- Lancement ---
echo "🚀 Lancement du serveur Next.js sur le port $PORT..."
echo "   🌐 URL: http://localhost:$PORT"
echo ""

PORT=$PORT npm run dev
