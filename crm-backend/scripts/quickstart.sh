#!/bin/bash
# ===========================================
# 🚀 CRM BACKEND - QUICK START (Docker v2)
# ===========================================

set -e

echo "======================================"
echo "   TPM Finance CRM - Quick Start"
echo "======================================"
echo ""

# ---- Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ---- Vérification Docker
echo "🔍 Vérification Docker et Compose..."

if ! command -v docker &> /dev/null; then
  echo -e "${RED}❌ Docker non installé${NC}"
  echo "   https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo -e "${RED}❌ Docker Compose v2 non disponible${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker et Compose détectés${NC}"

# ---- Nettoyage préalable
echo ""
echo "🧹 Nettoyage d'anciennes instances..."
docker compose down -v --remove-orphans >/dev/null 2>&1 || true

# ---- Création du .env si besoin
ENV_FILE="./crm-backend/.env.local"
if [ ! -f "$ENV_FILE" ]; then
  echo "📝 Création de $ENV_FILE à partir de .env.example..."
  cp ./crm-backend/.env.example "$ENV_FILE" 2>/dev/null || touch "$ENV_FILE"
  echo -e "${GREEN}✅ $ENV_FILE créé${NC}"
fi

# ---- Démarrage du stack (sans frontend)
echo ""
echo "🚀 Démarrage du backend (Postgres + API)..."
docker compose up -d postgres api

# ---- Attente de la santé
echo ""
echo "🏥 Vérification de la santé de l’API..."
MAX_ATTEMPTS=30
ATTEMPT=0
API_URL="http://localhost:8000/health"

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if curl -s "$API_URL" > /dev/null; then
    echo -e "${GREEN}✅ API est prête !${NC}"
    break
  fi
  echo "⏳ Tentative $((ATTEMPT + 1))/$MAX_ATTEMPTS..."
  sleep 2
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo -e "${RED}❌ API non accessible après 60s${NC}"
  echo "   Logs: docker compose logs -f api"
  exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}✨ Succès ! Accédez à l'API :${NC}"
echo "======================================"
echo ""
echo "📚 Swagger UI → http://localhost:8000/docs"
echo "📖 ReDoc       → http://localhost:8000/redoc"
echo "❤️ Healthcheck → http://localhost:8000/health"
echo ""
echo "======================================"
echo ""
read -p "Voir les logs de l’API ? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  docker compose logs -f api
fi
