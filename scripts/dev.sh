#!/usr/bin/env bash
set -euo pipefail

# ===========================================
# SCRIPT DE DÉVELOPPEMENT - CRM TPM FINANCE
# ===========================================
# Améliorations:
#   ✅ Attente robuste du démarrage Docker
#   ✅ Meilleure gestion des erreurs
#   ✅ Plus d'infos sur les pannes
#   ✅ Commandes utiles supplémentaires
# ===========================================

FRONT_PORT=3010
SERVICES=("postgres" "api" "frontend")
DOCKER_WAIT_TIMEOUT=60
DOCKER_CHECK_INTERVAL=2

# ============================================
# COLORS & FORMATTING
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_error() { echo -e "${RED}❌ $1${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_section() { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}$1${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ============================================
# CHECKS & VALIDATIONS
# ============================================

function check_prerequisites() {
  log_section "Vérification des prérequis"
  
  # Vérifier Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker n'est pas installé !"
    echo "Installez Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
  fi
  log_success "Docker trouvé"
  
  # Vérifier Docker Compose
  if ! docker compose version &> /dev/null; then
    log_error "Docker Compose n'est pas disponible !"
    exit 1
  fi
  log_success "Docker Compose trouvé"
  
  # Vérifier docker-compose.yml
  if [[ ! -f "docker-compose.yml" && ! -f "docker-compose.yaml" ]]; then
    log_error "docker-compose.yml non trouvé dans le répertoire courant"
    exit 1
  fi
  log_success "docker-compose.yml trouvé"
}

function check_docker_daemon() {
  log_section "Attente du démarrage de Docker"
  
  local attempt=0
  local max_attempts=$((DOCKER_WAIT_TIMEOUT / DOCKER_CHECK_INTERVAL))
  
  while ! docker info >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    
    if [ $attempt -ge $max_attempts ]; then
      log_error "Docker n'a pas pu être contacté après ${DOCKER_WAIT_TIMEOUT}s"
      echo ""
      log_warning "Diagnostic:"
      echo "  • Est-ce que Docker Desktop est lancé ?"
      echo "  • Vérifiez l'icône Docker dans la top bar (doit être stable)"
      echo "  • Sur macOS: open -a Docker"
      echo "  • Sur Linux: sudo systemctl start docker"
      echo ""
      log_info "Puis relancez: npm run dev"
      exit 1
    fi
    
    percentage=$((attempt * 100 / max_attempts))
    echo -ne "\rDémarrage de Docker... ${percentage}% ($(($max_attempts - $attempt))s restantes)"
    sleep $DOCKER_CHECK_INTERVAL
  done
  
  echo "" # Nouvelle ligne après la barre de progression
  log_success "Docker est prêt"
}

# ============================================
# PORT MANAGEMENT
# ============================================

function kill_port() {
  log_section "Vérification du port $FRONT_PORT"
  
  local os=$(uname -s)
  
  if [[ "$os" == "Darwin" ]]; then
    # macOS
    if lsof -nP -iTCP:$FRONT_PORT -sTCP:LISTEN >/dev/null 2>&1; then
      local pid=$(lsof -t -iTCP:$FRONT_PORT -sTCP:LISTEN | head -n1)
      log_warning "Port $FRONT_PORT occupé par PID $pid"
      echo "Arrêt du processus..."
      kill -9 "$pid" || true
      sleep 1
      log_success "Port libéré"
    else
      log_success "Port $FRONT_PORT libre"
    fi
  elif [[ "$os" == "Linux" ]]; then
    # Linux
    if ss -tulnp 2>/dev/null | grep -q ":$FRONT_PORT "; then
      local pid=$(ss -tulnp 2>/dev/null | grep ":$FRONT_PORT " | awk '{print $NF}' | cut -d'/' -f1)
      if [[ -n "$pid" && "$pid" != "-" ]]; then
        log_warning "Port $FRONT_PORT occupé par PID $pid"
        echo "Arrêt du processus..."
        kill -9 "$pid" || true
        sleep 1
        log_success "Port libéré"
      fi
    else
      log_success "Port $FRONT_PORT libre"
    fi
  fi
}

# ============================================
# SERVICE MONITORING
# ============================================

function get_service_status() {
  local service=$1
  docker compose ps --format json "$service" 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not_found"
}

function is_service_healthy() {
  local service=$1
  local status=$(docker compose ps --format json "$service" 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo "")
  [[ "$status" == "healthy" ]] && return 0 || return 1
}

function get_service_logs_snippet() {
  local service=$1
  docker compose logs --tail=5 "$service" 2>/dev/null | tail -n 3 || echo "Aucun log disponible"
}

function show_service_details() {
  local service=$1
  local state=$(get_service_status "$service")
  
  echo ""
  log_warning "Détails du service: $service"
  echo "État: $state"
  echo ""
  echo "Logs récents:"
  get_service_logs_snippet "$service"
}

# ============================================
# COMPOSE OPERATIONS
# ============================================

function compose_up_smart() {
  log_section "Vérification de l'état des services"

  local services_to_start=()
  local services_to_restart=()
  local all_healthy=true

  for service in "${SERVICES[@]}"; do
    local state=$(get_service_status "$service")

    case "$state" in
      running)
        if is_service_healthy "$service"; then
          log_success "$service: running (healthy)"
        else
          log_warning "$service: running mais pas healthy → restart"
          services_to_restart+=("$service")
          all_healthy=false
        fi
        ;;
      exited)
        log_warning "$service: exited → redémarrage"
        services_to_restart+=("$service")
        all_healthy=false
        ;;
      restarting)
        log_warning "$service: en cours de redémarrage..."
        services_to_restart+=("$service")
        all_healthy=false
        ;;
      not_found)
        log_info "$service: non créé → création"
        services_to_start+=("$service")
        all_healthy=false
        ;;
      *)
        log_warning "$service: état inconnu ($state) → redémarrage"
        services_to_restart+=("$service")
        all_healthy=false
        ;;
    esac
  done

  if [[ "$all_healthy" == true ]]; then
    echo ""
    log_success "Tous les services sont en état healthy !"
    echo ""
    log_info "Commandes utiles:"
    echo "  • Forcer un redémarrage: npm run restart"
    echo "  • Forcer un rebuild: npm run rebuild"
    echo "  • Voir les logs: npm run logs"
    echo "  • Arrêter: npm run down"
    return 0
  fi

  echo ""

  # Démarrer les services manquants
  if [[ ${#services_to_start[@]} -gt 0 ]]; then
    log_info "Création et démarrage: ${services_to_start[*]}"
    if ! docker compose up -d "${services_to_start[@]}"; then
      log_error "Erreur lors du démarrage"
      for service in "${services_to_start[@]}"; do
        show_service_details "$service"
      done
      exit 1
    fi
  fi

  # Redémarrer les services en erreur
  if [[ ${#services_to_restart[@]} -gt 0 ]]; then
    log_info "Redémarrage: ${services_to_restart[*]}"
    if ! docker compose restart "${services_to_restart[@]}"; then
      log_error "Erreur lors du redémarrage"
      for service in "${services_to_restart[@]}"; do
        show_service_details "$service"
      done
      exit 1
    fi
  fi

  # Attendre que les services soient stables
  log_section "Attente de la stabilisation des services"
  sleep 3
  
  echo ""
  log_info "État final des services:"
  docker compose ps
}

function compose_down() {
  log_section "Arrêt des services"
  docker compose down
  log_success "Services arrêtés"
}

function compose_logs() {
  log_section "Suivi des logs (Ctrl+C pour quitter)"
  docker compose logs -f --tail=50
}

function compose_ps() {
  log_section "État des services"
  docker compose ps
}

function compose_restart() {
  log_section "Redémarrage forcé de tous les services"
  docker compose restart
  sleep 2
  echo ""
  compose_ps
  log_success "Services redémarrés"
}

function compose_rebuild() {
  log_section "Rebuild et redémarrage complet"
  log_warning "Cela peut prendre quelques minutes..."
  docker compose up -d --build --force-recreate
  sleep 3
  echo ""
  compose_ps
  log_success "Rebuild terminé"
}

function compose_clean() {
  log_section "Nettoyage complet (volumes, images, réseaux)"
  log_warning "Cela supprimera les données locales (DB, etc.)"
  
  read -p "Êtes-vous sûr? (y/N) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker compose down -v --remove-orphans
    log_success "Nettoyage terminé"
  else
    log_info "Annulé"
  fi
}

function compose_shell() {
  local service=${1:-api}
  log_section "Shell dans le service: $service"
  docker compose exec "$service" /bin/bash || docker compose exec "$service" /bin/sh
}

function show_help() {
  cat << EOF
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${BLUE}   CRM TPM FINANCE - Script de Développement${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${GREEN}Commandes principales:${NC}
  up        Démarre les services intelligemment
  down      Arrête les services
  logs      Affiche les logs en temps réel
  ps        Affiche l'état des services
  restart   Redémarrage forcé
  rebuild   Rebuild complet + redémarrage

${GREEN}Commandes utilitaires:${NC}
  clean     Nettoyage complet (volumes, images, réseaux)
  shell     Ouvre un shell dans un service (ex: $0 shell api)
  help      Affiche cette aide

${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}

${YELLOW}Exemples:${NC}
  $0 up                 # Démarrage normal
  $0 rebuild            # Rebuild complet
  $0 shell postgres     # Shell PostgreSQL
  $0 logs               # Logs temps réel

EOF
}

# ============================================
# MAIN
# ============================================

function main() {
  case "${1:-}" in
    up)
      check_prerequisites
      check_docker_daemon
      kill_port
      compose_up_smart
      ;;
    down)
      compose_down
      ;;
    logs)
      check_prerequisites
      check_docker_daemon
      compose_logs
      ;;
    ps)
      check_prerequisites
      check_docker_daemon
      compose_ps
      ;;
    restart)
      check_prerequisites
      check_docker_daemon
      compose_restart
      ;;
    rebuild)
      check_prerequisites
      check_docker_daemon
      compose_rebuild
      ;;
    clean)
      check_prerequisites
      compose_clean
      ;;
    shell)
      check_prerequisites
      check_docker_daemon
      compose_shell "${2:-api}"
      ;;
    help)
      show_help
      ;;
    *)
      show_help
      exit 1
      ;;
  esac
}

main "$@"