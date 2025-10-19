import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type {
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookRotateSecretInput,
} from '@/lib/types'

// ============= QUERY KEYS =============

export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...webhookKeys.lists(), filters] as const,
  details: () => [...webhookKeys.all, 'detail'] as const,
  detail: (id: number) => [...webhookKeys.details(), id] as const,
  events: () => [...webhookKeys.all, 'events'] as const,
}

// ============= HOOKS =============

export function useWebhooks(params?: { is_active?: boolean }) {
  return useQuery({
    queryKey: webhookKeys.list(params || {}),
    queryFn: () => apiClient.getWebhooks(params),
  })
}

export function useWebhook(id: number) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => apiClient.getWebhook(id),
    enabled: !!id,
  })
}

export function useWebhookEvents() {
  return useQuery({
    queryKey: webhookKeys.events(),
    queryFn: () => apiClient.getWebhookEvents(),
  })
}

export function useCreateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: WebhookCreateInput) => apiClient.createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
      queryClient.invalidateQueries({ queryKey: webhookKeys.events() })
    },
  })
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WebhookUpdateInput }) =>
      apiClient.updateWebhook(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(updated.id) })
    },
  })
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteWebhook(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
      queryClient.removeQueries({ queryKey: webhookKeys.detail(id) })
    },
  })
}

export function useRotateWebhookSecret() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number
      data?: WebhookRotateSecretInput
    }) => apiClient.rotateWebhookSecret(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.lists() })
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(updated.id) })
    },
  })
}
