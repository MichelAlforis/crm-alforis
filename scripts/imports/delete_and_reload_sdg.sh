#!/bin/bash
# Script pour supprimer et recharger les 677 organisations SDG

set -e

echo "🗑️  Suppression des 677 organisations SDG de la base..."

# Connexion à la base de production
ssh -i ~/.ssh/id_rsa_hetzner root@159.69.108.234 << 'ENDSSH'
docker exec crm-alforis-postgres-1 psql -U crm_user -d crm_db << 'ENDSQL'
-- Sauvegarder le nombre avant suppression
SELECT COUNT(*) as "Organisations avant suppression" FROM organisations;

-- Supprimer toutes les organisations de type CLIENT
DELETE FROM organisations WHERE type = 'CLIENT';

-- Vérifier que c'est vide
SELECT COUNT(*) as "Organisations après suppression" FROM organisations;

-- Réinitialiser la séquence ID
SELECT setval('organisations_id_seq', 1, false);
ENDSQL
ENDSSH

echo "✅ Suppression terminée"
echo ""
echo "📥 Maintenant, pour recharger les organisations :"
echo ""
echo "1. Utilise le fichier CSV le plus complet"
echo "2. Va sur https://crm.alforis.fr/dashboard/imports/unified"
echo "3. Upload le CSV avec les bonnes colonnes"
echo ""
echo "📁 Fichiers CSV disponibles :"
echo "   - SDG_677_CATEGORIZED.csv (avec catégories)"
echo "   - data/csv_archives/SDG_677_FINAL_COMPLETE_WITH_AUM.csv (avec websites)"
echo ""
echo "💡 Conseil : Fusionner les deux pour avoir catégories + websites !"
