/**
 * useClipboard - Hook pour copier dans le presse-papier avec feedback
 *
 * Gère la copie de texte dans le clipboard avec indication de succès/échec
 * et reset automatique du statut après un délai.
 *
 * @example
 * ```tsx
 * const { copy, isCopied, error } = useClipboard({
 *   successDuration: 2000,
 *   onSuccess: () => toast.success('Copié!'),
 *   onError: (err) => toast.error('Échec de la copie'),
 * })
 *
 * <Button onClick={() => copy('Texte à copier')}>
 *   {isCopied ? 'Copié ✓' : 'Copier'}
 * </Button>
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react'

export interface UseClipboardOptions {
  /**
   * Durée (ms) pendant laquelle isCopied reste à true (défaut: 2000)
   */
  successDuration?: number

  /**
   * Callback appelé après copie réussie
   */
  onSuccess?: (text: string) => void

  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void
}

export interface UseClipboardReturn {
  /**
   * Copier le texte dans le presse-papier
   */
  copy: (text: string) => Promise<void>

  /**
   * Indique si la copie a réussi récemment
   */
  isCopied: boolean

  /**
   * Message d'erreur si échec
   */
  error: string | null

  /**
   * Réinitialiser l'état
   */
  reset: () => void
}

export function useClipboard({
  successDuration = 2000,
  onSuccess,
  onError,
}: UseClipboardOptions = {}): UseClipboardReturn {
  const [isCopied, setIsCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup du timeout au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const copy = useCallback(
    async (text: string) => {
      // Vérifier support du clipboard
      if (!navigator?.clipboard) {
        const err = new Error('Le navigateur ne supporte pas la copie automatique')
        setError(err.message)
        setIsCopied(false)

        if (onError) {
          onError(err)
        }
        return
      }

      try {
        await navigator.clipboard.writeText(text)
        setIsCopied(true)
        setError(null)

        // Callback de succès
        if (onSuccess) {
          onSuccess(text)
        }

        // Reset après le délai
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        timeoutRef.current = setTimeout(() => {
          setIsCopied(false)
        }, successDuration)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Échec de la copie dans le presse-papier'
        setError(errorMessage)
        setIsCopied(false)

        if (onError && err instanceof Error) {
          onError(err)
        }
      }
    },
    [successDuration, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setIsCopied(false)
    setError(null)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  return {
    copy,
    isCopied,
    error,
    reset,
  }
}
