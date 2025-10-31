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
Usage: ./deploy.sh [OPTIONS] <command>

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

Commands:
  deploy          Sync code from local machine (rsync) then rebuild containers
  deploy-pull     Pull latest changes on remote git repo then rebuild containers (PRODUCTION)
  deploy-staging  Pull latest changes and deploy to STAGING environment
  logs            Tail docker-compose logs
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
  local escaped_script=${script//\'/\'\"\'\"\'} # wrap single quotes for bash -lc
  local remote_cmd="bash -lc '$escaped_script'"
  if (( VERBOSE )); then
    printf "[REMOTE] %s\n" "$script"
  fi
  ssh_run "$remote_cmd"
}

ensure_prereqs() {
  require_cmd ssh
  require_cmd rsync
  require_file "$SSH_KEY"
  require_file ".env"
  if [[ -z "$REMOTE_DIR" ]]; then
    error "REMOTE_DIR is empty; provide a valid remote directory path."
    exit 8
  fi
}

ensure_ssh_ready() {
  info "Checking SSH connectivity to $SERVER"
  if ! ssh_run true >/dev/null 2>&1; then
    error "Unable to reach $SERVER with key $SSH_KEY"
    exit 5
  fi
}

ensure_remote_dir() {
  info "Ensuring remote directory exists at $REMOTE_DIR"
  if ! ssh_run mkdir -p "$REMOTE_DIR"; then
    error "Unable to create remote directory $REMOTE_DIR"
    exit 9
  fi
}

ensure_remote_env() {
  if ! ssh_run test -f "$REMOTE_DIR/.env"; then
    error "Missing remote .env file at $REMOTE_DIR/.env"
    exit 6
  fi
}

ensure_remote_repo() {
  if ! ssh_run test -d "$REMOTE_DIR/.git"; then
    error "No git repository found at $REMOTE_DIR (.git missing)."
    exit 10
  fi
}

rsync_project() {
  info "Syncing project files to $SERVER:$REMOTE_DIR"

  local -a rsync_opts=(-az --delete)
  if (( VERBOSE )); then
    rsync_opts+=(-v)
    if rsync --help 2>&1 | grep -q 'progress2'; then
      rsync_opts+=(--info=progress2)
    else
      warn "Local rsync lacks --info=progress2; using --progress instead."
      rsync_opts+=(--progress)
    fi
  fi

  local -a excludes=(
    "--exclude=.git"
    "--exclude=node_modules"
    "--exclude=.next"
    "--exclude=.venv*"
    "--exclude=venv"
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
  local remote_dir compose_file compose_path
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_file=$(printf '%q' "$COMPOSE_FILE")
  compose_path=$(printf '%q' "${REMOTE_DIR%/}/$COMPOSE_FILE")

  info "Rebuilding and restarting Docker services"
  ssh_bash "docker compose --project-directory $remote_dir -f $compose_path up -d --build"
}

run_migrations() {
  local remote_dir compose_path
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_path=$(printf '%q' "${REMOTE_DIR%/}/$COMPOSE_FILE")

  info "Applying database migrations"
  if ! ssh_bash "docker compose --project-directory $remote_dir -f $compose_path exec -T api alembic upgrade head"; then
    warn "Migrations failed; services are running but database may be outdated."
  fi
}

server_git_pull() {
  local remote_dir
  remote_dir=$(printf '%q' "$REMOTE_DIR")

  info "Pulling latest git changes on server"
  if ! ssh_bash "cd $remote_dir && git pull --ff-only"; then
    error "Git pull failed on server"
    exit 11
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

deploy_pull_action() {
  ensure_prereqs
  validate_tail_lines
  ensure_ssh_ready
  ensure_remote_dir
  ensure_remote_env
  ensure_remote_repo
  server_git_pull
  build_and_restart
  run_migrations
  info "Deployment from remote git repository complete."
}

deploy_staging_action() {
  ensure_prereqs
  validate_tail_lines
  ensure_ssh_ready
  ensure_remote_dir
  ensure_remote_repo

  # Check staging env file
  if ! ssh_run test -f "$REMOTE_DIR/.env.staging"; then
    error "Missing remote .env.staging file at $REMOTE_DIR/.env.staging"
    exit 6
  fi

  info "Deploying STAGING environment"
  server_git_pull

  local remote_dir compose_prod compose_staging
  remote_dir=$(printf '%q' "$REMOTE_DIR")
  compose_prod=$(printf '%q' "${REMOTE_DIR%/}/docker-compose.prod.yml")
  compose_staging=$(printf '%q' "${REMOTE_DIR%/}/docker-compose.staging.yml")

  # Build and restart staging services
  info "Rebuilding and restarting STAGING services"
  ssh_bash "docker compose --project-directory $remote_dir -f $compose_prod -f $compose_staging --env-file $remote_dir/.env.staging up -d --build api-staging frontend-staging worker-staging"

  # Run migrations on staging DB
  info "Applying database migrations on STAGING"
  ssh_bash "docker compose --project-directory $remote_dir -f $compose_prod -f $compose_staging --env-file $remote_dir/.env.staging exec -T api-staging alembic upgrade head" || warn "Staging migrations failed"

  info "✅ Staging deployment complete: https://staging.crm.alforis.fr (user: alforis, pass: alforis2025)"
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
    deploy-pull) deploy_pull_action ;;
    deploy-staging) deploy_staging_action ;;
    logs) logs_action ;;
    *)
      error "Unknown action: $action"
      usage
      exit 1
      ;;
  esac
}

main "$@"
