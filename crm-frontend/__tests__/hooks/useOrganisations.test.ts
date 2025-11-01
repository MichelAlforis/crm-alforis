import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, renderHookWithProviders } from '../test-utils'
import { useOrganisations } from '@/hooks/useOrganisations'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: {
    getOrganisations: vi.fn(),
    getOrganisation: vi.fn(),
    createOrganisation: vi.fn(),
    updateOrganisation: vi.fn(),
    deleteOrganisation: vi.fn(),
    searchOrganisations: vi.fn(),
    getOrganisationsByLanguage: vi.fn(),
    getOrganisationsStats: vi.fn(),
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
    vi.mocked(apiClient.getOrganisations).mockResolvedValue({
      data: mockOrganisations,
      total: 2,
    })

    const { result } = renderHookWithProviders(() => useOrganisations())

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toEqual(mockOrganisations)
    expect(apiClient.getOrganisations).toHaveBeenCalled()
  })

  it('should handle fetch organisations error', async () => {
    const errorMessage = 'Failed to fetch organisations'
    vi.mocked(apiClient.getOrganisations).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHookWithProviders(() => useOrganisations())

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.data).toBeUndefined()
  })

  it('should filter organisations by search term', async () => {
    const mockOrganisations = [
      { id: 1, name: 'Test Org', category: 'DISTRIBUTEUR' },
    ]
    vi.mocked(apiClient.getOrganisations).mockResolvedValue({
      data: mockOrganisations,
      total: 1,
    })

    const { result } = renderHookWithProviders(() => useOrganisations({ language: 'fr' }))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(apiClient.getOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ language: 'fr' })
    )
  })

  it('should paginate organisations correctly', async () => {
    vi.mocked(apiClient.getOrganisations).mockResolvedValue({
      data: [],
      total: 100,
    })

    const { result } = renderHookWithProviders(() => useOrganisations({ skip: 20, limit: 20 }))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(apiClient.getOrganisations).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, limit: 20 })
    )
  })
})
