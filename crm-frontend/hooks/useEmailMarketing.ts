/**
 * useEmailMarketing - Hooks React Query pour API Email Marketing
 *
 * Endpoints couverts:
 * - GET /marketing/leads-hot
 */

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api'
import type { HotLeadsResponse } from '@/types/email-marketing'

// ============================================
// Query Keys
// ============================================

export const emailMarketingKeys = {
  all: ['email-marketing'] as const,
  hotLeads: (limit: number, threshold: number) =>
    [...emailMarketingKeys.all, 'hot-leads', limit, threshold] as const,
}

// ============================================
// Queries
// ============================================

/**
 * Hook pour récupérer les leads chauds (hot leads)
 */
export function useHotLeads(options?: { limit?: number; threshold?: number }) {
  const { limit = 10, threshold = 15 } = options || {}

  return useQuery({
    queryKey: emailMarketingKeys.hotLeads(limit, threshold),
    queryFn: async () => {
      return apiClient.request<HotLeadsResponse>('/marketing/leads-hot', {
        params: { limit, threshold },
      })
    },
  })
}
