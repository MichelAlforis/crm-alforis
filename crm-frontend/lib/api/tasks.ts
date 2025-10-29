// lib/api/tasks.ts
// ============= TASKS API MODULE =============
// CRUD tâches + stats

import type { BaseApiClient } from './index'
import type {
  Task,
  TaskInput,
  TaskUpdateInput,
  TaskWithRelations,
  TaskStats,
} from '../types'

export class TasksApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Lister tâches
   * GET /tasks
   *
   * TODO: Copier depuis lib/api.ts méthode getTasks() (ligne ~692)
   */
  async list(params?: {
    status?: string
    priority?: string
    category?: string
    assigned_to?: number
    skip?: number
    limit?: number
  }): Promise<Task[]> {
    return await this.client['get']<Task[]>('/tasks', params)
  }

  /**
   * Détails tâche
   * GET /tasks/{id}
   */
  async get(id: number): Promise<TaskWithRelations> {
    return await this.client['get']<TaskWithRelations>(`/tasks/${id}`)
  }

  /**
   * Stats tâches
   * GET /tasks/stats
   */
  async getStats(): Promise<TaskStats> {
    return await this.client['get']<TaskStats>('/tasks/stats')
  }

  /**
   * Créer tâche
   * POST /tasks
   */
  async create(data: TaskInput): Promise<Task> {
    return await this.client['post']<Task>('/tasks', data)
  }

  /**
   * Mettre à jour tâche
   * PUT /tasks/{id}
   */
  async update(id: number, data: TaskUpdateInput): Promise<Task> {
    return await this.client['put']<Task>(`/tasks/${id}`, data)
  }

  /**
   * Supprimer tâche
   * DELETE /tasks/{id}
   */
  async delete(id: number): Promise<void> {
    await this.client['delete']<void>(`/tasks/${id}`)
  }

  /**
   * Snooze tâche (reporter de N jours)
   * POST /tasks/{id}/snooze
   */
  async snooze(id: number, days: number): Promise<Task> {
    return await this.client['post']<Task>(`/tasks/${id}/snooze`, { days })
  }

  /**
   * Actions rapides
   * POST /tasks/{id}/quick-action
   */
  async quickAction(
    id: number,
    action: 'snooze_1d' | 'snooze_1w' | 'mark_done' | 'next_day'
  ): Promise<Task> {
    return await this.client['post']<Task>(`/tasks/${id}/quick-action`, { action })
  }
}
