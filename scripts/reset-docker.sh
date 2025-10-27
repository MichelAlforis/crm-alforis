#!/usr/bin/env bash
# ============================================================
# RESET COMPLET DOCKER DESKTOP
# ============================================================
# À utiliser quand Docker Desktop refuse de démarrer

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

section "RESET COMPLET DOCKER DESKTOP"

log_warning "⚠️  ATTENTION: Cette opération va:"
echo "  • Arrêter Docker Desktop"
echo "  • Supprimer TOUS les conteneurs, images, volumes"
echo "  • Réinitialiser Docker Desktop aux paramètres d'usine"
echo ""
read -p "Voulez-vous continuer ? (tapez 'YES' en majuscules): " confirm

if [[ "$confirm" != "YES" ]]; then
  log_info "Annulé"
  exit 0
fi

section "Étape 1: Arrêt de Docker Desktop"
log_info "Fermeture de Docker Desktop..."
osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
killall "Docker Desktop" 2>/dev/null || true
sleep 5
log_success "Docker Desktop arrêté"

section "Étape 2: Sauvegarde des volumes importants"
log_info "Liste des volumes actuels (pour référence):"
if docker volume ls 2>/dev/null; then
  docker volume ls > ~/docker-volumes-backup-$(date +%Y%m%d).txt
  log_success "Liste sauvegardée dans ~/docker-volumes-backup-$(date +%Y%m%d).txt"
else
  log_info "Impossible de lister les volumes (daemon down)"
fi

section "Étape 3: Nettoyage des fichiers Docker"
log_info "Suppression des fichiers de configuration et données..."

# Fichiers à supprimer
FILES_TO_REMOVE=(
  "$HOME/Library/Containers/com.docker.docker"
  "$HOME/Library/Application Support/Docker Desktop"
  "$HOME/Library/Group Containers/group.com.docker"
  "$HOME/Library/Preferences/com.docker.docker.plist"
  "$HOME/Library/Saved Application State/com.electron.docker-frontend.savedState"
  "$HOME/Library/Logs/Docker Desktop"
)

for file in "${FILES_TO_REMOVE[@]}"; do
  if [[ -e "$file" ]]; then
    log_info "Suppression: $file"
    rm -rf "$file"
  fi
done

log_success "Fichiers supprimés"

section "Étape 4: Nettoyage cache Docker CLI"
log_info "Nettoyage du cache Docker CLI..."
rm -rf ~/.docker/buildx 2>/dev/null || true
rm -rf ~/.docker/cli-plugins 2>/dev/null || true
rm -f ~/.docker/config.json.* 2>/dev/null || true
log_success "Cache nettoyé"

section "Étape 5: Redémarrage de Docker Desktop"
log_info "Lancement de Docker Desktop..."
open -a "Docker Desktop"

log_info "Attente du démarrage du daemon (jusqu'à 90s)..."
for i in {1..45}; do
  if docker info >/dev/null 2>&1; then
    echo ""
    log_success "✅ Docker opérationnel après $((i*2))s!"
    echo ""
    docker info | grep -E "Server Version|Operating System|CPUs|Total Memory"
    echo ""

    section "Configuration recommandée"
    log_info "Ouvrez Docker Desktop > Preferences et configurez:"
    echo "  • Resources > Memory: 8 GB minimum"
    echo "  • Resources > CPUs: 4 minimum"
    echo "  • General > Start Docker Desktop when you log in: ✓"
    echo ""
    log_success "Reset terminé avec succès!"
    exit 0
  fi
  printf "\r  Tentative %d/45 (${i}s/90s)..." $i
  sleep 2
done

echo ""
log_error "Le daemon ne démarre toujours pas après 90s"
echo ""
log_warning "Solutions supplémentaires:"
echo "  1. Vérifier que Docker Desktop est bien installé"
echo "  2. Redémarrer votre Mac"
echo "  3. Réinstaller Docker Desktop: https://www.docker.com/products/docker-desktop"
echo "  4. Vérifier les logs: ~/Library/Containers/com.docker.docker/Data/log/"

exit 1
