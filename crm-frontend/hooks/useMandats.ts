import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  MandatDistributionCreate,
  MandatDistributionUpdate,
} from '@/lib/types'

// ============= QUERY KEYS =============

export const mandatKeys = {
  all: ['mandats'] as const,
  lists: () => [...mandatKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...mandatKeys.lists(), filters] as const,
  details: () => [...mandatKeys.all, 'detail'] as const,
  detail: (id: number) => [...mandatKeys.details(), id] as const,
  active: (organisation_id?: number) =>
    [...mandatKeys.all, 'active', organisation_id] as const,
  byOrganisation: (organisation_id: number) =>
    [...mandatKeys.all, 'organisation', organisation_id] as const,
}

// ============= HOOKS =============

/**
 * Hook pour récupérer la liste des mandats avec pagination et filtres
 */
export function useMandats(params?: {
  skip?: number
  limit?: number
  organisation_id?: number
  status?: string
}) {
  return useQuery({
    queryKey: mandatKeys.list(params || {}),
    queryFn: () => apiClient.getMandats(params),
    staleTime: 30000, // 30 secondes
  })
}

/**
 * Hook pour récupérer un mandat par ID avec ses détails (produits associés)
 */
export function useMandat(id: number) {
  return useQuery({
    queryKey: mandatKeys.detail(id),
    queryFn: () => apiClient.getMandat(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook pour récupérer les mandats actifs (signés ou actifs)
 */
export function useActiveMandats(organisation_id?: number) {
  return useQuery({
    queryKey: mandatKeys.active(organisation_id),
    queryFn: () => apiClient.getActiveMandats(organisation_id),
    staleTime: 30000,
  })
}

/**
 * Hook pour récupérer tous les mandats d'une organisation
 */
export function useMandatsByOrganisation(organisation_id: number) {
  return useQuery({
    queryKey: mandatKeys.byOrganisation(organisation_id),
    queryFn: () => apiClient.getMandatsByOrganisation(organisation_id),
    enabled: !!organisation_id,
    staleTime: 30000,
  })
}

/**
 * Hook pour vérifier si un mandat est actif
 */
export function useCheckMandatActif(id: number) {
  return useQuery({
    queryKey: ['mandats', 'check-actif', id],
    queryFn: () => apiClient.checkMandatActif(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook pour créer un mandat
 */
export function useCreateMandat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MandatDistributionCreate) => apiClient.createMandat(data),
    onSuccess: (newMandat) => {
      // Invalider les listes de mandats
      queryClient.invalidateQueries({ queryKey: mandatKeys.lists() })
      queryClient.invalidateQueries({ queryKey: mandatKeys.active() })
      queryClient.invalidateQueries({
        queryKey: mandatKeys.byOrganisation(newMandat.organisation_id),
      })

      // Invalider aussi les détails de l'organisation
      queryClient.invalidateQueries({
        queryKey: ['organisations', 'detail', newMandat.organisation_id],
      })
    },
  })
}

/**
 * Hook pour mettre à jour un mandat
 */
export function useUpdateMandat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MandatDistributionUpdate }) =>
      apiClient.updateMandat(id, data),
    onSuccess: (updatedMandat) => {
      // Invalider les listes et le détail
      queryClient.invalidateQueries({ queryKey: mandatKeys.lists() })
      queryClient.invalidateQueries({ queryKey: mandatKeys.detail(updatedMandat.id) })
      queryClient.invalidateQueries({ queryKey: mandatKeys.active() })
      queryClient.invalidateQueries({
        queryKey: mandatKeys.byOrganisation(updatedMandat.organisation_id),
      })

      // Invalider l'organisation associée
      queryClient.invalidateQueries({
        queryKey: ['organisations', 'detail', updatedMandat.organisation_id],
      })
    },
  })
}

/**
 * Hook pour supprimer un mandat
 */
export function useDeleteMandat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteMandat(id),
    onSuccess: () => {
      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: mandatKeys.lists() })
      queryClient.invalidateQueries({ queryKey: mandatKeys.active() })
      // Invalider aussi les organisations (car un mandat a été supprimé)
      queryClient.invalidateQueries({ queryKey: ['organisations'] })
    },
  })
}
