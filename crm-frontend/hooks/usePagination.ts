/**
 * usePagination - Hook pour gérer la pagination client-side
 *
 * Gère les états de pagination (page, limit, skip) avec des méthodes
 * utilitaires pour naviguer entre les pages.
 *
 * @example
 * ```tsx
 * const pagination = usePagination({
 *   initialLimit: 50,
 *   initialPage: 1
 * })
 *
 * // Calcul des données paginées
 * const paginatedData = useMemo(() => {
 *   const startIndex = pagination.skip
 *   return data.slice(startIndex, startIndex + pagination.limit)
 * }, [data, pagination.skip, pagination.limit])
 *
 * // Navigation
 * <Button onClick={pagination.nextPage}>Suivant</Button>
 * <Button onClick={pagination.prevPage}>Précédent</Button>
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

export interface UsePaginationOptions {
  /**
   * Nombre d'éléments par page (défaut: 50)
   */
  initialLimit?: number

  /**
   * Page initiale (1-indexed, défaut: 1)
   */
  initialPage?: number

  /**
   * Callback appelé lors du changement de page
   */
  onPageChange?: (page: number) => void

  /**
   * Callback appelé lors du changement de limite
   */
  onLimitChange?: (limit: number) => void
}

export interface UsePaginationReturn {
  /**
   * Nombre d'éléments par page
   */
  limit: number

  /**
   * Changer le nombre d'éléments par page (reset page à 1)
   */
  setLimit: (limit: number) => void

  /**
   * Page actuelle (1-indexed)
   */
  page: number

  /**
   * Changer la page actuelle
   */
  setPage: (page: number) => void

  /**
   * Index de début pour slice() (0-indexed)
   */
  skip: number

  /**
   * Changer le skip directement
   */
  setSkip: (skip: number) => void

  /**
   * Aller à la page suivante
   */
  nextPage: () => void

  /**
   * Aller à la page précédente
   */
  prevPage: () => void

  /**
   * Aller à une page spécifique
   */
  goToPage: (page: number) => void

  /**
   * Réinitialiser à la page 1
   */
  reset: () => void

  /**
   * Calculer le nombre total de pages
   */
  getTotalPages: (totalItems: number) => number

  /**
   * Vérifier si on peut aller à la page suivante
   */
  hasNextPage: (totalItems: number) => boolean

  /**
   * Vérifier si on peut aller à la page précédente
   */
  hasPrevPage: boolean
}

export function usePagination({
  initialLimit = 50,
  initialPage = 1,
  onPageChange,
  onLimitChange,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [limit, setLimitState] = useState(initialLimit)
  const [page, setPageState] = useState(initialPage)

  // Skip calculé à partir de page et limit
  const skip = useMemo(() => (page - 1) * limit, [page, limit])

  const setLimit = useCallback(
    (newLimit: number) => {
      setLimitState(newLimit)
      setPageState(1) // Reset à la page 1 lors du changement de limite
      if (onLimitChange) {
        onLimitChange(newLimit)
      }
      if (onPageChange) {
        onPageChange(1)
      }
    },
    [onLimitChange, onPageChange]
  )

  const setPage = useCallback(
    (newPage: number) => {
      if (newPage < 1) return
      setPageState(newPage)
      if (onPageChange) {
        onPageChange(newPage)
      }
    },
    [onPageChange]
  )

  const setSkip = useCallback(
    (newSkip: number) => {
      const newPage = Math.floor(newSkip / limit) + 1
      setPageState(newPage)
      if (onPageChange) {
        onPageChange(newPage)
      }
    },
    [limit, onPageChange]
  )

  const nextPage = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1)
    }
  }, [page, setPage])

  const goToPage = useCallback(
    (targetPage: number) => {
      setPage(targetPage)
    },
    [setPage]
  )

  const reset = useCallback(() => {
    setPageState(1)
    if (onPageChange) {
      onPageChange(1)
    }
  }, [onPageChange])

  const getTotalPages = useCallback(
    (totalItems: number) => {
      return Math.ceil(totalItems / limit)
    },
    [limit]
  )

  const hasNextPage = useCallback(
    (totalItems: number) => {
      return page < getTotalPages(totalItems)
    },
    [page, getTotalPages]
  )

  const hasPrevPage = page > 1

  return {
    limit,
    setLimit,
    page,
    setPage,
    skip,
    setSkip,
    nextPage,
    prevPage,
    goToPage,
    reset,
    getTotalPages,
    hasNextPage,
    hasPrevPage,
  }
}
