#!/bin/bash
# Monitor Selenium scraper and save results every 2 minutes

cd "$(dirname "$0")/../.."

echo "🔍 SELENIUM MONITOR - Auto-save every 2 minutes"
echo "================================================"
echo ""

while true; do
    # Save results
    python3 scripts/cssf/save_selenium_results.py

    echo ""
    echo "⏱️  Prochaine sauvegarde dans 2 minutes..."
    echo ""

    sleep 120
done
