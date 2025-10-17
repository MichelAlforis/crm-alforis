import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { OrganisationCreate, OrganisationUpdate } from '@/lib/types'

// ============= QUERY KEYS =============

export const organisationKeys = {
  all: ['organisations'] as const,
  lists: () => [...organisationKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...organisationKeys.lists(), filters] as const,
  details: () => [...organisationKeys.all, 'detail'] as const,
  detail: (id: number) => [...organisationKeys.details(), id] as const,
  stats: () => [...organisationKeys.all, 'stats'] as const,
  byLanguage: (language: string) => [...organisationKeys.all, 'language', language] as const,
}

// ============= HOOKS =============

/**
 * Hook pour récupérer la liste des organisations avec pagination et filtres
 */
export function useOrganisations(params?: {
  skip?: number
  limit?: number
  category?: string
  is_active?: boolean
  country_code?: string
  language?: string
}) {
  return useQuery({
    queryKey: organisationKeys.list(params || {}),
    queryFn: () => apiClient.getOrganisations(params),
    staleTime: 30000, // 30 secondes
  })
}

/**
 * Hook pour récupérer une organisation par ID avec ses détails
 */
export function useOrganisation(id: number) {
  return useQuery({
    queryKey: organisationKeys.detail(id),
    queryFn: () => apiClient.getOrganisation(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook pour rechercher des organisations
 */
export function useSearchOrganisations(
  query: string,
  options?: { skip?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['organisations', 'search', query, options],
    queryFn: () => apiClient.searchOrganisations(query, options?.skip, options?.limit),
    enabled: query.length > 0,
    staleTime: 10000, // 10 secondes pour la recherche
  })
}

/**
 * Hook pour récupérer les organisations par langue (segmentation newsletter)
 */
export function useOrganisationsByLanguage(
  language: string,
  options?: { skip?: number; limit?: number }
) {
  return useQuery({
    queryKey: organisationKeys.byLanguage(language),
    queryFn: () =>
      apiClient.getOrganisationsByLanguage(language, options?.skip, options?.limit),
    enabled: !!language,
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook pour récupérer les statistiques des organisations
 */
export function useOrganisationStats() {
  return useQuery({
    queryKey: organisationKeys.stats(),
    queryFn: () => apiClient.getOrganisationStats(),
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook pour créer une organisation
 */
export function useCreateOrganisation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: OrganisationCreate) => apiClient.createOrganisation(data),
    onSuccess: () => {
      // Invalider toutes les listes d'organisations
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: organisationKeys.stats() })
    },
  })
}

/**
 * Hook pour mettre à jour une organisation
 */
export function useUpdateOrganisation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrganisationUpdate }) =>
      apiClient.updateOrganisation(id, data),
    onSuccess: (updatedOrganisation) => {
      // Invalider les listes et le détail
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() })
      queryClient.invalidateQueries({
        queryKey: organisationKeys.detail(updatedOrganisation.id),
      })
      queryClient.invalidateQueries({ queryKey: organisationKeys.stats() })
    },
  })
}

/**
 * Hook pour supprimer une organisation
 */
export function useDeleteOrganisation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteOrganisation(id),
    onSuccess: () => {
      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: organisationKeys.lists() })
      queryClient.invalidateQueries({ queryKey: organisationKeys.stats() })
    },
  })
}
