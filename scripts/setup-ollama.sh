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
echo "Choix disponibles (du plus petit au plus gros):"
echo "  1) tinyllama:1.1b  (~637MB)   - Le plus rapide, qualité correcte"
echo "  2) phi:2.7b        (~1.6GB)   - Bon compromis"
echo "  3) mistral:7b      (~4.3GB)   - ⚠️ RISQUE CRASH sur CPX31"
echo ""
read -p "Choisir (1/2/3) [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        MODEL="tinyllama:1.1b"
        ;;
    2)
        MODEL="phi:2.7b"
        ;;
    3)
        echo "⚠️  ATTENTION: mistral:7b peut saturer la RAM du CPX31"
        read -p "Confirmer ? (oui/non) [non]: " confirm
        if [ "$confirm" != "oui" ]; then
            echo "❌ Annulé"
            exit 1
        fi
        MODEL="mistral:7b"
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
