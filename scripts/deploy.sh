#!/usr/bin/env bash
set -euo pipefail

# =====================================
# DEPLOY CRM ALFORIS - DOCKER VERSION
# =====================================
# Déploiement avec Docker Compose (production)
# Pas besoin de PM2 avec cette approche

# -------------------- CONFIG --------------------
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_hetzner}"
SERVER="${SERVER:-root@159.69.108.234}"
REMOTE_DIR="${REMOTE_DIR:-/srv/crm-alforis}"
LOGFILE="${LOGFILE:-deploy.log}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

VERBOSE=0

# -------------------- UTILS ---------------------
print_error()   { echo -e "${RED}❌ $*${NC}" >&2; }
print_success() { echo -e "${GREEN}✅ $*${NC}"; }
print_info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  [[ $VERBOSE -eq 1 ]] && echo "$msg"
  echo "$msg" >> "$LOGFILE"
}

run_quiet() {
  if [[ $VERBOSE -eq 1 ]]; then
    "$@" 2>&1 | tee -a "$LOGFILE"
    return "${PIPESTATUS[0]}"
  else
    "$@" >> "$LOGFILE" 2>&1
  fi
}

ssh_cmd() {
  ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$SERVER" "$@"
}

ssh_quiet() {
  if [[ $VERBOSE -eq 1 ]]; then
    ssh_cmd "$@" 2>&1 | tee -a "$LOGFILE"
    return "${PIPESTATUS[0]}"
  else
    ssh_cmd "$@" >> "$LOGFILE" 2>&1
  fi
}

scp_quiet() {
  local exclude_opts=(
    --exclude='.git'
    --exclude='node_modules'
    --exclude='.next'
    --exclude='.venv*'
    --exclude='__pycache__'
    --exclude='*.pyc'
    --exclude='.env'
    --exclude='.env.local'
    --exclude='.env.production'
    --exclude='*.log'
    --exclude='.DS_Store'
    --exclude='.pytest_cache'
    --exclude='test-results'
    --exclude='playwright-report'
    --exclude='.scannerwork'
    --exclude='crm-backend/uploads/*'
    --exclude='crm-backend/backups/*'
  )

  if command -v rsync &> /dev/null; then
    log "Utilisation de rsync pour la copie"
    if [[ $VERBOSE -eq 1 ]]; then
      rsync -avz --progress "${exclude_opts[@]}" -e "ssh -i $SSH_KEY" . "$SERVER:$REMOTE_DIR" 2>&1 | tee -a "$LOGFILE"
      return "${PIPESTATUS[0]}"
    else
      rsync -az "${exclude_opts[@]}" -e "ssh -i $SSH_KEY" . "$SERVER:$REMOTE_DIR" >> "$LOGFILE" 2>&1
    fi
  else
    log "rsync non disponible, utilisation de scp"
    if [[ $VERBOSE -eq 1 ]]; then
      scp -i "$SSH_KEY" -r . "$SERVER:$REMOTE_DIR" 2>&1 | tee -a "$LOGFILE"
      return "${PIPESTATUS[0]}"
    else
      scp -q -i "$SSH_KEY" -r . "$SERVER:$REMOTE_DIR" >> "$LOGFILE" 2>&1
    fi
  fi
}

show_help() {
  cat <<EOF
${BLUE}Alforis CRM - Docker Deployment Script${NC}

${GREEN}Usage:${NC} $0 [OPTIONS] <ACTION>

${GREEN}Options:${NC}
  -v        Verbose mode
  -h        Affiche cette aide

${GREEN}Actions:${NC}
  setup           Configuration initiale du serveur (Docker, nginx, SSL)
  setup-ssl       Configure Nginx + SSL Let's Encrypt (après deploy)
  deploy          Déploiement complet (copie + build + migrate + restart)
  deploy-backend  Déploiement backend uniquement (rebuild API)
  deploy-frontend Déploiement frontend uniquement (rebuild frontend)
  start           Démarrage des containers
  stop            Arrêt des containers
  restart         Redémarrage des containers
  status          Affiche le statut des containers
  logs            Affiche les logs en temps réel
  logs-api        Logs API uniquement
  logs-frontend   Logs frontend uniquement
  migrate         Exécute les migrations Alembic
  backup-db       Sauvegarde la base de données
  restore-db      Restaure la dernière sauvegarde
  rollback        Rollback vers la version précédente (git)
  update          Mise à jour depuis git (pull + rebuild + migrate)
  clean-docker    Nettoie les images/volumes Docker non utilisés

${GREEN}Variables d'environnement:${NC}
  SSH_KEY       Clé SSH (défaut: ~/.ssh/id_rsa_hetzner)
  SERVER        Serveur (défaut: root@159.69.108.234)
  REMOTE_DIR    Répertoire distant (défaut: /opt/alforis-crm)
  COMPOSE_FILE  Fichier compose (défaut: docker-compose.prod.yml)

${GREEN}Exemples:${NC}
  $0 setup                  Configuration initiale serveur
  $0 -v deploy              Déploiement complet
  $0 deploy-backend         Backend uniquement
  $0 migrate                Migrations DB
  $0 backup-db              Backup base de données
  $0 logs-api               Logs API en temps réel
EOF
}

check_dependencies() {
  local missing=()

  for cmd in ssh scp rsync; do
    if ! command -v "$cmd" &> /dev/null; then
      missing+=("$cmd")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    print_error "Commandes manquantes : ${missing[*]}"
    exit 3
  fi
}

create_backup() {
  log "Création backup avant déploiement"
  local backup_name="backup_$(date +%Y%m%d_%H%M%S)"

  if ssh_quiet "cd $(dirname "$REMOTE_DIR") && [ -d '$REMOTE_DIR' ] && cp -r '$REMOTE_DIR' '${REMOTE_DIR}_${backup_name}'"; then
    log "Backup créé : ${REMOTE_DIR}_${backup_name}"
    echo "$backup_name" > .last_backup
    return 0
  else
    print_warning "Impossible de créer le backup"
    return 1
  fi
}

# SUPPRIMÉ: Les fichiers .env sont maintenant stables sur le serveur
# Plus besoin de les copier à chaque déploiement
# Configuration initiale uniquement lors du premier setup

# -------------------- CHECKS ---------------------
while getopts "vh" opt; do
  case $opt in
    v) VERBOSE=1 ;;
    h) show_help; exit 0 ;;
    *) show_help; exit 1 ;;
  esac
done
shift $((OPTIND-1))

if [ "$(whoami)" = "root" ] && [ -n "${SSH_CONNECTION-}" ]; then
  print_error "Vous êtes déjà sur le serveur ! Lancez depuis votre poste local."
  exit 1
fi

if [[ $# -lt 1 ]]; then
  show_help
  exit 0
fi

ACTION="$1"
shift

check_dependencies

if [[ ! -f "$SSH_KEY" ]]; then
  print_error "Clé SSH introuvable : $SSH_KEY"
  exit 2
fi

print_info "Test connexion SSH..."
if ! ssh_cmd 'exit' 2>/dev/null; then
  print_error "Connexion SSH impossible avec $SERVER"
  exit 2
fi
print_success "Connexion SSH OK"

# ------------------- ACTIONS ---------------------
case "$ACTION" in
  setup)
    print_info "Configuration initiale du serveur"
    log "🔧 Setup serveur"

    print_info "Installation Docker..."
    ssh_quiet "
      apt update && apt upgrade -y
      apt install -y curl git nginx certbot python3-certbot-nginx

      # Docker
      if ! command -v docker &> /dev/null; then
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        apt install -y docker-compose-plugin
        systemctl enable docker
        systemctl start docker
      fi

      # Créer répertoire
      mkdir -p '$REMOTE_DIR'

      # Firewall
      ufw allow 80/tcp
      ufw allow 443/tcp
      ufw allow 22/tcp
      ufw --force enable
    " || { print_error "Échec setup"; exit 10; }

    print_success "Serveur configuré"
    print_info "Prochaines étapes:"
    print_info "1. Configurez vos DNS (A records)"
    print_info "2. Créez le fichier .env à la racine: cp .env.example .env"
    print_info "3. Lancez: $0 deploy"
    ;;

  deploy)
    print_info "Déploiement complet Docker"
    log "📤 Déploiement complet"

    # Vérifier fichier .env
    if [[ ! -f .env ]]; then
      print_error "Fichier .env manquant à la racine!"
      print_info "Docker Compose charge automatiquement .env"
      print_info "Créez-le: cp .env.example .env"
      exit 20
    fi

    # Vérifier espace disque
    print_info "Vérification espace disque..."
    disk_usage=$(ssh_cmd "df / | tail -1 | awk '{print \$5}' | sed 's/%//'")
    if [[ $disk_usage -gt 85 ]]; then
      print_warning "Disque à ${disk_usage}% - Nettoyage Docker..."
      ssh_quiet "docker system prune -af --volumes" || print_warning "Nettoyage échoué"
      print_success "Nettoyage terminé"
    else
      print_success "Espace disque OK (${disk_usage}%)"
    fi

    # Backup
    print_info "Backup base de données..."
    ssh_quiet "cd '$REMOTE_DIR' && [ -f docker-compose.prod.yml ] && docker compose -f docker-compose.prod.yml exec -T postgres pg_dump -U crm_user crm_db | gzip > /opt/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz" || print_warning "Pas de backup (premier déploiement?)"

    create_backup || true

    # Copie des fichiers
    print_info "Copie des fichiers..."
    if ! scp_quiet; then
      print_error "Échec copie"
      exit 13
    fi
    print_success "Fichiers copiés"

    # Les .env sont maintenant stables sur le serveur (pas de copie)
    print_info "Vérification .env existant sur serveur..."
    if ! ssh_cmd "[ -f '$REMOTE_DIR/.env' ]"; then
      print_error ".env manquant sur le serveur!"
      print_info "Créez-le manuellement sur le serveur: cp .env.example .env"
      exit 13
    fi
    print_success ".env présent"

    # Build et démarrage
    print_info "Build des images Docker..."
    # OPTIMISATION: Retrait de --no-cache pour utiliser le cache des layers Docker (gain 5-10x)
    # Si besoin d'un rebuild complet, ajouter --no-cache manuellement
    if ! ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE build"; then
      print_error "Échec build"
      exit 14
    fi
    print_success "Build réussi"

    print_info "Démarrage des containers..."
    if ! ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE down && docker compose -f $COMPOSE_FILE up -d"; then
      print_error "Échec démarrage"
      exit 15
    fi
    print_success "Containers démarrés"

    # Attendre que l'API soit prête
    print_info "Attente démarrage API (30s)..."
    sleep 30

    # Migrations
    print_info "Exécution migrations..."
    if ! ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE exec -T api alembic upgrade head"; then
      print_warning "Échec migrations (peut-être déjà à jour)"
    else
      print_success "Migrations OK"
    fi

    # Status
    ssh_cmd "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE ps"

    print_success "Déploiement terminé !"
    log "✅ Déploiement complet terminé"
    ;;

  deploy-backend)
    print_info "Déploiement backend uniquement"
    log "📤 Déploiement backend"

    print_info "Copie backend..."
    if command -v rsync &> /dev/null; then
      run_quiet rsync -az --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' --exclude='.venv*' -e "ssh -i $SSH_KEY" ./crm-backend/ "$SERVER:$REMOTE_DIR/crm-backend/"
    fi
    print_success "Backend copié"

    print_info "Rebuild + restart API..."
    if ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE build api && docker compose -f $COMPOSE_FILE up -d --no-deps api"; then
      print_success "Backend redémarré"
    else
      print_error "Échec redémarrage"
      exit 16
    fi

    print_info "Migrations..."
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE exec -T api alembic upgrade head" || print_warning "Migrations échouées"

    print_success "Backend déployé"
    ;;

  deploy-frontend)
    print_info "Déploiement frontend uniquement"
    log "📤 Déploiement frontend"

    print_info "Copie frontend..."
    if command -v rsync &> /dev/null; then
      run_quiet rsync -az --exclude='.git' --exclude='node_modules' --exclude='.next' -e "ssh -i $SSH_KEY" ./crm-frontend/ "$SERVER:$REMOTE_DIR/crm-frontend/"
    fi
    print_success "Frontend copié"

    print_info "Rebuild + restart frontend..."
    if ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE build frontend && docker compose -f $COMPOSE_FILE up -d --no-deps frontend"; then
      print_success "Frontend redémarré"
    else
      print_error "Échec redémarrage"
      exit 16
    fi

    print_success "Frontend déployé"
    ;;

  start)
    print_info "Démarrage containers"
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE up -d"
    print_success "Containers démarrés"
    ;;

  stop)
    print_info "Arrêt containers"
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE down"
    print_success "Containers arrêtés"
    ;;

  restart)
    print_info "Redémarrage containers"
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE restart"
    print_success "Containers redémarrés"
    ;;

  status)
    print_info "Statut des containers"
    ssh_cmd "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE ps && echo && docker compose -f $COMPOSE_FILE top"
    ;;

  logs)
    print_info "Logs temps réel (Ctrl+C pour quitter)"
    ssh_cmd "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE logs -f --tail=100"
    ;;

  logs-api)
    print_info "Logs API (Ctrl+C pour quitter)"
    ssh_cmd "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE logs -f api --tail=100"
    ;;

  logs-frontend)
    print_info "Logs frontend (Ctrl+C pour quitter)"
    ssh_cmd "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE logs -f frontend --tail=100"
    ;;

  migrate)
    print_info "Exécution migrations Alembic"
    if ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE exec -T api alembic upgrade head"; then
      print_success "Migrations exécutées"
    else
      print_error "Échec migrations"
      exit 17
    fi
    ;;

  backup-db)
    print_info "Sauvegarde base de données"
    ssh_quiet "mkdir -p /opt/backups"
    if ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE exec -T postgres pg_dump -U crm_user crm_db | gzip > /opt/backups/db_$(date +%Y%m%d_%H%M%S).sql.gz"; then
      print_success "Base sauvegardée"
      ssh_cmd "ls -lh /opt/backups/db_*.sql.gz | tail -5"
    else
      print_error "Échec backup"
      exit 18
    fi
    ;;

  restore-db)
    print_warning "Restauration dernière sauvegarde"

    # Afficher les backups disponibles
    print_info "Backups disponibles:"
    ssh_cmd "ls -lht /opt/backups/db_*.sql.gz | head -5"

    read -rp "Nom du fichier à restaurer (ex: db_20241020_143000.sql.gz): " backup_file

    if [[ -z "$backup_file" ]]; then
      print_error "Aucun fichier spécifié"
      exit 19
    fi

    print_warning "ATTENTION: Cela écrasera la base actuelle!"
    read -rp "Confirmer ? (yes/NO): " confirm

    if [[ "$confirm" != "yes" ]]; then
      print_info "Restauration annulée"
      exit 0
    fi

    if ssh_quiet "gunzip < /opt/backups/$backup_file | docker compose -f $COMPOSE_FILE exec -T postgres psql -U crm_user crm_db"; then
      print_success "Base restaurée"
    else
      print_error "Échec restauration"
      exit 19
    fi
    ;;

  rollback)
    print_warning "Rollback vers commit précédent"

    ssh_cmd "cd '$REMOTE_DIR' && git log --oneline -10"

    read -rp "Commit hash pour rollback: " commit_hash

    if [[ -z "$commit_hash" ]]; then
      print_error "Aucun commit spécifié"
      exit 20
    fi

    read -rp "Confirmer rollback vers $commit_hash ? (y/N): " confirm

    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      if ssh_quiet "cd '$REMOTE_DIR' && git checkout $commit_hash && docker compose -f $COMPOSE_FILE down && docker compose -f $COMPOSE_FILE build && docker compose -f $COMPOSE_FILE up -d"; then
        print_success "Rollback effectué"
      else
        print_error "Échec rollback"
        exit 21
      fi
    else
      print_info "Rollback annulé"
    fi
    ;;

  update)
    print_info "Mise à jour depuis git"
    log "🔄 Update depuis git"

    print_info "Git pull..."
    if ! ssh_quiet "cd '$REMOTE_DIR' && git pull origin main"; then
      print_error "Échec git pull"
      exit 22
    fi
    print_success "Code mis à jour"

    print_info "Rebuild containers..."
    if ! ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE build"; then
      print_error "Échec build"
      exit 23
    fi

    print_info "Redémarrage..."
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE down && docker compose -f $COMPOSE_FILE up -d"

    sleep 20

    print_info "Migrations..."
    ssh_quiet "cd '$REMOTE_DIR' && docker compose -f $COMPOSE_FILE exec -T api alembic upgrade head" || print_warning "Migrations échouées"

    print_success "Mise à jour terminée"
    ;;

  setup-ssl)
    print_info "Configuration Nginx + SSL Let's Encrypt"
    log "🔒 Setup SSL"

    if [[ -z "${1:-}" ]]; then
      print_error "Usage: $0 setup-ssl <domain> <email>"
      print_info "Exemple: $0 setup-ssl crm.alforis.fr contact@alforis.fr"
      exit 24
    fi

    DOMAIN="$1"
    EMAIL="${2:-admin@$DOMAIN}"

    print_info "Copie du script setup-nginx-ssl.sh..."
    if ! scp -i "$SSH_KEY" scripts/setup-nginx-ssl.sh "$SERVER:/tmp/setup-nginx-ssl.sh" >> "$LOGFILE" 2>&1; then
      print_error "Échec copie script"
      exit 25
    fi

    print_info "Exécution sur le serveur..."
    if ssh_cmd "chmod +x /tmp/setup-nginx-ssl.sh && /tmp/setup-nginx-ssl.sh '$DOMAIN' '$EMAIL'"; then
      print_success "Nginx + SSL configurés"
      print_info "Votre CRM est accessible sur: https://$DOMAIN"
    else
      print_error "Échec configuration SSL"
      exit 26
    fi
    ;;

  clean-docker)
    print_info "Nettoyage Docker (images, volumes, cache)"
    ssh_cmd "docker system df"

    read -rp "Confirmer le nettoyage ? (y/N): " confirm
    if [[ "$confirm" =~ ^[Yy]$ ]]; then
      ssh_quiet "docker system prune -af --volumes"
      print_success "Nettoyage effectué"
      ssh_cmd "docker system df"
    else
      print_info "Nettoyage annulé"
    fi
    ;;

  *)
    print_error "Action inconnue : $ACTION"
    show_help
    exit 1
    ;;
esac

exit 0
