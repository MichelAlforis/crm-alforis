import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useFilters } from '@/hooks/useFilters'

describe('useFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should initialize with default filters', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    expect(result.current.values).toEqual(defaultFilters)
  })

  it('should update single filter', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    act(() => {
      result.current.setFilter('search', 'test query')
    })

    expect(result.current.values.search).toBe('test query')
    expect(result.current.values.category).toBe('')
  })

  it('should update multiple filters', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    act(() => {
      result.current.setValues({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: 'ACTIF',
      })
    })

    expect(result.current.values).toEqual({
      search: 'test',
      category: 'DISTRIBUTEUR',
      status: 'ACTIF',
    })
  })

  it('should reset all filters to defaults', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    act(() => {
      result.current.setValues({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: 'ACTIF',
      })
    })

    expect(result.current.values.search).toBe('test')

    act(() => {
      result.current.reset()
    })

    expect(result.current.values).toEqual(defaultFilters)
  })

  it('should clear single filter', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    act(() => {
      result.current.setValues({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: '',
      })
    })

    expect(result.current.values.search).toBe('test')

    act(() => {
      result.current.setFilter('search', '')
    })

    expect(result.current.values.search).toBe('')
    expect(result.current.values.category).toBe('DISTRIBUTEUR')
  })

  it('should handle active filters count', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    // Initially no active filters
    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.activeCount).toBe(0)

    act(() => {
      result.current.setValues({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: '',
      })
    })

    // Now 2 active filters
    expect(result.current.hasActiveFilters).toBe(true)
    expect(result.current.activeCount).toBe(2)
  })

  it('should handle boolean filters', () => {
    const defaultFilters = {
      search: '',
      isActive: false,
      hasEmail: false,
    }

    const { result } = renderHook(() => useFilters({ initialValues: defaultFilters }))

    act(() => {
      result.current.setFilter('isActive', true)
    })

    expect(result.current.values.isActive).toBe(true)
  })
})
