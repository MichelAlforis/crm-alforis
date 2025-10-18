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

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
  user?: UserInfo
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
  main_phone?: string
  website?: string
  company?: string
  industry?: string
  pipeline_stage: PipelineStage
  client_type?: ClientType
  notes?: string
  is_active: boolean
  country_code?: string | null
  language?: string | null
  created_at: string
  updated_at: string
}

export interface InvestorCreate {
  name: string
  email?: string
  main_phone?: string
  website?: string
  company?: string
  industry?: string
  pipeline_stage?: PipelineStage
  client_type?: ClientType
  notes?: string
  country_code?: string
  language?: string
}

export interface InvestorUpdate extends Partial<InvestorCreate> {}

// ============= PERSONNE PHYSIQUE =============

export type OrganizationType = "investor" | "fournisseur"

export interface Person {
  id: number
  first_name: string
  last_name: string
  personal_email?: string
  personal_phone?: string
  role?: string
  linkedin_url?: string
  notes?: string
  country_code?: string | null
  language?: string | null
  created_at: string
  updated_at: string
}

export interface PersonInput {
  first_name: string
  last_name: string
  personal_email?: string
  personal_phone?: string
  role?: string
  linkedin_url?: string
  notes?: string
  country_code?: string
  language?: string
}

export type PersonUpdateInput = Partial<PersonInput>

export interface PersonOrganizationLink {
  id: number
  person_id: number
  organization_type: OrganizationType
  organization_id: number
  job_title?: string
  work_email?: string
  work_phone?: string
  is_primary: boolean
  notes?: string
  organization_name?: string
  person?: Person
  created_at: string
  updated_at: string
}

export interface PersonOrganizationLinkInput {
  person_id: number
  organization_type: OrganizationType
  organization_id: number
  job_title?: string
  work_email?: string
  work_phone?: string
  is_primary?: boolean
  notes?: string
}

export type PersonOrganizationLinkUpdateInput = Partial<
  Omit<PersonOrganizationLinkInput, "person_id" | "organization_type" | "organization_id">
>

export interface PersonDetail extends Person {
  organizations: PersonOrganizationLink[]
}

// ============= FOURNISSEUR (FSS) =============

export interface Fournisseur {
  id: number
  name: string
  email?: string
  main_phone?: string
  website?: string
  company?: string
  activity?: string
  stage?: string
  type_fournisseur?: string
  notes?: string
  is_active: boolean
  country_code?: string | null
  language?: string | null
  created_at: string
  updated_at: string
}

export interface FournisseurCreate {
  name: string
  email?: string
  main_phone?: string
  website?: string
  company?: string
  activity?: string
  stage?: string
  type_fournisseur?: string
  notes?: string
  country_code?: string
  language?: string
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

export interface InvestorDetail {
  investor: Investor
  contacts: Contact[]
  interaction_count: number
  kpi_count: number
  people: PersonOrganizationLink[]
}

export interface FournisseurContact {
  id: number
  fournisseur_id: number
  name: string
  email?: string
  phone?: string
  title?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface FournisseurDetail {
  fournisseur: Fournisseur
  contacts: FournisseurContact[]
  interaction_count: number
  kpi_count: number
  people: PersonOrganizationLink[]
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

// ============= TASKS =============

export type TaskPriority = "critique" | "haute" | "moyenne" | "basse" | "non_prioritaire"
export type TaskStatus = "todo" | "doing" | "done" | "snoozed"
export type TaskCategory = "relance" | "rdv" | "email" | "due_diligence" | "admin" | "pitch" | "negociation" | "autre"

export interface Task {
  id: number
  created_at: string
  updated_at: string
  title: string
  description?: string
  due_date: string // Format: YYYY-MM-DD
  snoozed_until?: string
  completed_at?: string
  priority: TaskPriority
  status: TaskStatus
  category: TaskCategory

  // Relations optionnelles
  investor_id?: number
  fournisseur_id?: number
  person_id?: number

  // Métadonnées
  is_auto_created: boolean
  auto_creation_rule?: string

  // Propriétés calculées
  is_overdue: boolean
  is_today: boolean
  is_next_7_days: boolean
  days_until_due: number
  linked_entity_display?: string
}

export interface TaskWithRelations extends Task {
  investor_name?: string
  fournisseur_name?: string
  person_name?: string
}

export interface TaskInput {
  title: string
  description?: string
  due_date: string
  priority?: TaskPriority
  status?: TaskStatus
  category?: TaskCategory
  investor_id?: number
  fournisseur_id?: number
  organisation_id?: number
  person_id?: number
}

export interface TaskUpdateInput {
  title?: string
  description?: string
  due_date?: string
  priority?: TaskPriority
  status?: TaskStatus
  category?: TaskCategory
  investor_id?: number
  fournisseur_id?: number
  organisation_id?: number
  person_id?: number
}

export interface TaskStats {
  total: number
  overdue: number
  today: number
  next_7_days: number
  by_status: Record<TaskStatus, number>
  by_priority: Record<TaskPriority, number>
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  category?: TaskCategory
  investor_id?: number
  fournisseur_id?: number
  person_id?: number
  view?: "today" | "overdue" | "next7" | "all"
}

// ============= ORGANISATION (Nouveau modèle remplaçant Fournisseur) =============

export type OrganisationCategory =
  | "DISTRIBUTEUR"
  | "EMETTEUR"
  | "FOURNISSEUR_SERVICE"
  | "PARTENAIRE"
  | "AUTRE"
  | "Institution" // Legacy
  | "Wholesale" // Legacy
  | "SDG" // Legacy
  | "CGPI" // Legacy
  | "Autres" // Legacy

export interface Organisation {
  id: number
  name: string
  category: OrganisationCategory
  email?: string
  main_phone?: string
  website?: string
  address?: string
  country_code?: string
  language: string // Langue principale (FR, EN, ES, etc.)
  is_active: boolean
  created_at: string
  updated_at: string
  // Legacy fields
  aum?: number // Assets Under Management
  aum_date?: string // Format: YYYY-MM-DD
  strategies?: string[] // Liste de stratégies d'investissement
  domicile?: string
  notes?: string
}

export interface OrganisationCreate {
  name: string
  category: OrganisationCategory
  email?: string
  main_phone?: string
  website?: string
  address?: string
  country_code?: string
  language?: string // Défaut: FR
  is_active?: boolean
  // Legacy fields
  aum?: number
  aum_date?: string
  strategies?: string[]
  domicile?: string
  notes?: string
}

export interface OrganisationUpdate extends Partial<OrganisationCreate> {}

export interface OrganisationContact {
  id: number
  organisation_id: number
  name: string
  email?: string
  phone?: string
  title?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface OrganisationDetail extends Organisation {
  mandats: MandatDistribution[]
  contacts: OrganisationContact[]
}

// ============= MANDAT DE DISTRIBUTION =============

export type MandatStatus =
  | "BROUILLON"
  | "EN_NEGOCIATION"
  | "SIGNE"
  | "ACTIF"
  | "EXPIRE"
  | "RESILIE"
  | "proposé" // Legacy
  | "signé" // Legacy
  | "actif" // Legacy
  | "terminé" // Legacy

export interface MandatDistribution {
  id: number
  organisation_id: number
  numero_mandat?: string
  status: MandatStatus
  date_debut: string // Format: YYYY-MM-DD
  date_fin?: string // Format: YYYY-MM-DD
  created_at: string
  updated_at: string
  organisation: Organisation // Relation populated
  // Legacy fields
  date_signature?: string
  notes?: string
  is_actif?: boolean
}

export interface MandatDistributionCreate {
  organisation_id: number
  numero_mandat?: string
  status?: MandatStatus // Défaut: BROUILLON
  date_debut: string
  date_fin?: string
  // Legacy fields
  date_signature?: string
  notes?: string
}

export interface MandatDistributionUpdate {
  numero_mandat?: string
  status?: MandatStatus
  date_debut?: string
  date_fin?: string
  // Legacy fields
  date_signature?: string
  notes?: string
}

export interface MandatDistributionDetail extends MandatDistribution {
  organisation: Organisation
  produits: Produit[]
}

// ============= PRODUIT =============

export type ProduitType =
  | "OPCVM"
  | "ETF"
  | "SCPI"
  | "ASSURANCE_VIE"
  | "PER"
  | "AUTRE"
  | "FCP" // Legacy
  | "SICAV" // Legacy
  | "Fonds Alternatif" // Legacy
  | "Autre" // Legacy

export type ProduitStatus =
  | "ACTIF"
  | "INACTIF"
  | "ARCHIVE"
  | "actif" // Legacy
  | "inactif" // Legacy
  | "en_attente" // Legacy

export interface Produit {
  id: number
  name: string
  isin_code?: string // Code ISIN unique
  type: ProduitType
  status: ProduitStatus
  description?: string
  created_at: string
  updated_at: string
  // Legacy fields
  isin?: string
  notes?: string
}

export interface ProduitCreate {
  name: string
  isin_code?: string
  type: ProduitType
  status?: ProduitStatus // Défaut: ACTIF
  description?: string
  // Legacy fields
  isin?: string
  notes?: string
}

export interface ProduitUpdate extends Partial<ProduitCreate> {}

export interface ProduitDetail extends Produit {
  mandats: MandatDistribution[]
}

// ============= MANDAT-PRODUIT (Association) =============

export interface MandatProduit {
  id: number
  mandat_id: number
  produit_id: number
  date_ajout?: string // Format: YYYY-MM-DD
  notes?: string
  created_at: string
  updated_at: string
  mandat?: MandatDistribution
  produit?: Produit
}

export interface MandatProduitCreate {
  mandat_id: number
  produit_id: number
  date_ajout?: string
  notes?: string
}

// ============= NOUVELLE INTERACTION (avec produit) =============

export type InteractionPipeline = "fournisseur" | "vente"
export type InteractionStatus = "prospect_froid" | "prospect_chaud" | "refus" | "en_discussion" | "validé"

export interface InteractionNew {
  id: number
  organisation_id: number
  personne_id?: number
  produit_id?: number // Nécessite un mandat actif
  date: string // Format: YYYY-MM-DD
  type: InteractionType
  pipeline: InteractionPipeline
  status?: InteractionStatus // Pour pipeline fournisseur
  duration_minutes?: number
  subject?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface InteractionCreateNew {
  organisation_id: number
  personne_id?: number
  produit_id?: number
  date: string
  type: InteractionType
  pipeline: InteractionPipeline
  status?: InteractionStatus
  duration_minutes?: number
  subject?: string
  notes?: string
}

export interface InteractionUpdateNew extends Partial<InteractionCreateNew> {}

export interface InteractionDetailNew extends InteractionNew {
  organisation?: Organisation
  personne?: Person
  produit?: Produit
}

// ============= WEBHOOKS =============

export interface Webhook {
  id: number
  url: string
  events: string[]
  is_active: boolean
  description?: string | null
  secret: string
  created_at: string
  updated_at: string
}

export interface WebhookCreateInput {
  url: string
  events: string[]
  description?: string | null
  is_active?: boolean
  secret?: string
}

export type WebhookUpdateInput = Partial<WebhookCreateInput>

export interface WebhookRotateSecretInput {
  secret?: string
}

export interface WebhookEventOption {
  value: string
  label: string
}

// ============= NOTIFICATIONS =============

export type NotificationType =
  | 'task_due'
  | 'task_assigned'
  | 'task_completed'
  | 'interaction_new'
  | 'interaction_assigned'
  | 'mandat_signed'
  | 'mandat_expired'
  | 'mandat_expiring_soon'
  | 'organisation_created'
  | 'organisation_updated'
  | 'organisation_assigned'
  | 'pipeline_moved'
  | 'pipeline_stuck'
  | 'mention'
  | 'comment_reply'
  | 'system'
  | 'export_ready'
  | 'import_completed'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface NotificationItem {
  id: number
  user_id: number
  type: NotificationType
  priority: NotificationPriority
  title: string
  message?: string | null
  link?: string | null
  resource_type?: string | null
  resource_id?: number | null
  is_read: boolean
  read_at?: string | null
  is_archived: boolean
  archived_at?: string | null
  created_at?: string | null
  expires_at?: string | null
  metadata?: any
}

export interface NotificationPayload {
  type: 'notification'
  data: NotificationItem
}

export interface NotificationsSnapshot {
  notifications: NotificationItem[]
  unreadCount: number
  lastSyncedAt: string
}
