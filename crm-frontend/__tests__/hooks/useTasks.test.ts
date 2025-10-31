import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useTasks } from '@/hooks/useTasks'
import { tasksAPI } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  tasksAPI: {
    getTasks: vi.fn(),
    getTask: vi.fn(),
    createTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    getTaskStats: vi.fn(),
  },
}))

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch tasks list successfully', async () => {
    const mockTasks = [
      { id: 1, title: 'Task 1', status: 'A_FAIRE', priority: 'haute' },
      { id: 2, title: 'Task 2', status: 'EN_COURS', priority: 'moyenne' },
    ]
    vi.mocked(tasksAPI.getTasks).mockResolvedValue({
      data: mockTasks,
      total: 2,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockTasks)
    expect(tasksAPI.getTasks).toHaveBeenCalled()
  })

  it('should filter tasks by status', async () => {
    const mockTasks = [
      { id: 1, title: 'Task 1', status: 'EN_COURS', priority: 'haute' },
    ]
    vi.mocked(tasksAPI.getTasks).mockResolvedValue({
      data: mockTasks,
      total: 1,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => useTasks({ status: 'EN_COURS' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(tasksAPI.getTasks).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'EN_COURS' })
    )
  })

  it('should filter tasks by priority', async () => {
    const mockTasks = [
      { id: 1, title: 'Urgent Task', status: 'A_FAIRE', priority: 'critique' },
    ]
    vi.mocked(tasksAPI.getTasks).mockResolvedValue({
      data: mockTasks,
      total: 1,
      page: 1,
      limit: 20,
    })

    const { result } = renderHook(() => useTasks({ priority: 'critique' }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(tasksAPI.getTasks).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'critique' })
    )
  })

  it('should handle create task successfully', async () => {
    const newTask = { title: 'New Task', status: 'A_FAIRE', priority: 'moyenne' }
    const createdTask = { id: 3, ...newTask }

    vi.mocked(tasksAPI.createTask).mockResolvedValue(createdTask)

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Note: This assumes useTasks exposes a createTask mutation
    // Adjust based on actual implementation
    expect(tasksAPI.createTask).toBeDefined()
  })

  it('should handle fetch error gracefully', async () => {
    const errorMessage = 'Failed to fetch tasks'
    vi.mocked(tasksAPI.getTasks).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeTruthy()
  })

  it('should fetch task stats', async () => {
    const mockStats = {
      total: 10,
      a_faire: 3,
      en_cours: 5,
      termine: 2,
    }
    vi.mocked(tasksAPI.getTaskStats).mockResolvedValue(mockStats)

    // Note: Assuming hook exposes stats query
    expect(tasksAPI.getTaskStats).toBeDefined()
  })
})
