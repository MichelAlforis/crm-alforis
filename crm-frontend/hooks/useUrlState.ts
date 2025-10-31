// hooks/useUrlState.ts
// ============= URL STATE MANAGEMENT =============
// URL-first approach for shareable/bookmarkable state: filters, sort, pagination, tabs
// Based on Next.js App Router searchParams

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo } from 'react'

// ============= TYPES =============

type UrlStateValue = string | number | boolean | string[] | undefined

interface UrlStateOptions {
  shallow?: boolean // Use shallow routing (default: true)
  scroll?: boolean // Scroll to top on change (default: false)
}

// ============= HOOK =============

/**
 * Hook for managing URL search parameters as state
 *
 * @example
 * ```tsx
 * const [page, setPage] = useUrlState('page', 1)
 * const [search, setSearch] = useUrlState('search', '')
 * const [filters, setFilters] = useUrlState('filters', [])
 * ```
 */
export function useUrlState<T extends UrlStateValue>(
  key: string,
  defaultValue: T,
  options: UrlStateOptions = {}
): [T, (value: T | ((prev: T) => T)) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { shallow = true, scroll = false } = options

  // Get current value from URL
  const value = useMemo(() => {
    const param = searchParams.get(key)
    if (param === null) return defaultValue

    // Parse based on defaultValue type
    if (typeof defaultValue === 'boolean') {
      return (param === 'true') as T
    }
    if (typeof defaultValue === 'number') {
      const parsed = Number(param)
      return (isNaN(parsed) ? defaultValue : parsed) as T
    }
    if (Array.isArray(defaultValue)) {
      return param.split(',').filter(Boolean) as T
    }
    return param as T
  }, [searchParams, key, defaultValue])

  // Update URL with new value
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const current = searchParams.toString()
      const params = new URLSearchParams(current)

      // Handle function updater
      const valueToSet = typeof newValue === 'function' ? (newValue as (prev: T) => T)(value) : newValue

      // Remove param if value equals default
      if (valueToSet === defaultValue || valueToSet === undefined || valueToSet === '') {
        params.delete(key)
      } else {
        // Serialize value
        if (typeof valueToSet === 'boolean') {
          params.set(key, String(valueToSet))
        } else if (Array.isArray(valueToSet)) {
          params.set(key, valueToSet.join(','))
        } else {
          params.set(key, String(valueToSet))
        }
      }

      const search = params.toString()
      const query = search ? `?${search}` : ''

      // Use Next.js router
      if (shallow) {
        router.replace(`${pathname}${query}`, { scroll })
      } else {
        router.push(`${pathname}${query}`, { scroll })
      }
    },
    [router, pathname, searchParams, key, defaultValue, value, shallow, scroll]
  )

  return [value, setValue]
}

// ============= MULTI-PARAM HOOK =============

/**
 * Hook for managing multiple URL parameters at once
 * Useful for complex filters or bulk updates
 *
 * @example
 * ```tsx
 * const [params, setParams] = useUrlParams({
 *   page: 1,
 *   limit: 50,
 *   search: '',
 *   status: 'active'
 * })
 *
 * // Update multiple params
 * setParams({ page: 2, search: 'test' })
 * ```
 */
export function useUrlParams<T extends Record<string, UrlStateValue>>(
  defaults: T,
  options: UrlStateOptions = {}
): [T, (updates: Partial<T>) => void, () => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { shallow = true, scroll = false } = options

  // Get current values from URL
  const values = useMemo(() => {
    const result = { ...defaults }
    Object.keys(defaults).forEach((key) => {
      const param = searchParams.get(key)
      if (param !== null) {
        const defaultValue = defaults[key]
        if (typeof defaultValue === 'boolean') {
          result[key] = (param === 'true') as T[typeof key]
        } else if (typeof defaultValue === 'number') {
          const parsed = Number(param)
          result[key] = (isNaN(parsed) ? defaultValue : parsed) as T[typeof key]
        } else if (Array.isArray(defaultValue)) {
          result[key] = param.split(',').filter(Boolean) as T[typeof key]
        } else {
          result[key] = param as T[typeof key]
        }
      }
    })
    return result
  }, [searchParams, defaults])

  // Update multiple params
  const setParams = useCallback(
    (updates: Partial<T>) => {
      const current = searchParams.toString()
      const params = new URLSearchParams(current)

      Object.entries(updates).forEach(([key, value]) => {
        const defaultValue = defaults[key]

        // Remove if equals default
        if (value === defaultValue || value === undefined || value === '') {
          params.delete(key)
        } else {
          // Serialize
          if (typeof value === 'boolean') {
            params.set(key, String(value))
          } else if (Array.isArray(value)) {
            params.set(key, value.join(','))
          } else {
            params.set(key, String(value))
          }
        }
      })

      const search = params.toString()
      const query = search ? `?${search}` : ''

      if (shallow) {
        router.replace(`${pathname}${query}`, { scroll })
      } else {
        router.push(`${pathname}${query}`, { scroll })
      }
    },
    [router, pathname, searchParams, defaults, shallow, scroll]
  )

  // Reset all params to defaults
  const resetParams = useCallback(() => {
    if (shallow) {
      router.replace(pathname, { scroll })
    } else {
      router.push(pathname, { scroll })
    }
  }, [router, pathname, shallow, scroll])

  return [values, setParams, resetParams]
}

// ============= HELPERS =============

/**
 * Parse URL search params into typed object
 */
export function parseUrlParams<T extends Record<string, UrlStateValue>>(
  searchParams: URLSearchParams,
  defaults: T
): T {
  const result = { ...defaults }
  Object.keys(defaults).forEach((key) => {
    const param = searchParams.get(key)
    if (param !== null) {
      const defaultValue = defaults[key]
      if (typeof defaultValue === 'boolean') {
        result[key] = (param === 'true') as T[typeof key]
      } else if (typeof defaultValue === 'number') {
        const parsed = Number(param)
        result[key] = (isNaN(parsed) ? defaultValue : parsed) as T[typeof key]
      } else if (Array.isArray(defaultValue)) {
        result[key] = param.split(',').filter(Boolean) as T[typeof key]
      } else {
        result[key] = param as T[typeof key]
      }
    }
  })
  return result
}

/**
 * Serialize object to URL search params
 */
export function serializeUrlParams<T extends Record<string, UrlStateValue>>(
  values: T,
  defaults: T
): URLSearchParams {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    const defaultValue = defaults[key]
    if (value !== defaultValue && value !== undefined && value !== '') {
      if (typeof value === 'boolean') {
        params.set(key, String(value))
      } else if (Array.isArray(value)) {
        params.set(key, value.join(','))
      } else {
        params.set(key, String(value))
      }
    }
  })
  return params
}
