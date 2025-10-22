#!/bin/bash

# ===========================================
# SCRIPT DE DÉPLOIEMENT EN PRODUCTION
# CRM Alforis Finance
# ===========================================

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   DÉPLOIEMENT EN PRODUCTION${NC}"
echo -e "${BLUE}   CRM Alforis Finance${NC}"
echo -e "${BLUE}=======================================${NC}\n"

# --- Vérifications préliminaires ---
echo -e "${YELLOW}📋 Vérifications préliminaires...${NC}"

# Déterminer le fichier docker-compose à utiliser
DEFAULT_COMPOSE_FILE="docker-compose.prod.yml"
FALLBACK_COMPOSE_FILE="docker-compose.yml"

if [ -n "${COMPOSE_FILE_OVERRIDE:-}" ]; then
    COMPOSE_FILE="$COMPOSE_FILE_OVERRIDE"
elif [ -n "${COMPOSE_FILE:-}" ]; then
    COMPOSE_FILE="$COMPOSE_FILE"
elif [ -f "$DEFAULT_COMPOSE_FILE" ]; then
    COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
elif [ -f "$FALLBACK_COMPOSE_FILE" ]; then
    COMPOSE_FILE="$FALLBACK_COMPOSE_FILE"
else
    COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
fi

if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}❌ Erreur: aucun fichier docker-compose trouvé (recherché: $COMPOSE_FILE, $DEFAULT_COMPOSE_FILE, $FALLBACK_COMPOSE_FILE)${NC}"
    echo -e "${RED}   Êtes-vous dans le bon répertoire ?${NC}"
    exit 1
fi

if [ "$COMPOSE_FILE" = "$FALLBACK_COMPOSE_FILE" ]; then
    echo -e "${YELLOW}⚠️  Utilisation de $COMPOSE_FILE (fallback). Pensez à conserver un fichier $DEFAULT_COMPOSE_FILE si possible.${NC}"
fi

DEFAULT_ENV_FILE=".env.production"
FALLBACK_ENV_FILE=".env"

if [ -n "${ENV_FILE_OVERRIDE:-}" ]; then
    ROOT_ENV_FILE="$ENV_FILE_OVERRIDE"
elif [ -f "$DEFAULT_ENV_FILE" ]; then
    ROOT_ENV_FILE="$DEFAULT_ENV_FILE"
elif [ -f "$FALLBACK_ENV_FILE" ]; then
    ROOT_ENV_FILE="$FALLBACK_ENV_FILE"
else
    ROOT_ENV_FILE=""
fi

if [ -z "$ROOT_ENV_FILE" ]; then
    echo -e "${RED}❌ Aucun fichier d'environnement trouvé (recherché: $DEFAULT_ENV_FILE et $FALLBACK_ENV_FILE)${NC}"
    echo -e "${YELLOW}   Créez-le à partir de .env.production.example${NC}"
    exit 1
fi

if [ "$ROOT_ENV_FILE" = "$FALLBACK_ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Utilisation de $ROOT_ENV_FILE (fallback). Assurez-vous que $COMPOSE_FILE l'utilise.${NC}"
fi

ENV_FILENAME=$(basename "$ROOT_ENV_FILE")
ENV_FILE_VALUE="$ROOT_ENV_FILE"
export COMPOSE_ENV_FILE="$ENV_FILE_VALUE"

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    exit 1
fi

# Vérifier la disponibilité de docker compose (v1 ou plugin v2)
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD=(docker-compose)
    COMPOSE_CMD_STRING="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD=(docker compose)
    COMPOSE_CMD_STRING="docker compose"
else
    echo -e "${RED}❌ docker-compose (ou le plugin docker compose) n'est pas installé${NC}"
    exit 1
fi

# Vérifier les fichiers .env
if [ ! -f "$ROOT_ENV_FILE" ]; then
    echo -e "${RED}❌ Fichier $ROOT_ENV_FILE introuvable${NC}"
    echo -e "${YELLOW}   Créez-le à partir de .env.production.example${NC}"
    exit 1
fi

if [ ! -f "crm-backend/.env.production.local" ]; then
    echo -e "${YELLOW}⚠️  Fichier crm-backend/.env.production.local introuvable${NC}"
    echo -e "${YELLOW}   Créez-le à partir de crm-backend/.env.production.example${NC}"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if [ ! -f "crm-frontend/.env.production.local" ]; then
    echo -e "${YELLOW}⚠️  Fichier crm-frontend/.env.production.local introuvable${NC}"
    echo -e "${YELLOW}   Créez-le à partir de crm-frontend/.env.production.example${NC}"
    read -p "Continuer quand même ? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Vérifications préliminaires OK${NC}\n"

# --- Demander confirmation ---
echo -e "${YELLOW}⚠️  ATTENTION: Vous êtes sur le point de déployer en PRODUCTION${NC}"
read -p "Êtes-vous sûr de vouloir continuer ? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Déploiement annulé${NC}"
    exit 1
fi

# --- Backup de la base de données (si elle existe) ---
echo -e "\n${YELLOW}💾 Backup de la base de données...${NC}"
if "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
    BACKUP_FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql"
    mkdir -p backups

    "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" exec -T postgres pg_dump -U crm_user crm_db > "$BACKUP_FILE" 2>/dev/null || true

    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
    else
        echo -e "${YELLOW}⚠️  Aucun backup créé (base de données vide ou inexistante)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Base de données non trouvée, pas de backup${NC}"
fi

# --- Arrêter les conteneurs existants ---
echo -e "\n${YELLOW}🛑 Arrêt des conteneurs existants...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" down

# --- Pull des dernières images ---
echo -e "\n${YELLOW}📥 Pull des dernières images...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" pull || true

# --- Build des images ---
echo -e "\n${YELLOW}🔨 Build des images...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" build --no-cache

# --- Démarrer les services ---
echo -e "\n${YELLOW}🚀 Démarrage des services...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" up -d

# --- Attendre que les services soient prêts ---
echo -e "\n${YELLOW}⏳ Attente du démarrage des services...${NC}"
sleep 10

# --- Vérifier l'état des services ---
echo -e "\n${YELLOW}🔍 Vérification de l'état des services...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" ps

# --- Appliquer les migrations ---
echo -e "\n${YELLOW}🗄️  Application des migrations de base de données...${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" exec -T api alembic upgrade head || echo -e "${YELLOW}⚠️  Migrations non appliquées (alembic peut ne pas être configuré)${NC}"

# --- Tests de connectivité ---
echo -e "\n${YELLOW}🧪 Tests de connectivité...${NC}"

# Test API Health
if curl -f -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API Backend accessible (http://localhost:8000/health)${NC}"
else
    echo -e "${RED}❌ API Backend non accessible${NC}"
fi

# Test Frontend
if curl -f -s http://localhost:3010 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend accessible (http://localhost:3010)${NC}"
else
    echo -e "${RED}❌ Frontend non accessible${NC}"
fi

# --- Health Checks complets ---
echo -e "\n${YELLOW}🏥 Health Checks complets...${NC}"
if [ -f "scripts/health-check/run_health_check.sh" ]; then
    chmod +x scripts/health-check/run_health_check.sh
    # Déterminer l'environnement (production ou local selon le compose file)
    if [[ "$COMPOSE_FILE" == *"prod"* ]]; then
        HEALTH_ENV="production"
    else
        HEALTH_ENV="local"
    fi

    echo -e "${BLUE}Lancement des health checks en mode ${HEALTH_ENV}...${NC}"
    ./scripts/health-check/run_health_check.sh "$HEALTH_ENV" || echo -e "${YELLOW}⚠️  Certains health checks ont échoué (voir détails ci-dessus)${NC}"
else
    echo -e "${YELLOW}⚠️  Scripts de health check non trouvés (scripts/health-check/)${NC}"
fi

# --- Afficher les logs récents ---
echo -e "\n${YELLOW}📋 Logs récents:${NC}"
"${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" logs --tail=20

# --- Résumé final ---
echo -e "\n${BLUE}=======================================${NC}"
echo -e "${GREEN}✅ DÉPLOIEMENT TERMINÉ${NC}"
echo -e "${BLUE}=======================================${NC}\n"

echo -e "${GREEN}Services déployés:${NC}"
echo -e "  • API Backend:  http://localhost:8000"
echo -e "  • Frontend:     http://localhost:3010"
echo -e "  • Swagger UI:   http://localhost:8000/docs"
echo -e "  • Health Check: http://localhost:8000/health"

echo -e "\n${YELLOW}Prochaines étapes:${NC}"
echo -e "  1. Vérifier que Nginx est configuré (voir nginx/crm.alforis.fr.conf)"
echo -e "  2. Obtenir un certificat SSL avec certbot"
echo -e "  3. Tester l'accès via https://crm.alforis.fr"
echo -e "  4. Vérifier les logs: ${BLUE}$COMPOSE_CMD_STRING -f $COMPOSE_FILE logs -f${NC}"

echo -e "\n${GREEN}Commandes utiles:${NC}"
echo -e "  • Voir les logs:      ${BLUE}$COMPOSE_CMD_STRING -f $COMPOSE_FILE logs -f${NC}"
echo -e "  • Voir l'état:        ${BLUE}$COMPOSE_CMD_STRING -f $COMPOSE_FILE ps${NC}"
echo -e "  • Redémarrer:         ${BLUE}$COMPOSE_CMD_STRING -f $COMPOSE_FILE restart${NC}"
echo -e "  • Arrêter:            ${BLUE}$COMPOSE_CMD_STRING -f $COMPOSE_FILE down${NC}"

echo ""
