/**
 * React Query Hook pour l'Autofill Preview (V1.5 Smart Resolver)
 *
 * Détection de doublons et matching multi-critères avant création/enrichissement
 */

import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

// ============= TYPES =============

export type MatchAction = 'apply' | 'preview' | 'create_new'

export interface MatchCandidate {
  score: number
  action: MatchAction
  details: Record<string, number> // ex: { email_exact: 100, email_domain: 40 }
  candidate: Record<string, any> // Person ou Organisation
}

export interface AutofillPreviewRequest {
  entity_type: 'person' | 'organisation'
  draft: Record<string, any>
  limit?: number
}

export interface AutofillPreviewResponse {
  matches: MatchCandidate[]
  recommendation: MatchAction
  meta: {
    execution_time_ms: number
    candidates_searched: number
    criteria_used: string[]
    entity_type: string
  }
}

// ============= DEBUG =============

const DBG = process.env.NEXT_PUBLIC_DEBUG_AUTOFILL === '1'

// ============= API HELPER =============

async function fetchAutofillPreview(request: AutofillPreviewRequest): Promise<AutofillPreviewResponse> {
  const token = apiClient.getToken()
  const API_BASE = apiClient.getBaseUrl()

  if (DBG) logger.log('[autofill-preview] → Request', request)

  const startTime = performance.now()

  const res = await fetch(`${API_BASE}/integrations/ai/autofill/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(request),
  })

  const elapsed = Math.round(performance.now() - startTime)

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Une erreur est survenue' }))
    if (DBG) logger.error('[autofill-preview] ✗ Error', { status: res.status, error, elapsed })
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  const response = await res.json()
  if (DBG) {
    logger.log('[autofill-preview] ← Response', {
      matches: response.matches?.length || 0,
      recommendation: response.recommendation,
      top_score: response.matches?.[0]?.score || 0,
      elapsed: `${elapsed}ms`,
    })
  }

  return response
}

// ============= HOOK =============

/**
 * Hook pour le Smart Resolver (détection doublons + matching)
 *
 * Usage:
 * ```tsx
 * const { preview, isLoading } = useAutofillPreview()
 *
 * const handleFillMe = async () => {
 *   const result = await preview.mutateAsync({
 *     entity_type: 'person',
 *     draft: formData,
 *     limit: 5
 *   })
 *
 *   if (result.recommendation === 'apply') {
 *     // Auto-merge avec le meilleur match
 *     const bestMatch = result.matches[0]
 *     mergeCandidate(bestMatch.candidate)
 *   } else if (result.recommendation === 'preview') {
 *     // Ouvrir modal de validation
 *     setShowMatchModal(true)
 *     setMatchCandidates(result.matches)
 *   } else {
 *     // create_new - procéder à la création
 *     createNew()
 *   }
 * }
 * ```
 */
export const useAutofillPreview = () => {
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: fetchAutofillPreview,
    onError: (error: Error) => {
      logger.error('[Autofill Preview] Error:', error)
      showToast({
        type: 'error',
        title: 'Erreur de détection de doublons',
        message: error.message,
      })
    },
  })

  return {
    preview: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  }
}
