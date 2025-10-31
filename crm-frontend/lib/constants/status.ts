/**
 * Status & State Constants
 *
 * Centralized status definitions for consistent state management
 * across different entities (campaigns, activities, tasks, etc.)
 */

/**
 * Email Campaign Status
 */
export const CAMPAIGN_STATUS = {
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  COMPLETED: 'completed',
  PAUSED: 'paused',
  CANCELLED: 'cancelled',
} as const;

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS];

/**
 * Campaign Status Colors (Tailwind classes)
 */
export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  [CAMPAIGN_STATUS.DRAFT]: 'bg-gray-500',
  [CAMPAIGN_STATUS.SCHEDULED]: 'bg-blue-500',
  [CAMPAIGN_STATUS.SENDING]: 'bg-yellow-500',
  [CAMPAIGN_STATUS.COMPLETED]: 'bg-green-500',
  [CAMPAIGN_STATUS.PAUSED]: 'bg-orange-500',
  [CAMPAIGN_STATUS.CANCELLED]: 'bg-red-500',
};

/**
 * Campaign Status Labels (French)
 */
export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  [CAMPAIGN_STATUS.DRAFT]: 'Brouillon',
  [CAMPAIGN_STATUS.SCHEDULED]: 'Planifiée',
  [CAMPAIGN_STATUS.SENDING]: 'En cours',
  [CAMPAIGN_STATUS.COMPLETED]: 'Terminée',
  [CAMPAIGN_STATUS.PAUSED]: 'En pause',
  [CAMPAIGN_STATUS.CANCELLED]: 'Annulée',
};

/**
 * Activity Types
 */
export const ACTIVITY_TYPE = {
  NOTE: 'note',
  CALL: 'appel',
  EMAIL: 'email',
  MEETING: 'reunion',
  TASK_COMPLETED: 'tache_completee',
  STAGE_CHANGE: 'changement_stage',
  ORGANISATION_CREATED: 'organisation_created',
  ORGANISATION_UPDATED: 'organisation_updated',
  MANDAT_CREATED: 'mandat_created',
  MANDAT_SIGNED: 'mandat_signed',
  OTHER: 'autre',
} as const;

export type ActivityType = typeof ACTIVITY_TYPE[keyof typeof ACTIVITY_TYPE];

/**
 * Activity Type Labels (French)
 */
export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  [ACTIVITY_TYPE.NOTE]: 'Note',
  [ACTIVITY_TYPE.CALL]: 'Appel',
  [ACTIVITY_TYPE.EMAIL]: 'Email',
  [ACTIVITY_TYPE.MEETING]: 'Réunion',
  [ACTIVITY_TYPE.TASK_COMPLETED]: 'Tâche complétée',
  [ACTIVITY_TYPE.STAGE_CHANGE]: 'Changement de statut',
  [ACTIVITY_TYPE.ORGANISATION_CREATED]: 'Organisation créée',
  [ACTIVITY_TYPE.ORGANISATION_UPDATED]: 'Organisation modifiée',
  [ACTIVITY_TYPE.MANDAT_CREATED]: 'Mandat créé',
  [ACTIVITY_TYPE.MANDAT_SIGNED]: 'Mandat signé',
  [ACTIVITY_TYPE.OTHER]: 'Autre',
};

/**
 * Activity Type Icons (Lucide icon names)
 */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  [ACTIVITY_TYPE.NOTE]: 'FileText',
  [ACTIVITY_TYPE.CALL]: 'Phone',
  [ACTIVITY_TYPE.EMAIL]: 'Mail',
  [ACTIVITY_TYPE.MEETING]: 'Users',
  [ACTIVITY_TYPE.TASK_COMPLETED]: 'CheckCircle',
  [ACTIVITY_TYPE.STAGE_CHANGE]: 'ArrowRight',
  [ACTIVITY_TYPE.ORGANISATION_CREATED]: 'Building',
  [ACTIVITY_TYPE.ORGANISATION_UPDATED]: 'Edit',
  [ACTIVITY_TYPE.MANDAT_CREATED]: 'FileSignature',
  [ACTIVITY_TYPE.MANDAT_SIGNED]: 'CheckSquare',
  [ACTIVITY_TYPE.OTHER]: 'Info',
};

/**
 * Task Status
 */
export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  BLOCKED: 'blocked',
} as const;

export type TaskStatus = typeof TASK_STATUS[keyof typeof TASK_STATUS];

/**
 * Task Priority
 */
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type TaskPriority = typeof TASK_PRIORITY[keyof typeof TASK_PRIORITY];

/**
 * Task Priority Colors
 */
export const TASK_PRIORITY_COLORS: Record<TaskPriority, string> = {
  [TASK_PRIORITY.LOW]: 'text-gray-500',
  [TASK_PRIORITY.MEDIUM]: 'text-blue-500',
  [TASK_PRIORITY.HIGH]: 'text-orange-500',
  [TASK_PRIORITY.URGENT]: 'text-red-500',
};

/**
 * AI Suggestion Status
 */
export const AI_SUGGESTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  AUTO_APPLIED: 'auto_applied',
} as const;

export type AISuggestionStatus = typeof AI_SUGGESTION_STATUS[keyof typeof AI_SUGGESTION_STATUS];

/**
 * Data Quality Score Levels
 */
export const QUALITY_LEVEL = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
} as const;

export type QualityLevel = typeof QUALITY_LEVEL[keyof typeof QUALITY_LEVEL];

/**
 * Quality Level Colors
 */
export const QUALITY_LEVEL_COLORS: Record<QualityLevel, string> = {
  [QUALITY_LEVEL.EXCELLENT]: 'text-green-600',
  [QUALITY_LEVEL.GOOD]: 'text-blue-600',
  [QUALITY_LEVEL.FAIR]: 'text-yellow-600',
  [QUALITY_LEVEL.POOR]: 'text-red-600',
};

/**
 * Organisation Stage
 */
export const ORGANISATION_STAGE = {
  LEAD: 'lead',
  PROSPECT: 'prospect',
  CLIENT: 'client',
  INACTIVE: 'inactive',
} as const;

export type OrganisationStage = typeof ORGANISATION_STAGE[keyof typeof ORGANISATION_STAGE];

/**
 * Mandat Status
 */
export const MANDAT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type MandatStatus = typeof MANDAT_STATUS[keyof typeof MANDAT_STATUS];

/**
 * Generic Active/Inactive Status
 */
export const GENERIC_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived',
} as const;

export type GenericStatus = typeof GENERIC_STATUS[keyof typeof GENERIC_STATUS];

/**
 * Email Sending Status
 */
export const EMAIL_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  OPENED: 'opened',
  CLICKED: 'clicked',
  BOUNCED: 'bounced',
  FAILED: 'failed',
  UNSUBSCRIBED: 'unsubscribed',
} as const;

export type EmailStatus = typeof EMAIL_STATUS[keyof typeof EMAIL_STATUS];

/**
 * Import Status
 */
export const IMPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
} as const;

export type ImportStatus = typeof IMPORT_STATUS[keyof typeof IMPORT_STATUS];

/**
 * Workflow Execution Status
 */
export const WORKFLOW_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type WorkflowStatus = typeof WORKFLOW_STATUS[keyof typeof WORKFLOW_STATUS];
