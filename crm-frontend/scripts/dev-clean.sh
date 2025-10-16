#!/bin/bash
# ===========================================
# SCRIPT DE DÉMARRAGE PROPRE - NEXT.JS
# ===========================================

set -e

PORT=${PORT:-3010}

echo "🔍 Environnement détecté..."
if [ -f /.dockerenv ]; then
  echo "📦 Exécution dans Docker (environnement contrôlé)"
  DOCKER_ENV=true
else
  echo "💻 Exécution en local"
  DOCKER_ENV=false
fi

# --- Nettoyage fichiers inutiles ---
echo "🧹 Suppression des fichiers .DS_Store..."
find . -name ".DS_Store" -type f -delete 2>/dev/null || true

# --- Nettoyage Next.js ---
echo "🧹 Nettoyage Next.js (.next + cache)..."
rm -rf .next node_modules/.cache 2>/dev/null || true
echo "✅ Cache Next.js supprimé."

# --- Lancement ---
if [ "$DOCKER_ENV" = false ]; then
  echo "🚀 Démarrage local du serveur Next.js sur le port $PORT..."
  echo "   🌐 http://localhost:$PORT"
  PORT=$PORT npm run dev
else
  echo "🚀 Démarrage Docker du serveur Next.js sur le port $PORT..."
  echo "   🌐 http://localhost:$PORT"
  exec npm run dev -- --port "$PORT"
fi
