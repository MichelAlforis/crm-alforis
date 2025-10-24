/**
 * Types TypeScript pour Interactions v1
 *
 * Alignés avec le backend FastAPI:
 * - IDs = Integer (cohérence projet)
 * - Pas de champs inbox (status, assignee, nextActionAt) en v1
 * - Attachments = liste d'URLs { name, url }
 */

import { z } from 'zod'

// ============================================
// Enums & Types
// ============================================

/**
 * Type d'interaction
 */
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'other'

/**
 * Labels UI pour les types d'interaction
 */
export const INTERACTION_TYPE_LABELS: Record<InteractionType, string> = {
  call: 'Appel',
  email: 'Email',
  meeting: 'Réunion',
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
  note: '📝',
  other: '📄',
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
export const InteractionCreateSchema = z.object({
  org_id: z.number().int().positive().optional(),
  person_id: z.number().int().positive().optional(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'other']),
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional().default([]),
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
  type: z.enum(['call', 'email', 'meeting', 'note', 'other']).optional(),
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  attachments: z.array(AttachmentSchema).optional(),
})

/**
 * Schéma Zod pour une interaction complète (réponse API)
 */
export const InteractionSchema = z.object({
  id: z.number().int().positive(),
  org_id: z.number().int().positive().optional().nullable(),
  person_id: z.number().int().positive().optional().nullable(),
  type: z.enum(['call', 'email', 'meeting', 'note', 'other']),
  title: z.string(),
  body: z.string().optional().nullable(),
  created_by: z.number().int().positive(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional().nullable(),
  attachments: z.array(AttachmentSchema),
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
 * Interaction (réponse API)
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
}

/**
 * Données pour créer une interaction
 */
export interface InteractionCreateInput {
  org_id?: number
  person_id?: number
  type: InteractionType
  title: string
  body?: string
  attachments?: Attachment[]
}

/**
 * Données pour modifier une interaction
 */
export interface InteractionUpdateInput {
  type?: InteractionType
  title?: string
  body?: string
  attachments?: Attachment[]
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
