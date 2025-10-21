#!/bin/bash
# Script de monitoring et sauvegarde automatique pour le scraping SDG France

cd "/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1"

TOTAL=677

while true; do
  sleep 120  # Attendre 2 minutes

  echo ""
  echo "💾 Sauvegarde automatique..."
  python3 scripts/sdg_france/save_selenium_results.py

  # Compter le nombre de sociétés scrapées
  if [ -f "data/sdg_france/selenium_cache.json" ]; then
    count=$(cat data/sdg_france/selenium_cache.json | grep -o '"email"' | wc -l | tr -d ' ')
    echo ""
    echo "📊 Progression: $count / $TOTAL"

    if [ "$count" -ge "$TOTAL" ]; then
      echo "✅ SCRAPING TERMINÉ!"
      break
    fi
  else
    echo "⚠️  Fichier cache introuvable"
  fi

  echo "⏱️  Prochaine sauvegarde dans 2 minutes..."
done
