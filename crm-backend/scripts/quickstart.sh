#!/bin/bash

# 🚀 CRM BACKEND - QUICK START
# Ce script vous aide à démarrer rapidement

set -e

echo "======================================"
echo "   TPM Finance CRM - Quick Start"
echo "======================================"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier Docker
echo "🔍 Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo "   Téléchargez Docker: https://www.docker.com"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker et Docker Compose trouvés${NC}"

# Aller dans le répertoire du projet
cd "$(dirname "$0")/crm-backend" || exit

echo ""
echo "📁 Répertoire du projet: $(pwd)"

# Créer .env s'il n'existe pas
if [ ! -f .env ]; then
    echo ""
    echo "📝 Création du fichier .env..."
    cp .env.example .env
    echo -e "${GREEN}✅ .env créé (utilise les valeurs par défaut)${NC}"
fi

# Démarrer les services
echo ""
echo "🚀 Démarrage des services..."
docker-compose up -d

echo ""
echo "⏳ Attente du démarrage de la BD..."
sleep 5

# Vérifier la santé
echo ""
echo "🏥 Vérification de la santé..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✅ API est prête!${NC}"
        break
    fi
    echo "⏳ Tentative $((ATTEMPT + 1))/$MAX_ATTEMPTS..."
    sleep 1
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    echo -e "${RED}❌ L'API n'a pas démarré à temps${NC}"
    echo "   Vérifiez: docker-compose logs -f api"
    exit 1
fi

# Afficher les URLs
echo ""
echo "======================================"
echo -e "${GREEN}✨ Succès! Accédez à l'API:${NC}"
echo "======================================"
echo ""
echo "📚 Documentation interactive:"
echo "   🔗 http://localhost:8000/docs"
echo ""
echo "📖 Documentation alternative:"
echo "   🔗 http://localhost:8000/redoc"
echo ""
echo "❤️  Health check:"
echo "   🔗 http://localhost:8000/health"
echo ""
echo "======================================"

# Afficher les logs
echo ""
read -p "Voulez-vous voir les logs? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker-compose logs -f api
fi