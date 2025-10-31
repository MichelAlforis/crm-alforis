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

    const { result } = renderHook(() => useFilters(defaultFilters))

    expect(result.current.filters).toEqual(defaultFilters)
  })

  it('should update single filter', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters(defaultFilters))

    act(() => {
      result.current.setFilter('search', 'test query')
    })

    expect(result.current.filters.search).toBe('test query')
    expect(result.current.filters.category).toBe('')
  })

  it('should update multiple filters', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters(defaultFilters))

    act(() => {
      result.current.setFilters({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: 'ACTIF',
      })
    })

    expect(result.current.filters).toEqual({
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

    const { result } = renderHook(() => useFilters(defaultFilters))

    act(() => {
      result.current.setFilters({
        search: 'test',
        category: 'DISTRIBUTEUR',
        status: 'ACTIF',
      })
    })

    expect(result.current.filters.search).toBe('test')

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.filters).toEqual(defaultFilters)
  })

  it('should clear single filter', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters(defaultFilters))

    act(() => {
      result.current.setFilters({
        search: 'test',
        category: 'DISTRIBUTEUR',
      })
    })

    expect(result.current.filters.search).toBe('test')

    act(() => {
      result.current.setFilter('search', '')
    })

    expect(result.current.filters.search).toBe('')
    expect(result.current.filters.category).toBe('DISTRIBUTEUR')
  })

  it('should handle active filters count', () => {
    const defaultFilters = {
      search: '',
      category: '',
      status: '',
    }

    const { result } = renderHook(() => useFilters(defaultFilters))

    // Initially no active filters
    const initialActive = Object.values(result.current.filters).filter(v => v !== '').length
    expect(initialActive).toBe(0)

    act(() => {
      result.current.setFilters({
        search: 'test',
        category: 'DISTRIBUTEUR',
      })
    })

    // Now 2 active filters
    const activeCount = Object.values(result.current.filters).filter(v => v !== '').length
    expect(activeCount).toBe(2)
  })

  it('should handle boolean filters', () => {
    const defaultFilters = {
      search: '',
      isActive: false,
      hasEmail: false,
    }

    const { result } = renderHook(() => useFilters(defaultFilters))

    act(() => {
      result.current.setFilter('isActive', true)
    })

    expect(result.current.filters.isActive).toBe(true)
  })
})
