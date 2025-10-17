// hooks/useTasks.ts
// ============= TASK MANAGEMENT HOOK =============

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { Task, TaskInput, TaskUpdateInput, TaskStats, TaskFilters, PaginatedResponse } from '@/lib/types'

export function useTasks(filters?: TaskFilters) {
  const queryClient = useQueryClient()

  // GET: Liste des tâches
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<PaginatedResponse<Task>>({
    queryKey: ['tasks', filters],
    queryFn: () => apiClient.getTasks(filters),
  })

  // GET: Statistiques
  const { data: stats } = useQuery<TaskStats>({
    queryKey: ['tasks', 'stats'],
    queryFn: () => apiClient.getTaskStats(),
  })

  // CREATE: Nouvelle tâche
  const createTaskMutation = useMutation({
    mutationFn: (taskData: TaskInput) => apiClient.createTask(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // UPDATE: Modifier une tâche
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: TaskUpdateInput }) =>
      apiClient.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // DELETE: Supprimer une tâche
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // SNOOZE: Reporter une tâche
  const snoozeTaskMutation = useMutation({
    mutationFn: ({ id, days }: { id: number; days: number }) =>
      apiClient.snoozeTask(id, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // QUICK ACTION: Actions rapides (+1j, +1sem, done)
  const quickActionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'snooze_1d' | 'snooze_1w' | 'mark_done' | 'next_day' }) =>
      apiClient.quickActionTask(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  return {
    // Data
    tasks: data?.items ?? [],
    total: data?.total ?? 0,
    stats,
    isLoading,
    error: error?.message,

    // Actions
    createTask: createTaskMutation.mutateAsync,
    updateTask: (id: number, data: TaskUpdateInput) => updateTaskMutation.mutateAsync({ id, data }),
    deleteTask: deleteTaskMutation.mutateAsync,
    snoozeTask: (id: number, days: number) => snoozeTaskMutation.mutateAsync({ id, days }),
    quickAction: (id: number, action: 'snooze_1d' | 'snooze_1w' | 'mark_done' | 'next_day') =>
      quickActionMutation.mutateAsync({ id, action }),

    // Status
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,

    // Refresh
    refetch,
  }
}

// ============= HOOK POUR UNE TÂCHE UNIQUE =============

export function useTask(taskId: number) {
  const queryClient = useQueryClient()

  const {
    data: task,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['tasks', taskId],
    queryFn: () => apiClient.getTask(taskId),
    enabled: !!taskId,
  })

  const updateTaskMutation = useMutation({
    mutationFn: (data: TaskUpdateInput) => apiClient.updateTask(taskId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['tasks', taskId] })
    },
  })

  return {
    task,
    isLoading,
    error: error?.message,
    updateTask: updateTaskMutation.mutateAsync,
    isUpdating: updateTaskMutation.isPending,
  }
}

// ============= HOOK POUR LES VUES SPÉCIALES (Aujourd'hui, En retard, etc.) =============

export function useTaskViews() {
  const { data: overdue } = useQuery({
    queryKey: ['tasks', 'overdue'],
    queryFn: () => apiClient.getTasks({ view: 'overdue' }),
  })

  const { data: today } = useQuery({
    queryKey: ['tasks', 'today'],
    queryFn: () => apiClient.getTasks({ view: 'today' }),
  })

  const { data: next7 } = useQuery({
    queryKey: ['tasks', 'next7'],
    queryFn: () => apiClient.getTasks({ view: 'next7' }),
  })

  const { data: stats } = useQuery({
    queryKey: ['tasks', 'stats'],
    queryFn: () => apiClient.getTaskStats(),
  })

  return {
    overdue: overdue?.items ?? [],
    today: today?.items ?? [],
    next7: next7?.items ?? [],
    stats,

    // Counts
    overdueCount: overdue?.total ?? 0,
    todayCount: today?.total ?? 0,
    next7Count: next7?.total ?? 0,
  }
}
