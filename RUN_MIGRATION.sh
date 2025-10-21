#!/bin/bash
# Script pour exécuter la migration activity_participants

echo "🚀 Exécution migration 002_add_activity_participants.sql..."
echo ""

# Chercher les credentials PostgreSQL
if [ -f "crm-backend/.env" ]; then
    source crm-backend/.env
fi

# Exécuter la migration
psql "${DATABASE_URL:-postgresql://localhost/crm_db}" -f crm-backend/migrations/002_add_activity_participants.sql

echo ""
echo "✅ Migration terminée!"
echo ""
echo "Prochaines étapes:"
echo "1. Redémarrer le backend (cd crm-backend && uvicorn main:app --reload)"
echo "2. Les nouveaux endpoints sont disponibles!"
