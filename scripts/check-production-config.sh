#!/bin/bash

# ===========================================
# SCRIPT DE VÉRIFICATION DE CONFIGURATION
# CRM Alforis Finance - Production
# ===========================================

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}   VÉRIFICATION CONFIGURATION PROD${NC}"
echo -e "${BLUE}=======================================${NC}\n"

ERRORS=0
WARNINGS=0

# --- Fonction pour vérifier un fichier ---
check_file() {
    local file=$1
    local required=$2

    if [ -f "$file" ]; then
        echo -e "${GREEN}✅ $file existe${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $file manquant (REQUIS)${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $file manquant (optionnel)${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

# --- Fonction pour vérifier une variable dans un fichier ---
check_env_var() {
    local file=$1
    local var=$2
    local required=$3

    if [ ! -f "$file" ]; then
        return 1
    fi

    if grep -q "^${var}=" "$file"; then
        local value=$(grep "^${var}=" "$file" | cut -d'=' -f2-)
        if [ -z "$value" ] || [ "$value" = "CHANGE_ME" ] || [ "$value" = "GENERER" ]; then
            echo -e "${YELLOW}⚠️  $var défini mais valeur à changer dans $file${NC}"
            ((WARNINGS++))
        else
            echo -e "${GREEN}✅ $var défini dans $file${NC}"
        fi
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}❌ $var manquant dans $file (REQUIS)${NC}"
            ((ERRORS++))
        else
            echo -e "${YELLOW}⚠️  $var manquant dans $file (optionnel)${NC}"
            ((WARNINGS++))
        fi
        return 1
    fi
}

echo -e "${YELLOW}📋 Vérification des fichiers...${NC}\n"

# --- Vérifier les fichiers de configuration ---
check_file "docker-compose.prod.yml" "true"
check_file ".env.production" "true"
check_file "nginx/crm.alforis.fr.conf" "true"
check_file "crm-backend/.env.production.local" "false"
check_file "crm-frontend/.env.production.local" "false"

echo ""

# --- Vérifier les variables d'environnement ---
echo -e "${YELLOW}🔑 Vérification des variables d'environnement...${NC}\n"

if [ -f ".env.production" ]; then
    check_env_var ".env.production" "POSTGRES_PASSWORD" "true"
    check_env_var ".env.production" "SECRET_KEY" "true"
    check_env_var ".env.production" "ALLOWED_ORIGINS" "true"
    check_env_var ".env.production" "NEXT_PUBLIC_API_URL" "true"
    check_env_var ".env.production" "POSTGRES_USER" "false"
    check_env_var ".env.production" "POSTGRES_DB" "false"
fi

echo ""

# --- Vérifier docker-compose.prod.yml ---
echo -e "${YELLOW}🐳 Vérification de docker-compose.prod.yml...${NC}\n"

if [ -f "docker-compose.prod.yml" ]; then
    # Vérifier que le fichier charge .env.production
    if grep -q "env_file:" docker-compose.prod.yml && grep -q ".env.production" docker-compose.prod.yml; then
        echo -e "${GREEN}✅ docker-compose.prod.yml charge .env.production${NC}"
    else
        echo -e "${RED}❌ docker-compose.prod.yml ne charge pas .env.production${NC}"
        echo -e "${YELLOW}   Ajouter 'env_file: - .env.production' dans chaque service${NC}"
        ((ERRORS++))
    fi

    # Vérifier le target production
    if grep -q "target: production" docker-compose.prod.yml; then
        echo -e "${GREEN}✅ docker-compose.prod.yml utilise le target production${NC}"
    else
        echo -e "${YELLOW}⚠️  docker-compose.prod.yml n'utilise pas 'target: production'${NC}"
        ((WARNINGS++))
    fi

    # Vérifier les services
    local services=$(grep -E "^  [a-z]+:" docker-compose.prod.yml | sed 's/://g' | tr -d ' ')
    echo -e "${BLUE}Services trouvés: $services${NC}"
fi

echo ""

# --- Vérifier Nginx ---
echo -e "${YELLOW}🌐 Vérification de la configuration Nginx...${NC}\n"

if [ -f "nginx/crm.alforis.fr.conf" ]; then
    # Vérifier le proxy /api
    if grep -q "location /api/" nginx/crm.alforis.fr.conf; then
        echo -e "${GREEN}✅ Nginx proxy /api configuré${NC}"
    else
        echo -e "${RED}❌ Nginx proxy /api manquant${NC}"
        ((ERRORS++))
    fi

    # Vérifier SSL
    if grep -q "ssl_certificate" nginx/crm.alforis.fr.conf; then
        echo -e "${GREEN}✅ Nginx SSL configuré${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx SSL non configuré (à faire avec certbot)${NC}"
        ((WARNINGS++))
    fi

    # Vérifier les ports
    if grep -q "proxy_pass.*8000" nginx/crm.alforis.fr.conf; then
        echo -e "${GREEN}✅ Nginx pointe vers le port 8000 (API)${NC}"
    else
        echo -e "${YELLOW}⚠️  Vérifier le proxy_pass vers l'API${NC}"
        ((WARNINGS++))
    fi

    if grep -q "proxy_pass.*3010" nginx/crm.alforis.fr.conf; then
        echo -e "${GREEN}✅ Nginx pointe vers le port 3010 (Frontend)${NC}"
    else
        echo -e "${YELLOW}⚠️  Vérifier le proxy_pass vers le Frontend${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# --- Vérifier les Dockerfiles ---
echo -e "${YELLOW}🔨 Vérification des Dockerfiles...${NC}\n"

if [ -f "crm-backend/Dockerfile" ]; then
    if grep -q "AS production" crm-backend/Dockerfile; then
        echo -e "${GREEN}✅ Backend Dockerfile a un stage production${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend Dockerfile n'a pas de stage production${NC}"
        ((WARNINGS++))
    fi
fi

if [ -f "crm-frontend/Dockerfile" ]; then
    if grep -q "AS production" crm-frontend/Dockerfile; then
        echo -e "${GREEN}✅ Frontend Dockerfile a un stage production${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend Dockerfile n'a pas de stage production${NC}"
        ((WARNINGS++))
    fi
fi

echo ""

# --- Vérifier Docker (si disponible) ---
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐋 Vérification de Docker...${NC}\n"

    if docker ps &> /dev/null; then
        echo -e "${GREEN}✅ Docker est accessible${NC}"

        # Vérifier les conteneurs en cours
        local running=$(docker ps --filter "name=crm" --format "{{.Names}}" 2>/dev/null | wc -l)
        if [ "$running" -gt 0 ]; then
            echo -e "${GREEN}✅ $running conteneur(s) CRM en cours d'exécution${NC}"
            docker ps --filter "name=crm" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo -e "${YELLOW}⚠️  Aucun conteneur CRM en cours d'exécution${NC}"
        fi
    else
        echo -e "${RED}❌ Docker n'est pas accessible (permissions?)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  Docker n'est pas installé${NC}"
    ((WARNINGS++))
fi

echo ""

# --- Vérifier Nginx (si disponible) ---
if command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Vérification de Nginx système...${NC}\n"

    if nginx -t &> /dev/null; then
        echo -e "${GREEN}✅ Configuration Nginx valide${NC}"
    else
        echo -e "${RED}❌ Configuration Nginx invalide${NC}"
        echo -e "${YELLOW}   Exécuter: sudo nginx -t${NC}"
        ((ERRORS++))
    fi

    # Vérifier si le site est activé
    if [ -L "/etc/nginx/sites-enabled/crm.alforis.fr" ]; then
        echo -e "${GREEN}✅ Site Nginx activé${NC}"
    else
        echo -e "${YELLOW}⚠️  Site Nginx non activé${NC}"
        echo -e "${YELLOW}   Exécuter: sudo ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/${NC}"
        ((WARNINGS++))
    fi
else
    echo -e "${YELLOW}⚠️  Nginx n'est pas installé${NC}"
    ((WARNINGS++))
fi

echo ""

# --- Résumé ---
echo -e "${BLUE}=======================================${NC}"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ CONFIGURATION PARFAITE${NC}"
    echo -e "${GREEN}Prêt pour le déploiement!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  CONFIGURATION OK AVEC AVERTISSEMENTS${NC}"
    echo -e "${YELLOW}$WARNINGS avertissement(s) trouvé(s)${NC}"
    echo -e "${YELLOW}Vous pouvez déployer, mais vérifiez les warnings${NC}"
else
    echo -e "${RED}❌ ERREURS DE CONFIGURATION${NC}"
    echo -e "${RED}$ERRORS erreur(s) trouvée(s)${NC}"
    echo -e "${YELLOW}$WARNINGS avertissement(s) trouvé(s)${NC}"
    echo -e "${RED}Corrigez les erreurs avant de déployer${NC}"
fi
echo -e "${BLUE}=======================================${NC}"

echo ""

# --- Actions recommandées ---
if [ $ERRORS -gt 0 ] || [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}📋 Actions recommandées:${NC}"

    if [ ! -f ".env.production" ]; then
        echo -e "  1. ${BLUE}cp .env.production.example .env.production${NC}"
        echo -e "  2. ${BLUE}nano .env.production${NC} (remplir les variables)"
    fi

    if ! grep -q ".env.production" docker-compose.prod.yml 2>/dev/null; then
        echo -e "  3. Mettre à jour ${BLUE}docker-compose.prod.yml${NC} pour charger .env.production"
    fi

    if [ ! -L "/etc/nginx/sites-enabled/crm.alforis.fr" ]; then
        echo -e "  4. ${BLUE}sudo cp nginx/crm.alforis.fr.conf /etc/nginx/sites-available/${NC}"
        echo -e "  5. ${BLUE}sudo ln -s /etc/nginx/sites-available/crm.alforis.fr /etc/nginx/sites-enabled/${NC}"
        echo -e "  6. ${BLUE}sudo certbot --nginx -d crm.alforis.fr${NC}"
    fi

    echo ""
fi

exit $ERRORS
