#!/usr/bin/env bash
set -Eeuo pipefail

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_hetzner}"
SERVER="${SERVER:-root@159.69.108.234}"
REMOTE_DIR="${REMOTE_DIR:-/srv/crm-alforis}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
TAIL_LINES="${TAIL_LINES:-200}"

VERBOSE=0

info() { printf "[INFO] %s\n" "$*"; }
warn() { printf "[WARN] %s\n" "$*" >&2; }
error() { printf "[ERROR] %s\n" "$*" >&2; }

usage() { cat <<'EOF'
Usage: ./deploy.sh [OPTIONS] [deploy|logs]

Deploys the CRM stack via Docker Compose and optionally streams logs.

Options:
  -v   Verbose output (echo remote commands and rsync progress)
  -h   Show this help

Environment variables:
  SSH_KEY       Path to SSH key (default: ~/.ssh/id_rsa_hetzner)
  SERVER        SSH destination (default: root@159.69.108.234)
  REMOTE_DIR    Remote project directory (default: /srv/crm-alforis)
  COMPOSE_FILE  Compose file to use (default: docker-compose.prod.yml)
  TAIL_LINES    Number of log lines when running "logs" (default: 200)
EOF
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    error "Required command missing: $1"
    exit 3
  fi
}

require_file() {
  if [[ ! -f "$1" ]]; then
    error "Required file missing: $1"
    exit 4
  fi
}

validate_tail_lines() {
  if [[ ! "$TAIL_LINES" =~ ^[0-9]+$ ]]; then
    warn "Invalid TAIL_LINES value \"$TAIL_LINES\"; falling back to 200."
    TAIL_LINES=200
  fi
}

ssh_run() {
  local -a opts=(
    -i "$SSH_KEY"
    -o BatchMode=yes
    -o ConnectTimeout=10
    -o StrictHostKeyChecking=accept-new
  )

  if (( VERBOSE )); then
    printf "[LOCAL] ssh %s %s %s\n" "${opts[*]}" "$SERVER" "$*" >&2
  fi

  ssh "${opts[@]}" "$SERVER" "$@"
}

ssh_bash() {
  local script="$1"
  if (( VERBOSE )); then
    printf "[REMOTE] %s\n" "$script"
  fi
  ssh_run bash -lc "$script"
}

ensure_prereqs() {
  require_cmd ssh
  require_cmd rsync
  require_file "$SSH_KEY"
  require_file ".env"
}

ensure_ssh_ready() {
  info "Checking SSH connectivity to $SERVER"
  if ! ssh_run true >/dev/null 2>&1; then
    error "Unable to reach $SERVER with key $SSH_KEY"
    exit 5
  fi
}

ensure_remote_dir() {
  local remote_dir
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  ssh_bash "mkdir -p $remote_dir"
}

ensure_remote_env() {
  local remote_env
  remote_env=$(printf '%q' "$REMOTE_DIR/.env")
  if ! ssh_bash "test -f $remote_env"; then
    error "Missing remote .env file at $REMOTE_DIR/.env"
    exit 6
  fi
}

rsync_project() {
  info "Syncing project files to $SERVER:$REMOTE_DIR"

  local -a rsync_opts=(-az --delete)
  if (( VERBOSE )); then
    rsync_opts+=(-v --info=progress2)
  fi

  local -a excludes=(
    "--exclude=.git"
    "--exclude=node_modules"
    "--exclude=.next"
    "--exclude=.venv*"
    "--exclude=__pycache__"
    "--exclude=*.pyc"
    "--exclude=.env"
    "--exclude=.env.local"
    "--exclude=.env.production"
    "--exclude=*.log"
    "--exclude=.DS_Store"
    "--exclude=.pytest_cache"
    "--exclude=test-results"
    "--exclude=playwright-report"
    "--exclude=.scannerwork"
    "--exclude=crm-backend/uploads/*"
    "--exclude=crm-backend/backups/*"
  )

  if ! rsync "${rsync_opts[@]}" "${excludes[@]}" \
      -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
      ./ "$SERVER:$REMOTE_DIR/"; then
    error "File sync failed"
    exit 7
  fi
}

build_and_restart() {
  local remote_dir compose_file
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_file=$(printf '%q' "$COMPOSE_FILE")

  info "Rebuilding and restarting Docker services"
  ssh_bash "cd $remote_dir && docker compose -f $compose_file up -d --build"
}

run_migrations() {
  local remote_dir compose_file
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_file=$(printf '%q' "$COMPOSE_FILE")

  info "Applying database migrations"
  if ! ssh_bash "cd $remote_dir && docker compose -f $compose_file exec -T api alembic upgrade head"; then
    warn "Migrations failed; services are running but database may be outdated."
  fi
}

deploy_action() {
  ensure_prereqs
  validate_tail_lines
  ensure_ssh_ready
  ensure_remote_dir
  ensure_remote_env
  rsync_project
  build_and_restart
  run_migrations
  info "Deployment complete."
}

logs_action() {
  validate_tail_lines
  local remote_dir compose_file
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_file=$(printf '%q' "$COMPOSE_FILE")

  info "Streaming logs (tail $TAIL_LINES lines)"
  ssh_bash "cd $remote_dir && docker compose -f $compose_file logs -f --tail=$TAIL_LINES"
}

main() {
  while getopts "vh" opt; do
    case "$opt" in
      v) VERBOSE=1 ;;
      h) usage; exit 0 ;;
      *) usage; exit 1 ;;
    esac
  done
  shift $((OPTIND - 1))

  local action="${1:-deploy}"

  case "$action" in
    deploy) deploy_action ;;
    logs) logs_action ;;
    *)
      error "Unknown action: $action"
      usage
      exit 1
      ;;
  esac
}

main "$@"
