#!/usr/bin/env bash
# ============================================================
# POST-INSTALLATION DOCKER DESKTOP
# ============================================================
# Configure Docker Desktop après une installation fraîche

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

section "POST-INSTALLATION DOCKER DESKTOP"

# Étape 1: Vérifier que Docker est installé et lancé
section "Étape 1: Vérification de Docker"

if ! command -v docker &>/dev/null; then
  log_error "Docker n'est pas installé!"
  log_info "Téléchargez Docker Desktop: https://www.docker.com/products/docker-desktop"
  exit 1
fi

log_success "Docker CLI installé"

# Attendre le daemon
log_info "Attente du daemon Docker..."
for i in {1..30}; do
  if docker info >/dev/null 2>&1; then
    log_success "Daemon opérationnel!"
    break
  fi
  if [ $i -eq 30 ]; then
    log_error "Daemon non accessible après 60s"
    log_info "Ouvrez Docker Desktop manuellement et relancez ce script"
    exit 1
  fi
  printf "\r  Tentative %d/30..." $i
  sleep 2
done
echo ""

# Étape 2: Afficher les infos actuelles
section "Étape 2: Configuration actuelle"

docker info | grep -E "Server Version|Operating System|CPUs|Total Memory|Docker Root Dir"

# Étape 3: Configurer daemon.json
section "Étape 3: Configuration du daemon"

DAEMON_JSON="$HOME/.docker/daemon.json"

if [[ -f "$DAEMON_JSON" ]]; then
  log_info "Sauvegarde de daemon.json existant..."
  cp "$DAEMON_JSON" "$DAEMON_JSON.backup-$(date +%Y%m%d-%H%M%S)"
fi

log_info "Écriture de la configuration optimisée..."

cat > "$DAEMON_JSON" << 'EOF'
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "max-concurrent-downloads": 10,
  "max-concurrent-uploads": 10
}
EOF

log_success "daemon.json configuré"
log_warning "Redémarrez Docker Desktop pour appliquer les changements"

# Étape 4: Test hello-world
section "Étape 4: Test avec hello-world"

log_info "Lancement du conteneur de test..."
if docker run --rm hello-world > /tmp/docker-test.log 2>&1; then
  log_success "Test réussi! Docker fonctionne correctement"
else
  log_error "Échec du test"
  cat /tmp/docker-test.log
  exit 1
fi

# Étape 5: Vérifier BuildKit
section "Étape 5: Vérification BuildKit"

if docker buildx version >/dev/null 2>&1; then
  log_success "BuildKit disponible"
  docker buildx version
else
  log_warning "BuildKit non disponible (normal sur certaines versions)"
fi

# Étape 6: Nettoyer
section "Étape 6: Nettoyage initial"

log_info "Nettoyage des images/conteneurs de test..."
docker system prune -f >/dev/null 2>&1
log_success "Nettoyage effectué"

# Étape 7: Recommandations
section "✅ INSTALLATION TERMINÉE"

echo ""
log_success "Docker Desktop est prêt à l'emploi!"
echo ""

log_info "Prochaines étapes:"
echo ""
echo "  1. Configurer les ressources dans Docker Desktop:"
echo "     → Preferences > Resources"
echo "     → CPU: 4 cores"
echo "     → Memory: 6 GB"
echo "     → Swap: 1 GB"
echo ""
echo "  2. Activer le démarrage auto:"
echo "     → Preferences > General"
echo "     → ✓ Start Docker Desktop when you log in"
echo ""
echo "  3. Redémarrer Docker Desktop pour appliquer daemon.json"
echo ""
echo "  4. Tester votre projet:"
echo "     cd \"$(dirname "$(dirname "$0")")\""
echo "     ./scripts/dev-fast.sh up"
echo ""

log_warning "N'oubliez pas de REDÉMARRER Docker Desktop maintenant!"
echo ""
log_info "Après redémarrage, lancez:"
echo "  ./scripts/dev-fast.sh up"
