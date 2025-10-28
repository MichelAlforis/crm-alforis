#!/bin/bash

# Script pour remplacer tous les console.* par logger.*
# Usage: ./scripts/replace-console-logs.sh

set -e

cd "$(dirname "$0")/.."

FRONTEND_DIR="crm-frontend"

echo "🔍 Recherche des fichiers avec console.* ..."

# Liste des fichiers à traiter (exclure logger.ts, .html, .tmp, node_modules, .next)
FILES=$(grep -rl "console\.\(log\|error\|warn\|info\|debug\)" "$FRONTEND_DIR" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude="logger.ts" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="playwright-report" \
  --exclude="*.tmp" \
  2>/dev/null || true)

if [ -z "$FILES" ]; then
  echo "✅ Aucun console.* trouvé (hors logger.ts)"
  exit 0
fi

COUNT=$(echo "$FILES" | wc -l | tr -d ' ')
echo "📝 $COUNT fichiers à traiter"
echo ""

# Traiter chaque fichier
echo "$FILES" | while read -r FILE; do
  if [ ! -f "$FILE" ]; then
    continue
  fi

  echo "🔧 Traitement: $FILE"

  # Vérifier si le fichier importe déjà logger
  HAS_LOGGER_IMPORT=$(grep -c "from '@/lib/logger'" "$FILE" || echo "0")

  # Vérifier s'il y a des console.* dans le fichier
  HAS_CONSOLE=$(grep -c "console\.\(log\|error\|warn\|info\|debug\)" "$FILE" || echo "0")

  if [ "$HAS_CONSOLE" -gt 0 ]; then
    # Remplacer console.* par logger.*
    sed -i '' 's/console\.log(/logger.log(/g' "$FILE"
    sed -i '' 's/console\.error(/logger.error(/g' "$FILE"
    sed -i '' 's/console\.warn(/logger.warn(/g' "$FILE"
    sed -i '' 's/console\.info(/logger.info(/g' "$FILE"
    sed -i '' 's/console\.debug(/logger.log(/g' "$FILE"

    # Ajouter l'import si absent
    if [ "$HAS_LOGGER_IMPORT" -eq 0 ]; then
      # Trouver la première ligne d'import ou la ligne 1
      FIRST_LINE=$(grep -n "^import\|^'use client'\|^\"use client\"" "$FILE" | head -1 | cut -d: -f1)

      if [ -n "$FIRST_LINE" ]; then
        # Insérer après la première ligne d'import/directive
        sed -i '' "${FIRST_LINE}a\\
import { logger } from '@/lib/logger'
" "$FILE"
      else
        # Ajouter au début du fichier
        echo "import { logger } from '@/lib/logger'
$(cat "$FILE")" > "$FILE"
      fi

      echo "  ✅ Import logger ajouté"
    fi

    echo "  ✅ $HAS_CONSOLE console.* remplacés"
  fi
done

echo ""
echo "✅ Remplacement terminé!"
echo ""
echo "🔍 Vérification finale..."

REMAINING=$(grep -r "console\.\(log\|error\|warn\|info\|debug\)" "$FRONTEND_DIR" \
  --include="*.ts" \
  --include="*.tsx" \
  --exclude="logger.ts" \
  --exclude-dir="node_modules" \
  --exclude-dir=".next" \
  --exclude-dir="playwright-report" \
  2>/dev/null | wc -l | tr -d ' ')

if [ "$REMAINING" -eq 0 ]; then
  echo "✅ Aucun console.* restant (hors logger.ts)"
else
  echo "⚠️  $REMAINING console.* restants à vérifier manuellement"
fi

echo ""
echo "📊 Statistiques:"
echo "  - Fichiers traités: $COUNT"
echo "  - console.* restants: $REMAINING"
