#!/bin/bash

###############################################################################
# Script de configuration des GitHub Secrets - CRM Alforis
#
# Usage:
#   ./scripts/setup_github_secrets.sh --org alforis --repo crm-v1
#   ./scripts/setup_github_secrets.sh --interactive
#
# Prérequis:
#   - GitHub CLI installé (gh)
#   - Authentifié: gh auth login
#   - Permissions admin sur le repo
###############################################################################

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables
ORG=""
REPO=""
INTERACTIVE=false
DRY_RUN=false

# Fonctions de log
log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

# Fonction d'aide
show_help() {
    cat << EOF
Usage: $0 [OPTIONS]

Options:
  -o, --org ORG          Organisation GitHub
  -r, --repo REPO        Repository GitHub
  -i, --interactive      Mode interactif (demande chaque secret)
  -d, --dry-run          Simulation (n'envoie pas les secrets)
  -h, --help             Affiche cette aide

Exemples:
  $0 --org alforis --repo crm-v1
  $0 --interactive
  $0 --org alforis --repo crm-v1 --dry-run

EOF
}

# Parse des arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -o|--org)
            ORG="$2"
            shift 2
            ;;
        -r|--repo)
            REPO="$2"
            shift 2
            ;;
        -i|--interactive)
            INTERACTIVE=true
            shift
            ;;
        -d|--dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Option inconnue: $1"
            show_help
            exit 1
            ;;
    esac
done

# Vérification prérequis
log_info "Vérification des prérequis..."

if ! command -v gh &> /dev/null; then
    log_error "GitHub CLI (gh) n'est pas installé"
    log_info "Installez-le avec: brew install gh (macOS) ou: https://cli.github.com"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    log_error "Non authentifié avec GitHub CLI"
    log_info "Exécutez: gh auth login"
    exit 1
fi

log_success "Prérequis OK"

# Mode interactif si besoin
if [[ "$INTERACTIVE" == true ]]; then
    if [[ -z "$ORG" ]]; then
        read -p "Organisation GitHub: " ORG
    fi
    if [[ -z "$REPO" ]]; then
        read -p "Repository GitHub: " REPO
    fi
fi

# Validation
if [[ -z "$ORG" ]] || [[ -z "$REPO" ]]; then
    log_error "Organisation et repository requis"
    show_help
    exit 1
fi

REPO_FULL="$ORG/$REPO"

log_info "Configuration pour: $REPO_FULL"
echo ""

# Fonction pour définir un secret
set_secret() {
    local secret_name=$1
    local secret_desc=$2
    local secret_example=$3
    local secret_cmd=$4

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    log_info "Secret: $secret_name"
    echo "Description: $secret_desc"

    if [[ -n "$secret_example" ]]; then
        echo "Exemple: $secret_example"
    fi

    if [[ -n "$secret_cmd" ]]; then
        log_info "Commande pour générer: $secret_cmd"
    fi

    local secret_value=""

    if [[ "$INTERACTIVE" == true ]]; then
        read -sp "Valeur (laissez vide pour skip): " secret_value
        echo ""
    else
        # Mode non-interactif: essayer de lire depuis .env
        if [[ -f ".env" ]]; then
            secret_value=$(grep "^${secret_name}=" .env | cut -d '=' -f2- | tr -d '"' || echo "")
        fi

        # Si commande fournie et valeur vide, générer
        if [[ -z "$secret_value" ]] && [[ -n "$secret_cmd" ]]; then
            log_info "Génération automatique..."
            secret_value=$(eval "$secret_cmd")
        fi
    fi

    # Vérifier si la valeur est vide ou contient seulement des espaces
    if [[ -z "${secret_value// /}" ]]; then
        log_warning "Secret $secret_name skippé"
        echo ""
        return
    fi

    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Secret $secret_name serait défini (${#secret_value} caractères)"
    else
        # Envoyer le secret avec gestion d'erreur améliorée
        local error_output
        if error_output=$(gh secret set "$secret_name" -b "$secret_value" -R "$REPO_FULL" 2>&1); then
            log_success "Secret $secret_name défini (${#secret_value} caractères)"
        else
            log_error "Erreur lors de la définition de $secret_name"
            log_warning "Détails: $error_output"
        fi
    fi

    echo ""
}

# ============================================================================
# Configuration des secrets
# ============================================================================

echo ""
log_info "🔐 Configuration des secrets GitHub pour $REPO_FULL"
echo ""

# Base de données
set_secret "DATABASE_URL" \
    "URL PostgreSQL production" \
    "postgresql://crm_user:***@db.alforis.fr:5432/crm_prod" \
    ""

set_secret "DATABASE_URL_TEST" \
    "URL PostgreSQL tests" \
    "postgresql://crm_user:***@localhost:5432/crm_test" \
    ""

# APIs
set_secret "ANTHROPIC_API_KEY" \
    "Claude API pour AI Agent" \
    "sk-ant-api03-..." \
    ""

set_secret "OPENAI_API_KEY" \
    "OpenAI API (fallback)" \
    "sk-proj-..." \
    ""

set_secret "SENDGRID_API_KEY" \
    "SendGrid pour emails transactionnels" \
    "SG.xxxxx..." \
    ""

set_secret "RESEND_API_KEY" \
    "Resend pour email marketing" \
    "re_xxxxx..." \
    ""

# Sécurité
set_secret "SECRET_KEY" \
    "Clé de signing JWT (64+ caractères)" \
    "a1b2c3d4e5f6..." \
    "openssl rand -hex 32"

set_secret "WEBHOOK_SECRET" \
    "Secret pour validation webhooks entrants" \
    "wh_secret_abc123..." \
    "openssl rand -hex 24"

set_secret "UNSUBSCRIBE_JWT_SECRET" \
    "JWT pour désabonnement email" \
    "unsub_a1b2c3..." \
    "openssl rand -hex 32"

# Monitoring
set_secret "SENTRY_DSN" \
    "Sentry DSN pour error tracking" \
    "https://abc123@o123.ingest.sentry.io/456" \
    ""

set_secret "SENTRY_AUTH_TOKEN" \
    "Sentry API token (releases)" \
    "sntrys_xxxxx..." \
    ""

set_secret "SENTRY_ENVIRONMENT" \
    "Environnement Sentry" \
    "production" \
    "echo 'production'"

# Docker
set_secret "DOCKER_USERNAME" \
    "Docker Hub username" \
    "alforis" \
    ""

set_secret "DOCKER_PASSWORD" \
    "Docker Hub token/password" \
    "dckr_pat_xxxxx..." \
    ""

# SonarQube
set_secret "SONAR_TOKEN" \
    "Token SonarQube" \
    "squ_xxxxx..." \
    ""

set_secret "SONAR_HOST_URL" \
    "URL SonarQube instance" \
    "https://sonarcloud.io" \
    "echo 'https://sonarcloud.io'"

set_secret "SONAR_ORGANIZATION" \
    "Organisation SonarQube" \
    "alforis" \
    ""

# Déploiement (optionnel)
if [[ "$INTERACTIVE" == true ]]; then
    read -p "Configurer les secrets de déploiement? (y/N): " deploy_secrets
    if [[ "$deploy_secrets" == "y" ]] || [[ "$deploy_secrets" == "Y" ]]; then
        set_secret "SSH_PRIVATE_KEY" \
            "Clé SSH pour déploiement" \
            "-----BEGIN OPENSSH PRIVATE KEY-----..." \
            ""

        set_secret "DEPLOY_HOST" \
            "Serveur de production" \
            "crm.alforis.fr" \
            ""

        set_secret "DEPLOY_USER" \
            "User SSH" \
            "deploy" \
            ""

        set_secret "SLACK_WEBHOOK_URL" \
            "Webhook Slack pour notifications" \
            "https://hooks.slack.com/services/..." \
            ""
    fi
fi

# ============================================================================
# Résumé
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_success "Configuration terminée!"
echo ""
log_info "Vérifiez les secrets configurés avec:"
echo "  gh secret list -R $REPO_FULL"
echo ""
log_info "Testez avec un workflow:"
echo "  gh workflow run ci-cd.yml -R $REPO_FULL"
echo ""
log_info "Documentation complète:"
echo "  .github/SECRETS.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
