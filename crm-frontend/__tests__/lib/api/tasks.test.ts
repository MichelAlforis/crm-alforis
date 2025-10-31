import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tasksAPI } from '@/lib/api/modules/tasks'
import type { Task, TaskInput, TaskUpdateInput, TaskStatus, TaskPriority } from '@/lib/types'

// Mock BaseHttpClient
vi.mock('@/lib/api/core/client', () => ({
  BaseHttpClient: class {
    request = vi.fn()
  },
}))

describe('tasksAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getTasks', () => {
    it('should fetch tasks list successfully', async () => {
      const mockTasks = [
        {
          id: 1,
          title: 'Call client',
          status: 'A_FAIRE' as TaskStatus,
          priority: 'haute' as TaskPriority,
        },
        {
          id: 2,
          title: 'Send proposal',
          status: 'EN_COURS' as TaskStatus,
          priority: 'moyenne' as TaskPriority,
        },
      ]
      const mockResponse = {
        items: mockTasks,
        total: 2,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      const result = await tasksAPI.getTasks()

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', { params: undefined })
      expect(result.items).toEqual(mockTasks)
      expect(result.total).toBe(2)
    })

    it('should filter tasks by status', async () => {
      const mockResponse = {
        items: [{ id: 1, title: 'Task', status: 'EN_COURS' as TaskStatus }],
        total: 1,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      await tasksAPI.getTasks({ status: 'EN_COURS' })

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        params: { status: 'EN_COURS' },
      })
    })

    it('should filter tasks by priority', async () => {
      const mockResponse = {
        items: [{ id: 1, title: 'Urgent Task', priority: 'critique' as TaskPriority }],
        total: 1,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      await tasksAPI.getTasks({ priority: 'critique' })

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        params: { priority: 'critique' },
      })
    })

    it('should filter tasks by view (today, overdue, etc)', async () => {
      const mockResponse = {
        items: [],
        total: 0,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      await tasksAPI.getTasks({ view: 'today' })

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        params: { view: 'today' },
      })
    })

    it('should filter tasks by organisation_id', async () => {
      const mockResponse = {
        items: [{ id: 1, title: 'Org Task', oganisation_id: 5 }],
        total: 1,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      await tasksAPI.getTasks({ oganisation_id: 5 })

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        params: { oganisation_id: 5 },
      })
    })

    it('should paginate tasks correctly', async () => {
      const mockResponse = {
        items: [],
        total: 100,
        skip: 20,
        limit: 20,
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockResponse)

      await tasksAPI.getTasks({ skip: 20, limit: 20 })

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        params: { skip: 20, limit: 20 },
      })
    })
  })

  describe('getTask', () => {
    it('should fetch single task by ID with relations', async () => {
      const mockTask = {
        id: 1,
        title: 'Important Task',
        status: 'A_FAIRE' as TaskStatus,
        priority: 'haute' as TaskPriority,
        organisation: { id: 5, name: 'Test Org' },
        person: { id: 10, first_name: 'John', last_name: 'Doe' },
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockTask)

      const result = await tasksAPI.getTask(1)

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/1')
      expect(result).toEqual(mockTask)
      expect(result.organisation).toBeDefined()
    })
  })

  describe('getTaskStats', () => {
    it('should fetch task statistics', async () => {
      const mockStats = {
        total: 50,
        a_faire: 20,
        en_cours: 15,
        termine: 15,
        by_priority: {
          critique: 5,
          haute: 15,
          moyenne: 20,
          basse: 10,
        },
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(mockStats)

      const result = await tasksAPI.getTaskStats()

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/stats')
      expect(result.total).toBe(50)
      expect(result.a_faire).toBe(20)
    })
  })

  describe('createTask', () => {
    it('should create task successfully', async () => {
      const newTask: TaskInput = {
        title: 'New Task',
        description: 'Task description',
        status: 'A_FAIRE',
        priority: 'moyenne',
        due_date: new Date('2025-11-15').toISOString(),
      }
      const createdTask: Task = {
        id: 3,
        ...newTask,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(createdTask)

      const result = await tasksAPI.createTask(newTask)

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      })
      expect(result.id).toBe(3)
      expect(result.title).toBe('New Task')
    })
  })

  describe('updateTask', () => {
    it('should update task successfully', async () => {
      const updateData: TaskUpdateInput = {
        title: 'Updated Task Title',
        status: 'EN_COURS',
        priority: 'haute',
      }
      const updatedTask: Task = {
        id: 1,
        title: 'Updated Task Title',
        status: 'EN_COURS',
        priority: 'haute',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(updatedTask)

      const result = await tasksAPI.updateTask(1, updateData)

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      expect(result.title).toBe('Updated Task Title')
      expect(result.status).toBe('EN_COURS')
    })

    it('should mark task as complete', async () => {
      const updateData: TaskUpdateInput = {
        status: 'TERMINE',
      }
      const updatedTask: Task = {
        id: 1,
        title: 'Task',
        status: 'TERMINE',
        priority: 'moyenne',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(updatedTask)

      const result = await tasksAPI.updateTask(1, updateData)

      expect(result.status).toBe('TERMINE')
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      vi.spyOn(tasksAPI, 'request').mockResolvedValue(undefined)

      await tasksAPI.deleteTask(1)

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/1', {
        method: 'DELETE',
      })
    })
  })

  describe('snoozeTask', () => {
    it('should snooze task for N days', async () => {
      const snoozedTask: Task = {
        id: 1,
        title: 'Snoozed Task',
        status: 'A_FAIRE',
        priority: 'moyenne',
        due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(snoozedTask)

      const result = await tasksAPI.snoozeTask(1, 3)

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/1/snooze', {
        method: 'POST',
        body: JSON.stringify({ days: 3 }),
      })
      expect(result.id).toBe(1)
    })
  })

  describe('quickActionTask', () => {
    it('should perform snooze_1d quick action', async () => {
      const updatedTask: Task = {
        id: 1,
        title: 'Task',
        status: 'A_FAIRE',
        priority: 'moyenne',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(updatedTask)

      await tasksAPI.quickActionTask(1, 'snooze_1d')

      expect(tasksAPI.request).toHaveBeenCalledWith('/tasks/1/quick-action', {
        method: 'POST',
        body: JSON.stringify({ action: 'snooze_1d' }),
      })
    })

    it('should perform mark_done quick action', async () => {
      const updatedTask: Task = {
        id: 1,
        title: 'Task',
        status: 'TERMINE',
        priority: 'moyenne',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(tasksAPI, 'request').mockResolvedValue(updatedTask)

      const result = await tasksAPI.quickActionTask(1, 'mark_done')

      expect(result.status).toBe('TERMINE')
    })
  })

  describe('error handling', () => {
    it('should handle fetch error gracefully', async () => {
      const errorMessage = 'Failed to fetch tasks'
      vi.spyOn(tasksAPI, 'request').mockRejectedValue(new Error(errorMessage))

      await expect(tasksAPI.getTasks()).rejects.toThrow(errorMessage)
    })

    it('should handle create error gracefully', async () => {
      const errorMessage = 'Validation error: title required'
      vi.spyOn(tasksAPI, 'request').mockRejectedValue(new Error(errorMessage))

      const newTask: TaskInput = {
        title: '',
        status: 'A_FAIRE',
        priority: 'moyenne',
      }

      await expect(tasksAPI.createTask(newTask)).rejects.toThrow(errorMessage)
    })
  })
})
