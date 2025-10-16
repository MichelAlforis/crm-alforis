#!/bin/bash

PORT=3010

echo "🔍 Vérification du port $PORT..."

PID=$(lsof -t -i:$PORT)

if [ -n "$PID" ]; then
  echo "⚠️  Port $PORT déjà utilisé par le processus $PID. Suppression..."
  kill -9 $PID
  echo "✅ Processus $PID tué."
else
  echo "✅ Aucun processus ne bloque le port $PORT."
fi

echo "🧹 Suppression des fichiers .DS_Store..."
find . -name ".DS_Store" -type f -delete
echo "✅ Tous les fichiers .DS_Store ont été supprimés."

echo "🧹 Nettoyage Next.js (.next + cache)..."
if command -v npx >/dev/null 2>&1; then
  npx next clean
else
  rm -rf .next
fi
rm -rf node_modules/.cache
echo "✅ Build et cache Next.js supprimés."

echo "🚀 Lancement du serveur sur le port $PORT..."
PORT=$PORT npm run dev
