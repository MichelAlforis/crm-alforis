'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  EmailTemplate,
  EmailTemplateInput,
  EmailTemplateUpdateInput,
  EmailCampaign,
  EmailCampaignInput,
  EmailCampaignUpdateInput,
  EmailCampaignFilters,
  EmailCampaignScheduleInput,
  EmailCampaignStats,
  EmailSend,
  EmailSendFilters,
  PaginatedResponse,
} from '@/lib/types'

// ============= EMAIL TEMPLATES =============

export function useEmailTemplates(options?: { onlyActive?: boolean }) {
  const queryClient = useQueryClient()
  const onlyActive = options?.onlyActive ?? true

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery<EmailTemplate[]>({
    queryKey: ['email', 'templates', { onlyActive }],
    queryFn: () => apiClient.getEmailTemplates({ only_active: onlyActive }),
  })

  const createMutation = useMutation({
    mutationFn: (payload: EmailTemplateInput) => apiClient.createEmailTemplate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'templates'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmailTemplateUpdateInput }) =>
      apiClient.updateEmailTemplate(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email', 'templates'] })
      queryClient.invalidateQueries({ queryKey: ['email', 'template', variables.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/email/templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'templates'] })
    },
  })

  return {
    templates: data ?? [],
    isLoading,
    isFetching,
    error,
    createTemplate: createMutation.mutateAsync,
    updateTemplate: (id: number, payload: EmailTemplateUpdateInput) =>
      updateMutation.mutateAsync({ id, data: payload }),
    deleteTemplate: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

// ============= EMAIL CAMPAIGNS =============

export function useEmailCampaigns(filters?: EmailCampaignFilters) {
  const queryClient = useQueryClient()
  const params = { ...filters }

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery<PaginatedResponse<EmailCampaign>>({
    queryKey: ['email', 'campaigns', params],
    queryFn: () => apiClient.getEmailCampaigns(params),
  })

  const createMutation = useMutation({
    mutationFn: (payload: EmailCampaignInput) => apiClient.createEmailCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'campaigns'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmailCampaignUpdateInput }) =>
      apiClient.updateEmailCampaign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email', 'campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['email', 'campaign', variables.id] })
    },
  })

  const scheduleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: EmailCampaignScheduleInput }) =>
      apiClient.scheduleEmailCampaign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['email', 'campaigns'] })
      queryClient.invalidateQueries({ queryKey: ['email', 'campaign', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['email', 'campaign', variables.id, 'stats'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/email/campaigns/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email', 'campaigns'] })
    },
  })

  return {
    campaigns: data?.items ?? [],
    pagination: {
      total: data?.total ?? 0,
      skip: data?.skip ?? 0,
      limit: data?.limit ?? (filters?.limit ?? 50),
    },
    isLoading,
    isFetching,
    error,
    createCampaign: createMutation.mutateAsync,
    updateCampaign: (id: number, payload: EmailCampaignUpdateInput) =>
      updateMutation.mutateAsync({ id, data: payload }),
    scheduleCampaign: (id: number, payload: EmailCampaignScheduleInput) =>
      scheduleMutation.mutateAsync({ id, data: payload }),
    deleteCampaign: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isScheduling: scheduleMutation.isPending,
    isDeleting: deleteMutation.isPending,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['email', 'campaigns'] }),
  }
}

export function useEmailCampaign(campaignId?: number) {
  return useQuery<EmailCampaign>({
    queryKey: ['email', 'campaign', campaignId],
    queryFn: () => apiClient.getEmailCampaign(campaignId as number),
    enabled: !!campaignId,
  })
}

export function useEmailCampaignStats(campaignId?: number) {
  return useQuery<EmailCampaignStats>({
    queryKey: ['email', 'campaign', campaignId, 'stats'],
    queryFn: () => apiClient.getEmailCampaignStats(campaignId as number),
    enabled: !!campaignId,
    refetchInterval: 60_000, // Rafraîchit toutes les minutes
  })
}

export function useEmailCampaignSends(campaignId?: number, filters?: EmailSendFilters) {
  const params = { ...filters }
  return useQuery<PaginatedResponse<EmailSend>>({
    queryKey: ['email', 'campaign', campaignId, 'sends', params],
    queryFn: () => apiClient.getEmailCampaignSends(campaignId as number, params),
    enabled: !!campaignId,
    refetchInterval: 30_000,
  })
}
