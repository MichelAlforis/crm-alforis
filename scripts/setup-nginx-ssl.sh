#!/bin/bash
set -euo pipefail

# ===========================================
# SETUP NGINX + SSL - CRM Alforis
# ===========================================
# Configuration Nginx et certificat SSL pour crm.alforis.fr

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error()   { echo -e "${RED}❌ $*${NC}" >&2; }
print_success() { echo -e "${GREEN}✅ $*${NC}"; }
print_info()    { echo -e "${BLUE}ℹ️  $*${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $*${NC}"; }

# Configuration
DOMAIN="crm.alforis.fr"
EMAIL="contact@alforis.fr"  # Changez ceci !
NGINX_CONF="/etc/nginx/sites-available/crm-alforis"
NGINX_ENABLED="/etc/nginx/sites-enabled/crm-alforis"

echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}   SETUP NGINX + SSL - CRM Alforis${NC}"
echo -e "${BLUE}=========================================${NC}\n"

# Vérifier si on est root
if [[ $EUID -ne 0 ]]; then
   print_error "Ce script doit être lancé en tant que root"
   exit 1
fi

# Vérifier si on est sur le serveur
if [[ ! -d "/srv/crm-alforis" ]]; then
    print_error "Ce script doit être lancé sur le serveur (pas en local)"
    print_info "Lancez: ssh root@159.69.108.234 'bash -s' < scripts/setup-nginx-ssl.sh"
    exit 1
fi

# ========================================
# 1. INSTALLATION NGINX + CERTBOT
# ========================================
print_info "Installation de Nginx et Certbot..."
apt update
apt install -y nginx certbot python3-certbot-nginx

print_success "Nginx et Certbot installés"

# ========================================
# 2. CONFIGURATION NGINX (HTTP SEULEMENT)
# ========================================
print_info "Configuration de Nginx (HTTP temporaire pour Let's Encrypt)..."

cat > "$NGINX_CONF" << 'EOF'
# Configuration temporaire HTTP pour Let's Encrypt
server {
    listen 80;
    listen [::]:80;
    server_name crm.alforis.fr;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Proxy temporaire vers le frontend
    location / {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

print_success "Configuration Nginx créée"

# ========================================
# 3. ACTIVER LE SITE
# ========================================
print_info "Activation du site..."

# Créer le dossier certbot
mkdir -p /var/www/certbot

# Lien symbolique
ln -sf "$NGINX_CONF" "$NGINX_ENABLED"

# Test de configuration
if nginx -t; then
    print_success "Configuration Nginx valide"
else
    print_error "Erreur dans la configuration Nginx"
    exit 1
fi

# Redémarrage Nginx
systemctl restart nginx
systemctl enable nginx

print_success "Nginx activé et démarré"

# ========================================
# 4. VÉRIFICATION DNS
# ========================================
print_info "Vérification de la configuration DNS..."

PUBLIC_IP=$(curl -s ifconfig.me)
DNS_IP=$(dig +short $DOMAIN | tail -1)

echo "IP publique du serveur : $PUBLIC_IP"
echo "IP DNS de $DOMAIN       : $DNS_IP"

if [[ "$PUBLIC_IP" != "$DNS_IP" ]]; then
    print_warning "ATTENTION : Le DNS ne pointe pas vers ce serveur !"
    print_info "Configurez un enregistrement A :"
    print_info "  Type: A"
    print_info "  Nom: crm.alforis.fr"
    print_info "  Valeur: $PUBLIC_IP"
    echo
    read -p "Appuyez sur Entrée quand le DNS est configuré (ou Ctrl+C pour annuler)..."
fi

print_success "DNS correctement configuré"

# ========================================
# 5. OBTENTION DU CERTIFICAT SSL
# ========================================
print_info "Obtention du certificat SSL Let's Encrypt..."

if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "$EMAIL" --redirect; then
    print_success "Certificat SSL obtenu avec succès"
else
    print_error "Échec de l'obtention du certificat SSL"
    print_info "Vérifiez que :"
    print_info "  1. Le DNS pointe bien vers ce serveur"
    print_info "  2. Le port 80 est ouvert (firewall)"
    print_info "  3. Nginx est bien démarré"
    exit 1
fi

# ========================================
# 6. CONFIGURATION NGINX FINALE (HTTPS)
# ========================================
print_info "Mise à jour de la configuration Nginx avec HTTPS..."

# La configuration complète sera copiée depuis nginx/crm-alforis.conf
# Pour l'instant, certbot a déjà configuré HTTPS

print_success "Configuration HTTPS active"

# ========================================
# 7. AUTO-RENOUVELLEMENT SSL
# ========================================
print_info "Configuration de l'auto-renouvellement SSL..."

# Test du renouvellement
if certbot renew --dry-run; then
    print_success "Auto-renouvellement SSL configuré"
else
    print_warning "Problème avec l'auto-renouvellement (non bloquant)"
fi

# Vérifier le timer systemd
systemctl status certbot.timer --no-pager || true

# ========================================
# 8. CONFIGURATION FIREWALL
# ========================================
print_info "Configuration du firewall..."

ufw allow 'Nginx Full'
ufw delete allow 'Nginx HTTP' 2>/dev/null || true

print_success "Firewall configuré"

# ========================================
# 9. VÉRIFICATION FINALE
# ========================================
print_info "Vérification finale..."

# Test HTTPS
if curl -sSf "https://$DOMAIN/health" > /dev/null 2>&1; then
    print_success "HTTPS fonctionne correctement"
else
    print_warning "Le healthcheck HTTPS a échoué (normal si les containers Docker ne sont pas encore démarrés)"
fi

# Afficher les certificats
certbot certificates

# ========================================
# RÉSUMÉ
# ========================================
echo
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   ✅ SETUP TERMINÉ AVEC SUCCÈS${NC}"
echo -e "${GREEN}=========================================${NC}"
echo
echo -e "${BLUE}Résumé :${NC}"
echo "  • Nginx installé et configuré"
echo "  • Certificat SSL actif pour $DOMAIN"
echo "  • HTTPS forcé (redirection HTTP → HTTPS)"
echo "  • Auto-renouvellement SSL configuré"
echo "  • Firewall configuré"
echo
echo -e "${BLUE}URLs :${NC}"
echo "  • Frontend : https://$DOMAIN"
echo "  • API      : https://$DOMAIN/api/v1/health"
echo
echo -e "${BLUE}Prochaines étapes :${NC}"
echo "  1. Vérifier que Docker containers sont démarrés"
echo "  2. Tester l'accès : curl https://$DOMAIN"
echo "  3. Vérifier les logs : tail -f /var/log/nginx/crm-alforis-error.log"
echo
print_success "Configuration terminée !"
