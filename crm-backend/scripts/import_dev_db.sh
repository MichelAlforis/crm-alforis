#!/bin/bash
set -euo pipefail

# =========================================
# Import de la base de production en local
# =========================================
# Ce script importe le dump de production dans
# votre base de développement locale

DUMP_FILE="${1:-crm-backend/crm_production.sql}"
DB_CONTAINER="crm-backend-postgres-1"
DB_USER="crm_user"
DB_NAME="crm_db"

echo "📥 Import de la base de production en local"
echo "============================================"
echo ""

# 1. Vérifier que le fichier existe
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Fichier non trouvé: $DUMP_FILE"
    echo ""
    echo "💡 Exportez d'abord la base de production:"
    echo "   ./crm-backend/scripts/export_prod_db.sh"
    exit 1
fi

SIZE=$(du -h "$DUMP_FILE" | cut -f1)
echo "✅ Fichier dump trouvé: $SIZE"
echo "   📁 $DUMP_FILE"
echo ""

# 2. Vérifier que Docker est lancé
if ! docker ps &> /dev/null; then
    echo "❌ Docker n'est pas lancé"
    exit 1
fi

# 3. Vérifier que le container PostgreSQL existe
if ! docker ps -a --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ Container PostgreSQL non trouvé: $DB_CONTAINER"
    echo ""
    echo "💡 Démarrez d'abord votre environnement de dev:"
    echo "   docker-compose up -d"
    exit 1
fi

# 4. Vérifier que le container est démarré
if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
    echo "⚠️  Container PostgreSQL arrêté, démarrage..."
    docker start "$DB_CONTAINER"
    echo "⏳ Attente 5s..."
    sleep 5
fi

echo "2️⃣ Vérification connexion PostgreSQL..."
if docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -c '\l' &> /dev/null; then
    echo "✅ PostgreSQL OK"
else
    echo "❌ Impossible de se connecter à PostgreSQL"
    exit 1
fi

echo ""
echo "⚠️  ATTENTION: Cette opération va ÉCRASER votre base locale !"
read -p "   Continuer ? (yes/NO): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Import annulé"
    exit 0
fi

echo ""
echo "3️⃣ Import du dump SQL..."

# Copier le dump dans le container
docker cp "$DUMP_FILE" "$DB_CONTAINER:/tmp/import.sql"

# Importer le dump
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d postgres -f /tmp/import.sql

# Nettoyer
docker exec "$DB_CONTAINER" rm /tmp/import.sql

echo "✅ Import terminé"
echo ""

# 4. Statistiques
echo "4️⃣ Statistiques de la base importée:"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" << 'SQL'
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

SELECT COUNT(*) as nb_users FROM users;
SQL

echo ""
echo "🎉 Import réussi !"
echo ""
echo "📋 Credentials locaux:"
echo "   Email:    michel.marques@alforis.fr"
echo "   Password: admin123"
echo ""
echo "🚀 Démarrez votre API locale:"
echo "   cd crm-backend && python main.py"
