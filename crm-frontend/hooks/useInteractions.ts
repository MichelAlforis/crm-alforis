/**
 * useInteractions - Hooks React Query pour API Interactions v1
 *
 * Endpoints couverts:
 * - GET /interactions/recent
 * - GET /interactions/by-organisation/{id}
 * - GET /interactions/by-person/{id}
 * - POST /interactions
 * - PATCH /interactions/{id}
 * - DELETE /interactions/{id}
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  Interaction,
  InteractionCreateInput,
  InteractionUpdateInput,
  InteractionListResponse,
} from '@/types/interaction'
import { toast } from 'react-hot-toast'

// ============================================
// Query Keys
// ============================================

export const interactionKeys = {
  all: ['interactions'] as const,
  recent: (limit: number) => [...interactionKeys.all, 'recent', limit] as const,
  byOrg: (orgId: number) => [...interactionKeys.all, 'org', orgId] as const,
  byPerson: (personId: number) => [...interactionKeys.all, 'person', personId] as const,
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
      toast.success('Interaction créée')

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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la création')
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
      toast.success('Interaction mise à jour')

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
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la mise à jour')
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
      toast.success('Interaction supprimée')
      // Invalidate all interaction caches
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erreur lors de la suppression')
    },
  })
}
