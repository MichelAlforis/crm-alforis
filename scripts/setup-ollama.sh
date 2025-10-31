#!/bin/bash
# Setup Ollama avec modèle LÉGER pour CPX31
# Évite crash comme sur MacBook (Mistral 7B = 4.3GB RAM)

set -e

echo "🚀 Setup Ollama pour CPX31 (8GB RAM)..."

# 1. Démarrer Ollama
echo "1️⃣ Démarrage Ollama..."
docker compose up -d ollama
sleep 10

# 2. Vérifier health
echo "2️⃣ Health check..."
docker compose exec ollama curl -f http://localhost:11434/api/tags || {
    echo "❌ Ollama pas démarré"
    exit 1
}

echo "✅ Ollama démarré"

# 3. Télécharger modèle LÉGER (phi ou tinyllama)
echo ""
echo "3️⃣ Téléchargement modèle LÉGER..."
echo ""
echo "Choix disponibles (CPX31: 8GB RAM, ~6.9GB libre):"
echo "  1) mistral:7b      (~4.3GB)   - ✅ RECOMMANDÉ - Meilleure qualité"
echo "  2) phi:2.7b        (~1.6GB)   - Plus rapide, bonne qualité"
echo "  3) tinyllama:1.1b  (~637MB)   - Le plus rapide, qualité OK"
echo ""
read -p "Choisir (1/2/3) [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        MODEL="mistral:7b"
        ;;
    2)
        MODEL="phi:2.7b"
        ;;
    3)
        MODEL="tinyllama:1.1b"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

echo "📥 Téléchargement de $MODEL..."
docker compose exec ollama ollama pull $MODEL

# 4. Tester le modèle
echo ""
echo "4️⃣ Test du modèle..."
docker compose exec ollama ollama run $MODEL "Bonjour, qui es-tu ?"

echo ""
echo "✅ Ollama configuré avec succès !"
echo ""
echo "📊 Stats RAM Ollama:"
docker stats ollama --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "💡 Configuration .env recommandée:"
echo "OLLAMA_BASE_URL=http://ollama:11434"
echo "OLLAMA_MODEL=$MODEL"
echo "OLLAMA_ENABLE_FALLBACK=true"
echo "OLLAMA_FALLBACK_MODEL=gpt-3.5-turbo"
