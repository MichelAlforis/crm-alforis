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

// ============= KPI =============

export interface KPI {
  id: number | null
  organisation_id: number
  year: number
  month: number
  rdv_count: number
  pitchs: number
  due_diligences: number
  closings: number
  revenue: number
  commission_rate: number | null
  notes?: string
  created_at: string | null
  updated_at: string | null
  auto_generated?: boolean
  source?: string | null
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
  auto_generated?: boolean
  source?: string
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

// ============= EMAIL AUTOMATION =============

export type EmailTemplateCategory =
  | 'welcome'
  | 'follow_up'
  | 'newsletter'
  | 'case_study'
  | 'event'
  | 'onboarding'
  | 'custom'

export type EmailProvider = 'sendgrid' | 'mailgun'
export type EmailCampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
export type EmailScheduleType = 'manual' | 'immediate' | 'scheduled' | 'recurring'
export type EmailVariant = 'A' | 'B'
export type EmailSendStatus =
  | 'queued'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'failed'
  | 'bounced'
  | 'unsubscribed'
  | 'complained'
export type EmailEventType =
  | 'processed'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'dropped'
  | 'spamreport'
  | 'unsubscribe'
  | 'group_unsubscribe'
  | 'group_resubscribe'
  | 'deferred'

export interface EmailTemplate {
  id: number
  name: string
  code?: string | null
  subject: string
  preheader?: string | null
  description?: string | null
  category: EmailTemplateCategory
  html_content: string
  design_json?: Record<string, any> | null
  is_active: boolean
  is_default: boolean
  tags?: string[] | null
  last_used_at?: string | null
  created_at: string
  updated_at: string
}

export interface EmailTemplateInput {
  name: string
  subject: string
  preheader?: string
  description?: string
  category?: EmailTemplateCategory
  html_content: string
  design_json?: Record<string, any> | null
  code?: string | null
  tags?: string[]
  is_active?: boolean
  is_default?: boolean
}

export interface EmailTemplateUpdateInput extends Partial<EmailTemplateInput> {}

export interface EmailCampaignStep {
  id: number
  campaign_id: number
  template_id: number
  subject?: string | null
  preheader?: string | null
  order_index: number
  delay_hours: number
  wait_for_event?: EmailEventType | null
  variant?: EmailVariant | null
  send_window_hours?: number | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface EmailCampaignStepInput {
  template_id?: number
  subject?: string
  preheader?: string
  order_index?: number
  delay_hours?: number
  wait_for_event?: EmailEventType
  variant?: EmailVariant
  send_window_hours?: number
  metadata?: Record<string, any>
}

export interface EmailAudienceSnapshot {
  total_contacts: number
  total_organisations: number
  filters_applied?: Record<string, any> | null
}

export interface EmailCampaign {
  id: number
  name: string
  description?: string | null
  provider: EmailProvider
  status: EmailCampaignStatus
  schedule_type: EmailScheduleType
  from_name: string
  from_email: string
  reply_to?: string | null
  default_template_id?: number | null
  subject?: string | null
  preheader?: string | null
  audience_filters?: Record<string, any> | null
  audience_snapshot?: EmailAudienceSnapshot | null
  scheduled_at?: string | null
  timezone?: string | null
  track_opens: boolean
  track_clicks: boolean
  is_ab_test: boolean
  ab_test_split_percentage: number
  rate_limit_per_minute?: number | null
  total_recipients?: number | null
  total_sent: number
  last_sent_at?: string | null
  created_at: string
  updated_at: string
  steps: EmailCampaignStep[]
}

export interface EmailCampaignInput {
  name: string
  description?: string
  provider?: EmailProvider
  from_name: string
  from_email: string
  reply_to?: string
  default_template_id?: number
  subject?: string
  preheader?: string
  audience_filters?: Record<string, any>
  track_opens?: boolean
  track_clicks?: boolean
  is_ab_test?: boolean
  ab_test_split_percentage?: number
  rate_limit_per_minute?: number
  schedule_type?: EmailScheduleType
  steps: EmailCampaignStepInput[]
}

export interface EmailCampaignUpdateInput extends Partial<Omit<EmailCampaignInput, 'steps'>> {
  status?: EmailCampaignStatus
  steps?: EmailCampaignStepInput[]
}

export interface EmailRecipient {
  email: string
  first_name?: string
  last_name?: string
  full_name?: string
  person_id?: number
  organisation_id?: number
  organisation_name?: string
  custom_data?: Record<string, any>
}

export interface EmailCampaignScheduleInput {
  scheduled_at?: string
  timezone?: string
  recipients: EmailRecipient[]
  audience_snapshot?: EmailAudienceSnapshot
  rate_limit_per_minute?: number
  schedule_type?: EmailScheduleType
}

export interface EmailCampaignFilters {
  skip?: number
  limit?: number
  status?: EmailCampaignStatus
  provider?: EmailProvider
}

export interface EmailSend {
  id: number
  campaign_id: number
  step_id?: number | null
  template_id?: number | null
  recipient_email: string
  recipient_name?: string | null
  recipient_person_id?: number | null
  organisation_id?: number | null
  variant?: EmailVariant | null
  status: EmailSendStatus
  scheduled_at?: string | null
  sent_at?: string | null
  provider_message_id?: string | null
  error_message?: string | null
  created_at: string
  updated_at: string
}

export interface EmailSendFilters {
  skip?: number
  limit?: number
  status?: EmailSendStatus
}

export interface EmailCampaignStatsVariant {
  variant: EmailVariant
  total_sent: number
  opens: number
  clicks: number
  bounces: number
  unsubscribes: number
  open_rate: number
  click_rate: number
}

export interface EmailCampaignStats {
  campaign_id: number
  total_recipients: number
  total_sent: number
  delivered: number
  opens: number
  unique_opens: number
  clicks: number
  unique_clicks: number
  bounces: number
  unsubscribes: number
  complaints: number
  open_rate: number
  click_rate: number
  bounce_rate: number
  unsubscribe_rate: number
  last_event_at?: string | null
  per_variant: EmailCampaignStatsVariant[]
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

export type OrganisationActivityType =
  | 'interaction_created'
  | 'interaction_updated'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'note_added'
  | 'document_added'
  | 'mandat_created'
  | 'mandat_status_changed'
  | 'mandat_updated'
  | 'organisation_created'
  | 'organisation_updated'
  | 'email_sent'
  | 'system_event'

export interface OrganisationActivity {
  id: number
  organisation_id: number
  occurred_at: string
  type: OrganisationActivityType
  title: string
  preview?: string | null
  actor_id?: string | null
  actor_name?: string | null
  actor_avatar_url?: string | null
  resource_type?: string | null
  resource_id?: number | null
  metadata?: Record<string, any> | null
  created_at: string
  updated_at: string
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

export type InteractionType = "appel" | "email" | "reunion" | "webinaire" | "autre"
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
