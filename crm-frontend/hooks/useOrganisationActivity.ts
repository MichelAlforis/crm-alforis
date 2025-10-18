import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  ApiError,
  OrganisationActivity,
  OrganisationActivityType,
  PaginatedResponse,
} from '@/lib/types'

// ============= QUERY KEYS =============

export const organisationActivityKeys = {
  root: ['organisationActivity'] as const,
  timeline: (
    organisationId: number,
    types?: OrganisationActivityType[]
  ) => [...organisationActivityKeys.root, 'timeline', organisationId, types?.slice().sort()] as const,
  widget: (params?: ActivityWidgetParams) => [
    ...organisationActivityKeys.root,
    'widget',
    params?.organisationIds?.slice().sort(),
    params?.types?.slice().sort(),
    params?.limit ?? null,
  ] as const,
}

// ============= TYPES =============

export interface ActivityWidgetParams {
  organisationIds?: number[]
  types?: OrganisationActivityType[]
  limit?: number
}

export interface OrganisationActivityOptions {
  limit?: number
  types?: OrganisationActivityType[]
}

// ============= HOOKS =============

/**
 * Timeline d'une organisation avec pagination par curseur (before_id)
 */
export function useOrganisationActivity(
  organisationId: number,
  options?: OrganisationActivityOptions
) {
  return useInfiniteQuery<PaginatedResponse<OrganisationActivity>, ApiError>({
    queryKey: organisationActivityKeys.timeline(organisationId, options?.types),
    enabled: Boolean(organisationId),
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.getOrganisationActivity(organisationId, {
        limit: options?.limit ?? 20,
        before_id: pageParam,
        types: options?.types,
      }),
    getNextPageParam: (lastPage) => {
      if (!lastPage.items.length) {
        return undefined
      }
      const lastItem = lastPage.items[lastPage.items.length - 1]
      if (lastPage.items.length < (lastPage.limit || options?.limit || 20)) {
        return undefined
      }
      return lastItem?.id
    },
    staleTime: 15000,
  })
}

/**
 * Flux global utilisé par le widget Activity dans le dashboard
 */
export function useActivityWidget(params?: ActivityWidgetParams) {
  return useQuery<PaginatedResponse<OrganisationActivity>, ApiError>({
    queryKey: organisationActivityKeys.widget(params),
    queryFn: () =>
      apiClient.getActivityWidget({
        organisation_ids: params?.organisationIds,
        types: params?.types,
        limit: params?.limit ?? 30,
      }),
    staleTime: 15000,
    keepPreviousData: true,
  })
}

/**
 * Utilitaire pour transformer les pages en une liste plate
 */
export function flattenActivities(
  pages: PaginatedResponse<OrganisationActivity>[] = []
): OrganisationActivity[] {
  return pages.flatMap((page) => page.items)
}
