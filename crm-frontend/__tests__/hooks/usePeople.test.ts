import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, renderHookWithProviders } from '../test-utils'
import { usePeople } from '@/hooks/usePeople'
import { apiClient } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  apiClient: {
    getPeople: vi.fn(),
    getPerson: vi.fn(),
    createPerson: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
    createPersonOrganizationLink: vi.fn(),
    updatePersonOrganizationLink: vi.fn(),
    deletePersonOrganizationLink: vi.fn(),
  },
}))

describe('usePeople', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch people list successfully', async () => {
    const mockPeople = [
      { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
      { id: 2, first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
    ]
    vi.mocked(apiClient.getPeople).mockResolvedValue({
      data: mockPeople,
      total: 2,
    })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.fetchPeople()

    await waitFor(() => {
      expect(result.current.people.data?.data).toEqual(mockPeople)
    })

    expect(apiClient.getPeople).toHaveBeenCalled()
  })

  it('should filter people by search term', async () => {
    const mockPeople = [
      { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    ]
    vi.mocked(apiClient.getPeople).mockResolvedValue({
      data: mockPeople,
      total: 1,
    })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.fetchPeople(0, 50, { q: 'John' })

    await waitFor(() => {
      expect(result.current.people.isLoading).toBe(false)
    })

    expect(apiClient.getPeople).toHaveBeenCalledWith(
      0, 50, expect.objectContaining({ q: 'John' })
    )
  })

  it('should create person successfully', async () => {
    const newPerson = {
      first_name: 'Bob',
      last_name: 'Johnson',
      personal_email: 'bob@example.com',
    }
    const createdPerson = { id: 3, ...newPerson }

    vi.mocked(apiClient.createPerson).mockResolvedValue(createdPerson)
    vi.mocked(apiClient.getPeople).mockResolvedValue({ data: [], total: 0 })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.createPerson(newPerson)

    await waitFor(() => {
      expect(result.current.create.success).toBe(true)
    })

    expect(apiClient.createPerson).toHaveBeenCalledWith(newPerson)
  })

  it('should update person successfully', async () => {
    const updatedPerson = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe Updated',
      personal_email: 'john.updated@example.com',
    }

    vi.mocked(apiClient.updatePerson).mockResolvedValue(updatedPerson)
    vi.mocked(apiClient.getPerson).mockResolvedValue(updatedPerson)

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.updatePerson(1, { last_name: 'Doe Updated' })

    await waitFor(() => {
      expect(result.current.update.success).toBe(true)
    })

    expect(apiClient.updatePerson).toHaveBeenCalledWith(1, { last_name: 'Doe Updated' })
  })

  it('should delete person successfully', async () => {
    vi.mocked(apiClient.deletePerson).mockResolvedValue(undefined)
    vi.mocked(apiClient.getPeople).mockResolvedValue({ data: [], total: 0 })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.deletePerson(1)

    await waitFor(() => {
      expect(result.current.remove.success).toBe(true)
    })

    expect(apiClient.deletePerson).toHaveBeenCalledWith(1)
  })

  it('should handle fetch error gracefully', async () => {
    const errorMessage = 'Failed to fetch people'
    vi.mocked(apiClient.getPeople).mockRejectedValue({ detail: errorMessage })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.fetchPeople()

    await waitFor(() => {
      expect(result.current.people.error).toBeTruthy()
    })

    expect(result.current.people.error).toContain(errorMessage)
  })

  it('should paginate correctly', async () => {
    vi.mocked(apiClient.getPeople).mockResolvedValue({
      data: [],
      total: 100,
    })

    const { result } = renderHookWithProviders(() => usePeople())

    await result.current.fetchPeople(60, 20)

    await waitFor(() => {
      expect(result.current.people.isLoading).toBe(false)
    })

    expect(apiClient.getPeople).toHaveBeenCalledWith(60, 20, undefined)
  })
})
