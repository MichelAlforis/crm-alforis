/**
 * useInteractions - Hooks React Query pour API Interactions V2
 *
 * Endpoints couverts:
 * - GET /interactions/recent
 * - GET /interactions/by-organisation/{id}
 * - GET /interactions/by-person/{id}
 * - GET /interactions/inbox (V2)
 * - POST /interactions
 * - PATCH /interactions/{id}
 * - PATCH /interactions/{id}/status (V2)
 * - PATCH /interactions/{id}/assignee (V2)
 * - PATCH /interactions/{id}/next-action (V2)
 * - DELETE /interactions/{id}
 */

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  Interaction,
  InteractionCreateInput,
  InteractionUpdateInput,
  InteractionListResponse,
  InteractionStatusUpdate,
  InteractionAssigneeUpdate,
  InteractionNextActionUpdate,
} from '@/types/interaction'

// ============================================
// Query Keys
// ============================================

export const interactionKeys = {
  all: ['interactions'] as const,
  recent: (limit: number) => [...interactionKeys.all, 'recent', limit] as const,
  byOrg: (orgId: number) => [...interactionKeys.all, 'org', orgId] as const,
  byPerson: (personId: number) => [...interactionKeys.all, 'person', personId] as const,
  inbox: (filters: InboxFilters) => [...interactionKeys.all, 'inbox', filters] as const,
}

// ============================================
// Types
// ============================================

export interface InboxFilters {
  assignee?: string  // 'me' | user_id | undefined
  status?: string  // 'todo' | 'in_progress' | 'done' | undefined
  due?: string  // 'overdue' | 'today' | 'week' | 'all'
  limit?: number
  cursor?: string
}

// ============================================
// Queries
// ============================================

/**
 * Hook pour récupérer les interactions récentes (widget dashboard)
 */
export function useRecentInteractions(limit = 10) {
  return useQuery({
    queryKey: interactionKeys.recent(limit),
    queryFn: async () => {
      return apiClient.request<InteractionListResponse>('/interactions/recent', {
        params: { limit },
      })
    },
  })
}

/**
 * Hook pour récupérer les interactions d'une organisation
 */
export function useOrgInteractions(
  orgId: number,
  options?: { limit?: number; cursor?: string }
) {
  const { limit = 20, cursor } = options || {}

  return useQuery({
    queryKey: [...interactionKeys.byOrg(orgId), limit, cursor],
    queryFn: async () => {
      return apiClient.request<InteractionListResponse>(
        `/interactions/by-organisation/${orgId}`,
        {
          params: { limit, cursor },
        }
      )
    },
    enabled: !!orgId,
  })
}

/**
 * Hook pour récupérer les interactions d'une personne
 */
export function usePersonInteractions(
  personId: number,
  options?: { limit?: number; cursor?: string }
) {
  const { limit = 20, cursor } = options || {}

  return useQuery({
    queryKey: [...interactionKeys.byPerson(personId), limit, cursor],
    queryFn: async () => {
      return apiClient.request<InteractionListResponse>(
        `/interactions/by-person/${personId}`,
        {
          params: { limit, cursor },
        }
      )
    },
    enabled: !!personId,
  })
}

/**
 * Hook pour récupérer la boîte de réception (inbox) - V2
 */
export function useInbox(filters: InboxFilters = {}) {
  const { assignee, status, due = 'all', limit = 50, cursor } = filters

  return useQuery({
    queryKey: interactionKeys.inbox(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = { limit }
      if (assignee) params.assignee = assignee
      if (status) params.status = status
      if (due) params.due = due
      if (cursor) params.cursor = cursor

      return apiClient.request<InteractionListResponse>('/interactions/inbox', {
        params,
      })
    },
  })
}

// ============================================
// Infinite Scroll Queries
// ============================================

/**
 * Hook pour infinite scroll des interactions d'une organisation
 */
export function useOrgInteractionsInfinite(orgId: number, limit = 20) {
  return useInfiniteQuery({
    queryKey: [...interactionKeys.byOrg(orgId), 'infinite', limit],
    queryFn: async ({ pageParam }) => {
      return apiClient.request<InteractionListResponse>(
        `/interactions/by-organisation/${orgId}`,
        {
          params: { limit, cursor: pageParam },
        }
      )
    },
    enabled: !!orgId,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}

/**
 * Hook pour infinite scroll des interactions d'une personne
 */
export function usePersonInteractionsInfinite(personId: number, limit = 20) {
  return useInfiniteQuery({
    queryKey: [...interactionKeys.byPerson(personId), 'infinite', limit],
    queryFn: async ({ pageParam }) => {
      return apiClient.request<InteractionListResponse>(
        `/interactions/by-person/${personId}`,
        {
          params: { limit, cursor: pageParam },
        }
      )
    },
    enabled: !!personId,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor || undefined,
  })
}

// ============================================
// Mutations
// ============================================

/**
 * Hook pour créer une interaction
 */
export function useCreateInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InteractionCreateInput) => {
      return apiClient.request<Interaction>('/interactions', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: (newInteraction) => {
      // Invalidate affected caches
      if (newInteraction.org_id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.byOrg(newInteraction.org_id),
        })
      }
      if (newInteraction.person_id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.byPerson(newInteraction.person_id),
        })
      }
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

/**
 * Hook pour mettre à jour une interaction
 */
export function useUpdateInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number
      data: InteractionUpdateInput
    }) => {
      return apiClient.request<Interaction>(`/interactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
    },
    onSuccess: (updatedInteraction) => {
      // Invalidate affected caches
      if (updatedInteraction.org_id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.byOrg(updatedInteraction.org_id),
        })
      }
      if (updatedInteraction.person_id) {
        queryClient.invalidateQueries({
          queryKey: interactionKeys.byPerson(updatedInteraction.person_id),
        })
      }
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

/**
 * Hook pour supprimer une interaction
 */
export function useDeleteInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      await apiClient.request<void>(`/interactions/${id}`, {
        method: 'DELETE',
      })
      return id
    },
    onSuccess: () => {
      // Invalidate all interaction caches
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

// ============================================
// Mutations V2 (Quick Actions)
// ============================================

/**
 * Hook pour mettre à jour le statut d'une interaction (V2)
 * Supporte les optimistic updates
 */
export function useUpdateInteractionStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: number
      status: InteractionStatusUpdate['status']
    }) => {
      return apiClient.request<Interaction>(`/interactions/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
    },
    onMutate: async ({ id, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: interactionKeys.all })

      // Snapshot previous value
      const previousInbox = queryClient.getQueryData(
        interactionKeys.inbox({ due: 'all' })
      )

      // Optimistically update to the new value
      queryClient.setQueriesData<InteractionListResponse>(
        { queryKey: interactionKeys.all },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, status } : item
            ),
          }
        }
      )

      return { previousInbox }
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousInbox) {
        queryClient.setQueryData(
          interactionKeys.inbox({ due: 'all' }),
          context.previousInbox
        )
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

/**
 * Hook pour mettre à jour l'assignee d'une interaction (V2)
 * Supporte les optimistic updates
 */
export function useUpdateInteractionAssignee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      assignee_id,
    }: {
      id: number
      assignee_id?: number | null
    }) => {
      return apiClient.request<Interaction>(`/interactions/${id}/assignee`, {
        method: 'PATCH',
        body: JSON.stringify({ assignee_id }),
      })
    },
    onMutate: async ({ id, assignee_id }) => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.all })

      const previousInbox = queryClient.getQueryData(
        interactionKeys.inbox({ due: 'all' })
      )

      queryClient.setQueriesData<InteractionListResponse>(
        { queryKey: interactionKeys.all },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, assignee_id } : item
            ),
          }
        }
      )

      return { previousInbox }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousInbox) {
        queryClient.setQueryData(
          interactionKeys.inbox({ due: 'all' }),
          context.previousInbox
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}

/**
 * Hook pour mettre à jour la prochaine action d'une interaction (V2)
 * Supporte les optimistic updates
 */
export function useUpdateInteractionNextAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      next_action_at,
    }: {
      id: number
      next_action_at?: string | null
    }) => {
      return apiClient.request<Interaction>(`/interactions/${id}/next-action`, {
        method: 'PATCH',
        body: JSON.stringify({ next_action_at }),
      })
    },
    onMutate: async ({ id, next_action_at }) => {
      await queryClient.cancelQueries({ queryKey: interactionKeys.all })

      const previousInbox = queryClient.getQueryData(
        interactionKeys.inbox({ due: 'all' })
      )

      queryClient.setQueriesData<InteractionListResponse>(
        { queryKey: interactionKeys.all },
        (old) => {
          if (!old) return old
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === id ? { ...item, next_action_at, notified_at: null } : item
            ),
          }
        }
      )

      return { previousInbox }
    },
    onError: (_err, _variables, context) => {
      if (context?.previousInbox) {
        queryClient.setQueryData(
          interactionKeys.inbox({ due: 'all' }),
          context.previousInbox
        )
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
  })
}
