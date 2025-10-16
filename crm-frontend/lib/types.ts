// lib/types.ts - UPDATED
// ============= TYPES & INTERFACES =============

// ============= AUTH =============

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export interface UserInfo {
  email: string
  is_admin: boolean
}

// ============= INVESTOR =============

export type PipelineStage =
  | "prospect_froid"
  | "prospect_tiede"
  | "prospect_chaud"
  | "en_negociation"
  | "client"
  | "inactif"

export type ClientType = "cgpi" | "wholesale" | "institutionnel" | "autre"

export interface Investor {
  id: number
  name: string
  email?: string
  phone?: string
  website?: string
  company?: string
  industry?: string
  pipeline_stage: PipelineStage
  client_type?: ClientType
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface InvestorCreate {
  name: string
  email?: string
  phone?: string
  website?: string
  company?: string
  industry?: string
  pipeline_stage?: PipelineStage
  client_type?: ClientType
  notes?: string
}

export interface InvestorUpdate extends Partial<InvestorCreate> {}

// ============= FOURNISSEUR (FSS) =============

export interface Fournisseur {
  id: number
  name: string
  email?: string
  phone?: string
  website?: string
  industry?: string
  contact_person?: string
  notes?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface FournisseurCreate {
  name: string
  email?: string
  phone?: string
  website?: string
  industry?: string
  contact_person?: string
  notes?: string
}

export interface FournisseurUpdate extends Partial<FournisseurCreate> {}

// ============= CONTACT =============

export interface Contact {
  id: number
  investor_id: number
  name: string
  email?: string
  phone?: string
  title?: string
  notes?: string
  created_at: string
  updated_at: string
}

// ============= INTERACTION =============

export type InteractionType = "appel" | "email" | "reunion" | "webinaire" | "autre"

export interface Interaction {
  id: number
  investor_id: number
  fournisseurs: number[] // ✅ Liste des IDs de fournisseurs
  type: InteractionType
  date: string
  duration_minutes?: number
  subject?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InteractionCreate {
  fournisseurs: number[] // ✅ Required: au moins 1 fournisseur
  type: InteractionType
  date: string
  duration_minutes?: number
  subject?: string
  notes?: string
}

export interface InteractionUpdate extends Partial<InteractionCreate> {}

// ============= KPI =============

export interface KPI {
  id: number
  fournisseur_id: number // ✅ KPI par FSS
  year: number
  month: number
  rdv_count: number
  pitchs: number
  due_diligences: number
  closings: number
  revenue: number
  commission_rate: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface KPICreate {
  year: number
  month: number
  rdv_count?: number
  pitchs?: number
  due_diligences?: number
  closings?: number
  revenue?: number
  commission_rate?: number
  notes?: string
}

export interface KPIUpdate extends Partial<Omit<KPICreate, "year" | "month">> {}

// ============= NEWSLETTER (Future use - Phase 3) =============

export type NewsletterType = "fournisseur" | "investisseur"

export type ClientCategory = "cgpi" | "wholesale" | "institutionnel"

export interface Newsletter {
  id: number
  name: string
  type: NewsletterType // "fournisseur" ou "investisseur"
  category?: ClientCategory // Pour type "investisseur": CGPI, Wholesale, etc.
  subject: string
  content: string
  recipient_count: number
  is_draft: boolean
  sent_at?: string
  created_at: string
  updated_at: string
}

export interface NewsletterCreate {
  name: string
  type: NewsletterType
  category?: ClientCategory
  subject: string
  content: string
}

export interface NewsletterRecipient {
  id: number
  newsletter_id: number
  fournisseur_id?: number
  investor_id?: number
  email: string
  sent_at?: string
}

// ============= API RESPONSES =============

export interface PaginatedResponse<T> {
  total: number
  skip: number
  limit: number
  items: T[]
}

export interface ApiError {
  detail: string
  status_code: number
}

// ============= UI STATES =============

export interface LoadingState {
  isLoading: boolean
  error?: string
  data?: any
}

export interface FormState {
  isSubmitting: boolean
  error?: string
  success?: boolean
}