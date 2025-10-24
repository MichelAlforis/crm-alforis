/**
 * usePagination — Hook de pagination client-side, vitaminé (mais pas plus coloré)
 *
 * 🎯 Objectif : garder simple, ajouter un peu de fun + quelques helpers DX.
 * - API compatible avec ta version initiale (aucune rupture)
 * - Ajouts facultatifs : totalItems, clampPage, first/last, range, pagesArray
 *
 * @example
 * const pagination = usePagination({ initialLimit: 50, initialPage: 1, totalItems: data.length, clampPage: true })
 *
 * const paginatedData = useMemo(() => {
 *   const { start, endExclusive } = pagination.range
 *   return data.slice(start, endExclusive)
 * }, [data, pagination.range])
 *
 * <Button onClick={pagination.prevPage} disabled={!pagination.hasPrevPage}>Précédent</Button>
 * <span>Page {pagination.page} / {pagination.getTotalPages(data.length)}</span>
 * <Button onClick={pagination.nextPage} disabled={!pagination.hasNextPage(data.length)}>Suivant</Button>
 */

import { useCallback, useMemo, useState } from 'react'

export interface UsePaginationOptions {
  /** Nombre d'éléments par page (défaut: 50) */
  initialLimit?: number
  /** Page initiale (1-indexed, défaut: 1) */
  initialPage?: number
  /** Callback sur changement de page */
  onPageChange?: (page: number) => void
  /** Callback sur changement de limite */
  onLimitChange?: (limit: number) => void
  /**
   * (Optionnel) Total d'items connus. Si fourni, on peut clamp les pages et calculer lastPage sans argument.
   * Tip: passe data.length ici pour éviter de le répéter partout.
   */
  totalItems?: number
  /**
   * (Optionnel) Si true, empêche d'aller au-delà de la dernière page et avant la 1re (quand totalItems est fourni).
   * Par défaut false (liberté totale ✈️).
   */
  clampPage?: boolean
}

export interface UsePaginationReturn {
  /** Nombre d'éléments par page */
  limit: number
  /** Changer le nombre d'éléments par page (reset page à 1) */
  setLimit: (limit: number) => void
  /** Page actuelle (1-indexed) */
  page: number
  /** Changer la page actuelle */
  setPage: (page: number) => void
  /** Index de début pour slice() (0-indexed) */
  skip: number
  /** Changer le skip directement (recalcule page) */
  setSkip: (skip: number) => void
  /** Page suivante */
  nextPage: () => void
  /** Page précédente */
  prevPage: () => void
  /** Aller à une page spécifique */
  goToPage: (page: number) => void
  /** Première page (si totalItems connu, clamp garanti) */
  firstPage: () => void
  /** Dernière page (nécessite totalItems, sinon reste sur la page courante) */
  lastPage: () => void
  /** Réinitialiser à la page 1 */
  reset: () => void
  /** Nombre total de pages pour un total donné (arrondi au supérieur) */
  getTotalPages: (totalItems: number) => number
  /** Peut-on aller à la page suivante ? */
  hasNextPage: (totalItems: number) => boolean
  /** Peut-on revenir en arrière ? */
  hasPrevPage: boolean
  /**
   * Range prêt-à-consommer pour slice() et affichage
   * - start: index de début (inclus)
   * - endExclusive: index de fin exclusif (parfait pour slice)
   * - endInclusive: index de fin inclus (pour UI)
   */
  range: { start: number; endExclusive: number; endInclusive: number }
  /**
   * Tableau [1..N] des pages (⚠️ à utiliser avec parcimonie si N est énorme)
   * - Utilise totalItems fourni dans le hook, sinon renvoie []
   */
  pagesArray: number[]
}

export function usePagination({
  initialLimit = 50,
  initialPage = 1,
  onPageChange,
  onLimitChange,
  totalItems,
  clampPage = false,
}: UsePaginationOptions = {}): UsePaginationReturn {
  const [limit, setLimitState] = useState(initialLimit)
  const [page, setPageState] = useState(Math.max(1, initialPage))

  // Calcul basique
  const skip = useMemo(() => (page - 1) * limit, [page, limit])

  // Helpers internes
  const clampToBounds = useCallback(
    (targetPage: number) => {
      if (!clampPage || totalItems == null) return Math.max(1, targetPage)
      const totalPages = Math.max(1, Math.ceil(totalItems / limit) || 1)
      return Math.min(Math.max(1, targetPage), totalPages)
    },
    [clampPage, totalItems, limit]
  )

  const emitPageChange = useCallback(
    (newPage: number) => {
      onPageChange?.(newPage)
    },
    [onPageChange]
  )

  const setLimit = useCallback(
    (newLimit: number) => {
      const safe = Math.max(1, Math.floor(newLimit))
      setLimitState(safe)
      // Reset page à 1 (ne discutons pas, c'est la vie)
      setPageState(1)
      onLimitChange?.(safe)
      emitPageChange(1)
    },
    [emitPageChange, onLimitChange]
  )

  const setPage = useCallback(
    (newPage: number) => {
      const next = clampToBounds(Math.floor(newPage))
      if (next < 1) return
      setPageState(next)
      emitPageChange(next)
    },
    [clampToBounds, emitPageChange]
  )

  const setSkip = useCallback(
    (newSkip: number) => {
      const safeSkip = Math.max(0, Math.floor(newSkip))
      const derivedPage = clampToBounds(Math.floor(safeSkip / limit) + 1)
      setPageState(derivedPage)
      emitPageChange(derivedPage)
    },
    [clampToBounds, emitPageChange, limit]
  )

  const nextPage = useCallback(() => {
    setPage(page + 1)
  }, [page, setPage])

  const prevPage = useCallback(() => {
    if (page > 1) setPage(page - 1)
  }, [page, setPage])

  const goToPage = useCallback(
    (targetPage: number) => {
      setPage(targetPage)
    },
    [setPage]
  )

  const firstPage = useCallback(() => {
    setPage(1)
  }, [setPage])

  const lastPage = useCallback(() => {
    if (totalItems == null) return
    const total = Math.max(1, Math.ceil(totalItems / limit) || 1)
    setPage(total)
  }, [limit, setPage, totalItems])

  const reset = useCallback(() => {
    setPageState(1)
    emitPageChange(1)
  }, [emitPageChange])

  const getTotalPages = useCallback(
    (total: number) => Math.max(1, Math.ceil(total / limit) || 1),
    [limit]
  )

  const hasNextPage = useCallback(
    (total: number) => page < getTotalPages(total),
    [getTotalPages, page]
  )

  const hasPrevPage = page > 1

  const range = useMemo(() => {
    const start = skip
    // endExclusive ne dépasse jamais totalItems si fourni (pratique pour l'UI)
    const rawEnd = start + limit
    const endExclusive =
      totalItems == null ? rawEnd : Math.min(rawEnd, totalItems)
    const endInclusive = Math.max(start, endExclusive - 1)
    return { start, endExclusive, endInclusive }
  }, [limit, skip, totalItems])

  const pagesArray = useMemo(() => {
    if (totalItems == null) return []
    const total = Math.max(1, Math.ceil(totalItems / limit) || 1)
    return Array.from({ length: total }, (_, i) => i + 1)
  }, [limit, totalItems])

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
    firstPage,
    lastPage,
    reset,
    getTotalPages,
    hasNextPage,
    hasPrevPage,
    range,
    pagesArray,
  }
}
