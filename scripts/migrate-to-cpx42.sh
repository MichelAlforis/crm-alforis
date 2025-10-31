#!/bin/bash
# Migration CPX31 → CPX42
# Run on NEW CPX42 server after deploy

set -e

echo "🚀 Migration vers CPX42 (16GB RAM, 8 vCPU)..."
echo ""

# 1. Vérifier qu'on est bien sur CPX42
TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
TOTAL_CPU=$(nproc)

echo "📊 Serveur détecté:"
echo "  RAM: ${TOTAL_RAM}GB"
echo "  CPU: ${TOTAL_CPU} cores"
echo ""

if [ "$TOTAL_RAM" -lt 14 ]; then
    echo "⚠️  WARNING: RAM < 14GB (détecté ${TOTAL_RAM}GB)"
    echo "   Ce script est optimisé pour CPX42 (16GB RAM)"
    read -p "Continuer quand même ? (oui/non) [non]: " confirm
    if [ "$confirm" != "oui" ]; then
        echo "❌ Migration annulée"
        exit 1
    fi
fi

# 2. Backup config actuelle
echo "1️⃣ Backup configuration actuelle..."
cp docker-compose.yml docker-compose.yml.cpx31.backup
echo "✅ Backup: docker-compose.yml.cpx31.backup"

# 3. Déployer avec override CPX42
echo ""
echo "2️⃣ Déploiement config CPX42..."
docker compose -f docker-compose.yml -f docker-compose.cpx42.yml up -d --no-deps ollama postgres celery-worker

# 4. Attendre Ollama
echo ""
echo "3️⃣ Attente démarrage Ollama..."
sleep 15

# 5. Télécharger modèles optimaux pour CPX42
echo ""
echo "4️⃣ Setup modèles Ollama pour CPX42..."
echo ""
echo "Recommandations CPX42 (12GB RAM disponible) :"
echo ""
echo "Option A - UN SEUL MODÈLE (qualité max) :"
echo "  1) llama2:13b      (~7.3GB)   - ✅ MEILLEURE QUALITÉ"
echo "  2) mistral:7b      (~4.3GB)   - Qualité excellente, plus rapide"
echo ""
echo "Option B - DEUX MODÈLES (spécialisation) :"
echo "  3) mistral:7b + phi:2.7b  (~5.9GB total)"
echo "     → mistral pour suggestions, phi pour classification"
echo ""
read -p "Choisir (1/2/3) [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        echo "📥 Téléchargement llama2:13b (7.3GB)..."
        docker compose exec ollama ollama pull llama2:13b
        MODEL="llama2:13b"
        echo ""
        echo "✅ llama2:13b installé"
        echo "💡 Update .env:"
        echo "   OLLAMA_MODEL=llama2:13b"
        ;;
    2)
        echo "📥 Téléchargement mistral:7b (4.3GB)..."
        docker compose exec ollama ollama pull mistral:7b
        MODEL="mistral:7b"
        echo ""
        echo "✅ mistral:7b installé"
        echo "💡 Update .env:"
        echo "   OLLAMA_MODEL=mistral:7b"
        ;;
    3)
        echo "📥 Téléchargement mistral:7b + phi:2.7b (5.9GB total)..."
        docker compose exec ollama ollama pull mistral:7b &
        PID1=$!
        docker compose exec ollama ollama pull phi:2.7b &
        PID2=$!
        wait $PID1 $PID2
        MODEL="mistral:7b,phi:2.7b"
        echo ""
        echo "✅ 2 modèles installés"
        echo "💡 Update .env:"
        echo "   OLLAMA_MODEL=mistral:7b"
        echo "   OLLAMA_MODEL_CLASSIFY=phi:2.7b"
        ;;
    *)
        echo "❌ Choix invalide"
        exit 1
        ;;
esac

# 6. Test performance
echo ""
echo "5️⃣ Test performance..."
echo ""
echo "Test 1 - Latence simple:"
time docker compose exec ollama ollama run ${MODEL%%,*} "Bonjour"

echo ""
echo "Test 2 - Stats RAM:"
docker stats ollama --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

echo ""
echo "Test 3 - Models chargés:"
docker compose exec ollama curl -s http://localhost:11434/api/tags | grep name

# 7. Update Celery concurrency
echo ""
echo "6️⃣ Vérification Celery (concurrency: 4)..."
docker compose logs celery-worker | grep concurrency

# 8. Résumé
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ Migration CPX42 TERMINÉE"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📊 Nouvelles capacités:"
echo "  - Ollama: 12GB RAM (vs 5GB CPX31)"
echo "  - Ollama CPU: 4 cores (vs 2 CPX31)"
echo "  - Requêtes parallèles: 4 (vs 2 CPX31)"
echo "  - Modèles en mémoire: 2 (vs 1 CPX31)"
echo "  - Celery workers: 4 (vs 2 CPX31)"
echo "  - Postgres connections: 100 (vs 50 CPX31)"
echo ""
echo "🎯 Modèle(s) installé(s): $MODEL"
echo ""
echo "⚡ Performance attendue:"
echo "  - Latence: ~200-500ms (vs 300-800ms CPX31)"
echo "  - Throughput: 4x requêtes parallèles"
echo "  - Qualité: ${choice}1${choice} = Meilleure${choice}fi${choice}"
echo ""
echo "📝 TODO:"
echo "  1. Update .env avec nouvelles variables"
echo "  2. Redéployer API: docker compose restart api"
echo "  3. Tester suggestions IA via UI"
echo "  4. Monitorer RAM: watch 'docker stats --no-stream'"
echo ""
