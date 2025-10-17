// hooks/usePaginatedOptions.ts
// ============= GENERIC PAGINATED OPTIONS HELPER =============
// Fournit la logique d'infinite scroll et de recherche pour les composants de sélection

'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DependencyList,
} from 'react'
import type { PaginatedResponse } from '@/lib/types'
import type { SelectOption } from '@/components/shared/SearchableSelect'

export interface PaginatedFetcherParams {
  query: string
  skip: number
  limit: number
}

export type PaginatedFetcher<TItem> = (
  params: PaginatedFetcherParams
) => Promise<PaginatedResponse<TItem>>

interface UsePaginatedOptionsParams<TItem> {
  fetcher: PaginatedFetcher<TItem>
  mapItem: (item: TItem) => SelectOption
  limit?: number
  initialQuery?: string
  dependencies?: DependencyList
}

interface UsePaginatedOptionsResult {
  options: SelectOption[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  search: (query: string) => void
  loadMore: () => void
  upsertOption: (option: SelectOption) => void
  reset: () => void
}

export function usePaginatedOptions<TItem>({
  fetcher,
  mapItem,
  limit = 25,
  initialQuery = '',
  dependencies = [],
}: UsePaginatedOptionsParams<TItem>): UsePaginatedOptionsResult {
  const [options, setOptions] = useState<SelectOption[]>([])
  const [query, setQuery] = useState(initialQuery.trim())
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const requestIdRef = useRef(0)
  const lastQueryRef = useRef(query)

  const normalizedLimit = useMemo(() => Math.max(5, limit), [limit])

  const loadPage = useCallback(
    async (params: { query: string; skip: number; append: boolean }) => {
      const { query: nextQuery, skip, append } = params
      const currentRequestId = ++requestIdRef.current

      if (append) {
        // Chargement supplémentaire
        setIsLoadingMore(true)
      } else {
        // Chargement initial / recherche
        setIsLoading(true)
        setIsLoadingMore(false) // reset any previous loadingMore state
        setHasMore(true)
      }

      try {
        const response = await fetcher({
          query: nextQuery,
          skip,
          limit: normalizedLimit,
        })

        // Ignorer les réponses obsolètes
        if (requestIdRef.current !== currentRequestId) {
          return
        }

        const mapped = response.items.map(mapItem)
        setOptions((prev) => (append ? [...prev, ...mapped] : mapped))
        const totalLoaded = response.skip + response.items.length
        setHasMore(totalLoaded < response.total)
      } catch (error) {
        console.error('Failed to load paginated options:', error)
        if (!append) {
          setOptions([])
        }
        setHasMore(false)
      } finally {
        if (requestIdRef.current === currentRequestId) {
          if (append) {
            setIsLoadingMore(false)
          } else {
            setIsLoading(false)
          }
        }
      }
    },
    [fetcher, mapItem, normalizedLimit]
  )

  const reset = useCallback(() => {
    loadPage({ query, skip: 0, append: false })
  }, [loadPage, query])

  // Recherche
  const search = useCallback(
    (value: string) => {
      const normalized = value.trim()
      setQuery(normalized)
      lastQueryRef.current = normalized
      loadPage({ query: normalized, skip: 0, append: false })
    },
    [loadPage]
  )

  // Chargement supplémentaire
  const loadMore = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore) {
      return
    }
    loadPage({
      query: lastQueryRef.current,
      skip: options.length,
      append: true,
    })
  }, [hasMore, isLoading, isLoadingMore, loadPage, options.length])

  // Upsert manuel (utile pour les valeurs pré-sélectionnées)
  const upsertOption = useCallback((option: SelectOption) => {
    setOptions((prev) => {
      const exists = prev.some((opt) => opt.id === option.id)
      if (exists) {
        return prev.map((opt) => (opt.id === option.id ? option : opt))
      }
      return [option, ...prev]
    })
  }, [])

  // Chargement initial + rechargement si les dépendances externes changent
  useEffect(() => {
    lastQueryRef.current = initialQuery.trim()
    setQuery(initialQuery.trim())
    loadPage({ query: initialQuery.trim(), skip: 0, append: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadPage, initialQuery, ...dependencies])

  return {
    options,
    isLoading,
    isLoadingMore,
    hasMore,
    search,
    loadMore,
    upsertOption,
    reset,
  }
}
