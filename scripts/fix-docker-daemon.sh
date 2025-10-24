#!/usr/bin/env bash
# ============================================================
# FIX DOCKER DAEMON - macOS
# ============================================================
# Résout les problèmes de daemon Docker sur macOS
# À lancer quand "Cannot connect to the Docker daemon"

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_error() { echo -e "${RED}❌ $*${NC}" >&2; }
log_success() { echo -e "${GREEN}✅ $*${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $*${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }
section() { echo -e "\n${BLUE}━━━ $* ━━━${NC}\n"; }

# Timeout configurable
TIMEOUT=${DOCKER_DAEMON_TIMEOUT:-120}
CHECK_INTERVAL=2

# ============================================================
# DIAGNOSTIC
# ============================================================
diagnostic() {
  section "Diagnostic Docker"

  echo "Context actuel:"
  docker context show 2>/dev/null || echo "  ❌ Erreur"
  echo ""

  echo "Contexts disponibles:"
  docker context ls 2>/dev/null || echo "  ❌ Erreur"
  echo ""

  echo "Docker Desktop processus:"
  if pgrep -f "Docker Desktop" >/dev/null; then
    echo "  ✅ Docker Desktop lancé"
  else
    echo "  ❌ Docker Desktop non lancé"
  fi
  echo ""

  echo "Daemon status:"
  if docker info >/dev/null 2>&1; then
    echo "  ✅ Daemon accessible"
    docker info | grep -E "Server Version|Operating System" | sed 's/^/  /'
  else
    echo "  ❌ Daemon inaccessible"
  fi
}

# ============================================================
# FIX AUTOMATIQUE
# ============================================================
auto_fix() {
  section "Fix automatique du daemon Docker"

  # 1. Vérifier si daemon est OK
  if docker info >/dev/null 2>&1; then
    log_success "Daemon déjà opérationnel!"
    docker info | grep "Server Version"
    return 0
  fi

  log_warning "Daemon inaccessible, tentative de fix..."

  # 2. Vérifier si Docker Desktop est lancé
  if ! pgrep -f "Docker Desktop" >/dev/null; then
    log_info "Docker Desktop non lancé, démarrage..."
    open -a "Docker Desktop"
    log_info "Docker Desktop démarré, attente du daemon..."
  else
    log_info "Docker Desktop déjà lancé"
  fi

  # 3. Fix du contexte (problème fréquent)
  log_info "Vérification du contexte Docker..."
  local current_context=$(docker context show 2>/dev/null || echo "unknown")

  if [[ "$current_context" == "desktop-linux" ]]; then
    log_info "Contexte: desktop-linux (OK pour macOS)"
  elif [[ "$current_context" == "default" ]]; then
    log_warning "Contexte: default - tentative de switch vers desktop-linux"
    if docker context use desktop-linux 2>/dev/null; then
      log_success "Contexte changé vers desktop-linux"
    else
      log_warning "Impossible de changer le contexte (normal si daemon down)"
    fi
  fi

  # 4. Attendre le daemon (avec progress bar)
  log_info "Attente du daemon Docker (timeout: ${TIMEOUT}s)..."
  local elapsed=0
  local max_attempts=$((TIMEOUT / CHECK_INTERVAL))
  local attempt=0

  while ! docker info >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    elapsed=$((attempt * CHECK_INTERVAL))

    if [ $attempt -ge $max_attempts ]; then
      log_error "Timeout après ${TIMEOUT}s"
      echo ""
      log_info "Solutions manuelles:"
      echo "  1. Ouvrir Docker Desktop manuellement"
      echo "  2. Vérifier les préférences Docker Desktop"
      echo "  3. Redémarrer Docker Desktop: cmd+Q puis relancer"
      echo "  4. En dernier recours: killall 'Docker Desktop' puis relancer"
      return 1
    fi

    # Progress bar
    local percent=$((attempt * 100 / max_attempts))
    local bar_length=30
    local filled=$((percent * bar_length / 100))
    local empty=$((bar_length - filled))

    printf "\r  ["
    printf "%${filled}s" | tr ' ' '█'
    printf "%${empty}s" | tr ' ' '░'
    printf "] %3d%% (%ds/%ds)" $percent $elapsed $TIMEOUT

    sleep $CHECK_INTERVAL
  done

  echo ""
  log_success "Daemon opérationnel après ${elapsed}s!"
  echo ""
  docker info | grep -E "Server Version|Operating System|CPUs|Total Memory" | sed 's/^/  /'

  return 0
}

# ============================================================
# FIX AGRESSIF (si auto_fix échoue)
# ============================================================
hard_fix() {
  section "Fix agressif - Redémarrage complet"

  log_warning "Cette méthode va TUER et relancer Docker Desktop"
  read -p "Continuer ? (y/N) " -n1 -r
  echo

  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "Annulé"
    return 1
  fi

  log_info "1. Arrêt de Docker Desktop..."
  killall "Docker Desktop" 2>/dev/null || true
  sleep 3

  log_info "2. Nettoyage des sockets..."
  rm -f ~/Library/Containers/com.docker.docker/Data/docker.sock 2>/dev/null || true
  rm -f ~/.docker/run/docker.sock 2>/dev/null || true

  log_info "3. Redémarrage de Docker Desktop..."
  open -a "Docker Desktop"

  log_info "4. Attente du daemon..."
  auto_fix
}

# ============================================================
# TIPS & PREVENTION
# ============================================================
show_tips() {
  section "Tips pour éviter le problème"

  cat << EOF
${BLUE}Pourquoi ça arrive ?${NC}
  • Docker Desktop ne démarre pas automatiquement le daemon
  • Le daemon crash silencieusement
  • Contexte Docker incorrect (default au lieu de desktop-linux)
  • Ressources insuffisantes (RAM/CPU)

${GREEN}Prévention:${NC}
  1. Activer "Start Docker Desktop when you log in"
     → Préférences Docker Desktop > General

  2. Augmenter les ressources si nécessaire
     → Préférences > Resources (4+ CPU, 8+ GB RAM)

  3. Ajouter ce fix au début de vos scripts:
     ${BLUE}./scripts/fix-docker-daemon.sh --auto${NC}

  4. Alias utile dans ~/.zshrc ou ~/.bashrc:
     ${BLUE}alias dfix='cd /path/to/project && ./scripts/fix-docker-daemon.sh --auto'${NC}

${YELLOW}Debug avancé:${NC}
  • Logs Docker Desktop: ~/Library/Containers/com.docker.docker/Data/log/
  • Reset factory: Docker Desktop > Troubleshoot > Reset to factory defaults
EOF
}

# ============================================================
# MAIN
# ============================================================
main() {
  local cmd="${1:-auto}"

  case "$cmd" in
    --auto|-a)
      auto_fix
      ;;

    --hard|-h)
      hard_fix
      ;;

    --diagnostic|-d)
      diagnostic
      ;;

    --tips|-t)
      show_tips
      ;;

    --help)
      cat << EOF
${BLUE}Fix Docker Daemon - macOS${NC}

${GREEN}Usage:${NC}
  $0 [OPTION]

${GREEN}Options:${NC}
  --auto, -a        Fix automatique (par défaut)
  --hard, -h        Fix agressif (redémarrage complet)
  --diagnostic, -d  Diagnostic uniquement
  --tips, -t        Afficher conseils de prévention
  --help            Afficher cette aide

${GREEN}Variables d'environnement:${NC}
  DOCKER_DAEMON_TIMEOUT  Timeout en secondes (défaut: 120)

${GREEN}Exemples:${NC}
  $0                     # Fix automatique
  $0 --hard              # Redémarrage complet
  DOCKER_DAEMON_TIMEOUT=60 $0  # Timeout 60s
EOF
      ;;

    *)
      auto_fix
      ;;
  esac
}

main "$@"
