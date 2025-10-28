#!/usr/bin/env bash
# ============================================================
# CRM DEV - SCRIPT RAPIDE ET SIMPLE
# ============================================================
# Remplace dev.sh avec une approche minimaliste
# Docker Compose gère tout nativement!

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_error() { echo -e "${RED}❌ $*${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $*${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
section() { echo -e "\n${BLUE}━━━ $* ━━━${NC}\n"; }

# Config
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
WITH_FRONTEND="${WITH_FRONTEND:-0}"

usage() {
  cat << EOF
${BLUE}CRM Dev - Script rapide${NC}

${GREEN}Usage:${NC}
  $0 up [--frontend]     Démarre les services
  $0 down                Arrête tout
  $0 logs [service]      Affiche les logs
  $0 restart [service]   Redémarre
  $0 build [service]     Rebuild
  $0 shell [service]     Ouvre un shell
  $0 clean               Nettoyage complet
  $0 status              État des services

${GREEN}Options:${NC}
  --frontend            Active le frontend (profil)

${GREEN}Exemples:${NC}
  $0 up                 # API + Postgres uniquement
  $0 up --frontend      # Avec frontend
  $0 logs api           # Logs de l'API
  $0 shell api          # Shell dans le container API
EOF
}

# Parse args
CMD="${1:-help}"
shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --frontend) WITH_FRONTEND=1; shift;;
    *) SERVICE="$1"; shift;;
  esac
done

# Helper compose
compose() {
  local args=(-p v1 -f "$COMPOSE_FILE")
  [[ "$WITH_FRONTEND" -eq 1 ]] && args+=(--profile frontend)
  docker compose "${args[@]}" "$@"
}

# Vérifications rapides avec auto-fix
check_docker() {
  if ! docker info >/dev/null 2>&1; then
    log_info "Docker daemon non disponible, tentative de fix automatique..."

    # Essayer le fix automatique
    local fix_script="$(dirname "$0")/fix-docker-daemon.sh"
    if [[ -x "$fix_script" ]]; then
      if "$fix_script" --auto; then
        log_success "Daemon fixé automatiquement!"
        return 0
      fi
    fi

    # Si le fix échoue
    log_error "Docker daemon non disponible"
    log_info "Lancez: ./scripts/fix-docker-daemon.sh"
    log_info "Ou manuellement:"
    log_info "  macOS: ouvrir Docker Desktop"
    log_info "  Linux: sudo systemctl start docker"
    exit 1
  fi
}

# Commandes
case "$CMD" in
  up)
    check_docker
    section "Démarrage"

    # Docker Compose gère tout automatiquement!
    if [[ "$WITH_FRONTEND" -eq 1 ]]; then
      log_info "Démarrage avec frontend..."
      compose up -d
    else
      log_info "Démarrage API + Postgres..."
      compose up -d postgres api
    fi

    log_success "Services démarrés!"
    echo ""
    log_info "Endpoints:"
    echo "  API:      http://localhost:8000/docs"
    echo "  Health:   http://localhost:8000/api/v1/health"
    [[ "$WITH_FRONTEND" -eq 1 ]] && echo "  Frontend: http://localhost:3010"
    echo ""
    compose ps
    ;;

  down)
    section "Arrêt"
    compose down
    log_success "Arrêté"
    ;;

  logs)
    section "Logs ${SERVICE:-tous services}"
    if [[ -n "${SERVICE:-}" ]]; then
      compose logs -f --tail=100 "$SERVICE"
    else
      compose logs -f --tail=50
    fi
    ;;

  restart)
    section "Redémarrage ${SERVICE:-tous services}"
    if [[ -n "${SERVICE:-}" ]]; then
      compose restart "$SERVICE"
    else
      compose restart
    fi
    log_success "Redémarré"
    ;;

  build)
    section "Build ${SERVICE:-tous services}"
    check_docker
    if [[ -n "${SERVICE:-}" ]]; then
      compose build "$SERVICE"
      compose up -d "$SERVICE"
    else
      compose build
      compose up -d
    fi
    log_success "Build terminé"
    ;;

  rebuild)
    section "Rebuild complet ${SERVICE:-tous services}"
    check_docker
    if [[ -n "${SERVICE:-}" ]]; then
      compose up -d --build --force-recreate "$SERVICE"
    else
      compose up -d --build --force-recreate
    fi
    log_success "Rebuild terminé"
    ;;

  shell)
    section "Shell ${SERVICE:-api}"
    compose exec "${SERVICE:-api}" /bin/bash || compose exec "${SERVICE:-api}" /bin/sh
    ;;

  status|ps)
    section "État des services"
    compose ps
    echo ""
    echo "Détails:"
    docker ps --filter "label=com.docker.compose.project=v1" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;

  clean)
    section "Nettoyage"
    log_info "Suppression des conteneurs, volumes, et images..."
    read -p "Confirmer ? (y/N) " -n1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      compose down -v --remove-orphans
      log_success "Nettoyé!"
    else
      log_info "Annulé"
    fi
    ;;

  doctor)
    section "Diagnostic"
    echo "Docker:"
    docker version --format '  Version: {{.Server.Version}}' 2>/dev/null || echo "  ❌ Daemon indisponible"
    echo ""
    echo "Services:"
    compose ps || true
    echo ""
    echo "Ports en écoute:"
    lsof -nP -iTCP:8000 -sTCP:LISTEN 2>/dev/null || echo "  8000: libre"
    lsof -nP -iTCP:3010 -sTCP:LISTEN 2>/dev/null || echo "  3010: libre"
    lsof -nP -iTCP:5433 -sTCP:LISTEN 2>/dev/null || echo "  5433: libre"
    ;;

  help|--help|-h)
    usage
    ;;

  *)
    log_error "Commande inconnue: $CMD"
    usage
    exit 1
    ;;
esac
