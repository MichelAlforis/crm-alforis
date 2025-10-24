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
import { api } from '@/lib/axios'
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
export function useRecentInteractions(limit: number = 5) {
  return useQuery({
    queryKey: interactionKeys.recent(limit),
    queryFn: async () => {
      const { data } = await api.get<Interaction[]>(`/api/v1/interactions/recent`, {
        params: { limit },
      })
      return data
    },
  })
}

/**
 * Hook pour récupérer les interactions d'une organisation (timeline)
 */
export function useOrgInteractions(orgId: number, options?: { limit?: number; cursor?: string }) {
  const { limit = 50, cursor } = options || {}

  return useQuery({
    queryKey: [...interactionKeys.byOrg(orgId), limit, cursor],
    queryFn: async () => {
      const { data } = await api.get<InteractionListResponse>(
        `/api/v1/interactions/by-organisation/${orgId}`,
        {
          params: { limit, cursor },
        }
      )
      return data
    },
    enabled: !!orgId,
  })
}

/**
 * Hook pour récupérer les interactions d'une personne (timeline)
 */
export function usePersonInteractions(personId: number, options?: { limit?: number; cursor?: string }) {
  const { limit = 50, cursor } = options || {}

  return useQuery({
    queryKey: [...interactionKeys.byPerson(personId), limit, cursor],
    queryFn: async () => {
      const { data } = await api.get<InteractionListResponse>(
        `/api/v1/interactions/by-person/${personId}`,
        {
          params: { limit, cursor },
        }
      )
      return data
    },
    enabled: !!personId,
  })
}

// ============================================
// Mutations
// ============================================

/**
 * Hook pour créer une interaction
 *
 * Optimistic update: prepend à la liste
 */
export function useCreateInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InteractionCreateInput) => {
      const { data } = await api.post<Interaction>('/api/v1/interactions', input)
      return data
    },
    onSuccess: (newInteraction) => {
      toast.success('Interaction créée')

      // Invalider les listes concernées
      if (newInteraction.org_id) {
        queryClient.invalidateQueries({ queryKey: interactionKeys.byOrg(newInteraction.org_id) })
      }
      if (newInteraction.person_id) {
        queryClient.invalidateQueries({ queryKey: interactionKeys.byPerson(newInteraction.person_id) })
      }
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création')
    },
  })
}

/**
 * Hook pour modifier une interaction
 */
export function useUpdateInteraction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: InteractionUpdateInput }) => {
      const { data } = await api.patch<Interaction>(`/api/v1/interactions/${id}`, input)
      return data
    },
    onSuccess: (updatedInteraction) => {
      toast.success('Interaction modifiée')

      // Invalider les listes concernées
      if (updatedInteraction.org_id) {
        queryClient.invalidateQueries({ queryKey: interactionKeys.byOrg(updatedInteraction.org_id) })
      }
      if (updatedInteraction.person_id) {
        queryClient.invalidateQueries({ queryKey: interactionKeys.byPerson(updatedInteraction.person_id) })
      }
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la modification')
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
      await api.delete(`/api/v1/interactions/${id}`)
      return id
    },
    onSuccess: () => {
      toast.success('Interaction supprimée')

      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: interactionKeys.all })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression')
    },
  })
}
