// lib/api/modules/tasks.ts
// ============= TASKS MODULE =============
// Task management, stats, quick actions

import { BaseHttpClient } from '../core/client'
import type {
  Task,
  TaskInput,
  TaskUpdateInput,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskStats,
  PaginatedResponse,
} from '@/lib/types'

export class TasksAPI extends BaseHttpClient {
  /**
   * Get paginated list of tasks
   */
  async getTasks(params?: {
    skip?: number
    limit?: number
    status?: TaskStatus
    priority?: TaskPriority
    category?: TaskCategory
    view?: 'today' | 'overdue' | 'next7' | 'all'
    oganisation_id?: number
    person_id?: number
  }): Promise<PaginatedResponse<Task>> {
    return this.request<PaginatedResponse<Task>>('/tasks', { params })
  }

  /**
   * Get task details by ID with relations
   */
  async getTask(id: number): Promise<TaskWithRelations> {
    return this.request<TaskWithRelations>(`/tasks/${id}`)
  }

  /**
   * Get task statistics
   */
  async getTaskStats(): Promise<TaskStats> {
    return this.request<TaskStats>('/tasks/stats')
  }

  /**
   * Create new task
   */
  async createTask(data: TaskInput): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update task
   */
  async updateTask(id: number, data: TaskUpdateInput): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete task
   */
  async deleteTask(id: number): Promise<void> {
    await this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Snooze task for N days
   */
  async snoozeTask(id: number, days: number): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    })
  }

  /**
   * Quick action on task
   */
  async quickActionTask(id: number, action: 'snooze_1d' | 'snooze_1w' | 'mark_done' | 'next_day'): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/quick-action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }
}

// Singleton instance
export const tasksAPI = new TasksAPI()
