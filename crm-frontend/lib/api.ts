// lib/api.ts
// ============= API CLIENT CENTRALISÉ =============
// Singleton pattern - Toutes les requêtes HTTP passent ici
// Avantages: Gestion tokens, erreurs, retry logic centralisée

import {
  LoginRequest,
  TokenResponse,
  Person,
  PersonInput,
  PersonUpdateInput,
  PersonDetail,
  PersonOrganizationLink,
  PersonOrganizationLinkInput,
  PersonOrganizationLinkUpdateInput,
  OrganizationType,
  KPI,
  KPICreate,
  KPIUpdate,
  PaginatedResponse,
  Newsletter,
  NewsletterCreate,
  NewsletterType,
  UserInfo,
  Organisation,
  OrganisationCreate,
  OrganisationUpdate,
  OrganisationDetail,
  OrganisationActivity,
  MandatDistribution,
  MandatDistributionCreate,
  MandatDistributionUpdate,
  MandatDistributionDetail,
  Produit,
  ProduitCreate,
  ProduitUpdate,
  ProduitDetail,
  MandatProduit,
  MandatProduitCreate,
  Task,
  TaskInput,
  TaskUpdateInput,
  TaskWithRelations,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  TaskStats,
  Webhook,
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookRotateSecretInput,
  WebhookEventOption,
  EmailTemplate,
  EmailTemplateInput,
  EmailTemplateUpdateInput,
  EmailCampaign,
  EmailCampaignInput,
  EmailCampaignUpdateInput,
  EmailCampaignFilters,
  EmailCampaignScheduleInput,
  EmailCampaignStats,
  EmailSend,
  EmailSendFilters,
} from './types'

import type { ApiError } from './types'

// En production, utiliser un chemin relatif pour éviter les problèmes CORS et mixed content
// Le reverse proxy Nginx fera le routage vers l'API backend
const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? '/api/v1'  // Production: chemin relatif (Nginx proxy)
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1')  // Dev: localhost

// ============= TYPES INTERNES =============

interface RequestConfig extends RequestInit {
  params?: Record<string, any>
}

// ============= API CLIENT CLASS =============

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    // Force toujours le /api/v1 à la fin de la baseUrl
    if (!baseUrl.endsWith('/api/v1')) {
      baseUrl = baseUrl.replace(/\/?$/, '/api/v1')
    }
    this.baseUrl = baseUrl
    this.initToken()
  }

  /**
   * Initialise le token depuis localStorage et cookies (côté client)
   */
  private initToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token') || this.getCookie('auth_token')
    }
  }

  /**
   * Définit le token (après login) - stocke dans localStorage ET cookies
   */
  public setToken(token: string): void {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
      // Stocker aussi dans les cookies pour le middleware
      this.setCookie('auth_token', token, 1) // 1 jour
    }
  }

  /**
   * Récupère le token
   */
  public getToken(): string | null {
    if (this.token) {
      return this.token
    }

    if (typeof window !== 'undefined') {
      const fromStorage =
        localStorage.getItem('auth_token') || this.getCookie('auth_token')
      if (fromStorage) {
        this.token = fromStorage
        return fromStorage
      }
    }

    return null
  }

  /**
   * Supprime le token (logout)
   */
  public clearToken(): void {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
      this.deleteCookie('auth_token')
    }
  }

  /**
   * Utilitaire pour définir un cookie
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
  }

  /**
   * Utilitaire pour récupérer un cookie
   */
  private getCookie(name: string): string | null {
    const nameEQ = name + '='
    const ca = document.cookie.split(';')
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i]
      while (c.charAt(0) === ' ') c = c.substring(1, c.length)
      if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
    }
    return null
  }

  /**
   * Utilitaire pour supprimer un cookie
   */
  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
  }

  /**
   * Construit les headers avec authentification
   */
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    return headers
  }

  /**
   * Construit une URL absolue vers l'API en ajoutant les paramètres de requête
   */
  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    let url = this.baseUrl.replace(/\/$/, '') + (endpoint.startsWith('/') ? endpoint : '/' + endpoint)
    if (params) {
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((item) => {
              if (item !== undefined && item !== null) {
                query.append(key, String(item))
              }
            })
          } else {
            query.append(key, String(value))
          }
        }
      })
      const queryString = query.toString()
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString
      }
    }
    return url
  }

  /**
   * Effectue une requête HTTP générique
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...requestConfig } = config
    const url = this.buildUrl(endpoint, params)

    try {
      const response = await fetch(url, {
        ...requestConfig,
        headers: {
          ...this.getHeaders(),
          ...requestConfig.headers,
        },
      })

      // Gérer les erreurs HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Token expiré ou invalide
          this.clearToken()
        }

        const error = await response.json().catch(() => ({}))
        throw {
          status_code: response.status,
          detail: error.detail || 'Une erreur est survenue',
        } as ApiError
      }

      return await response.json() as T
    } catch (error: any) {
      // Réformater les erreurs
      if (error && typeof error === 'object' && 'status_code' in error && 'detail' in error) {
        throw error
      }
      throw {
        status_code: 500,
        detail: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  }

  /**
   * Retourne l'URL absolue vers un endpoint API (utile pour téléchargements)
   */
  public resolveUrl(endpoint: string, params?: Record<string, any>): string {
    return this.buildUrl(endpoint, params)
  }

  /**
   * Retourne l'URL de base actuelle (incluant /api/v1)
   */
  public getBaseUrl(): string {
    return this.baseUrl
  }

  // ============= AUTH ENDPOINTS =============

  async login(data: LoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCurrentUser(): Promise<UserInfo | null> {
    try {
      return await this.request<UserInfo>('/auth/me')
    } catch (error: any) {
      if (error?.status_code === 401) {
        return null
      }
      throw error
    }
  }

  async logout(): Promise<void> {
    this.clearToken()
  }

  // ============= INVESTOR ENDPOINTS (LEGACY - DEPRECATED) =============
  // ❌ LEGACY: Utiliser getOrganisations({ type: 'client' }) à la place
  // Migration: /investors → /organisations?type=client
  // 🔄 MIGRATED: Ces méthodes utilisent maintenant les endpoints /organisations en interne

  async getInvestors(skip = 0, limit = 100, searchText = ''): Promise<PaginatedResponse<Investor>> {
    // Migration: Utilise maintenant /organisations
    // ⚠️ Note: Les catégories sont différentes entre legacy et nouveau système
    let result: PaginatedResponse<Organisation>

    if (searchText && searchText.trim()) {
      result = await this.searchOrganisations(searchText, skip, limit)
    } else {
      result = await this.getOrganisations({
        skip,
        limit,
      })
    }

    // Map Organisation → Investor pour compatibilité
    return {
      items: result.items.map(org => ({
        id: org.id,
        name: org.name,
        email: org.email,
        main_phone: org.main_phone,
        website: org.website,
        pipeline_stage: 'prospect_froid' as const, // Valeur par défaut pour compatibilité
        is_active: org.is_active,
        country_code: org.country_code,
        language: org.language,
        created_at: org.created_at,
        updated_at: org.updated_at,
      })) as unknown as Investor[],
      total: result.total,
      skip: result.skip,
      limit: result.limit,
    }
  }

  async getInvestor(id: number): Promise<InvestorDetail> {
    // Migration: Utilise maintenant /organisations/{id}
    const orgDetail = await this.getOrganisation(id)

    // Map OrganisationDetail → InvestorDetail pour compatibilité
    const investor: Investor = {
      id: orgDetail.id,
      name: orgDetail.name,
      email: orgDetail.email,
      main_phone: orgDetail.main_phone,
      website: orgDetail.website,
      pipeline_stage: 'prospect_froid', // Valeur par défaut pour compatibilité
      is_active: orgDetail.is_active,
      country_code: orgDetail.country_code,
      language: orgDetail.language,
      created_at: orgDetail.created_at,
      updated_at: orgDetail.updated_at,
    }

    return {
      investor,
      contacts: [], // Les contacts sont dans people maintenant
      interaction_count: 0, // Legacy field
      kpi_count: 0, // KPI deprecated
      people: [], // People dans contacts maintenant
    }
  }

  async createInvestor(data: InvestorCreate): Promise<Investor> {
    // Migration: Utilise maintenant /organisations
    const orgData: OrganisationCreate = {
      name: data.name,
      category: 'DISTRIBUTEUR', // Catégorie par défaut pour les investisseurs
      email: data.email,
      main_phone: data.main_phone,
      language: data.language || 'fr',
      is_active: true, // Toujours actif par défaut
    }

    const org = await this.createOrganisation(orgData)

    // Map Organisation → Investor
    return {
      id: org.id,
      name: org.name,
      email: org.email,
      main_phone: org.main_phone,
      website: org.website,
      pipeline_stage: 'prospect_froid', // Valeur par défaut pour compatibilité
      is_active: org.is_active,
      country_code: org.country_code,
      language: org.language,
      created_at: org.created_at,
      updated_at: org.updated_at,
    }
  }

  async updateInvestor(id: number, data: InvestorUpdate): Promise<Investor> {
    // Migration: Utilise maintenant /organisations/{id}
    const orgData: OrganisationUpdate = {
      name: data.name,
      email: data.email,
      main_phone: data.main_phone,
      language: data.language,
      // is_active n'est pas dans InvestorUpdate, donc on ne le passe pas
    }

    const org = await this.updateOrganisation(id, orgData)

    // Map Organisation → Investor
    return {
      id: org.id,
      name: org.name,
      email: org.email,
      main_phone: org.main_phone,
      website: org.website,
      pipeline_stage: 'prospect_froid', // Valeur par défaut pour compatibilité
      is_active: org.is_active,
      country_code: org.country_code,
      language: org.language,
      created_at: org.created_at,
      updated_at: org.updated_at,
    }
  }

  async deleteInvestor(id: number): Promise<void> {
    // Migration: Utilise maintenant /organisations/{id}
    await this.deleteOrganisation(id)
  }

  // ============= INTERACTION ENDPOINTS (LEGACY - DEPRECATED) =============
  // ❌ LEGACY: Utiliser getOrganisationActivity() à la place
  // Migration: /interactions → /organisations/{id}/activity
  // 🔄 MIGRATED: Ces méthodes utilisent maintenant les endpoints /organisations/{id}/activity en interne

  async getInteractions(investorId: number, skip = 0, limit = 50): Promise<PaginatedResponse<Interaction>> {
    // Migration: Utilise maintenant /organisations/{id}/activity
    const activities = await this.getOrganisationActivity(investorId, { limit })

    // Map OrganisationActivity → Interaction pour compatibilité
    return {
      items: activities.items.map(activity => ({
        id: activity.id,
        investor_id: activity.organisation_id || investorId,
        type: activity.type,
        notes: activity.preview || '',
        date: activity.occurred_at,
        created_at: activity.occurred_at,
        updated_at: activity.occurred_at,
      })) as unknown as Interaction[],
      total: activities.total,
      skip: skip,
      limit: limit,
    }
  }

  async createInteraction(_investorId: number, _data: InteractionCreate): Promise<Interaction> {
    // ⚠️ DEPRECATED: Les interactions sont maintenant créées automatiquement via les activités
    // Cette méthode retourne une erreur car il n'y a pas d'équivalent direct
    throw new Error(
      'createInteraction est déprécié. Les activités sont créées automatiquement par le système.'
    )
  }

  async updateInteraction(_interactionId: number, _data: InteractionUpdate): Promise<Interaction> {
    // ⚠️ DEPRECATED: Les interactions sont en lecture seule dans le nouveau système
    throw new Error(
      'updateInteraction est déprécié. Les activités sont en lecture seule.'
    )
  }

  async deleteInteraction(_interactionId: number): Promise<void> {
    // ⚠️ DEPRECATED: Les interactions sont en lecture seule dans le nouveau système
    throw new Error(
      'deleteInteraction est déprécié. Les activités ne peuvent pas être supprimées.'
    )
  }

  // ============= KPI ENDPOINTS (LEGACY - DEPRECATED) =============
  // ❌ LEGACY: Utiliser /dashboards/stats à la place
  // Migration: /kpis → /dashboards/*
  // 🔄 MIGRATED: Ces méthodes utilisent maintenant les endpoints /dashboards/stats

  async getKPIs(investorId: number, year?: number, month?: number): Promise<KPI[]> {
    // Migration: Utilise maintenant /dashboards/stats/organisation/{id}/kpis
    return this.request<KPI[]>(`/dashboards/stats/organisation/${investorId}/kpis`, {
      params: { year, month },
    })
  }

  async createKPI(investorId: number, data: KPICreate): Promise<KPI> {
    // Migration: Utilise maintenant /dashboards/stats/organisation/{id}/kpis (POST)
    return this.request<KPI>(`/dashboards/stats/organisation/${investorId}/kpis`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateKPI(kpiId: number, data: KPIUpdate): Promise<KPI> {
    // Migration: Utilise maintenant /dashboards/stats/kpis/{kpi_id} (PUT)
    return this.request<KPI>(`/dashboards/stats/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKPI(kpiId: number): Promise<void> {
    // Migration: Utilise maintenant /dashboards/stats/kpis/{kpi_id} (DELETE)
    await this.request<void>(`/dashboards/stats/kpis/${kpiId}`, {
      method: 'DELETE',
    })
  }

  // ============= HEALTH CHECK =============

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`)
      return response.ok
    } catch {
      return false
    }
  }

  // ============= SEARCH ENDPOINTS =============

  async searchAutocomplete(
    query: string,
    entityType: 'organisations' | 'people' | 'mandats' | 'tasks' = 'organisations',
    limit = 10
  ): Promise<Array<{ id: number; name: string; type: string; [key: string]: any }>> {
    return this.request('/search/autocomplete', {
      params: {
        q: query,
        type: entityType,
        limit,
      },
    })
  }

  // ============= FOURNISSEUR ENDPOINTS (LEGACY - DEPRECATED) =============
  // ❌ LEGACY: Utiliser getOrganisations({ type: 'fournisseur' }) à la place
  // Migration: /fournisseurs → /organisations?type=fournisseur
  // 🔄 MIGRATED: Ces méthodes utilisent maintenant les endpoints /organisations en interne

  async getFournisseurs(skip = 0, limit = 100, searchText = ''): Promise<PaginatedResponse<Fournisseur>> {
    // Migration: Utilise maintenant /organisations
    // ⚠️ Note: Les catégories sont différentes entre legacy et nouveau système
    let result: PaginatedResponse<Organisation>

    if (searchText && searchText.trim()) {
      result = await this.searchOrganisations(searchText, skip, limit)
    } else {
      result = await this.getOrganisations({
        skip,
        limit,
      })
    }

    // Map Organisation → Fournisseur pour compatibilité
    return {
      items: result.items.map(org => ({
        id: org.id,
        name: org.name,
        email: org.email || '',
        main_phone: org.main_phone || '',
        company: org.name,
        activity: org.category,
        language: org.language || 'fr',
        is_active: org.is_active,
        created_at: org.created_at,
        updated_at: org.updated_at,
      })) as Fournisseur[],
      total: result.total,
      skip: result.skip,
      limit: result.limit,
    }
  }

  async getFournisseur(id: number): Promise<FournisseurDetail> {
    // Migration: Utilise maintenant /organisations/{id}
    const orgDetail = await this.getOrganisation(id)

    // Map OrganisationDetail → FournisseurDetail pour compatibilité
    const fournisseur: Fournisseur = {
      id: orgDetail.id,
      name: orgDetail.name,
      email: orgDetail.email || '',
      main_phone: orgDetail.main_phone || '',
      company: orgDetail.name,
      activity: orgDetail.category,
      language: orgDetail.language || 'fr',
      is_active: orgDetail.is_active,
      created_at: orgDetail.created_at,
      updated_at: orgDetail.updated_at,
    }

    return {
      fournisseur,
      contacts: [] as any, // Les types OrganisationContact et FournisseurContact ne correspondent pas exactement
      interaction_count: 0, // Pas de activity_count dans OrganisationDetail
      kpi_count: 0, // KPI deprecated
      people: [], // People séparé maintenant
    }
  }

  async createFournisseur(data: FournisseurCreate): Promise<Fournisseur> {
    // Migration: Utilise maintenant /organisations
    const orgData: OrganisationCreate = {
      name: data.name,
      category: 'FOURNISSEUR_SERVICE', // Catégorie pour les fournisseurs
      email: data.email,
      main_phone: data.main_phone,
      language: data.language || 'fr',
      is_active: true, // Toujours actif par défaut
    }

    const org = await this.createOrganisation(orgData)

    // Map Organisation → Fournisseur
    return {
      id: org.id,
      name: org.name,
      email: org.email || '',
      main_phone: org.main_phone || '',
      company: org.name,
      activity: org.category,
      language: org.language || 'fr',
      is_active: org.is_active,
      created_at: org.created_at,
      updated_at: org.updated_at,
    }
  }

  async updateFournisseur(id: number, data: FournisseurUpdate): Promise<Fournisseur> {
    // Migration: Utilise maintenant /organisations/{id}
    const orgData: OrganisationUpdate = {
      name: data.name,
      email: data.email,
      main_phone: data.main_phone,
      language: data.language,
      // is_active n'est pas dans FournisseurUpdate
    }

    const org = await this.updateOrganisation(id, orgData)

    // Map Organisation → Fournisseur
    return {
      id: org.id,
      name: org.name,
      email: org.email || '',
      main_phone: org.main_phone || '',
      company: org.name,
      activity: org.category,
      language: org.language || 'fr',
      is_active: org.is_active,
      created_at: org.created_at,
      updated_at: org.updated_at,
    }
  }

  async deleteFournisseur(id: number): Promise<void> {
    // Migration: Utilise maintenant /organisations/{id}
    await this.deleteOrganisation(id)
  }

  // ============= KPI ENDPOINTS (UPDATED - PAR FOURNISSEUR) (LEGACY - DEPRECATED) =============
  // 🔄 MIGRATED: Ces méthodes utilisent maintenant les endpoints /dashboards/stats

  async getKPIsByFournisseur(fournisseurId: number, year?: number, month?: number): Promise<KPI[]> {
    // Migration: Utilise maintenant /dashboards/stats/organisation/{id}/kpis
    return this.request<KPI[]>(`/dashboards/stats/organisation/${fournisseurId}/kpis`, {
      params: { year, month },
    })
  }

  async createKPIForFournisseur(fournisseurId: number, data: KPICreate): Promise<KPI> {
    // Migration: Utilise la même méthode que createKPI
    return this.createKPI(fournisseurId, data)
  }

  async updateKPIForFournisseur(_fournisseurId: number, kpiId: number, data: KPIUpdate): Promise<KPI> {
    // Migration: Utilise la même méthode que updateKPI
    return this.updateKPI(kpiId, data)
  }

  async deleteKPIForFournisseur(_fournisseurId: number, kpiId: number): Promise<void> {
    // Migration: Utilise la même méthode que deleteKPI
    await this.deleteKPI(kpiId)
  }

  // ============= PEOPLE ENDPOINTS =============

  async getPeople(
    skip = 0,
    limit = 50,
    options?: { q?: string; organizationType?: OrganizationType; organizationId?: number },
  ): Promise<PaginatedResponse<Person>> {
    const params: Record<string, any> = { skip, limit }
    if (options?.q) params.q = options.q
    if (options?.organizationType) params.organization_type = options.organizationType
    if (options?.organizationId) params.organization_id = options.organizationId

    return this.request<PaginatedResponse<Person>>('/people', { params })
  }

  async getPerson(id: number): Promise<PersonDetail> {
    const data = await this.request<PersonDetail>(`/people/${id}`)
    return data
  }

  async createPerson(data: PersonInput): Promise<Person> {
    return this.request<Person>('/people', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePerson(id: number, data: PersonUpdateInput): Promise<Person> {
    return this.request<Person>(`/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePerson(id: number): Promise<void> {
    await this.request<void>(`/people/${id}`, {
      method: 'DELETE',
    })
  }

  async createPersonOrganizationLink(
    data: PersonOrganizationLinkInput,
  ): Promise<PersonOrganizationLink> {
    const response = await this.request<PersonOrganizationLink>('/org-links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  async updatePersonOrganizationLink(
    linkId: number,
    data: PersonOrganizationLinkUpdateInput,
  ): Promise<PersonOrganizationLink> {
    return this.request<PersonOrganizationLink>(`/org-links/${linkId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deletePersonOrganizationLink(linkId: number): Promise<void> {
    await this.request<void>(`/org-links/${linkId}`, {
      method: 'DELETE',
    })
  }

  // ============= NEWSLETTER ENDPOINTS (Phase 3) =============

  async getNewsletters(type?: NewsletterType): Promise<Newsletter[]> {
    return this.request<Newsletter[]>('/newsletters', {
      params: { type },
    })
  }

  async createNewsletter(data: NewsletterCreate): Promise<Newsletter> {
    return this.request<Newsletter>('/newsletters', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async sendNewsletter(id: number): Promise<void> {
    await this.request<void>(`/newsletters/${id}/send`, {
      method: 'POST',
    })
  }

  async deleteNewsletter(id: number): Promise<void> {
    await this.request<void>(`/newsletters/${id}`, {
      method: 'DELETE',
    })
  }

  // ============= EMAIL AUTOMATION ENDPOINTS =============

  async getEmailTemplates(params?: { only_active?: boolean }): Promise<EmailTemplate[]> {
    const query = {
      only_active: params?.only_active ?? true,
    }
    return this.request<EmailTemplate[]>('/email/templates', { params: query })
  }

  async createEmailTemplate(data: EmailTemplateInput): Promise<EmailTemplate> {
    return this.request<EmailTemplate>('/email/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEmailTemplate(id: number, data: EmailTemplateUpdateInput): Promise<EmailTemplate> {
    return this.request<EmailTemplate>(`/email/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async getEmailCampaigns(filters?: EmailCampaignFilters): Promise<PaginatedResponse<EmailCampaign>> {
    const params = {
      skip: filters?.skip,
      limit: filters?.limit,
      status: filters?.status,
      provider: filters?.provider,
    }
    return this.request<PaginatedResponse<EmailCampaign>>('/email/campaigns', { params })
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}`)
  }

  async createEmailCampaign(data: EmailCampaignInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>('/email/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateEmailCampaign(id: number, data: EmailCampaignUpdateInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async scheduleEmailCampaign(id: number, data: EmailCampaignScheduleInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEmailCampaignStats(id: number): Promise<EmailCampaignStats> {
    return this.request<EmailCampaignStats>(`/email/campaigns/${id}/stats`)
  }

  async getEmailCampaignSends(
    id: number,
    filters?: EmailSendFilters
  ): Promise<PaginatedResponse<EmailSend>> {
    const params = {
      skip: filters?.skip,
      limit: filters?.limit,
      status: filters?.status,
    }
    return this.request<PaginatedResponse<EmailSend>>(`/email/campaigns/${id}/sends`, { params })
  }

  // ============= TASK ENDPOINTS =============

  async getTasks(params?: {
    skip?: number
    limit?: number
    status?: TaskStatus
    priority?: TaskPriority
    category?: TaskCategory
    view?: 'today' | 'overdue' | 'next7' | 'all'
    investor_id?: number
    fournisseur_id?: number
    person_id?: number
  }): Promise<PaginatedResponse<Task>> {
    return this.request<PaginatedResponse<Task>>('/tasks', { params })
  }

  async getTask(id: number): Promise<TaskWithRelations> {
    return this.request<TaskWithRelations>(`/tasks/${id}`)
  }

  async getTaskStats(): Promise<TaskStats> {
    return this.request<TaskStats>('/tasks/stats')
  }

  async createTask(data: TaskInput): Promise<Task> {
    return this.request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateTask(id: number, data: TaskUpdateInput): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(id: number): Promise<void> {
    await this.request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    })
  }

  async snoozeTask(id: number, days: number): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/snooze`, {
      method: 'POST',
      body: JSON.stringify({ days }),
    })
  }

  async quickActionTask(id: number, action: 'snooze_1d' | 'snooze_1w' | 'mark_done' | 'next_day'): Promise<Task> {
    return this.request<Task>(`/tasks/${id}/quick-action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
  }

  // ============= ORGANISATION ENDPOINTS =============

  async getOrganisations(params?: {
    skip?: number
    limit?: number
    category?: string
    is_active?: boolean
    country_code?: string
    language?: string
  }): Promise<PaginatedResponse<Organisation>> {
    return this.request<PaginatedResponse<Organisation>>('/organisations', { params })
  }

  async getOrganisation(id: number): Promise<OrganisationDetail> {
    return this.request<OrganisationDetail>(`/organisations/${id}`)
  }

  async getOrganisationActivity(
    organisationId: number,
    params?: { limit?: number; before_id?: number; types?: string[] }
  ): Promise<PaginatedResponse<OrganisationActivity>> {
    return this.request<PaginatedResponse<OrganisationActivity>>(
      `/organisations/${organisationId}/activity`,
      { params },
    )
  }

  async getActivityWidget(params?: {
    organisation_ids?: number[]
    types?: string[]
    limit?: number
  }): Promise<PaginatedResponse<OrganisationActivity>> {
    return this.request<PaginatedResponse<OrganisationActivity>>(
      '/dashboards/widgets/activity',
      { params },
    )
  }

  async searchOrganisations(query: string, skip = 0, limit = 100): Promise<PaginatedResponse<Organisation>> {
    return this.request<PaginatedResponse<Organisation>>('/organisations/search', {
      params: { q: query, skip, limit },
    })
  }

  async getOrganisationsByLanguage(language: string, skip = 0, limit = 100): Promise<PaginatedResponse<Organisation>> {
    return this.request<PaginatedResponse<Organisation>>(`/organisations/by-language/${language}`, {
      params: { skip, limit },
    })
  }

  async getOrganisationsStats(): Promise<{
    total: number
    by_category: Record<string, number>
    by_language: Record<string, number>
  }> {
    // ⚠️ DEPRECATED: Utiliser getGlobalDashboardStats() à la place
    return this.request(`/organisations/stats`)
  }

  async createOrganisation(data: OrganisationCreate): Promise<Organisation> {
    return this.request<Organisation>('/organisations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOrganisation(id: number, data: OrganisationUpdate): Promise<Organisation> {
    return this.request<Organisation>(`/organisations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteOrganisation(id: number): Promise<void> {
    await this.request<void>(`/organisations/${id}`, {
      method: 'DELETE',
    })
  }

  // ============= MANDAT DISTRIBUTION ENDPOINTS =============

  async getMandats(params?: {
    skip?: number
    limit?: number
    organisation_id?: number
    status?: string
  }): Promise<PaginatedResponse<MandatDistribution>> {
    return this.request<PaginatedResponse<MandatDistribution>>('/mandats', { params })
  }

  async getMandat(id: number): Promise<MandatDistributionDetail> {
    return this.request<MandatDistributionDetail>(`/mandats/${id}`)
  }

  async getActiveMandats(organisation_id?: number): Promise<MandatDistribution[]> {
    return this.request<MandatDistribution[]>('/mandats/active', {
      params: organisation_id ? { organisation_id } : undefined,
    })
  }

  async getMandatsByOrganisation(organisation_id: number): Promise<MandatDistribution[]> {
    return this.request<MandatDistribution[]>(`/mandats/organisation/${organisation_id}`)
  }

  async checkMandatActif(id: number): Promise<{ mandat_id: number; is_actif: boolean }> {
    return this.request(`/mandats/${id}/is-actif`)
  }

  async createMandat(data: MandatDistributionCreate): Promise<MandatDistribution> {
    return this.request<MandatDistribution>('/mandats', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateMandat(id: number, data: MandatDistributionUpdate): Promise<MandatDistribution> {
    return this.request<MandatDistribution>(`/mandats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteMandat(id: number): Promise<void> {
    await this.request<void>(`/mandats/${id}`, {
      method: 'DELETE',
    })
  }

  // ============= PRODUIT ENDPOINTS =============

  async getProduits(params?: {
    skip?: number
    limit?: number
    type?: string
    status?: string
  }): Promise<PaginatedResponse<Produit>> {
    return this.request<PaginatedResponse<Produit>>('/produits', { params })
  }

  async getProduit(id: number): Promise<ProduitDetail> {
    return this.request<ProduitDetail>(`/produits/${id}`)
  }

  async searchProduits(query: string, skip = 0, limit = 100): Promise<PaginatedResponse<Produit>> {
    return this.request<PaginatedResponse<Produit>>('/produits/search', {
      params: { q: query, skip, limit },
    })
  }

  async getProduitByIsin(isin: string): Promise<Produit> {
    return this.request<Produit>(`/produits/by-isin/${isin}`)
  }

  async getProduitsByMandat(mandat_id: number): Promise<Produit[]> {
    return this.request<Produit[]>(`/produits/by-mandat/${mandat_id}`)
  }

  async createProduit(data: ProduitCreate): Promise<Produit> {
    return this.request<Produit>('/produits', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProduit(id: number, data: ProduitUpdate): Promise<Produit> {
    return this.request<Produit>(`/produits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteProduit(id: number): Promise<void> {
    await this.request<void>(`/produits/${id}`, {
      method: 'DELETE',
    })
  }

  async associateProduitToMandat(data: MandatProduitCreate): Promise<MandatProduit> {
    return this.request<MandatProduit>('/produits/associate-to-mandat', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async deleteMandatProduitAssociation(association_id: number): Promise<void> {
    await this.request<void>(`/produits/association/${association_id}`, {
      method: 'DELETE',
    })
  }

  // ============= WEBHOOKS ENDPOINTS =============

  async getWebhooks(params?: { is_active?: boolean }): Promise<Webhook[]> {
    return this.request<Webhook[]>('/webhooks', { params })
  }

  async getWebhook(id: number): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}`)
  }

  async createWebhook(data: WebhookCreateInput): Promise<Webhook> {
    return this.request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateWebhook(id: number, data: WebhookUpdateInput): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWebhook(id: number): Promise<void> {
    await this.request<void>(`/webhooks/${id}`, {
      method: 'DELETE',
    })
  }

  async rotateWebhookSecret(id: number, data?: WebhookRotateSecretInput): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}/rotate-secret`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    })
  }

  async getWebhookEvents(): Promise<WebhookEventOption[]> {
    return this.request<WebhookEventOption[]>('/webhooks/events/available')
  }

  // ============= DASHBOARD STATS ENDPOINTS =============
  // ✅ NEW: Endpoints pour les statistiques dashboard (remplace KPIs)

  async getGlobalDashboardStats(): Promise<any> {
    // Retourne les statistiques globales pour le dashboard principal
    return this.request('/dashboards/stats/global')
  }

  async getOrganisationStats(organisationId: number): Promise<any> {
    // Retourne les statistiques pour une organisation spécifique
    return this.request(`/dashboards/stats/organisation/${organisationId}`)
  }

  async getMonthlyAggregateStats(year: number, month: number): Promise<any> {
    // Agrège les KPIs de toutes les organisations pour un mois donné
    return this.request(`/dashboards/stats/month/${year}/${month}`)
  }

  async getYearlyAggregateStats(organisationId: number, year: number): Promise<any> {
    // Agrège les KPIs d'une organisation pour une année complète
    return this.request(`/dashboards/stats/organisation/${organisationId}/year/${year}`)
  }
}

// ============= SINGLETON EXPORT =============
export const apiClient = new ApiClient(API_BASE_URL)
