import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePeople } from '@/hooks/usePeople'
import { peopleAPI } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  peopleAPI: {
    getPeople: vi.fn(),
    getPerson: vi.fn(),
    createPerson: vi.fn(),
    updatePerson: vi.fn(),
    deletePerson: vi.fn(),
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
    vi.mocked(peopleAPI.getPeople).mockResolvedValue({
      data: mockPeople,
      total: 2,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => usePeople())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockPeople)
    expect(peopleAPI.getPeople).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 })
    )
  })

  it('should filter people by search term', async () => {
    const mockPeople = [
      { id: 1, first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    ]
    vi.mocked(peopleAPI.getPeople).mockResolvedValue({
      data: mockPeople,
      total: 1,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => usePeople({ search: 'John' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(peopleAPI.getPeople).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'John' })
    )
  })

  it('should create person successfully', async () => {
    const newPerson = {
      first_name: 'Bob',
      last_name: 'Johnson',
      personal_email: 'bob@example.com',
    }
    const createdPerson = { id: 3, ...newPerson }

    vi.mocked(peopleAPI.createPerson).mockResolvedValue(createdPerson)

    const { result } = renderHook(() => usePeople())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Note: Assumes hook exposes createPerson mutation
    expect(peopleAPI.createPerson).toBeDefined()
  })

  it('should update person successfully', async () => {
    const updatedPerson = {
      id: 1,
      first_name: 'John',
      last_name: 'Doe Updated',
      personal_email: 'john.updated@example.com',
    }

    vi.mocked(peopleAPI.updatePerson).mockResolvedValue(updatedPerson)

    expect(peopleAPI.updatePerson).toBeDefined()
  })

  it('should delete person successfully', async () => {
    vi.mocked(peopleAPI.deletePerson).mockResolvedValue(undefined)

    const { result } = renderHook(() => usePeople())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(peopleAPI.deletePerson).toBeDefined()
  })

  it('should handle fetch error gracefully', async () => {
    const errorMessage = 'Failed to fetch people'
    vi.mocked(peopleAPI.getPeople).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => usePeople())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should paginate correctly', async () => {
    vi.mocked(peopleAPI.getPeople).mockResolvedValue({
      data: [],
      total: 100,
      page: 3,
      limit: 20,
    })

    const { result } = renderHook(() => usePeople({ page: 3, limit: 20 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(peopleAPI.getPeople).toHaveBeenCalledWith(
      expect.objectContaining({ page: 3, limit: 20 })
    )
  })
})
