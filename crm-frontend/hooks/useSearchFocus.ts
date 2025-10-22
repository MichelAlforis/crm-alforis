// hooks/useSearchFocus.ts
// ============= SEARCH INPUT FOCUS HOOK =============

import { useState, useCallback } from 'react'

/**
 * Hook to manage search input focus state
 * Returns focused state and handlers for better UX
 */
export function useSearchFocus() {
  const [isFocused, setIsFocused] = useState(false)

  const handleFocus = useCallback(() => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to fire before blur
    setTimeout(() => {
      setIsFocused(false)
    }, 150)
  }, [])

  return {
    isFocused,
    handleFocus,
    handleBlur,
  }
}
