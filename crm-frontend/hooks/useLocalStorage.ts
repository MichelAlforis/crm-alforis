// hooks/useLocalStorage.ts
// Hook pour synchroniser l'état avec localStorage

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { storage } from '@/lib/constants'

/**
 * Hook pour synchroniser l'état avec localStorage
 *
 * @example
 * ```tsx
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 * const [onboardingCompleted, setOnboardingCompleted] = useLocalStorage<boolean>('onboarding-completed', false)
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  // État pour stocker la valeur
  // On passe une fonction à useState pour que l'initialisation ne se fasse qu'une fois
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Utiliser le helper storage qui gère déjà SSR et parsing
    const value = storage.get<T>(key, initialValue)
    return value ?? initialValue
  })

  // Retourner une version wrappée de la fonction set de useState
  // qui persiste la nouvelle valeur dans localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Permettre à value d'être une fonction comme useState
        const valueToStore = value instanceof Function ? value(storedValue) : value

        // Sauvegarder l'état
        setStoredValue(valueToStore)

        // Sauvegarder dans localStorage via helper
        storage.set(key, valueToStore)
      } catch (error) {
        logger.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}
