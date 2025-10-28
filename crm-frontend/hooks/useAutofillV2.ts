/**
 * React Query Hook pour l'Autofill Prédictif V2
 *
 * Pipeline multi-sources pour l'autofill de formulaires:
 * - Rules (10ms): TLD→Pays, phone E.164
 * - DB Patterns (20ms): Patterns email existants
 * - Outlook (50ms): Signatures emails
 * - LLM Fallback (300ms): Si incertitude et budget disponible
 */

import { useMutation } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api'
import { logger } from '@/lib/logger'

// ============= TYPES =============

export type BudgetMode = 'normal' | 'low' | 'emergency'
export type AutofillSourceType = 'rules' | 'db_pattern' | 'outlook' | 'linkedin' | 'google' | 'llm'
export type TaskPriority = 'high' | 'medium' | 'low'

export interface AutofillSuggestion {
  field: string
  value: any
  confidence: number // 0-1
  source: AutofillSourceType
  evidence?: string
  auto_apply: boolean
}

export interface AutofillTask {
  title: string
  description?: string
  priority: TaskPriority
  due_date?: string
  metadata?: Record<string, any>
}

export interface AutofillV2Request {
  entity_type: 'person' | 'organisation'
  draft: Record<string, any>
  context?: {
    budget_mode?: BudgetMode
    outlook_enabled?: boolean
    [key: string]: any
  }
}

export interface AutofillV2Response {
  autofill: Record<string, AutofillSuggestion>
  tasks: AutofillTask[]
  meta: {
    execution_time_ms: number
    sources_used: AutofillSourceType[]
    llm_used: boolean
    [key: string]: any
  }
}

// ============= DEBUG =============

const DBG = process.env.NEXT_PUBLIC_DEBUG_AUTOFILL === '1'

// ============= API HELPER =============

async function fetchAutofillV2(request: AutofillV2Request): Promise<AutofillV2Response> {
  const token = apiClient.getToken()
  const API_BASE = apiClient.getBaseUrl() // Déjà = http://localhost:8000/api/v1

  if (DBG) logger.log('[autofill] → Request', request)

  const startTime = performance.now()

  const res = await fetch(`${API_BASE}/integrations/ai/autofill/v2`, {
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
    if (DBG) logger.error('[autofill] ✗ Error', { status: res.status, error, elapsed })
    throw new Error(error.detail || `HTTP ${res.status}`)
  }

  const response = await res.json()
  if (DBG) {
    logger.log('[autofill] ← Response', {
      suggestions: Object.keys(response.autofill || {}),
      tasks: response.tasks?.length || 0,
      elapsed: `${elapsed}ms`,
      sources: response.meta?.sources_used,
      llm_used: response.meta?.llm_used,
    })
  }

  return response
}

// ============= HOOK =============

/**
 * Hook pour l'autofill prédictif V2
 *
 * Usage:
 * ```tsx
 * const { autofill, isLoading } = useAutofillV2()
 *
 * const handleFieldBlur = async (field: string) => {
 *   const suggestions = await autofill.mutateAsync({
 *     entity_type: 'person',
 *     draft: formData,
 *     context: { budget_mode: 'normal' }
 *   })
 *
 *   // Appliquer suggestions auto_apply
 *   Object.entries(suggestions.autofill).forEach(([field, suggestion]) => {
 *     if (suggestion.auto_apply) {
 *       setFormData(prev => ({ ...prev, [field]: suggestion.value }))
 *     }
 *   })
 * }
 * ```
 */
export const useAutofillV2 = () => {
  const { showToast } = useToast()

  const mutation = useMutation({
    mutationFn: fetchAutofillV2,
    onError: (error: Error) => {
      logger.error('[Autofill V2] Error:', error)
      showToast({
        type: 'error',
        title: 'Erreur autofill',
        message: error.message,
      })
    },
  })

  return {
    autofill: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  }
}

// ============= HELPER HOOKS =============

/**
 * Hook pour vérifier si Outlook est connecté (pour afficher badge)
 */
export const useIsOutlookConnected = () => {
  // TODO: Implémenter appel API pour vérifier statut Outlook
  // Pour l'instant, retourne false
  return false
}

/**
 * Hook pour le mode budget (contexte global)
 */
export const useBudgetMode = () => {
  // TODO: Stocker dans contexte ou localStorage
  // Pour l'instant, retourne 'normal'
  return 'normal' as BudgetMode
}
