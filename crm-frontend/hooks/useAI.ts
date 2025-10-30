/**
 * React Query Hooks pour l'Agent IA
 * Gère toutes les interactions avec l'API AI (/api/v1/ai/*)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from './useToast'
import { apiClient } from '@/lib/api'
import type {
  AISuggestion,
  AIExecution,
  AIConfiguration,
  AIStatistics,
  SuggestionPreview,
  BatchOperationResponse,
  SuggestionsFilters,
  ExecutionsFilters,
  DetectDuplicatesRequest,
  EnrichOrganisationsRequest,
  CheckQualityRequest,
  ApproveSuggestionRequest,
  RejectSuggestionRequest,
  BatchApproveSuggestionsRequest,
  BatchRejectSuggestionsRequest,
  UpdateAIConfigRequest,
} from '@/types/ai'

// ============= HELPER FUNCTIONS =============

// Helper pour normaliser les erreurs API (Pydantic validation errors)
function normalizeErrorDetail(detail: any): string {
  if (typeof detail === 'string') return detail

  // Si c'est un tableau d'erreurs de validation Pydantic
  if (Array.isArray(detail)) {
    return detail
      .map((err) => {
        if (typeof err === 'object' && err.msg) {
          const location = err.loc ? ` (${err.loc.join(' > ')})` : ''
          return `${err.msg}${location}`
        }
        return String(err)
      })
      .join(', ')
  }

  if (typeof detail === 'object' && detail !== null) {
    if (detail.msg) return String(detail.msg)
    if (detail.message) return String(detail.message)
    return JSON.stringify(detail)
  }

  return String(detail)
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // ✅ CORRECTIF: Utiliser apiClient directement pour éviter les problèmes de port
  const token = apiClient.getToken()
  const API_BASE = apiClient.getBaseUrl().replace('/api/v1', '')  // Obtenir l'URL de base sans /api/v1

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Une erreur est survenue' }))
    const errorMessage = normalizeErrorDetail(error.detail || `HTTP ${res.status}`)
    throw new Error(errorMessage)
  }

  return res.json()
}

// ============= QUERIES =============

/**
 * Liste des suggestions avec filtres
 */
export const useAISuggestions = (filters?: SuggestionsFilters) => {
  return useQuery({
    queryKey: ['ai', 'suggestions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.type) params.append('type', filters.type)
      if (filters?.entity_type) params.append('entity_type', filters.entity_type)
      if (filters?.entity_id) params.append('entity_id', filters.entity_id.toString())
      if (filters?.min_confidence) params.append('min_confidence', filters.min_confidence.toString())
      if (filters?.max_confidence) params.append('max_confidence', filters.max_confidence.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      return fetchAPI<AISuggestion[]>(`/api/v1/ai/suggestions?${params}`)
    },
  })
}

/**
 * Détails d'une suggestion
 */
export const useAISuggestion = (id: number | null) => {
  return useQuery({
    queryKey: ['ai', 'suggestions', id],
    queryFn: () => fetchAPI<AISuggestion>(`/api/v1/ai/suggestions/${id}`),
    enabled: !!id,
  })
}

/**
 * Suggestions pour une entité spécifique (organisation, personne...)
 */
export const useEntitySuggestions = (
  entityType: string,
  entityId: number,
  filters?: { status?: string }
) => {
  return useQuery({
    queryKey: ['ai', 'suggestions', entityType, entityId, filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)

      return fetchAPI<AISuggestion[]>(
        `/api/v1/ai/suggestions/${entityType}/${entityId}?${params}`
      )
    },
    enabled: !!entityType && !!entityId,
  })
}

/**
 * Preview d'une suggestion (voir changements avant application)
 */
export const usePreviewSuggestion = (suggestionId: number | null) => {
  return useQuery({
    queryKey: ['ai', 'suggestions', suggestionId, 'preview'],
    queryFn: () => fetchAPI<SuggestionPreview>(`/api/v1/ai/suggestions/${suggestionId}/preview`),
    enabled: !!suggestionId,
  })
}

/**
 * Statistiques globales de l'Agent IA
 */
export const useAIStatistics = () => {
  return useQuery({
    queryKey: ['ai', 'statistics'],
    queryFn: () => fetchAPI<AIStatistics>('/api/v1/ai/statistics'),
    refetchInterval: 30000, // Refresh toutes les 30s
  })
}

/**
 * Historique des exécutions
 */
export const useAIExecutions = (filters?: ExecutionsFilters) => {
  return useQuery({
    queryKey: ['ai', 'executions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.task_type) params.append('task_type', filters.task_type)
      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      return fetchAPI<AIExecution[]>(`/api/v1/ai/executions?${params}`)
    },
  })
}

/**
 * Détails d'une exécution
 */
export const useAIExecution = (id: number | null) => {
  return useQuery({
    queryKey: ['ai', 'executions', id],
    queryFn: () => fetchAPI<AIExecution>(`/api/v1/ai/executions/${id}`),
    enabled: !!id,
  })
}

/**
 * Configuration actuelle de l'Agent IA
 */
export const useAIConfig = () => {
  return useQuery({
    queryKey: ['ai', 'config'],
    queryFn: () => fetchAPI<AIConfiguration>('/api/v1/ai/config'),
  })
}

// ============= MUTATIONS - TÂCHES IA =============

/**
 * Lancer la détection de doublons
 */
export const useDetectDuplicates = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: DetectDuplicatesRequest) =>
      fetchAPI<AIExecution>('/api/v1/ai/duplicates/detect', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'executions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Détection lancée',
        description: `Tâche d'exécution #${data.id} créée`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Lancer l'enrichissement des organisations
 */
export const useEnrichOrganisations = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: EnrichOrganisationsRequest) =>
      fetchAPI<AIExecution>('/api/v1/ai/enrich/organisations', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'executions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Enrichissement lancé',
        description: `Tâche d'exécution #${data.id} créée`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Lancer le contrôle qualité
 */
export const useCheckQuality = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: CheckQualityRequest) =>
      fetchAPI<AIExecution>('/api/v1/ai/quality/check', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'executions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Contrôle qualité lancé',
        description: `Tâche d'exécution #${data.id} créée`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ============= MUTATIONS - SUGGESTIONS (INDIVIDUELLES) =============

/**
 * Approuver une suggestion
 */
export const useApproveSuggestion = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, notes }: { id: number } & ApproveSuggestionRequest) =>
      fetchAPI<AISuggestion>(`/api/v1/ai/suggestions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Suggestion approuvée',
        description: data.title,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Rejeter une suggestion
 */
export const useRejectSuggestion = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, reason }: { id: number } & RejectSuggestionRequest) =>
      fetchAPI<AISuggestion>(`/api/v1/ai/suggestions/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Suggestion rejetée',
        description: data.title,
        variant: 'default',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ============= MUTATIONS - BATCH OPERATIONS =============

/**
 * Approuver plusieurs suggestions en masse (10-20x plus rapide)
 */
export const useBatchApproveSuggestions = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: BatchApproveSuggestionsRequest) =>
      fetchAPI<BatchOperationResponse>('/api/v1/ai/suggestions/batch/approve', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Approbation en masse réussie',
        description: `${data.successful}/${data.total_requested} suggestions approuvées`,
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

/**
 * Rejeter plusieurs suggestions en masse
 */
export const useBatchRejectSuggestions = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: BatchRejectSuggestionsRequest) =>
      fetchAPI<BatchOperationResponse>('/api/v1/ai/suggestions/batch/reject', {
        method: 'POST',
        body: JSON.stringify(params),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['ai', 'statistics'] })
      toast({
        title: 'Rejet en masse réussi',
        description: `${data.successful}/${data.total_requested} suggestions rejetées`,
        variant: 'default',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ============= MUTATIONS - CONFIGURATION =============

/**
 * Mettre à jour la configuration de l'Agent IA
 */
export const useUpdateAIConfig = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (params: UpdateAIConfigRequest) =>
      fetchAPI<AIConfiguration>('/api/v1/ai/config', {
        method: 'PATCH',
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai', 'config'] })
      toast({
        title: 'Configuration mise à jour',
        description: 'Les nouveaux paramètres ont été sauvegardés',
        variant: 'success',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ============= SIGNATURE PARSING =============

/**
 * Parse email signature with AI
 */
export const useParseSignature = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { email_body: string; team_id?: number }) => {
      const response = await apiClient.post('/ai/parse-signature', data)
      return response.data
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: '✅ Signature parsée',
          description: `${data.confidence ? (data.confidence * 100).toFixed(0) + '% confiance' : 'Données extraites'} - ${data.model_used || 'IA'}`,
        })
        // Rafraîchir les suggestions
        queryClient.invalidateQueries({ queryKey: ['ai', 'suggestions'] })
      } else {
        toast({
          title: 'Échec du parsing',
          description: data.error || 'Erreur inconnue',
          variant: 'destructive',
        })
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// ============= CUSTOM HOOKS =============

/**
 * Hook pour obtenir le compteur de suggestions en attente (pour badges)
 */
export const usePendingSuggestionsCount = () => {
  const { data: stats } = useAIStatistics()
  return stats?.pending_suggestions || 0
}

/**
 * Hook pour vérifier si l'Agent IA est configuré
 */
export const useIsAIConfigured = () => {
  const { data: config } = useAIConfig()
  return config?.api_key_set || false
}
