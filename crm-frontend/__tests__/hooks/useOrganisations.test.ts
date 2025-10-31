import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useOrganisations } from '@/hooks/useOrganisations'
import { organisationsAPI } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  organisationsAPI: {
    getOrganisations: vi.fn(),
    getOrganisation: vi.fn(),
    createOrganisation: vi.fn(),
    updateOrganisation: vi.fn(),
    deleteOrganisation: vi.fn(),
  },
}))

describe('useOrganisations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch organisations list successfully', async () => {
    const mockOrganisations = [
      { id: 1, name: 'Org 1', category: 'DISTRIBUTEUR' },
      { id: 2, name: 'Org 2', category: 'CGPI' },
    ]
    vi.mocked(organisationsAPI.getOrganisations).mockResolvedValue({
      data: mockOrganisations,
      total: 2,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => useOrganisations())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockOrganisations)
    expect(organisationsAPI.getOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    )
  })

  it('should handle fetch organisations error', async () => {
    const errorMessage = 'Failed to fetch organisations'
    vi.mocked(organisationsAPI.getOrganisations).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useOrganisations())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeUndefined()
  })

  it('should filter organisations by search term', async () => {
    const mockOrganisations = [
      { id: 1, name: 'Test Org', category: 'DISTRIBUTEUR' },
    ]
    vi.mocked(organisationsAPI.getOrganisations).mockResolvedValue({
      data: mockOrganisations,
      total: 1,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => useOrganisations({ search: 'Test' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(organisationsAPI.getOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'Test' })
    )
  })

  it('should paginate organisations correctly', async () => {
    vi.mocked(organisationsAPI.getOrganisations).mockResolvedValue({
      data: [],
      total: 100,
      page: 2,
      limit: 20,
    })

    const { result } = renderHook(() => useOrganisations({ page: 2, limit: 20 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(organisationsAPI.getOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 20 })
    )
  })
})
