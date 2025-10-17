import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  Produit,
  ProduitCreate,
  ProduitUpdate,
  ProduitDetail,
  MandatProduit,
  MandatProduitCreate,
  PaginatedResponse,
} from '@/lib/types'

// ============= QUERY KEYS =============

export const produitKeys = {
  all: ['produits'] as const,
  lists: () => [...produitKeys.all, 'list'] as const,
  list: (filters: Record<string, any>) => [...produitKeys.lists(), filters] as const,
  details: () => [...produitKeys.all, 'detail'] as const,
  detail: (id: number) => [...produitKeys.details(), id] as const,
  byIsin: (isin: string) => [...produitKeys.all, 'isin', isin] as const,
  byMandat: (mandat_id: number) => [...produitKeys.all, 'mandat', mandat_id] as const,
}

// ============= HOOKS =============

/**
 * Hook pour récupérer la liste des produits avec pagination et filtres
 */
export function useProduits(params?: {
  skip?: number
  limit?: number
  type?: string
  status?: string
}) {
  return useQuery({
    queryKey: produitKeys.list(params || {}),
    queryFn: () => apiClient.getProduits(params),
    staleTime: 30000, // 30 secondes
  })
}

/**
 * Hook pour récupérer un produit par ID avec ses détails (mandats associés)
 */
export function useProduit(id: number) {
  return useQuery({
    queryKey: produitKeys.detail(id),
    queryFn: () => apiClient.getProduit(id),
    enabled: !!id,
    staleTime: 30000,
  })
}

/**
 * Hook pour rechercher des produits
 */
export function useSearchProduits(
  query: string,
  options?: { skip?: number; limit?: number }
) {
  return useQuery({
    queryKey: ['produits', 'search', query, options],
    queryFn: () => apiClient.searchProduits(query, options?.skip, options?.limit),
    enabled: query.length > 0,
    staleTime: 10000, // 10 secondes pour la recherche
  })
}

/**
 * Hook pour récupérer un produit par code ISIN
 */
export function useProduitByIsin(isin: string) {
  return useQuery({
    queryKey: produitKeys.byIsin(isin),
    queryFn: () => apiClient.getProduitByIsin(isin),
    enabled: !!isin && isin.length === 12, // ISIN = 12 caractères
    staleTime: 60000, // 1 minute
  })
}

/**
 * Hook pour récupérer tous les produits associés à un mandat
 */
export function useProduitsByMandat(mandat_id: number) {
  return useQuery({
    queryKey: produitKeys.byMandat(mandat_id),
    queryFn: () => apiClient.getProduitsByMandat(mandat_id),
    enabled: !!mandat_id,
    staleTime: 30000,
  })
}

/**
 * Hook pour créer un produit
 */
export function useCreateProduit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProduitCreate) => apiClient.createProduit(data),
    onSuccess: () => {
      // Invalider toutes les listes de produits
      queryClient.invalidateQueries({ queryKey: produitKeys.lists() })
    },
  })
}

/**
 * Hook pour mettre à jour un produit
 */
export function useUpdateProduit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProduitUpdate }) =>
      apiClient.updateProduit(id, data),
    onSuccess: (updatedProduit) => {
      // Invalider les listes et le détail
      queryClient.invalidateQueries({ queryKey: produitKeys.lists() })
      queryClient.invalidateQueries({ queryKey: produitKeys.detail(updatedProduit.id) })
    },
  })
}

/**
 * Hook pour supprimer un produit
 */
export function useDeleteProduit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteProduit(id),
    onSuccess: () => {
      // Invalider toutes les listes
      queryClient.invalidateQueries({ queryKey: produitKeys.lists() })
      // Invalider aussi les mandats (car produits associés peuvent avoir changé)
      queryClient.invalidateQueries({ queryKey: ['mandats'] })
    },
  })
}

/**
 * Hook pour associer un produit à un mandat
 * IMPORTANT: Le mandat doit être actif (signé ou actif)
 */
export function useAssociateProduitToMandat() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MandatProduitCreate) => apiClient.associateProduitToMandat(data),
    onSuccess: (association) => {
      // Invalider les produits du mandat
      queryClient.invalidateQueries({
        queryKey: produitKeys.byMandat(association.mandat_id),
      })

      // Invalider le détail du mandat
      queryClient.invalidateQueries({
        queryKey: ['mandats', 'detail', association.mandat_id],
      })

      // Invalider le détail du produit
      queryClient.invalidateQueries({
        queryKey: produitKeys.detail(association.produit_id),
      })
    },
  })
}

/**
 * Hook pour supprimer une association mandat-produit
 */
export function useDeleteMandatProduitAssociation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (association_id: number) =>
      apiClient.deleteMandatProduitAssociation(association_id),
    onSuccess: () => {
      // Invalider tous les mandats et produits
      queryClient.invalidateQueries({ queryKey: ['mandats'] })
      queryClient.invalidateQueries({ queryKey: produitKeys.all })
    },
  })
}
