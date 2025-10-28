/**
 * useAsyncAction - Hook pour gérer les actions asynchrones
 *
 * Encapsule les états loading/error/data pour les opérations async.
 * Élimine les patterns répétitifs try/catch/loading dans les composants.
 *
 * @example
 * ```tsx
 * const { execute, isLoading, error, data } = useAsyncAction({
 *   action: apiClient.createTemplate,
 *   onSuccess: (result) => {
 *     toast.success('Template créé!')
 *     router.push(`/templates/${result.id}`)
 *   },
 *   onError: (err) => {
 *     logger.error('Erreur création:', err)
 *   }
 * })
 *
 * // Dans le composant
 * <Button onClick={() => execute(formData)} disabled={isLoading}>
 *   {isLoading ? 'Création...' : 'Créer'}
 * </Button>
 * ```
 */

import { useState, useCallback } from 'react'
import { logger } from '@/lib/logger'

export interface UseAsyncActionOptions<TArgs extends any[], TResult> {
  /**
   * La fonction async à exécuter
   */
  action: (...args: TArgs) => Promise<TResult>

  /**
   * Callback appelé en cas de succès
   */
  onSuccess?: (result: TResult) => void | Promise<void>

  /**
   * Callback appelé en cas d'erreur
   */
  onError?: (error: Error) => void

  /**
   * Réinitialiser l'état après succès (défaut: false)
   */
  resetOnSuccess?: boolean

  /**
   * Message d'erreur par défaut si l'erreur n'a pas de message
   */
  defaultErrorMessage?: string
}

export interface UseAsyncActionReturn<TArgs extends any[], TResult> {
  /**
   * Exécuter l'action avec les arguments fournis
   */
  execute: (...args: TArgs) => Promise<TResult | undefined>

  /**
   * Indicateur de chargement
   */
  isLoading: boolean

  /**
   * Message d'erreur (si erreur)
   */
  error: string | null

  /**
   * Données retournées par l'action (si succès)
   */
  data: TResult | null

  /**
   * Réinitialiser l'état (loading, error, data)
   */
  reset: () => void
}

export function useAsyncAction<TArgs extends any[] = any[], TResult = any>({
  action,
  onSuccess,
  onError,
  resetOnSuccess = false,
  defaultErrorMessage = 'Une erreur est survenue',
}: UseAsyncActionOptions<TArgs, TResult>): UseAsyncActionReturn<TArgs, TResult> {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TResult | null>(null)

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await action(...args)
        setData(result)
        setIsLoading(false)

        // Callback de succès
        if (onSuccess) {
          await onSuccess(result)
        }

        // Reset si demandé
        if (resetOnSuccess) {
          setData(null)
        }

        return result
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'string'
            ? err
            : defaultErrorMessage

        setError(errorMessage)
        setIsLoading(false)

        // Callback d'erreur
        if (onError && err instanceof Error) {
          onError(err)
        }

        // Re-throw pour permettre au composant de gérer l'erreur si nécessaire
        throw err
      }
    },
    [action, onSuccess, onError, resetOnSuccess, defaultErrorMessage]
  )

  const reset = useCallback(() => {
    setIsLoading(false)
    setError(null)
    setData(null)
  }, [])

  return {
    execute,
    isLoading,
    error,
    data,
    reset,
  }
}
