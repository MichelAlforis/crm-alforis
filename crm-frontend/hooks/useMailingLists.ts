'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

interface MailingList {
  id: number
  name: string
  description?: string
  target_type: string
  filters: Record<string, unknown>
  recipient_count: number
  is_active: boolean
  last_used_at?: string
  created_at: string
  updated_at?: string
}

interface MailingListInput {
  name: string
  description?: string
  target_type: string
  filters?: Record<string, unknown>
  recipient_count?: number
  is_active?: boolean
}

interface MailingListFilters {
  skip?: number
  limit?: number
  only_active?: boolean
  only_mine?: boolean
}

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

interface UseMailingListsOptions {
  filters?: MailingListFilters
  autoRefetch?: boolean
}

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const maybeResponse = (error as { response?: unknown }).response
    if (maybeResponse && typeof maybeResponse === 'object' && 'data' in maybeResponse) {
      const maybeData = (maybeResponse as { data?: unknown }).data
      if (maybeData && typeof maybeData === 'object' && 'detail' in maybeData) {
        const detail = (maybeData as { detail?: unknown }).detail
        if (typeof detail === 'string') {
          return detail
        }
      }
    }
  }

  return fallback
}

/**
 * Hook complet pour gérer les listes de diffusion avec CRUD
 *
 * @example
 * ```tsx
 * const {
 *   lists,
 *   isLoading,
 *   createList,
 *   updateList,
 *   deleteList,
 *   isCreating,
 *   isDeleting
 * } = useMailingLists()
 *
 * // Créer
 * await createList({ name: 'Ma liste', target_type: 'contacts' })
 *
 * // Modifier
 * await updateList(listId, { name: 'Nouveau nom' })
 *
 * // Supprimer
 * await deleteList(listId)
 * ```
 */
export function useMailingLists(options?: UseMailingListsOptions) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const filters = options?.filters || {}

  // Query: Récupérer les listes
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<PaginatedResponse<MailingList>>({
    queryKey: ['mailing-lists', filters],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<MailingList>>('/mailing-lists', {
        params: filters,
      })
      return response.data
    },
    refetchInterval: options?.autoRefetch ? 30000 : false, // Auto-refresh toutes les 30s si activé
  })

  // Mutation: Créer une liste
  const createMutation = useMutation({
    mutationFn: async (payload: MailingListInput) => {
      const response = await apiClient.post<MailingList>('/mailing-lists', payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      showToast({
        type: 'success',
        title: 'Liste créée',
        message: `La liste "${data.name}" a été créée avec succès`,
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: extractErrorMessage(error, 'Impossible de créer la liste'),
      })
    },
  })

  // Mutation: Mettre à jour une liste
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MailingListInput> }) => {
      const response = await apiClient.put<MailingList>(`/mailing-lists/${id}`, data)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      queryClient.invalidateQueries({ queryKey: ['mailing-list', data.id] })
      showToast({
        type: 'success',
        title: 'Liste mise à jour',
        message: `La liste "${data.name}" a été mise à jour`,
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: extractErrorMessage(error, 'Impossible de mettre à jour la liste'),
      })
    },
  })

  // Mutation: Supprimer une liste
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiClient.delete(`/mailing-lists/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      showToast({
        type: 'success',
        title: 'Liste supprimée',
        message: 'La liste a été supprimée avec succès',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: extractErrorMessage(error, 'Impossible de supprimer la liste'),
      })
    },
  })

  // Mutation: Activer/Désactiver une liste
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const response = await apiClient.patch<MailingList>(`/mailing-lists/${id}`, { is_active })
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mailing-lists'] })
      showToast({
        type: 'success',
        title: data.is_active ? 'Liste activée' : 'Liste désactivée',
      })
    },
    onError: (error: unknown) => {
      showToast({
        type: 'error',
        title: 'Erreur',
        message: extractErrorMessage(error, "Impossible de modifier l'état de la liste"),
      })
    },
  })

  return {
    // Data
    lists: data?.items ?? [],
    pagination: {
      total: data?.total ?? 0,
      page: data?.page ?? 1,
      page_size: data?.page_size ?? 100,
    },

    // Loading states
    isLoading,
    isFetching,
    error,

    // CRUD operations
    createList: createMutation.mutateAsync,
    updateList: (id: number, payload: Partial<MailingListInput>) =>
      updateMutation.mutateAsync({ id, data: payload }),
    deleteList: deleteMutation.mutateAsync,
    toggleActive: (id: number, is_active: boolean) =>
      toggleActiveMutation.mutateAsync({ id, is_active }),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isToggling: toggleActiveMutation.isPending,

    // Utils
    refetch,
  }
}

/**
 * Hook pour récupérer une seule liste de diffusion
 */
export function useMailingList(listId?: number) {
  return useQuery<MailingList>({
    queryKey: ['mailing-list', listId],
    queryFn: async () => {
      const response = await apiClient.get<MailingList>(`/mailing-lists/${listId}`)
      return response.data
    },
    enabled: !!listId,
  })
}
