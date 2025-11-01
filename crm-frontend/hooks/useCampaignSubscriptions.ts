'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/useToast'

export interface CampaignSubscription {
  id: number
  campaign_id: number
  person_id?: number
  organisation_id?: number
  subscribed_by?: number
  is_active: boolean
  unsubscribed_at?: string
  created_at: string
  updated_at?: string

  // Relations optionnelles
  campaign_name?: string
  entity_name?: string
  entity_email?: string
}

interface SubscribeInput {
  campaign_id: number
  person_id?: number
  organisation_id?: number
}

interface BulkSubscribeInput {
  campaign_id: number
  person_ids?: number[]
  organisation_ids?: number[]
}

interface BulkSubscribeResponse {
  created: number
  already_exists: number
  errors: number
  subscriptions: CampaignSubscription[]
}

/**
 * Hook pour gérer les abonnements à une campagne spécifique
 *
 * @example
 * ```tsx
 * const { subscriptions, isLoading, subscribe, unsubscribe } = useCampaignSubscriptions(campaignId)
 *
 * // Abonner une personne
 * await subscribe({ campaign_id: campaignId, person_id: 123 })
 *
 * // Désabonner
 * await unsubscribe(subscriptionId)
 * ```
 */
export function useCampaignSubscriptions(campaignId: number, only_active: boolean = true) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Query: Récupérer les abonnements d'une campagne
  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery<CampaignSubscription[]>({
    queryKey: ['campaign-subscriptions', campaignId, only_active],
    queryFn: async () => {
      const response = await apiClient.get<CampaignSubscription[]>(
        `/email/campaigns/${campaignId}/subscriptions`,
        { only_active }
      )
      return response.data
    },
    enabled: !!campaignId,
  })

  // Mutation: Abonner une entité
  const subscribeMutation = useMutation({
    mutationFn: async (input: SubscribeInput) => {
      const response = await apiClient.post<CampaignSubscription>(
        `/email/campaigns/${campaignId}/subscriptions`,
        input
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-subscriptions', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      // Invalider aussi les abonnements de l'entité
      if (data.person_id) {
        queryClient.invalidateQueries({ queryKey: ['person-subscriptions', data.person_id] })
      }
      if (data.organisation_id) {
        queryClient.invalidateQueries({ queryKey: ['organisation-subscriptions', data.organisation_id] })
      }

      showToast({
        type: 'success',
        title: 'Abonnement créé avec succès',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: error?.message || 'Erreur lors de la création de l\'abonnement',
      })
    },
  })

  // Mutation: Désabonner une entité
  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      await apiClient.delete(`/email/campaigns/${campaignId}/subscriptions/${subscriptionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-subscriptions', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      showToast({
        type: 'success',
        title: 'Désabonnement réussi',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: error?.message || 'Erreur lors du désabonnement',
      })
    },
  })

  // Mutation: Abonnement en masse
  const bulkSubscribeMutation = useMutation({
    mutationFn: async (input: BulkSubscribeInput) => {
      const response = await apiClient.post<BulkSubscribeResponse>(
        '/email/campaigns/subscriptions/bulk',
        input
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-subscriptions', campaignId] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      showToast({
        type: 'success',
        title: `${data.created} abonnement(s) créé(s) avec succès${data.already_exists > 0 ? ` (${data.already_exists} déjà existant(s))` : ''}`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: error?.message || 'Erreur lors de l\'abonnement en masse',
      })
    },
  })

  return {
    subscriptions,
    isLoading,
    error,
    refetch,
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isUnsubscribing: unsubscribeMutation.isPending,
    bulkSubscribe: bulkSubscribeMutation.mutateAsync,
    isBulkSubscribing: bulkSubscribeMutation.isPending,
  }
}

/**
 * Hook pour gérer les abonnements d'une personne
 *
 * @example
 * ```tsx
 * const { subscriptions, isLoading } = usePersonSubscriptions(personId)
 * ```
 */
export function usePersonSubscriptions(personId: number, only_active: boolean = true) {


  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery<CampaignSubscription[]>({
    queryKey: ['person-subscriptions', personId, only_active],
    queryFn: async () => {
      const response = await apiClient.get<CampaignSubscription[]>(
        `/email/people/${personId}/subscriptions`,
        { only_active }
      )
      return response.data
    },
    enabled: !!personId,
  })

  return {
    subscriptions,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook pour gérer les abonnements d'une organisation
 *
 * @example
 * ```tsx
 * const { subscriptions, isLoading } = useOrganisationSubscriptions(orgId)
 * ```
 */
export function useOrganisationSubscriptions(organisationId: number, only_active: boolean = true) {


  const {
    data: subscriptions = [],
    isLoading,
    error,
    refetch,
  } = useQuery<CampaignSubscription[]>({
    queryKey: ['organisation-subscriptions', organisationId, only_active],
    queryFn: async () => {
      const response = await apiClient.get<CampaignSubscription[]>(
        `/email/organisations/${organisationId}/subscriptions`,
        { only_active }
      )
      return response.data
    },
    enabled: !!organisationId,
  })

  return {
    subscriptions,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Hook pour abonner/désabonner une entité à une campagne (pour usage dans Person/Organisation pages)
 *
 * @example
 * ```tsx
 * const { subscribe, unsubscribe } = useSubscribeToCampaign()
 *
 * // Depuis une page Person
 * await subscribe({ campaign_id: 1, person_id: personId })
 *
 * // Depuis une page Organisation
 * await subscribe({ campaign_id: 1, organisation_id: orgId })
 * ```
 */
export function useSubscribeToCampaign() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  // Mutation: Abonner une entité
  const subscribeMutation = useMutation({
    mutationFn: async (input: SubscribeInput) => {
      const response = await apiClient.post<CampaignSubscription>(
        `/email/campaigns/${input.campaign_id}/subscriptions`,
        input
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['campaign-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      // Invalider les abonnements de l'entité
      if (data.person_id) {
        queryClient.invalidateQueries({ queryKey: ['person-subscriptions', data.person_id] })
      }
      if (data.organisation_id) {
        queryClient.invalidateQueries({ queryKey: ['organisation-subscriptions', data.organisation_id] })
      }

      showToast({
        type: 'success',
        title: `Abonné à la campagne "${data.campaign_name}" avec succès`,
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: error?.message || 'Erreur lors de l\'abonnement à la campagne',
      })
    },
  })

  // Mutation: Désabonner une entité
  const unsubscribeMutation = useMutation({
    mutationFn: async ({ campaignId, subscriptionId }: { campaignId: number; subscriptionId: number }) => {
      await apiClient.delete(`/email/campaigns/${campaignId}/subscriptions/${subscriptionId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaign-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['person-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['organisation-subscriptions'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })

      showToast({
        type: 'success',
        title: 'Désabonnement réussi',
      })
    },
    onError: (error: any) => {
      showToast({
        type: 'error',
        title: error?.message || 'Erreur lors du désabonnement',
      })
    },
  })

  return {
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isUnsubscribing: unsubscribeMutation.isPending,
  }
}
