// hooks/useLocalStorage.ts
// Hook pour synchroniser l'état avec localStorage

import { useState, useEffect, useCallback } from 'react'

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
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      // Récupérer depuis localStorage
      const item = window.localStorage.getItem(key)
      // Parser le JSON stocké ou retourner initialValue
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
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

        // Sauvegarder dans localStorage
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error)
      }
    },
    [key, storedValue]
  )

  return [storedValue, setValue]
}
