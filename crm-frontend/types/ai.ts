/**
 * Types TypeScript pour l'Agent IA
 * Correspond aux schemas Pydantic du backend
 */

// ============= ENUMS =============

export enum AISuggestionType {
  DUPLICATE_DETECTION = 'duplicate_detection',
  DATA_ENRICHMENT = 'data_enrichment',
  QUALITY_CHECK = 'quality_check',
  FIELD_CORRECTION = 'field_correction',
}

export enum AISuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
  FAILED = 'failed',
}

export enum AITaskType {
  DETECT_DUPLICATES = 'detect_duplicates',
  ENRICH_DATA = 'enrich_data',
  CHECK_QUALITY = 'check_quality',
  CUSTOM = 'custom',
}

export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  OLLAMA = 'ollama',
}

// ============= INTERFACES =============

export interface AISuggestion {
  id: number
  type: AISuggestionType
  status: AISuggestionStatus
  entity_type: string
  entity_id: number
  title: string
  description: string
  confidence_score: number
  suggestion_data: any
  created_at: string
  updated_at: string
  applied_at?: string
  applied_by_id?: number
  reviewed_by_id?: number
  review_notes?: string
}

export interface AIExecution {
  id: number
  task_type: AITaskType
  status: string
  started_at: string
  completed_at?: string
  total_items_processed: number
  successful_items: number
  failed_items: number
  estimated_cost_usd: number
  actual_cost_usd?: number
  configuration_snapshot: any
  error_details?: any
  logs: string[]
}

export interface AIConfiguration {
  id: number
  provider: AIProvider
  model_name: string
  api_key_set: boolean
  temperature: number
  max_tokens: number
  duplicate_threshold: number
  enrichment_threshold: number
  quality_threshold: number
  auto_apply_enabled: boolean
  auto_apply_threshold: number
  daily_budget_usd: number
  cache_enabled: boolean
  cache_ttl_hours: number
  created_at: string
  updated_at: string
}

export interface AIStatistics {
  total_suggestions: number
  pending_suggestions: number
  approved_suggestions: number
  rejected_suggestions: number
  applied_suggestions: number
  failed_suggestions: number
  total_executions: number
  successful_executions: number
  failed_executions: number
  total_cost_usd: number
  cache_hits: number
  cache_total_requests: number
  cache_hit_rate: number
  average_confidence: number
  suggestions_by_type: Record<string, number>
  suggestions_by_status: Record<string, number>
}

export interface SuggestionPreview {
  suggestion_id: number
  entity_type: string
  entity_id: number
  current_data: Record<string, any>
  proposed_changes: Record<string, any>
  changes_summary: Array<{
    field: string
    from: any
    to: any
    type: 'add' | 'update' | 'delete'
  }>
  impact_assessment?: string
}

export interface BatchOperationResponse {
  total_requested: number
  successful: number
  failed: number
  skipped: number
  results: Array<{
    suggestion_id: number
    status: 'success' | 'failed' | 'skipped'
    error?: string
  }>
}

// ============= REQUEST PAYLOADS =============

export interface DetectDuplicatesRequest {
  limit?: number
  entity_types?: string[]
}

export interface EnrichOrganisationsRequest {
  limit?: number
  organisation_ids?: number[]
}

export interface CheckQualityRequest {
  limit?: number
  entity_types?: string[]
}

export interface ApproveSuggestionRequest {
  notes?: string
}

export interface RejectSuggestionRequest {
  reason?: string
}

export interface BatchApproveSuggestionsRequest {
  suggestion_ids: number[]
  notes?: string
}

export interface BatchRejectSuggestionsRequest {
  suggestion_ids: number[]
  reason?: string
}

export interface UpdateAIConfigRequest {
  provider?: AIProvider
  model_name?: string
  api_key?: string
  temperature?: number
  max_tokens?: number
  duplicate_threshold?: number
  enrichment_threshold?: number
  quality_threshold?: number
  auto_apply_enabled?: boolean
  auto_apply_threshold?: number
  daily_budget_usd?: number
  cache_enabled?: boolean
  cache_ttl_hours?: number
}

// ============= FILTERS =============

export interface SuggestionsFilters {
  status?: AISuggestionStatus
  type?: AISuggestionType
  entity_type?: string
  entity_id?: number
  min_confidence?: number
  max_confidence?: number
  limit?: number
  offset?: number
}

export interface ExecutionsFilters {
  task_type?: AITaskType
  status?: string
  limit?: number
  offset?: number
}
