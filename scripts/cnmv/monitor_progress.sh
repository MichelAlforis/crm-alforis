#!/bin/bash
# Monitor Selenium scraper progress

CACHE_FILE="output/selenium_cache.json"

while true; do
    clear
    echo "======================================================================"
    echo "  SELENIUM GOOGLE SCRAPER - ESPAÑA (CNMV)"
    echo "======================================================================"
    echo ""

    # Check if process is running
    if ps aux | grep -v grep | grep "selenium_google_scraper.py" > /dev/null; then
        echo "✅ Status: RUNNING"
    else
        echo "⚠️  Status: STOPPED"
    fi
    echo ""

    # Parse cache
    if [ -f "$CACHE_FILE" ]; then
        python3 << EOF
import json
with open("$CACHE_FILE", "r") as f:
    data = json.load(f)

total = len(data)
with_web = sum(1 for v in data.values() if v.get('website'))
with_email = sum(1 for v in data.values() if v.get('email'))
with_phone = sum(1 for v in data.values() if v.get('phone'))

target = 117
progress_pct = (total / target * 100) if target > 0 else 0

print(f"📊 Progression: {total}/{target} sociétés ({progress_pct:.0f}%)")
print("")
print(f"   Websites: {with_web:>3}/{total:>3} ({with_web/total*100 if total > 0 else 0:.0f}%)")
print(f"   Emails:   {with_email:>3}/{total:>3} ({with_email/total*100 if total > 0 else 0:.0f}%)")
print(f"   Phones:   {with_phone:>3}/{total:>3} ({with_phone/total*100 if total > 0 else 0:.0f}%)")
print("")

# Estimate time remaining
avg_time_per_company = 8  # seconds (2 searches * 4s)
remaining = target - total
time_remaining_mins = (remaining * avg_time_per_company) / 60

print(f"⏱️  Temps restant estimé: {time_remaining_mins:.0f} minutes")
EOF
    else
        echo "⚠️  Cache file not found"
    fi

    echo ""
    echo "======================================================================"
    echo "  Dernières sociétés enrichies:"
    echo "======================================================================"

    if [ -f "$CACHE_FILE" ]; then
        python3 << 'EOF'
import json
with open("output/selenium_cache.json", "r") as f:
    data = json.load(f)

# Show last 5
for i, (name, info) in enumerate(list(data.items())[-5:], 1):
    web_icon = "🌐" if info.get('website') else "  "
    email_icon = "📧" if info.get('email') else "  "
    phone_icon = "📞" if info.get('phone') else "  "

    print(f"  {web_icon}{email_icon}{phone_icon} {name[:60]}")
EOF
    fi

    echo ""
    echo "======================================================================"
    echo "  Rafraîchissement dans 10 secondes... (Ctrl+C pour quitter)"
    echo "======================================================================"

    sleep 10
done
