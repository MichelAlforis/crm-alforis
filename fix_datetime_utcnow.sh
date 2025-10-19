#!/bin/bash
# Script pour corriger datetime.utcnow() → datetime.now(timezone.utc)

cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-backend"

echo "🔧 Correction de datetime.utcnow() dans le code backend..."

# Liste des fichiers à corriger (hors tests pour l'instant)
files=(
    "core/events.py"
    "core/notifications.py"
    "core/webhooks.py"
    "models/task.py"
    "models/notification.py"
    "tasks/workflow_tasks.py"
    "tasks/email_tasks.py"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  Correction de $file..."

        # Ajouter l'import timezone si pas déjà présent
        if ! grep -q "from datetime import.*timezone" "$file"; then
            # Remplacer la ligne d'import datetime
            sed -i '' 's/from datetime import datetime/from datetime import datetime, timezone/g' "$file" 2>/dev/null || true
            sed -i '' 's/from datetime import \(.*\)datetime\(.*\)/from datetime import \1datetime, timezone\2/g' "$file" 2>/dev/null || true
        fi

        # Remplacer datetime.utcnow() par datetime.now(timezone.utc)
        sed -i '' 's/datetime\.utcnow()/datetime.now(timezone.utc)/g' "$file"

        echo "    ✅ $file corrigé"
    else
        echo "    ⚠️  $file non trouvé"
    fi
done

echo ""
echo "✅ Correction terminée !"
echo ""
echo "Fichiers modifiés : ${#files[@]}"
