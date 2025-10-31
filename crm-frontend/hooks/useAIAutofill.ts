/**
 * useAIAutofill - Hook for AI-powered field autofill (stub implementation)
 *
 * This is a placeholder hook that will be fully implemented later.
 * For now, it provides the interface without AI functionality.
 */

import { useCallback, useState } from 'react'

interface UseAIAutofillOptions {
  entityType: string
  formData: Record<string, any>
  onFieldUpdate: (fieldName: string, fieldValue: any) => void
}

interface MenuPosition {
  x: number
  y: number
  fieldName: string
}

export function useAIAutofill(_: UseAIAutofillOptions) {
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null)
  const [activeField, setActiveField] = useState<string | null>(null)

  const handleAutofillSuggest = useCallback((fieldName: string, position: { x: number; y: number }) => {
    // Stub: No AI suggestions yet
    setMenuPosition({ x: position.x, y: position.y, fieldName })
    setActiveField(fieldName)
  }, [])

  return {
    menuPosition,
    activeField,
    handleAutofillSuggest,
  }
}
