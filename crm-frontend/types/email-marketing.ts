/**
 * Types TypeScript pour Email Marketing & Lead Scoring
 *
 * Alignés avec le backend FastAPI:
 * - EmailSend: tracking emails (Resend, Sendgrid, etc.)
 * - LeadScore: score d'engagement calculé automatiquement
 */

import { z } from 'zod'

// ============================================
// Enums & Types
// ============================================

/**
 * Type d'événement email
 */
export type EmailEventType = 'sent' | 'opened' | 'clicked' | 'bounced'

/**
 * Statut d'un email
 */
export type EmailStatus = 'sent' | 'opened' | 'clicked' | 'bounced'

/**
 * Labels UI pour les statuts d'email
 */
export const EMAIL_STATUS_LABELS: Record<EmailStatus, string> = {
  sent: 'Envoyé',
  opened: 'Ouvert',
  clicked: 'Cliqué',
  bounced: 'Rebondi',
}

/**
 * Couleurs Tailwind par statut d'email
 */
export const EMAIL_STATUS_COLORS: Record<EmailStatus, string> = {
  sent: 'bg-gray-100 text-gray-700',
  opened: 'bg-blue-100 text-blue-700',
  clicked: 'bg-green-100 text-green-700',
  bounced: 'bg-red-100 text-red-700',
}

// ============================================
// Zod Schemas (Validation)
// ============================================

/**
 * Schéma Zod pour payload webhook email
 */
export const EmailIngestPayloadSchema = z.object({
  provider: z.string().min(1).max(50),
  external_id: z.string().min(1).max(255),
  event: z.enum(['sent', 'opened', 'clicked', 'bounced']),
  occurred_at: z.string().datetime(),
  person_id: z.number().int().positive().optional().nullable(),
  organisation_id: z.number().int().positive().optional().nullable(),
  subject: z.string().max(500).optional().nullable(),
}).refine(
  (data) => data.person_id !== undefined || data.organisation_id !== undefined,
  {
    message: 'Au moins person_id ou organisation_id est requis',
    path: ['person_id'],
  }
)

/**
 * Schéma Zod pour EmailSend (réponse API)
 */
export const EmailSendSchema = z.object({
  id: z.number().int().positive(),
  organisation_id: z.number().int().positive().optional().nullable(),
  person_id: z.number().int().positive().optional().nullable(),
  provider: z.string(),
  external_id: z.string(),
  subject: z.string().optional().nullable(),
  status: z.enum(['sent', 'opened', 'clicked', 'bounced']),
  sent_at: z.string().datetime().optional().nullable(),
  open_count: z.number().int().nonnegative(),
  click_count: z.number().int().nonnegative(),
  last_open_at: z.string().datetime().optional().nullable(),
  last_click_at: z.string().datetime().optional().nullable(),
  interaction_id: z.number().int().positive().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional().nullable(),
})

/**
 * Schéma Zod pour LeadScore (réponse API)
 */
export const LeadScoreSchema = z.object({
  person_id: z.number().int().positive(),
  score: z.number().int().nonnegative(),
  last_event_at: z.string().datetime().optional().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime().optional().nullable(),
  // Optional: person data (via join)
  person_name: z.string().optional().nullable(),
  person_email: z.string().optional().nullable(),
})

/**
 * Schéma Zod pour HotLeadsResponse
 */
export const HotLeadsResponseSchema = z.object({
  items: z.array(LeadScoreSchema),
  threshold: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
})

// ============================================
// TypeScript Interfaces
// ============================================

/**
 * Payload webhook email
 */
export interface EmailIngestPayload {
  provider: string
  external_id: string
  event: EmailEventType
  occurred_at: string  // ISO datetime
  person_id?: number | null
  organisation_id?: number | null
  subject?: string | null
}

/**
 * EmailSend (réponse API)
 */
export interface EmailSend {
  id: number
  organisation_id?: number | null
  person_id?: number | null
  provider: string
  external_id: string
  subject?: string | null
  status: EmailStatus
  sent_at?: string | null  // ISO datetime
  open_count: number
  click_count: number
  last_open_at?: string | null  // ISO datetime
  last_click_at?: string | null  // ISO datetime
  interaction_id?: number | null
  created_at: string  // ISO datetime
  updated_at?: string | null  // ISO datetime
}

/**
 * LeadScore (réponse API)
 */
export interface LeadScore {
  person_id: number
  score: number
  last_event_at?: string | null  // ISO datetime
  created_at: string  // ISO datetime
  updated_at?: string | null  // ISO datetime
  // Optional: person data (via join)
  person_name?: string | null
  person_email?: string | null
}

/**
 * Réponse endpoint /marketing/leads-hot
 */
export interface HotLeadsResponse {
  items: LeadScore[]
  threshold: number
  total: number
}
