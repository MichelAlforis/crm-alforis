/**
 * useClientSideTable Hook
 *
 * Manages client-side table operations including filtering, sorting, and search.
 * Reduces repetitive table logic across the application.
 *
 * @example
 * ```tsx
 * const table = useClientSideTable<Organisation>({
 *   data: organisations?.items || [],
 *   searchFields: ['name', 'email', 'category'],
 *   defaultSortKey: 'name',
 *   defaultSortDirection: 'asc',
 *   filterFn: (item, filters) => {
 *     if (filters.country && item.country !== filters.country) return false
 *     if (filters.type && item.type !== filters.type) return false
 *     return true
 *   }
 * })
 *
 * // Usage
 * <SearchBar value={table.searchQuery} onChange={table.setSearchQuery} />
 * <Table
 *   data={table.filteredData}
 *   sortConfig={table.sortConfig}
 *   onSort={table.handleSort}
 * />
 * ```
 */

import { useMemo, useState, useCallback } from 'react'

export interface SortConfig {
  key: string
  direction: 'asc' | 'desc'
}

export interface UseClientSideTableOptions<T, F = Record<string, any>> {
  /** Array of data to display in the table */
  data: T[]
  /** Fields to search in (will search across all these fields) */
  searchFields?: (keyof T)[]
  /** Default sort key */
  defaultSortKey?: keyof T
  /** Default sort direction */
  defaultSortDirection?: 'asc' | 'desc'
  /** Custom filter function */
  filterFn?: (item: T, filters: F) => boolean
  /** Case sensitive search (default: false) */
  caseSensitive?: boolean
}

export interface UseClientSideTableReturn<T, F = Record<string, any>> {
  /** Filtered and sorted data */
  filteredData: T[]
  /** Current search query */
  searchQuery: string
  /** Set search query */
  setSearchQuery: (query: string) => void
  /** Current sort configuration */
  sortConfig: SortConfig | undefined
  /** Handle column sort */
  handleSort: (key: string) => void
  /** Current filters */
  filters: F
  /** Set filters */
  setFilters: (filters: F | ((prev: F) => F)) => void
  /** Reset all filters and search */
  resetFilters: () => void
  /** Total count before filtering */
  totalCount: number
  /** Count after filtering */
  filteredCount: number
}

export function useClientSideTable<T extends Record<string, any>, F = Record<string, any>>({
  data,
  searchFields = [],
  defaultSortKey,
  defaultSortDirection = 'asc',
  filterFn,
  caseSensitive = false,
}: UseClientSideTableOptions<T, F>): UseClientSideTableReturn<T, F> {
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig | undefined>(
    defaultSortKey
      ? { key: String(defaultSortKey), direction: defaultSortDirection }
      : undefined
  )
  const [filters, setFilters] = useState<F>({} as F)

  const handleSort = useCallback((key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        // Toggle direction
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc',
        }
      }
      // New sort key
      return { key, direction: 'asc' }
    })
  }, [])

  const resetFilters = useCallback(() => {
    setSearchQuery('')
    setFilters({} as F)
    setSortConfig(
      defaultSortKey
        ? { key: String(defaultSortKey), direction: defaultSortDirection }
        : undefined
    )
  }, [defaultSortKey, defaultSortDirection])

  const filteredData = useMemo(() => {
    let result = [...data]

    // Apply search filter
    if (searchQuery && searchFields.length > 0) {
      const query = caseSensitive ? searchQuery : searchQuery.toLowerCase()
      result = result.filter((item) => {
        return searchFields.some((field) => {
          const value = item[field]
          if (value === null || value === undefined) return false
          const stringValue = caseSensitive ? String(value) : String(value).toLowerCase()
          return stringValue.includes(query)
        })
      })
    }

    // Apply custom filters
    if (filterFn) {
      result = result.filter((item) => filterFn(item, filters))
    }

    // Apply sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof T]
        const bValue = b[sortConfig.key as keyof T]

        // Handle null/undefined values
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        // Handle different types
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
        }

        if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
          const aNum = aValue ? 1 : 0
          const bNum = bValue ? 1 : 0
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }

        // Date comparison
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortConfig.direction === 'asc'
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime()
        }

        // String comparison (case insensitive)
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()

        if (sortConfig.direction === 'asc') {
          return aStr < bStr ? -1 : aStr > bStr ? 1 : 0
        } else {
          return aStr > bStr ? -1 : aStr < bStr ? 1 : 0
        }
      })
    }

    return result
  }, [data, searchQuery, searchFields, sortConfig, filters, filterFn, caseSensitive])

  return {
    filteredData,
    searchQuery,
    setSearchQuery,
    sortConfig,
    handleSort,
    filters,
    setFilters,
    resetFilters,
    totalCount: data.length,
    filteredCount: filteredData.length,
  }
}
