// lib/api.ts
// ============= API CLIENT CENTRALISÉ =============
// Singleton pattern - Toutes les requêtes HTTP passent ici
// Avantages: Gestion tokens, erreurs, retry logic centralisée

import {
  LoginRequest,
  TokenResponse,
  Investor,
  InvestorCreate,
  InvestorUpdate,
  InvestorDetail,
  Person,
  PersonInput,
  PersonUpdateInput,
  PersonDetail,
  PersonOrganizationLink,
  PersonOrganizationLinkInput,
  PersonOrganizationLinkUpdateInput,
  OrganizationType,
  Interaction,
  InteractionCreate,
  InteractionUpdate,
  KPI,
  KPICreate,
  KPIUpdate,
  PaginatedResponse,
  Contact,
  Fournisseur,
  FournisseurCreate,
  FournisseurUpdate,
  FournisseurContact,
  FournisseurDetail,
  Newsletter,
  NewsletterCreate,
  NewsletterType,
  UserInfo,
  Organisation,
  OrganisationCreate,
  OrganisationUpdate,
  OrganisationDetail,
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
} from './types'

import type { ApiError } from './types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

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
   * Effectue une requête HTTP générique
   */
  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const { params, ...requestConfig } = config
    // Toujours garantir un seul slash entre baseUrl et endpoint
    let url = this.baseUrl.replace(/\/$/, '') + (endpoint.startsWith('/') ? endpoint : '/' + endpoint)
    if (params) {
      const query = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query.append(key, String(value))
        }
      })
      const queryString = query.toString()
      if (queryString) url += `?${queryString}`
    }

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

  // ============= INVESTOR ENDPOINTS =============

  async getInvestors(skip = 0, limit = 100, searchText = ''): Promise<PaginatedResponse<Investor>> {
    return this.request<PaginatedResponse<Investor>>('/investors', {
      params: { skip, limit, search: searchText },
    })
  }

  async getInvestor(id: number): Promise<InvestorDetail> {
    const data = await this.request<{
      investor: Investor
      contacts: Contact[]
      interaction_count: number
      kpi_count: number
      people?: PersonOrganizationLink[]
    }>(`/investors/${id}`)

    return {
      investor: data.investor,
      contacts: data.contacts ?? [],
      interaction_count: data.interaction_count ?? 0,
      kpi_count: data.kpi_count ?? 0,
      people: data.people ?? [],
    }
  }

  async createInvestor(data: InvestorCreate): Promise<Investor> {
    return this.request<Investor>('/investors', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInvestor(id: number, data: InvestorUpdate): Promise<Investor> {
    return this.request<Investor>(`/investors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInvestor(id: number): Promise<void> {
    await this.request<void>(`/investors/${id}`, {
      method: 'DELETE',
    })
  }

  // ============= INTERACTION ENDPOINTS =============

  async getInteractions(investorId: number, skip = 0, limit = 50): Promise<PaginatedResponse<Interaction>> {
    return this.request<PaginatedResponse<Interaction>>(`/interactions/investor/${investorId}`, {
      params: { skip, limit },
    })
  }

  async createInteraction(investorId: number, data: InteractionCreate): Promise<Interaction> {
    return this.request<Interaction>(`/interactions/investor/${investorId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInteraction(interactionId: number, data: InteractionUpdate): Promise<Interaction> {
    return this.request<Interaction>(`/interactions/${interactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInteraction(interactionId: number): Promise<void> {
    await this.request<void>(`/interactions/${interactionId}`, {
      method: 'DELETE',
    })
  }

  // ============= KPI ENDPOINTS =============

  async getKPIs(investorId: number, year?: number, month?: number): Promise<KPI[]> {
    const targetYear = year ?? new Date().getFullYear()

    if (month !== undefined) {
      const kpi = await this.request<KPI>(
        `/kpis/investor/${investorId}/month/${targetYear}/${month}`
      )
      return kpi ? [kpi] : []
    }

    return this.request<KPI[]>(`/kpis/investor/${investorId}`, {
      params: { year: targetYear },
    })
  }

  async createKPI(investorId: number, data: KPICreate): Promise<KPI> {
    const { year, month, ...payload } = data
    return this.request<KPI>(`/kpis/investor/${investorId}`, {
      method: 'POST',
      params: { year, month },
      body: JSON.stringify(payload),
    })
  }

  async updateKPI(kpiId: number, data: KPIUpdate): Promise<KPI> {
    return this.request<KPI>(`/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKPI(kpiId: number): Promise<void> {
    await this.request<void>(`/kpis/${kpiId}`, {
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

  // ============= FOURNISSEUR ENDPOINTS =============

  async getFournisseurs(skip = 0, limit = 100, searchText = ''): Promise<PaginatedResponse<Fournisseur>> {
    return this.request<PaginatedResponse<Fournisseur>>('/fournisseurs', {
      params: { skip, limit, search: searchText },
    })
  }

  async getFournisseur(id: number): Promise<FournisseurDetail> {
    const data = await this.request<{
      fournisseur: Fournisseur
      contacts: FournisseurContact[]
      interaction_count: number
      kpi_count: number
      people?: PersonOrganizationLink[]
    }>(`/fournisseurs/${id}`)

    return {
      fournisseur: data.fournisseur,
      contacts: data.contacts ?? [],
      interaction_count: data.interaction_count ?? 0,
      kpi_count: data.kpi_count ?? 0,
      people: data.people ?? [],
    }
  }

  async createFournisseur(data: FournisseurCreate): Promise<Fournisseur> {
    return this.request<Fournisseur>('/fournisseurs', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateFournisseur(id: number, data: FournisseurUpdate): Promise<Fournisseur> {
    return this.request<Fournisseur>(`/fournisseurs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteFournisseur(id: number): Promise<void> {
    await this.request<void>(`/fournisseurs/${id}`, {
      method: 'DELETE',
    })
  }

  // ============= KPI ENDPOINTS (UPDATED - PAR FOURNISSEUR) =============

  async getKPIsByFournisseur(fournisseurId: number, year?: number, month?: number): Promise<KPI[]> {
    return this.request<KPI[]>(`/fournisseurs/${fournisseurId}/kpis`, {
      params: { year, month },
    })
  }

  async createKPIForFournisseur(fournisseurId: number, data: KPICreate): Promise<KPI> {
    return this.request<KPI>(`/fournisseurs/${fournisseurId}/kpis`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateKPIForFournisseur(fournisseurId: number, kpiId: number, data: KPIUpdate): Promise<KPI> {
    return this.request<KPI>(`/fournisseurs/${fournisseurId}/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKPIForFournisseur(fournisseurId: number, kpiId: number): Promise<void> {
    await this.request<void>(`/fournisseurs/${fournisseurId}/kpis/${kpiId}`, {
      method: 'DELETE',
    })
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

  async getOrganisationStats(): Promise<{
    total: number
    by_category: Record<string, number>
    by_language: Record<string, number>
  }> {
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
}

// ============= SINGLETON EXPORT =============
export const apiClient = new ApiClient(API_BASE_URL)
