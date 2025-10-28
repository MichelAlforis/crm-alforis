#!/bin/bash

# Fix more unused variables and imports

# UserForm.tsx - remove confirm_password variable
sed -i '' '/const { password, confirm_password } = watch()/c\
  const { password } = watch()
' components/forms/UserForm.tsx 2>/dev/null || true

# ArticleRating.tsx - Remove unused parameters
sed -i '' 's/export default function ArticleRating({ articleId, articleTitle }: ArticleRatingProps)/export default function ArticleRating({ articleId }: ArticleRatingProps)/' components/help/ArticleRating.tsx 2>/dev/null || true

# OnboardingTour.tsx - Remove unused steps parameter
sed -i '' 's/const handleStepClick = (index: number, steps: OnboardingStep\[\])/const handleStepClick = (index: number)/' components/onboarding/OnboardingTour.tsx 2>/dev/null || true

# BannerManager.tsx - Remove unused state
sed -i '' 's/const \[onboardingCallback, setOnboardingCallback\] = useState<.*$/\/\/ Onboarding callback removed/' components/pwa/BannerManager.tsx 2>/dev/null || true

# PWAInstallPrompt.tsx - Remove unused function
sed -i '' 's/const handleIOSInstructions =/\/\/ const handleIOSInstructions =/' components/pwa/PWAInstallPrompt.tsx 2>/dev/null || true

# PushNotificationManager.tsx
sed -i '' 's/import { Bell, BellOff, Settings, Check } from/import { Bell, Settings, Check } from/' components/pwa/PushNotificationManager.tsx 2>/dev/null || true

# OverflowMenu.tsx - Remove unused ref
sed -i '' 's/const openedAtRef = useRef<number>(0)/\/\/ const openedAtRef = useRef<number>(0)/' components/shared/OverflowMenu.tsx 2>/dev/null || true

# TableV2.tsx - Remove unused variables
sed -i '' 's/const { overflowMenu } = cell.column.columnDef/\/\/ overflowMenu removed from destructuring/' components/shared/TableV2.tsx 2>/dev/null || true
sed -i '' 's/const isCoarse = window.matchMedia/\/\/ const isCoarse removed/' components/shared/TableV2.tsx 2>/dev/null || true

echo "✅ Fixed more unused variables and imports"
