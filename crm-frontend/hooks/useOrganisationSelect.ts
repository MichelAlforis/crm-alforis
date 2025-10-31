/**
 * useOrganisationSelect - Hook réutilisable pour autocomplete d'organisations
 *
 * Consolide la logique de recherche/pagination d'organisations utilisée dans:
 * - TaskForm
 * - MandatForm
 * - PersonForm (indirectement)
 *
 * Utilise usePaginatedOptions avec mappers standardisés
 */

import { useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { usePaginatedOptions, type PaginatedFetcherParams } from '@/hooks/usePaginatedOptions'
import type { Organisation } from '@/lib/types'

interface UseOrganisationSelectOptions {
  /**
   * ID d'organisation à précharger (optionnel)
   */
  preloadId?: number

  /**
   * Filtre pour organisations actives uniquement
   * @default true
   */
  activeOnly?: boolean

  /**
   * Nombre d'items par page
   * @default 25
   */
  limit?: number
}

interface OrganisationOption {
  id: number
  label: string
  sublabel?: string
}

/**
 * Hook pour gérer la sélection d'organisations avec recherche et pagination
 *
 * @example
 * ```tsx
 * const { options, isLoading, search, loadMore } = useOrganisationSelect({
 *   preloadId: 123,
 *   activeOnly: true
 * })
 *
 * <EntityAutocompleteInput
 *   options={options}
 *   isLoading={isLoading}
 *   onSearch={search}
 *   onLoadMore={loadMore}
 * />
 * ```
 */
export function useOrganisationSelect(hookOptions: UseOrganisationSelectOptions = {}) {
  const {
    preloadId,
    activeOnly = true,
    limit = 25,
  } = hookOptions

  // Fetcher avec support de recherche et filtrage
  const fetchOrganisationOptions = useCallback(
    ({ query, skip, limit: pageLimit }: PaginatedFetcherParams) => {
      if (query) {
        return apiClient.searchOrganisations(query, skip, pageLimit)
      }
      return apiClient.getOrganisations({
        skip,
        limit: pageLimit,
        is_active: activeOnly,
      })
    },
    [activeOnly]
  )

  // Mapper standardisé Organisation → Option
  const mapOrganisationToOption = useCallback(
    (organisation: Organisation): OrganisationOption => ({
      id: organisation.id,
      label: organisation.name,
      sublabel: organisation.category || undefined,
    }),
    []
  )

  const {
    options,
    isLoading,
    isLoadingMore,
    hasMore,
    search,
    loadMore,
    upsertOption,
  } = usePaginatedOptions<Organisation>({
    fetcher: fetchOrganisationOptions,
    mapItem: mapOrganisationToOption,
    limit,
    preloadIds: preloadId ? [preloadId] : undefined,
  })

  return {
    /**
     * Liste des options d'organisations formatées pour autocomplete
     */
    options,

    /**
     * État de chargement initial
     */
    isLoading,

    /**
     * État de chargement de pages supplémentaires
     */
    isLoadingMore,

    /**
     * Indique si plus de résultats sont disponibles
     */
    hasMore,

    /**
     * Fonction de recherche
     * @param query - Terme de recherche
     */
    search,

    /**
     * Fonction pour charger plus de résultats (pagination)
     */
    loadMore,

    /**
     * Fonction pour ajouter/mettre à jour une option dans la liste
     * Utile après création d'une nouvelle organisation
     */
    upsertOption,
  }
}
