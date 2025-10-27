/**
 * Types TypeScript pour Interactions V2
 *
 * Alignés avec le backend FastAPI:
 * - IDs = Integer (cohérence projet)
 * - V2: champs inbox (status, assignee_id, next_action_at, notified_at)
 * - Attachments = liste d'URLs { name, url }
 */

import { z } from 'zod'

// ============================================
// Enums & Types
// ============================================

/**
 * Type d'interaction (v1.1: ajout 'visio')
 */
export type InteractionType = 'call' | 'email' | 'meeting' | 'visio' | 'note' | 'other'

/**
 * Statut d'une interaction (V2 - workflow inbox)
 */
export type InteractionStatus = 'todo' | 'in_progress' | 'done'

/**
 * Labels UI pour les types d'interaction
 */
export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Appel',
  email: 'Email',
  meeting: 'Réunion',
  visio: 'Visioconférence',
  note: 'Note',
  other: 'Autre',
}

/**
 * Icônes par type (emojis pour simplicité v1)
 */
export const INTERACTION_TYPE_ICONS: Record<InteractionType, string> = {
  call: '☎️',
  email: '📧',
  meeting: '📅',
  visio: '🎥',
  note: '📝',
  other: '📄',
}

/**
 * Labels UI pour les statuts d'interaction (V2)
 */
export const INTERACTION_STATUS_LABELS: Record<InteractionStatus, string> = {
  todo: 'À faire',
  in_progress: 'En cours',
  done: 'Terminé',
}

/**
 * Couleurs Tailwind par statut (V2)
 */
export const INTERACTION_STATUS_COLORS: Record<InteractionStatus, string> = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
}

// ============================================
// Zod Schemas (Validation)
// ============================================

/**
 * Schéma Zod pour une pièce jointe
 */
export const AttachmentSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
})

/**
 * Schéma Zod pour la création d'une interaction
 */
const ParticipantInSchema = z.object({
  person_id: z.number().int().positive(),
  role: z.string().max(80).optional().nullable(),
  present: z.boolean().optional().default(true),
})

const ExternalParticipantSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().optional().nullable(),
  company: z.string().max(255).optional().nullable(),
})

export const InteractionCreateSchema = z.object({
  org_id: z.number().int().positive().optional(),
  person_id: z.number().int().positive().optional(),
  type: z.enum(['call', 'email', 'meeting', 'visio', 'note', 'other']),
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional().default([]),

  // v1.1: Participants
  participants: z.array(ParticipantInSchema).optional(),
  external_participants: z.array(ExternalParticipantSchema).optional(),

  // V2: Workflow inbox
  status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo'),
  assignee_id: z.number().int().positive().optional().nullable(),
  next_action_at: z.string().datetime().optional().nullable(),
}).refine(
  (data) => data.org_id !== undefined || data.person_id !== undefined,
  {
    message: 'Au moins org_id ou person_id est requis',
    path: ['org_id'],
  }
)

/**
 * Schéma Zod pour la mise à jour d'une interaction
 */
export const InteractionUpdateSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'visio', 'note', 'other']).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),

  // v1.1: Participants
  participants: z.array(ParticipantInSchema).optional(),
  external_participants: z.array(ExternalParticipantSchema).optional(),

  // V2: Workflow inbox
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assignee_id: z.number().int().positive().optional().nullable(),
  next_action_at: z.string().datetime().optional().nullable(),
})

/**
 * Schéma Zod pour mise à jour du statut uniquement (V2)
 */
export const InteractionStatusUpdateSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'done']),
})

/**
 * Schéma Zod pour mise à jour de l'assignee uniquement (V2)
 */
export const InteractionAssigneeUpdateSchema = z.object({
  assignee_id: z.number().int().positive().optional().nullable(),
})

/**
 * Schéma Zod pour mise à jour de la prochaine action (V2)
 */
export const InteractionNextActionUpdateSchema = z.object({
  next_action_at: z.string().datetime().optional().nullable(),
})

/**
 * Schéma Zod pour une interaction complète (réponse API)
 */
export const InteractionSchema = z.object({
  id: z.number().int().positive(),
  org_id: z.number().int().positive().optional().nullable(),
  person_id: z.number().int().positive().optional().nullable(),
  type: z.enum(['call', 'email', 'meeting', 'visio', 'note', 'other']),
  title: z.string(),
  body: z.string().optional().nullable(),
  created_by: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional().nullable(),
  attachments: z.array(AttachmentSchema),

  // v1.1: Participants
  participants: z.array(ParticipantInSchema).optional().default([]),
  external_participants: z.array(ExternalParticipantSchema).optional().default([]),

  // V2: Workflow inbox
  status: z.enum(['todo', 'in_progress', 'done']),
  assignee_id: z.number().int().positive().optional().nullable(),
  next_action_at: z.string().datetime().optional().nullable(),
  notified_at: z.string().datetime().optional().nullable(),
  linked_task_id: z.number().int().positive().optional().nullable(),
  linked_event_id: z.number().int().positive().optional().nullable(),
})

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Pièce jointe
 */
export interface Attachment {
  name: string
  url: string
}

/**
 * Participant interne (personne du CRM) - v1.1
 */
export interface ParticipantIn {
  person_id: number
  role?: string | null
  present?: boolean
}

/**
 * Participant externe (non dans le CRM) - v1.1
 */
export interface ExternalParticipant {
  name: string
  email?: string | null
  company?: string | null
}

/**
 * Interaction (réponse API) - V2 avec workflow inbox
 */
export interface Interaction {
  id: number
  org_id?: number | null
  person_id?: number | null
  type: InteractionType
  title: string
  body?: string | null
  created_by: number
  created_at: string  // ISO datetime
  updated_at?: string | null  // ISO datetime
  attachments: Attachment[]

  // v1.1: Participants multiples
  participants?: ParticipantIn[]
  external_participants?: ExternalParticipant[]

  // V2: Workflow inbox
  status: InteractionStatus
  assignee_id?: number | null
  next_action_at?: string | null  // ISO datetime
  notified_at?: string | null  // ISO datetime
  linked_task_id?: number | null
  linked_event_id?: number | null
}

/**
 * Données pour créer une interaction - V2 avec workflow inbox
 */
export interface InteractionCreateInput {
  org_id?: number
  person_id?: number
  type: InteractionType
  title: string
  body?: string
  attachments?: Attachment[]

  // v1.1: Participants multiples
  participants?: ParticipantIn[]
  external_participants?: ExternalParticipant[]

  // V2: Workflow inbox
  status?: InteractionStatus
  assignee_id?: number | null
  next_action_at?: string | null  // ISO datetime
}

/**
 * Données pour modifier une interaction - V2 avec workflow inbox
 */
export interface InteractionUpdateInput {
  type?: InteractionType
  title?: string
  body?: string
  attachments?: Attachment[]

  // v1.1: Participants multiples
  participants?: ParticipantIn[]
  external_participants?: ExternalParticipant[]

  // V2: Workflow inbox
  status?: InteractionStatus
  assignee_id?: number | null
  next_action_at?: string | null  // ISO datetime
}

/**
 * Données pour mise à jour du statut uniquement (V2)
 */
export interface InteractionStatusUpdate {
  status: InteractionStatus
}

/**
 * Données pour mise à jour de l'assignee uniquement (V2)
 */
export interface InteractionAssigneeUpdate {
  assignee_id?: number | null
}

/**
 * Données pour mise à jour de la prochaine action (V2)
 */
export interface InteractionNextActionUpdate {
  next_action_at?: string | null  // ISO datetime
}

/**
 * Réponse paginée d'interactions
 */
export interface InteractionListResponse {
  items: Interaction[]
  total: number
  limit: number
  cursor?: string | null
}

// ============================================
// Type Guards
// ============================================

/**
 * Vérifie si une interaction a une organisation
 */
export function hasOrganisation(interaction: Interaction): interaction is Interaction & { org_id: number } {
  return interaction.org_id !== null && interaction.org_id !== undefined
}

/**
 * Vérifie si une interaction a une personne
 */
export function hasPerson(interaction: Interaction): interaction is Interaction & { person_id: number } {
  return interaction.person_id !== null && interaction.person_id !== undefined
}
