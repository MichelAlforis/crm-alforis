#!/usr/bin/env bash
# ============================================================
# SAUVEGARDE COMPLÈTE AVANT RESET DOCKER
# ============================================================
# Sauvegarde toutes les données importantes avant reset Docker

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

# Répertoire de backup
BACKUP_DIR="$HOME/docker-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

section "SAUVEGARDE AVANT RESET DOCKER"
log_info "Répertoire de sauvegarde: $BACKUP_DIR"
echo ""

# Vérifier si le daemon est accessible
if ! docker info >/dev/null 2>&1; then
  log_error "Docker daemon inaccessible!"
  log_warning "Impossible de sauvegarder les données depuis les conteneurs"
  echo ""
  log_info "Tentative de sauvegarde des volumes locaux..."

  # Sauvegarder les fichiers locaux mappés
  section "Sauvegarde des fichiers locaux"

  if [[ -d "crm-backend/uploads" ]]; then
    log_info "Copie de crm-backend/uploads..."
    cp -r crm-backend/uploads "$BACKUP_DIR/backend-uploads"
    log_success "Uploads backend sauvegardés"
  fi

  if [[ -d "crm-backend/backups" ]]; then
    log_info "Copie de crm-backend/backups..."
    cp -r crm-backend/backups "$BACKUP_DIR/backend-backups"
    log_success "Backups backend sauvegardés"
  fi

  # Copier le .env
  if [[ -f ".env" ]]; then
    log_info "Copie du fichier .env..."
    cp .env "$BACKUP_DIR/.env"
    log_success "Fichier .env sauvegardé"
  fi

  echo ""
  log_warning "⚠️  Base de données NON sauvegardée (daemon inaccessible)"
  log_info "Si vous avez des données importantes, essayez d'abord de:"
  echo "  1. Forcer le démarrage du daemon"
  echo "  2. Ou récupérer manuellement depuis:"
  echo "     ~/Library/Containers/com.docker.docker/Data/vms/0/data/"
  echo ""
  log_info "Sauvegarde partielle dans: $BACKUP_DIR"
  exit 1
fi

# Si daemon accessible, sauvegarde complète
section "Étape 1: Sauvegarde de la base PostgreSQL"

PROJECT_NAME="v1"

# Vérifier si le conteneur postgres existe
if docker ps -a --format '{{.Names}}' | grep -q "${PROJECT_NAME}-postgres"; then
  log_info "Sauvegarde de PostgreSQL..."

  # Dump SQL
  if docker exec "${PROJECT_NAME}-postgres-1" pg_dump -U crm_user crm_db > "$BACKUP_DIR/database-dump.sql" 2>/dev/null; then
    log_success "Base de données sauvegardée: database-dump.sql"

    # Compresser
    gzip "$BACKUP_DIR/database-dump.sql"
    log_success "Compressé: database-dump.sql.gz ($(du -h "$BACKUP_DIR/database-dump.sql.gz" | cut -f1))"
  else
    log_warning "Échec du dump PostgreSQL (conteneur arrêté?)"
    log_info "Tentative de sauvegarde du volume..."

    # Sauvegarder le volume directement
    if docker run --rm -v ${PROJECT_NAME}_postgres-data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres-volume.tar.gz -C /data . 2>/dev/null; then
      log_success "Volume PostgreSQL sauvegardé: postgres-volume.tar.gz"
    else
      log_error "Impossible de sauvegarder PostgreSQL"
    fi
  fi
else
  log_warning "Conteneur PostgreSQL non trouvé"
fi

section "Étape 2: Sauvegarde des uploads/fichiers"

# Uploads API
if docker ps -a --format '{{.Names}}' | grep -q "${PROJECT_NAME}-api"; then
  log_info "Sauvegarde des uploads API..."

  # Vérifier si des fichiers existent
  if docker exec "${PROJECT_NAME}-api-1" ls /app/uploads 2>/dev/null | grep -q .; then
    docker cp "${PROJECT_NAME}-api-1:/app/uploads" "$BACKUP_DIR/api-uploads" 2>/dev/null || log_warning "Pas de fichiers uploads"
    log_success "Uploads API sauvegardés"
  else
    log_info "Pas de fichiers uploads dans l'API"
  fi

  # Backups existants
  if docker exec "${PROJECT_NAME}-api-1" ls /app/backups 2>/dev/null | grep -q .; then
    docker cp "${PROJECT_NAME}-api-1:/app/backups" "$BACKUP_DIR/api-backups" 2>/dev/null || log_warning "Pas de backups"
    log_success "Backups API sauvegardés"
  else
    log_info "Pas de backups dans l'API"
  fi
fi

# Fichiers locaux mappés (sécurité)
if [[ -d "crm-backend/uploads" ]]; then
  log_info "Copie des uploads locaux (bind mount)..."
  cp -r crm-backend/uploads "$BACKUP_DIR/local-backend-uploads" 2>/dev/null || true
fi

if [[ -d "crm-backend/backups" ]]; then
  log_info "Copie des backups locaux (bind mount)..."
  cp -r crm-backend/backups "$BACKUP_DIR/local-backend-backups" 2>/dev/null || true
fi

section "Étape 3: Sauvegarde de la configuration"

log_info "Copie des fichiers de configuration..."

# .env
if [[ -f ".env" ]]; then
  cp .env "$BACKUP_DIR/.env"
  log_success ".env sauvegardé"
fi

# docker-compose.yml
if [[ -f "docker-compose.yml" ]]; then
  cp docker-compose.yml "$BACKUP_DIR/docker-compose.yml"
  log_success "docker-compose.yml sauvegardé"
fi

# Liste des volumes
log_info "Liste des volumes Docker..."
docker volume ls > "$BACKUP_DIR/volumes-list.txt"
log_success "Liste des volumes sauvegardée"

# Liste des images
log_info "Liste des images Docker..."
docker images --format "{{.Repository}}:{{.Tag}}" > "$BACKUP_DIR/images-list.txt"
log_success "Liste des images sauvegardée"

section "Étape 4: Informations système"

log_info "Capture des informations système..."

# Docker info
docker info > "$BACKUP_DIR/docker-info.txt" 2>&1
docker compose -p v1 ps > "$BACKUP_DIR/compose-ps.txt" 2>&1 || true

# Créer un README
cat > "$BACKUP_DIR/README.txt" << EOF
SAUVEGARDE DOCKER - $(date)
======================================

Contenu de cette sauvegarde:
----------------------------
- database-dump.sql.gz     Base de données PostgreSQL
- api-uploads/             Fichiers uploadés par les utilisateurs
- api-backups/             Backups existants de l'API
- .env                     Variables d'environnement
- docker-compose.yml       Configuration Docker Compose
- volumes-list.txt         Liste des volumes Docker
- images-list.txt          Liste des images Docker
- docker-info.txt          Informations Docker système

Restauration après reset:
-------------------------
1. Recréer les conteneurs:
   cd "$(pwd)"
   docker compose up -d

2. Restaurer la base de données:
   gunzip -c database-dump.sql.gz | docker exec -i v1-postgres-1 psql -U crm_user crm_db

3. Restaurer les uploads (si nécessaire):
   docker cp api-uploads/. v1-api-1:/app/uploads/

Emplacement original: $(pwd)
EOF

log_success "README créé"

section "✅ SAUVEGARDE TERMINÉE"

echo ""
log_success "Tous les fichiers sauvegardés dans:"
echo "  $BACKUP_DIR"
echo ""

log_info "Contenu de la sauvegarde:"
du -sh "$BACKUP_DIR"/* 2>/dev/null | sed 's/^/  /'

echo ""
log_info "Vous pouvez maintenant procéder au reset Docker en toute sécurité!"
echo ""
log_warning "Conservez ce dossier jusqu'à confirmation que tout fonctionne après le reset"

# Créer un lien symbolique vers le dernier backup
ln -sf "$BACKUP_DIR" "$HOME/docker-backup-latest" 2>/dev/null || true
log_info "Lien rapide: ~/docker-backup-latest"
