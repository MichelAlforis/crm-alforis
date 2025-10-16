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
  Interaction,
  InteractionCreate,
  InteractionUpdate,
  KPI,
  KPICreate,
  KPIUpdate,
  PaginatedResponse,
  Fournisseur,
  FournisseurCreate,
  FournisseurUpdate,
  Newsletter,
  NewsletterCreate,
  NewsletterType
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
    return this.token
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
    
    // Construire l'URL avec params
    let url = `${this.baseUrl}${endpoint}`
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
          if (typeof window !== 'undefined') {
            window.location.href = '/auth/login'
          }
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

  async logout(): Promise<void> {
    this.clearToken()
  }

  // ============= INVESTOR ENDPOINTS =============

  async getInvestors(skip = 0, limit = 100, searchText = ''): Promise<PaginatedResponse<Investor>> {
    return this.request<PaginatedResponse<Investor>>('/investors', {
      params: { skip, limit, search: searchText },
    })
  }

  async getInvestor(id: number): Promise<Investor> {
    return this.request<Investor>(`/investors/${id}`)
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
    return this.request<PaginatedResponse<Interaction>>(`/investors/${investorId}/interactions`, {
      params: { skip, limit },
    })
  }

  async createInteraction(investorId: number, data: InteractionCreate): Promise<Interaction> {
    return this.request<Interaction>(`/investors/${investorId}/interactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateInteraction(investorId: number, interactionId: number, data: InteractionUpdate): Promise<Interaction> {
    return this.request<Interaction>(`/investors/${investorId}/interactions/${interactionId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInteraction(investorId: number, interactionId: number): Promise<void> {
    await this.request<void>(`/investors/${investorId}/interactions/${interactionId}`, {
      method: 'DELETE',
    })
  }

  // ============= KPI ENDPOINTS =============

  async getKPIs(investorId: number, year?: number, month?: number): Promise<KPI[]> {
    return this.request<KPI[]>(`/investors/${investorId}/kpis`, {
      params: { year, month },
    })
  }

  async createKPI(investorId: number, data: KPICreate): Promise<KPI> {
    return this.request<KPI>(`/investors/${investorId}/kpis`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateKPI(investorId: number, kpiId: number, data: KPIUpdate): Promise<KPI> {
    return this.request<KPI>(`/investors/${investorId}/kpis/${kpiId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteKPI(investorId: number, kpiId: number): Promise<void> {
    await this.request<void>(`/investors/${investorId}/kpis/${kpiId}`, {
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

  async getFournisseur(id: number): Promise<Fournisseur> {
    return this.request<Fournisseur>(`/fournisseurs/${id}`)
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
}

// ============= SINGLETON EXPORT =============
export const apiClient = new ApiClient(API_BASE_URL)