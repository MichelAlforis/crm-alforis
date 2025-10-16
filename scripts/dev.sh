#!/usr/bin/env bash
# --- compat macOS bash 3.x ---
# évite "unbound variable" sur les tableaux optionnels
: "${EXTRA_COMPOSE_ARGS:=}"
: "${EXTRA_COMPOSE_FILES:=}"

# mapfile compat: si mapfile absent, on crée un équivalent
if ! command -v mapfile >/dev/null 2>&1; then
  mapfile() {
    # Usage basique : mapfile -t VAR < <(cmd)
    # On lit stdin vers un tableau $1 (sans -t avancé)
    local __arr_name="$2"
    local __line
    local __i=0
    while IFS= read -r __line; do
      eval "${__arr_name}[__i++]=\"\${__line}\""
    done
  }
fi


# ============================================================
#  CRM TPM FINANCE - DEV ORCHESTRATOR (compose v2)
# ============================================================
#  Points clés:
#   ✅ Détection auto des services définis par le compose courant
#   ✅ Frontend activable (--frontend / FRONTEND=1) avec profil
#   ✅ Pré-check & libération des ports (API & Front)
#   ✅ Détection & purge des conteneurs orphelins qui publient les ports
#   ✅ Contexte Docker & daemon checks (macOS/Linux)
#   ✅ Helpers: up/down/logs/ps/restart/rebuild/clean/shell/doctor
#   ✅ Projet (-p) et fichier compose (-f) configurables
#   ✅ Messages clairs + sections colorées
# ============================================================

# ---------- CONFIG PAR DÉFAUT ----------
FRONT_PORT="${FRONT_PORT:-3010}"
API_PORT="${API_PORT:-8000}"
# Par défaut, on active le frontend sauf si --no-frontend est passé
REQUEST_FRONTEND="${REQUEST_FRONTEND:-1}"
DOCKER_WAIT_TIMEOUT="${DOCKER_WAIT_TIMEOUT:-60}"
DOCKER_CHECK_INTERVAL="${DOCKER_CHECK_INTERVAL:-2}"

# Emplacement du compose (par défaut: compose dans le répertoire courant)
COMPOSE_FILE_DEFAULT="docker-compose.yml"
COMPOSE_FILE="${COMPOSE_FILE:-$COMPOSE_FILE_DEFAULT}"

# Nom de projet (docker compose -p). Par défaut: nom du dossier courant "v1"
PROJECT_NAME="${PROJECT_NAME:-$(basename "$(pwd)" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '-')}"
FORCE_NO_HEALTH="${FORCE_NO_HEALTH:-0}"  # 1 = ne bloque jamais sur les healthchecks

# ---------- COULEURS ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_error(){ echo -e "${RED}❌ $*${NC}" >&2; }
log_success(){ echo -e "${GREEN}✅ $*${NC}"; }
log_warning(){ echo -e "${YELLOW}⚠️  $*${NC}"; }
log_info(){ echo -e "${BLUE}ℹ️  $*${NC}"; }
section(){ echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BLUE}$*${NC}\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"; }

# ---------- ARGUMENTS / OPTIONS ----------
EXTRA_COMPOSE_ARGS=()
WANT_PROFILE_FRONTEND=0
SILENT=0

usage() {
  cat << EOF
${BLUE}CRM TPM FINANCE - Script de développement${NC}

${GREEN}Usage:${NC}
  $0 up [--frontend] [--api-port N] [--project NAME] [--compose FILE]
  $0 down
  $0 logs [--frontend]
  $0 ps   [--frontend]
  $0 restart [--frontend]
  $0 rebuild [--frontend]
  $0 shell [service]
  $0 clean
  $0 kill-ports
  $0 doctor
  $0 endpoints
  $0 help

${GREEN}Options:${NC}
  --frontend           Active le service frontend (et le profil 'frontend' si présent)
  --no-frontend        Force sans frontend
  --api-port N         Override rapide du port API (défaut: 8000)
  --project NAME       Utilise NAME comme -p du projet compose (défaut: répertoire courant)
  --compose FILE       Fichier compose à utiliser (défaut: ./docker-compose.yml)
  --silent             Moins de logs (utile dans CI)

${YELLOW}Astuces:${NC}
  FRONTEND=1 $0 up         # Active le frontend via variable d'env
  API_PORT=8010 $0 up      # Démarre l'API sur 8010
EOF
}

parse_args() {
  local want_front_env="${FRONTEND:-0}"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --frontend) REQUEST_FRONTEND=1; shift;;
      --no-frontend) REQUEST_FRONTEND=0; shift;;
      --api-port) API_PORT="${2:-}"; shift 2;;
      --project) PROJECT_NAME="${2:-}"; shift 2;;
      --compose) COMPOSE_FILE="${2:-}"; shift 2;;
      --profile) EXTRA_COMPOSE_ARGS+=("$1"); shift;; # libre
      --silent) SILENT=1; shift;;
      --force-no-health) FORCE_NO_HEALTH=1; shift;;
      *) break;;
    esac
  done
  # FRONTEND=1 dans l'env
  if [[ "$want_front_env" == "1" && "$REQUEST_FRONTEND" == "0" ]]; then
    REQUEST_FRONTEND=1
  fi
}

# ---------- HELPERS DOCKER COMPOSE ----------
compose() {
  docker compose -p "$PROJECT_NAME" -f "$COMPOSE_FILE" "${EXTRA_COMPOSE_ARGS[@]}" "$@"
}

compose_config_services() {
  compose config --services
}

# ---------- PRÉREQUIS ----------
check_prerequisites() {
  section "Vérification des prérequis"
  command -v docker >/dev/null || { log_error "Docker non installé"; exit 1; }
  docker compose version >/dev/null || { log_error "Docker Compose indisponible"; exit 1; }
  [[ -f "$COMPOSE_FILE" ]] || { log_error "Compose introuvable: $COMPOSE_FILE"; exit 1; }
  log_success "Docker & Compose OK — Compose: $COMPOSE_FILE — Projet: $PROJECT_NAME"
}

check_docker_daemon() {
  section "Attente du daemon Docker"
  local attempt=0 max_attempts=$((DOCKER_WAIT_TIMEOUT / DOCKER_CHECK_INTERVAL))
  while ! docker info >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      log_error "Docker injoignable après ${DOCKER_WAIT_TIMEOUT}s"
      log_warning "macOS: open -a Docker ; Linux: sudo systemctl start docker"
      exit 1
    fi
    [[ $SILENT -eq 1 ]] || printf "\rDémarrage de Docker… %d%%" $(( attempt*100/max_attempts ))
    sleep $DOCKER_CHECK_INTERVAL
  done
  [[ $SILENT -eq 1 ]] || echo
  log_success "Docker est prêt"
}

# ---------- DÉTECTION DES SERVICES ----------
AVAILABLE_SERVICES=()
load_available_services() {
  mapfile -t AVAILABLE_SERVICES < <(compose_config_services)
  [[ $SILENT -eq 1 ]] || log_info "Services déclarés: ${AVAILABLE_SERVICES[*]:-<aucun>}"
}

have_service(){ local s="$1"; for x in "${AVAILABLE_SERVICES[@]}"; do [[ "$x" == "$s" ]] && return 0; done; return 1; }

compute_target_services_and_args() {
  TARGET_SERVICES=()
  have_service "postgres" && TARGET_SERVICES+=("postgres")
  have_service "api" && TARGET_SERVICES+=("api")
  if [[ "$REQUEST_FRONTEND" -eq 1 ]] && have_service "frontend"; then
    TARGET_SERVICES+=("frontend")
    # Ajoute automatiquement le profil si défini
    if compose config | grep -qE 'profiles:.*frontend'; then
      EXTRA_COMPOSE_ARGS+=(--profile frontend)
    fi
    WANT_PROFILE_FRONTEND=1
  fi
  [[ $SILENT -eq 1 ]] || {
    log_info "Services cibles: ${TARGET_SERVICES[*]:-<aucun>}"
    log_info "Args compose: ${EXTRA_COMPOSE_ARGS[*]:-<aucun>}"
  }
}

# ---------- PORTS & CONFLITS ----------
is_listening_port() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

kill_pid_if_listening() {
  local port="$1"
  if is_listening_port "$port"; then
    local pid
    pid=$(lsof -t -iTCP:"$port" -sTCP:LISTEN | head -n1)
    [[ -n "${pid:-}" ]] && kill -9 "$pid" || true
  fi
}

show_port_owner() {
  local port="$1"
  lsof -nP -iTCP:"$port" -sTCP:LISTEN || true
}

free_publish_port_from_container() {
  local port="$1"
  local rows
  rows=$(docker ps -a --filter "publish=$port" --format "{{.Names}} {{.Ports}}" || true)
  if [[ -n "$rows" ]]; then
    log_warning "Conteneur(s) publiant le port $port:"
    echo "$rows"
    local cname
    cname=$(echo "$rows" | awk '{print $1}' | head -n1)
    if [[ -n "$cname" ]]; then
      log_info "→ docker stop $cname && docker rm $cname"
      docker stop "$cname" >/dev/null 2>&1 || true
      docker rm   "$cname" >/dev/null 2>&1 || true
    fi
  fi
}

check_free_api_port() {
  section "Pré-check du port API ($API_PORT)"
  if is_listening_port "$API_PORT"; then
    local line proc pid
    line=$(lsof -nP -iTCP:"$API_PORT" -sTCP:LISTEN | tail -n1)
    proc=$(echo "$line" | awk '{print $1}')
    pid=$(echo "$line" | awk '{print $2}')
    log_warning "Le port API $API_PORT est occupé par: $proc (PID $pid)"
    # Essaye d'abord les conteneurs docker
    free_publish_port_from_container "$API_PORT"
    # Re-check
    if is_listening_port "$API_PORT"; then
      # Proxy Docker Desktop?
      if [[ "$proc" == "com.docke" || "$proc" == "com.docker.backend" ]]; then
        log_warning "Le proxy Docker Desktop tient $API_PORT."
        echo "  → Solutions:"
        echo "    • Redémarrer Docker Desktop puis relancer ce script"
        echo "    • OU démarrer l'API sur un autre port: --api-port 8010"
      else
        log_warning "Process local inconnu sur $API_PORT. À fermer manuellement si conflit."
      fi
    else
      log_success "Port $API_PORT libéré côté Docker"
    fi
  else
    log_success "Port $API_PORT libre"
  fi
}

check_free_front_port() {
  [[ "$REQUEST_FRONTEND" -eq 1 ]] || return 0
  section "Pré-check du port FRONT ($FRONT_PORT)"
  if is_listening_port "$FRONT_PORT"; then
    local line pid proc
    line=$(lsof -nP -iTCP:"$FRONT_PORT" -sTCP:LISTEN | tail -n1)
    proc=$(echo "$line" | awk '{print $1}')
    pid=$(echo "$line" | awk '{print $2}')
    log_warning "Le port FRONT $FRONT_PORT est occupé par: $proc (PID $pid)"
    # On tente de tuer seulement si ce n’est pas Docker Desktop
    if [[ "$proc" != "com.docke" && "$proc" != "com.docker.backend" ]]; then
      log_info "→ kill -9 $pid"
      kill -9 "$pid" || true
      sleep 1
    fi
    if is_listening_port "$FRONT_PORT"; then
      log_warning "Le port $FRONT_PORT est encore pris. Vérifie les process locaux ou passe un autre port."
    else
      log_success "Port $FRONT_PORT libéré"
    fi
  else
    log_success "Port $FRONT_PORT libre"
  fi
}

check_free_postgres_port() {
  section "Pré-check du port POSTGRES (5433)"
  local PG_PORT=5433
  if is_listening_port "$PG_PORT"; then
    local line proc pid
    line=$(lsof -nP -iTCP:"$PG_PORT" -sTCP:LISTEN | tail -n1)
    proc=$(echo "$line" | awk '{print $1}')
    pid=$(echo "$line" | awk '{print $2}')
    log_warning "Le port POSTGRES $PG_PORT est occupé par: $proc (PID $pid)"

    # D'abord, essayer de nettoyer les conteneurs Docker qui publient ce port
    log_info "Recherche de conteneurs Docker utilisant le port $PG_PORT..."
    local containers
    containers=$(docker ps -a --filter "publish=$PG_PORT" --format "{{.Names}}" 2>/dev/null || true)

    if [[ -n "$containers" ]]; then
      log_info "Conteneurs trouvés: $containers"
      for container in $containers; do
        log_info "Arrêt et suppression du conteneur: $container"
        docker stop "$container" >/dev/null 2>&1 || true
        docker rm "$container" >/dev/null 2>&1 || true
      done
      sleep 2

      # Re-vérifier après nettoyage
      if ! is_listening_port "$PG_PORT"; then
        log_success "Port $PG_PORT libéré après nettoyage des conteneurs"
        return 0
      fi
    fi

    # Si toujours occupé par Docker Desktop
    if [[ "$proc" == "com.docke" || "$proc" == "com.docker.backend" ]]; then
      log_warning "Le port $PG_PORT est tenu par le proxy Docker Desktop."
      echo "  → Solutions:"
      echo "    1. Redémarrer Docker Desktop (cmd+Q puis relancer)"
      echo "    2. OU: docker ps -a | grep 5433 puis docker rm -f <container>"
      echo "    3. OU: Utiliser un autre port dans docker-compose.yml"
      log_info "Tentative de nettoyage forcé..."
      docker ps -a --filter "publish=$PG_PORT" --format "{{.Names}}" | xargs -r docker rm -f 2>/dev/null || true
      sleep 2
      if ! is_listening_port "$PG_PORT"; then
        log_success "Port $PG_PORT libéré"
        return 0
      fi
    else
      # Process local non-Docker
      log_info "→ kill -9 $pid"
      kill -9 "$pid" || true
      sleep 1
      if is_listening_port "$PG_PORT"; then
        log_warning "Le port $PG_PORT est encore pris."
      else
        log_success "Port $PG_PORT libéré"
      fi
    fi
  else
    log_success "Port $PG_PORT libre"
  fi
}

# ---------- SURVEILLANCE SERVICES ----------
svc_state(){ compose ps --format json "${1:-}" 2>/dev/null | grep -o '"State":"[^"]*"' | cut -d'"' -f4 || echo "not_found"; }
svc_health(){ compose ps --format json "${1:-}" 2>/dev/null | grep -o '"Health":"[^"]*"' | cut -d'"' -f4 || echo ""; }

get_last_logs(){ compose logs --tail=20 "${1:-}" 2>/dev/null || true; }

show_service_details() {
  local s="$1"
  echo; log_warning "Détails du service: $s"
  echo "État: $(svc_state "$s") | Health: $(svc_health "$s")"
  echo "---- Derniers logs ----"
  get_last_logs "$s" | tail -n 20
  echo "-----------------------"
}

# ---------- OPÉRATIONS COMPOSE ----------
up_smart() {
  section "Vérification initiale des services"
  local to_start=() to_restart=() all_healthy=true
  for s in "${TARGET_SERVICES[@]}"; do
    local st=$(svc_state "$s")
    case "$st" in
      running)
        local h=$(svc_health "$s")
        if [[ "$h" == "healthy" || "$h" == "" || "$FORCE_NO_HEALTH" -eq 1 ]]; then
          log_success "$s: running ${h:+($h)}"
        else
          log_warning "$s: running mais pas healthy → restart"
          to_restart+=("$s"); all_healthy=false
        fi
        ;;
      exited|restarting|removing)
        log_warning "$s: $st → restart"
        to_restart+=("$s"); all_healthy=false
        ;;
      not_found)
        log_info "$s: non créé → start"
        to_start+=("$s"); all_healthy=false
        ;;
      *)
        log_warning "$s: état inconnu ($st) → restart"
        to_restart+=("$s"); all_healthy=false
        ;;
    esac
  done

  if [[ $all_healthy == true ]]; then
    [[ $SILENT -eq 1 ]] || { echo; log_success "Tous les services sont OK"; echo; compose ps; }
    print_endpoints
    print_services_status
    return 0
  fi

  # Démarrage des services manquants
  if [[ ${#to_start[@]} -gt 0 ]]; then
    log_info "Création & démarrage: ${to_start[*]}"
    if ! compose up -d "${to_start[@]}"; then
      log_error "Échec au démarrage initial"
      for s in "${to_start[@]}"; do show_service_details "$s"; done
      exit 1
    fi
  fi

  # Restart des services instables (utiliser up -d au lieu de restart pour recréer si nécessaire)
  if [[ ${#to_restart[@]} -gt 0 ]]; then
    log_info "Redémarrage: ${to_restart[*]}"
    if ! compose up -d "${to_restart[@]}"; then
      log_error "Échec au redémarrage"
      for s in "${to_restart[@]}"; do show_service_details "$s"; done
      exit 1
    fi
  fi

  # Stabilisation & état final
  section "Stabilisation"
  sleep 3
  [[ $SILENT -eq 1 ]] || { echo; log_info "État final:"; compose ps; }
  print_endpoints
  print_services_status
}
compose_down(){ section "Arrêt de la stack"; compose down; log_success "Stack stoppée"; }
compose_logs(){ section "Logs (Ctrl+C pour quitter)"; compose logs -f --tail=80; }
compose_ps(){ section "État des services"; compose ps; }
compose_restart(){ section "Redémarrage forcé"; compose restart "${TARGET_SERVICES[@]}"; sleep 2; compose_ps; }
compose_rebuild(){ section "Rebuild complet"; compose up -d --build --force-recreate "${TARGET_SERVICES[@]}"; sleep 3; compose_ps; }
compose_clean(){ section "Nettoyage complet"; log_warning "Supprime volumes & orphelins"; read -p "Confirmer ? (y/N) " -n1 -r; echo; [[ $REPLY =~ ^[Yy]$ ]] && compose down -v --remove-orphans && log_success "OK" || log_info "Annulé"; }
compose_shell(){ local s=${1:-api}; section "Shell dans $s"; compose exec "$s" /bin/bash || compose exec "$s" /bin/sh; }

# ----------- ETAT FINAL EXPLICITE -----------
print_services_status() {
  section "Résumé de l'état des services"
  local services=(postgres api)
  if [[ "$REQUEST_FRONTEND" -eq 1 || "$WANT_PROFILE_FRONTEND" -eq 1 ]]; then
    services+=(frontend)
  fi
  local all_ok=1
  for s in "${services[@]}"; do
    local st=$(svc_state "$s")
    local h=$(svc_health "$s")
    if [[ "$st" == "running" ]]; then
      if [[ -n "$h" && "$h" != "healthy" ]]; then
        echo -e "${YELLOW}⚠️  $s : running ($h)${NC}"
        all_ok=0
      else
        echo -e "${GREEN}✅ $s : running${NC}"
      fi
    elif [[ "$st" == "exited" ]]; then
      echo -e "${RED}❌ $s : exited/crashed${NC}"
      all_ok=0
    elif [[ "$st" == "not_found" ]]; then
      echo -e "${RED}❌ $s : non démarré (not found)${NC}"
      all_ok=0
    else
      echo -e "${YELLOW}⚠️  $s : état inconnu ($st)${NC}"
      all_ok=0
    fi
  done
  if [[ $all_ok -eq 1 ]]; then
    echo -e "\n${GREEN}🎉 Tous les services sont opérationnels !${NC}"
  else
    echo -e "\n${YELLOW}Vérifiez les logs avec : ./scripts/dev.sh logs --frontend${NC}"
  fi
}

# ---------- OUTILS D'AIDE ----------
print_endpoints() {
  section "Endpoints"
  local api="http://localhost:${API_PORT}"
  local front="http://localhost:${FRONT_PORT}"
  echo "API     : $api/health  | $api/docs | $api/redoc"
  if [[ "$REQUEST_FRONTEND" -eq 1 || "$WANT_PROFILE_FRONTEND" -eq 1 ]]; then
    echo "Frontend: $front"
  fi
}

doctor() {
  section "DOCTOR – Diagnostic rapide"
  echo "Context Docker :"
  docker context ls || true
  echo
  echo "Docker info (client seulement si daemon down) :"
  docker info || true
  echo
  echo "Ports en écoute (API=$API_PORT / FRONT=$FRONT_PORT) :"
  echo "— API —"
  show_port_owner "$API_PORT" || true
  echo "— FRONT —"
  show_port_owner "$FRONT_PORT" || true
  echo
  echo "Conteneurs publiant $API_PORT :"
  docker ps -a --filter "publish=$API_PORT" --format "table {{.Names}}\t{{.Ports}}" || true
  echo
  echo "Services du compose courant ($COMPOSE_FILE) :"
  compose_config_services || true
  echo
  echo "compose ps :"
  compose ps || true
}

kill_ports_cmd() {
  section "Kill des ports"

  # Postgres 5433
  echo "→ POSTGRES 5433"
  local pg_containers=$(docker ps -a --filter "publish=5433" --format "{{.Names}}" 2>/dev/null || true)
  if [[ -n "$pg_containers" ]]; then
    log_info "Conteneurs Postgres: $pg_containers"
    echo "$pg_containers" | xargs docker rm -f 2>/dev/null || true
  fi
  if is_listening_port "5433"; then
    local pgpid=$(lsof -t -iTCP:5433 -sTCP:LISTEN | head -n1 || true)
    [[ -n "$pgpid" ]] && { log_info "kill -9 $pgpid"; kill -9 "$pgpid" || true; }
  fi

  # API
  echo "→ API $API_PORT"
  free_publish_port_from_container "$API_PORT"
  if is_listening_port "$API_PORT"; then
    local pid=$(lsof -t -iTCP:"$API_PORT" -sTCP:LISTEN | head -n1 || true)
    [[ -n "$pid" ]] && { log_info "kill -9 $pid"; kill -9 "$pid" || true; }
  fi

  # Frontend
  echo "→ FRONT $FRONT_PORT"
  if is_listening_port "$FRONT_PORT"; then
    local pid2=$(lsof -t -iTCP:"$FRONT_PORT" -sTCP:LISTEN | head -n1 || true)
    [[ -n "$pid2" ]] && { log_info "kill -9 $pid2"; kill -9 "$pid2" || true; }
  fi

  log_success "Tentative de libération des ports effectuée"
}

# ---------- MAIN ----------
main() {
  local cmd="${1:-help}"; shift || true
  parse_args "$@"

  case "$cmd" in
    up)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      check_free_postgres_port
      check_free_api_port
      check_free_front_port
      up_smart
      ;;
    down)
      check_prerequisites
      compose_down
      ;;
    logs)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      compose_logs
      ;;
    ps)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      compose_ps
      ;;
    restart)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      compose_restart
      ;;
    rebuild)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      compose_rebuild
      ;;
    clean)
      check_prerequisites
      compose_clean
      ;;
    shell)
      check_prerequisites
      check_docker_daemon
      load_available_services
      compute_target_services_and_args
      compose_shell "${1:-api}"
      ;;
    doctor)
      check_prerequisites
      doctor
      ;;
    kill-ports)
      kill_ports_cmd
      ;;
    endpoints)
      print_endpoints
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      usage; exit 1;;
  esac
}

main "$@"
