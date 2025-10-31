#!/bin/bash
#
# SSL Certificate Expiration Check
#
# Vérifie l'expiration du certificat SSL et envoie une alerte si < 10 jours
#
# Usage:
#   ./check-ssl-expiry.sh
#
# Cron (quotidien à 9h):
#   0 9 * * * /path/to/check-ssl-expiry.sh >> /var/log/ssl-check.log 2>&1
#

set -euo pipefail

# Configuration
DOMAIN="crm.alforis.fr"
ALERT_EMAIL="${SSL_ALERT_EMAIL:-infra@alforis.fr}"
WARNING_DAYS=10
CRITICAL_DAYS=3

# Couleurs pour output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

# Récupérer la date d'expiration
log "Vérification SSL pour $DOMAIN..."

EXPIRATION_DATE=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [[ -z "$EXPIRATION_DATE" ]]; then
    log "❌ Erreur: Impossible de récupérer le certificat SSL"
    echo "❌ Erreur SSL check pour $DOMAIN" | mail -s "❌ SSL Check Failed - $DOMAIN" "$ALERT_EMAIL" || true
    exit 1
fi

# Calculer jours restants (compatible macOS et Linux)
if date --version >/dev/null 2>&1; then
    # Linux (GNU date)
    EXPIRATION_SECONDS=$(date -d "$EXPIRATION_DATE" +%s)
else
    # macOS (BSD date)
    EXPIRATION_SECONDS=$(date -j -f "%b %d %H:%M:%S %Y %Z" "$EXPIRATION_DATE" +%s)
fi

NOW_SECONDS=$(date +%s)
DAYS_LEFT=$(( (EXPIRATION_SECONDS - NOW_SECONDS) / 86400 ))

log "Certificat SSL expire le: $EXPIRATION_DATE"
log "Jours restants: $DAYS_LEFT"

# Alertes selon seuils
if [ "$DAYS_LEFT" -lt "$CRITICAL_DAYS" ]; then
    # CRITIQUE: < 3 jours
    echo -e "${RED}🚨 CRITIQUE: SSL expire dans $DAYS_LEFT jours!${NC}"

    MESSAGE="🚨 CRITIQUE: Le certificat SSL du domaine $DOMAIN expire dans $DAYS_LEFT jours!

Date d'expiration: $EXPIRATION_DATE
Action requise: Renouveler immédiatement le certificat

Vérifier Caddy auto-renew:
  docker compose logs caddy | grep -i certificate
  docker compose exec caddy caddy list-certificates

Renouveler manuellement si besoin:
  docker compose restart caddy
"
    echo "$MESSAGE" | mail -s "🚨 CRITIQUE: SSL expire dans $DAYS_LEFT jours - $DOMAIN" "$ALERT_EMAIL" || true
    exit 2

elif [ "$DAYS_LEFT" -lt "$WARNING_DAYS" ]; then
    # WARNING: < 10 jours
    echo -e "${YELLOW}⚠️  WARNING: SSL expire dans $DAYS_LEFT jours${NC}"

    MESSAGE="⚠️  Le certificat SSL du domaine $DOMAIN expire dans $DAYS_LEFT jours.

Date d'expiration: $EXPIRATION_DATE
Action recommandée: Vérifier le renouvellement automatique

Caddy devrait renouveler automatiquement. Vérifier:
  docker compose logs caddy --tail=100 | grep -i certificate

Si problème, forcer le renouvellement:
  docker compose restart caddy
"
    echo "$MESSAGE" | mail -s "⚠️ SSL expire dans $DAYS_LEFT jours - $DOMAIN" "$ALERT_EMAIL" || true
    exit 1

else
    # OK: > 10 jours
    echo -e "${GREEN}✅ SSL OK: expire dans $DAYS_LEFT jours${NC}"
    exit 0
fi
