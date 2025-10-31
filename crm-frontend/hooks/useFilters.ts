/**
 * useFilters Hook
 *
 * Simplified state management for filter forms with reset functionality.
 * Reduces boilerplate for managing multiple filter states.
 *
 * @example
 * ```tsx
 * const filters = useFilters({
 *   role: '',
 *   country: '',
 *   language: '',
 *   createdFrom: '',
 *   createdTo: '',
 * })
 *
 * // Usage
 * <AdvancedFilters
 *   values={filters.values}
 *   onChange={filters.handleChange}
 *   onReset={filters.reset}
 * />
 *
 * // Set individual filter
 * filters.setFilter('country', 'FR')
 *
 * // Check if any filters are active
 * {filters.hasActiveFilters && <ClearButton onClick={filters.reset} />}
 * ```
 */

import { useState, useCallback, useMemo } from 'react'

export interface UseFiltersOptions<T> {
  /** Initial filter values */
  initialValues: T
  /** Callback when filters change */
  onChange?: (filters: T) => void
  /** Callback when filters are reset */
  onReset?: () => void
}

export interface UseFiltersReturn<T extends Record<string, unknown>> {
  /** Current filter values */
  values: T
  /** Set all filter values at once */
  setValues: (values: T | ((prev: T) => T)) => void
  /** Handle filter change (compatible with AdvancedFilters component) */
  handleChange: (key: string, value: unknown) => void
  /** Set a specific filter value */
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void
  /** Reset all filters to initial values */
  reset: () => void
  /** Whether any filters are active (different from initial values) */
  hasActiveFilters: boolean
  /** Get active filters only (excludes empty values) */
  activeFilters: Partial<T>
  /** Count of active filters */
  activeCount: number
}

export function useFilters<T extends Record<string, unknown>>({
  initialValues,
  onChange,
  onReset,
}: UseFiltersOptions<T>): UseFiltersReturn<T> {
  const [values, setValues] = useState<T>(initialValues)

  const handleChange = useCallback((key: string, value: unknown) => {
    // Ignore array values (not compatible with simple filters)
    if (Array.isArray(value)) return

    setValues((prev) => {
      const newValues = {
        ...prev,
        [key]: value,
      } as T

      if (onChange) {
        onChange(newValues)
      }

      return newValues
    })
  }, [onChange])

  const setFilter = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues((prev) => {
      const newValues = {
        ...prev,
        [key]: value,
      } as T

      if (onChange) {
        onChange(newValues)
      }

      return newValues
    })
  }, [onChange])

  const reset = useCallback(() => {
    setValues(initialValues)

    if (onReset) {
      onReset()
    }

    if (onChange) {
      onChange(initialValues)
    }
  }, [initialValues, onChange, onReset])

  const hasActiveFilters = useMemo(() => {
    return Object.keys(values).some((key) => {
      const currentValue = values[key]
      const initialValue = initialValues[key]

      // Check if value is different from initial
      if (currentValue !== initialValue) {
        // Also check if it's not empty
        if (currentValue !== '' && currentValue !== null && currentValue !== undefined) {
          return true
        }
      }

      return false
    })
  }, [values, initialValues])

  const activeFilters = useMemo(() => {
    const active: Partial<T> = {}

    Object.keys(values).forEach((key) => {
      const value = values[key]
      // Include only non-empty values
      if (value !== '' && value !== null && value !== undefined) {
        active[key as keyof T] = value
      }
    })

    return active
  }, [values])

  const activeCount = useMemo(() => {
    return Object.keys(activeFilters).length
  }, [activeFilters])

  return {
    values,
    setValues,
    handleChange,
    setFilter,
    reset,
    hasActiveFilters,
    activeFilters,
    activeCount,
  }
}
