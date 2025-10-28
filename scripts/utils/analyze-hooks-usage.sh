#!/bin/bash

# Script d'analyse de l'utilisation des hooks React dans le CRM
# Date: 24 Octobre 2025

echo "🎣 Analyse de l'utilisation des Hooks React - CRM Alforis"
echo "=========================================================="
echo ""

FRONTEND_DIR="/Users/test/Documents/ALFORIS FINANCE/06. CRM/V1/crm-frontend"

cd "$FRONTEND_DIR"

# Liste des hooks à analyser
hooks=(
    "useAI"
    "useAuth"
    "useCampaignSubscriptions"
    "useConfirm"
    "useDebounce"
    "useEmailAutomation"
    "useEmailConfig"
    "useExport"
    "useImport"
    "useLocalStorage"
    "useMailingLists"
    "useMandats"
    "useMediaQuery"
    "useNotifications"
    "useOnlineStatus"
    "useOrganisationActivity"
    "useOrganisations"
    "usePaginatedOptions"
    "usePeople"
    "useProduits"
    "useSearchFocus"
    "useSettingsData"
    "useSidebar"
    "useTableColumns"
    "useTasks"
    "useToast"
    "useUsers"
    "useWebhooks"
    "useWorkflows"
)

echo "📊 Résumé par Hook:"
echo "-------------------"
printf "%-30s %-10s %-15s\n" "Hook" "Imports" "Utilisations"
echo "--------------------------------------------------------------------------------"

total_imports=0
total_usages=0

for hook in "${hooks[@]}"; do
    # Compter les imports (import ... from '@/hooks/...')
    imports=$(grep -r "import.*$hook" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | wc -l | tr -d ' ')

    # Compter les utilisations réelles dans le code (const ... = useHook())
    usages=$(grep -r "\b$hook\s*(" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "^hooks/" | wc -l | tr -d ' ')

    total_imports=$((total_imports + imports))
    total_usages=$((total_usages + usages))

    # Afficher avec indicateur d'utilisation
    if [ "$imports" -gt 0 ]; then
        printf "%-30s %-10s %-15s ✅\n" "$hook" "$imports" "$usages"
    else
        printf "%-30s %-10s %-15s ⚪\n" "$hook" "$imports" "$usages"
    fi
done

echo "--------------------------------------------------------------------------------"
printf "%-30s %-10s %-15s\n" "TOTAL" "$total_imports" "$total_usages"
echo ""
echo ""

echo "🔝 Top 10 Hooks les Plus Utilisés:"
echo "-----------------------------------"

# Créer un tableau temporaire et trier
declare -A hook_counts
for hook in "${hooks[@]}"; do
    count=$(grep -r "\b$hook\s*(" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "^hooks/" | wc -l | tr -d ' ')
    hook_counts[$hook]=$count
done

# Trier et afficher top 10
for hook in "${!hook_counts[@]}"; do
    echo "${hook_counts[$hook]} $hook"
done | sort -rn | head -10 | nl

echo ""
echo ""

echo "📁 Hooks Non Utilisés:"
echo "----------------------"
unused=0
for hook in "${hooks[@]}"; do
    imports=$(grep -r "import.*$hook" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | wc -l | tr -d ' ')
    if [ "$imports" -eq 0 ]; then
        echo "⚠️  $hook"
        unused=$((unused + 1))
    fi
done

if [ "$unused" -eq 0 ]; then
    echo "✅ Tous les hooks sont utilisés!"
fi

echo ""
echo ""

echo "📈 Statistiques Globales:"
echo "-------------------------"
echo "Total hooks: ${#hooks[@]}"
echo "Hooks utilisés: $((${#hooks[@]} - unused))"
echo "Hooks non utilisés: $unused"
echo "Taux d'utilisation: $(( (${#hooks[@]} - unused) * 100 / ${#hooks[@]} ))%"

echo ""
echo ""

echo "🔍 Détails par Catégorie:"
echo "-------------------------"

# Hooks Métier
echo ""
echo "💼 Hooks Métier (17):"
metier_hooks=("useAuth" "useOrganisations" "usePeople" "useTasks" "useMailingLists" "useMandats" "useProduits" "useUsers" "useWorkflows" "useWebhooks" "useNotifications" "useOrganisationActivity" "useCampaignSubscriptions" "useEmailAutomation" "useEmailConfig" "useImport" "usePaginatedOptions" "useSettingsData" "useAI")
for hook in "${metier_hooks[@]}"; do
    count=$(grep -r "\b$hook\s*(" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "^hooks/" | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
        printf "  ✅ %-30s %s utilisations\n" "$hook" "$count"
    else
        printf "  ⚪ %-30s Non utilisé\n" "$hook"
    fi
done

# Hooks UI/UX
echo ""
echo "🎨 Hooks UI/UX (6):"
uiux_hooks=("useConfirm" "useExport" "useTableColumns" "useSearchFocus" "useSidebar" "useMediaQuery" "useOnlineStatus" "useToast")
for hook in "${uiux_hooks[@]}"; do
    count=$(grep -r "\b$hook\s*(" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "^hooks/" | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
        printf "  ✅ %-30s %s utilisations\n" "$hook" "$count"
    else
        printf "  ⚪ %-30s Non utilisé\n" "$hook"
    fi
done

# Hooks Utilitaires
echo ""
echo "🛠️  Hooks Utilitaires (2):"
util_hooks=("useDebounce" "useLocalStorage")
for hook in "${util_hooks[@]}"; do
    count=$(grep -r "\b$hook\s*(" --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v "node_modules" | grep -v ".next" | grep -v "^hooks/" | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
        printf "  ✅ %-30s %s utilisations\n" "$hook" "$count"
    else
        printf "  ⚪ %-30s Non utilisé\n" "$hook"
    fi
done

echo ""
echo ""
echo "✅ Analyse terminée!"
