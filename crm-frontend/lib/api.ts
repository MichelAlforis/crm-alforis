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
  AutofillStats,
  AutofillTimelineResponse,
  AutofillLeaderboardResponse,
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
import { logger } from './logger'

import type { ApiError } from './types'

// En production, on récupère l'URL depuis NEXT_PUBLIC_API_URL (configurée via l'infra)
// Fallback local en dev pour éviter les problèmes CORS lorsqu'on n'a pas de reverse proxy
const API_BASE_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }
  return 'http://localhost:8000/api/v1'
})()

// ============= TYPES INTERNES =============

interface RequestConfig extends RequestInit {
  params?: Record<string, any>
}

// ============= API CLIENT CLASS =============

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  private csrfToken: string | null = null

  constructor(baseUrl: string) {
    // Normaliser la baseUrl: retirer le trailing slash s'il existe
    // La baseUrl doit déjà contenir /api/v1 (défini dans API_BASE_URL)
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.initToken()
    this.initCsrfToken()
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
   * Initialise le CSRF token (généré côté client)
   */
  private initCsrfToken(): void {
    if (typeof window !== 'undefined') {
      // Récupérer ou générer un CSRF token
      let csrf = localStorage.getItem('csrf_token')
      if (!csrf) {
        csrf = this.generateCsrfToken()
        localStorage.setItem('csrf_token', csrf)
      }
      this.csrfToken = csrf
    }
  }

  /**
   * Génère un token CSRF aléatoire
   */
  private generateCsrfToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
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
      // Générer un nouveau CSRF token après logout
      const newCsrf = this.generateCsrfToken()
      localStorage.setItem('csrf_token', newCsrf)
      this.csrfToken = newCsrf
    }
  }

  /**
   * Utilitaire pour définir un cookie
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

    // Sécurité: Secure (HTTPS only) + SameSite=Strict (anti-CSRF)
    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const secureFlag = isProduction ? ';Secure' : '' // Secure uniquement en HTTPS

    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict${secureFlag}`
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
   * Construit les headers avec authentification + CSRF
   */
  private getHeaders(method?: string): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    // Protection CSRF pour les requêtes mutatives
    const mutativeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
    if (method && mutativeMethods.includes(method.toUpperCase()) && this.csrfToken) {
      headers['X-CSRF-Token'] = this.csrfToken
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
   * Tente de rafraîchir le token JWT
   * @returns true si le refresh a réussi, false sinon
   */
  private async tryRefreshToken(): Promise<boolean> {
    const token = this.getToken()
    if (!token) return false

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        this.setToken(data.access_token)
        return true
      }

      return false
    } catch (error) {
      logger.error('[API] Token refresh failed:', error)
      return false
    }
  }

  /**
   * Effectue une requête HTTP générique avec gestion automatique du refresh token
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...requestConfig } = config
    const url = this.buildUrl(endpoint, params)

    // Fonction interne pour faire la requête
    const makeRequest = async (): Promise<Response> => {
      return await fetch(url, {
        ...requestConfig,
        headers: {
          ...this.getHeaders(requestConfig.method),
          ...requestConfig.headers,
        },
      })
    }

    try {
      let response = await makeRequest()

      // Si 401 (Unauthorized), tenter un refresh automatique
      if (response.status === 401 && !endpoint.includes('/auth/')) {
        logger.info('[API] Token expired, attempting automatic refresh...')

        const refreshSuccess = await this.tryRefreshToken()

        if (refreshSuccess) {
          logger.info('[API] Token refreshed successfully, retrying request...')
          // Retry la requête avec le nouveau token
          response = await makeRequest()
        } else {
          logger.warn('[API] Token refresh failed, clearing token and redirecting to login')
          this.clearToken()
          // Rediriger vers la page de login
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }

      // Gérer les erreurs HTTP
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))

        // Parser le detail: peut être une string, un array d'erreurs de validation, ou un objet
        let detailMessage = 'Une erreur est survenue'

        if (typeof error.detail === 'string') {
          detailMessage = error.detail
        } else if (Array.isArray(error.detail)) {
          // FastAPI validation errors: [{type, loc, msg, input, ctx}, ...]
          detailMessage = error.detail
            .map((err: any) => {
              const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'champ'
              return `${field}: ${err.msg || 'erreur de validation'}`
            })
            .join(', ')
        } else if (error.detail && typeof error.detail === 'object') {
          detailMessage = JSON.stringify(error.detail)
        }

        throw {
          status_code: response.status,
          detail: detailMessage,
        } as ApiError
      }

      // Pour les réponses 204 No Content ou autres sans body, retourner void
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T
      }

      // Sinon, parser le JSON
      const text = await response.text()
      if (!text) {
        return undefined as T
      }

      return JSON.parse(text) as T
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

  // ============= GENERIC HTTP METHODS =============

  /**
   * GET request générique
   */
  public async get<T>(endpoint: string, config?: RequestConfig): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { ...config, method: 'GET' })
    return { data }
  }

  /**
   * POST request générique
   */
  public async post<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
    return { data }
  }

  /**
   * PUT request générique
   */
  public async put<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
    return { data }
  }

  /**
   * PATCH request générique
   */
  public async patch<T>(endpoint: string, body?: any, config?: RequestConfig): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    })
    return { data }
  }

  /**
   * DELETE request générique
   */
  public async delete<T = void>(endpoint: string, config?: RequestConfig): Promise<{ data: T }> {
    const data = await this.request<T>(endpoint, { ...config, method: 'DELETE' })
    return { data }
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

  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async updateProfile(data: { full_name?: string; email?: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
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

  // ============= PEOPLE ENDPOINTS =============

  async getPeople(
    skip = 0,
    limit = 50,
    options?: { q?: string; organizationId?: number },  // ✅ MIGRATION: organizationType supprimé
  ): Promise<PaginatedResponse<Person>> {
    const params: Record<string, any> = { skip, limit }
    if (options?.q) params.q = options.q
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
    oganisation_id?: number
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
    const items = await this.request<Organisation[]>('/organisations/search', {
      params: { q: query, skip, limit },
    })

    // Transformer la liste en réponse paginée
    return {
      items: items || [],
      total: (items || []).length + skip, // Estimation (le backend ne fournit pas le total)
      skip,
      limit,
    }
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

  // ============= AUTOFILL STATS ENDPOINTS =============

  async getAutofillStats(params?: { days?: number }): Promise<AutofillStats> {
    return this.request<AutofillStats>('/ai/autofill/stats', { params })
  }

  async getAutofillTimeline(params?: { days?: number }): Promise<AutofillTimelineResponse> {
    return this.request<AutofillTimelineResponse>('/ai/autofill/stats/timeline', { params })
  }

  async getAutofillLeaderboard(): Promise<AutofillLeaderboardResponse> {
    return this.request<AutofillLeaderboardResponse>('/ai/autofill/stats/leaderboard')
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
  // ============= KPI ENDPOINTS =============

  /**
   * Liste paginée des KPI
   * @param skip pagination
   * @param limit pagination
   * @param options filtres facultatifs (q / organisation_id / owner_id / type)
   */
  async getKPIs(
    skip = 0,
    limit = 50,
    options?: {
      q?: string
      organisation_id?: number
      owner_id?: number
      type?: string
    },
  ): Promise<PaginatedResponse<KPI>> {
    const params: Record<string, any> = { skip, limit }
    if (options?.q) params.q = options.q
    if (options?.organisation_id) params.organisation_id = options.organisation_id
    if (options?.owner_id) params.owner_id = options.owner_id
    if (options?.type) params.type = options.type

    return this.request<PaginatedResponse<KPI>>('/kpis', { params })
  }

  /** Détail d’un KPI par id */
  async getKPI(id: number): Promise<KPI> {
    return this.request<KPI>(`/kpis/${id}`)
  }

  /** Création d’un KPI */
  async createKPI(data: KPICreate): Promise<KPI> {
    return this.request<KPI>('/kpis', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /** Mise à jour d’un KPI */
  async updateKPI(id: number, data: KPIUpdate): Promise<KPI> {
    return this.request<KPI>(`/kpis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /** Suppression d’un KPI */
  async deleteKPI(id: number): Promise<void> {
    await this.request<void>(`/kpis/${id}`, { method: 'DELETE' })
  }

}

// ============= SINGLETON EXPORT =============
export const apiClient = new ApiClient(API_BASE_URL)
