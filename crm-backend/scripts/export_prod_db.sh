#!/bin/bash
set -euo pipefail

# =========================================
# Export de la base de données de production
# =========================================
# Ce script exporte la base PostgreSQL de production
# vers un fichier SQL local pour import en développement

SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa_hetzner}"
SERVER="${SERVER:-root@159.69.108.234}"
REMOTE_DIR="/srv/crm-alforis"
LOCAL_FILE="crm-backend/crm_production.sql"

echo "📦 Export de la base de production"
echo "===================================="
echo ""

# 1. Vérifier la connexion SSH
echo "1️⃣ Vérification connexion SSH..."
if ! ssh -i "$SSH_KEY" "$SERVER" 'exit' 2>/dev/null; then
    echo "❌ Impossible de se connecter au serveur"
    exit 1
fi
echo "✅ Connexion OK"
echo ""

# 2. Export sur le serveur
echo "2️⃣ Export de la base PostgreSQL..."
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
cd /srv/crm-alforis
mkdir -p /tmp/db-export

# Export complet avec DROP + CREATE
docker compose -f docker-compose.prod.yml exec -T postgres pg_dump \
    -U crm_user \
    -d crm_db \
    --clean \
    --if-exists \
    --create \
    > /tmp/db-export/crm_production.sql

# Statistiques
SIZE=$(du -h /tmp/db-export/crm_production.sql | cut -f1)
LINES=$(wc -l < /tmp/db-export/crm_production.sql)
echo "✅ Export terminé: $SIZE ($LINES lignes)"
REMOTE_SCRIPT

echo ""

# 3. Téléchargement en local
echo "3️⃣ Téléchargement du dump..."
scp -i "$SSH_KEY" "$SERVER:/tmp/db-export/crm_production.sql" "$LOCAL_FILE"

if [ -f "$LOCAL_FILE" ]; then
    SIZE=$(du -h "$LOCAL_FILE" | cut -f1)
    echo "✅ Fichier téléchargé: $SIZE"
    echo "   📁 Emplacement: $LOCAL_FILE"
else
    echo "❌ Échec du téléchargement"
    exit 1
fi

echo ""
echo "🎉 Export terminé avec succès !"
echo ""
echo "📋 Prochaine étape:"
echo "   Importez la base en local avec:"
echo "   ./crm-backend/scripts/import_dev_db.sh"
