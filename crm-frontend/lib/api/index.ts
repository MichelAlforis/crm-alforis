// lib/api/index.ts
// ============= API CLIENT CENTRALISÉ - VERSION REFACTORISÉE =============
// Architecture modulaire par domaine
// Maintient la rétrocompatibilité avec l'ancien singleton ApiClient

import { AuthApi } from './auth'
import { PeopleApi } from './people'
import { OrganisationsApi } from './organisations'
import { EmailApi } from './email'
import { TasksApi } from './tasks'
import { IntegrationsApi } from './integrations'
import { ProductsApi } from './products'
import { MandatsApi } from './mandats'
import { AiApi } from './ai'
import { logger } from '../logger'

// ============= CONFIGURATION =============

const API_BASE_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }
  return 'http://localhost:8000/api/v1'
})()

// ============= BASE CLIENT =============

export class BaseApiClient {
  protected baseUrl: string
  protected token: string | null = null
  protected csrfToken: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.initToken()
    this.initCsrfToken()
  }

  protected initToken(): void {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('token')
    }
  }

  protected initCsrfToken(): void {
    if (typeof window !== 'undefined') {
      this.csrfToken = localStorage.getItem('csrf_token')
    }
  }

  public setToken(token: string | null): void {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token)
      } else {
        localStorage.removeItem('token')
      }
    }
  }

  public getToken(): string | null {
    return this.token
  }

  protected async request<T>(
    endpoint: string,
    config: RequestInit & { params?: Record<string, any> } = {}
  ): Promise<T> {
    const { params, ...fetchConfig } = config

    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(fetchConfig.headers || {}),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (this.csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(fetchConfig.method || 'GET')) {
      headers['X-CSRF-Token'] = this.csrfToken
    }

    try {
      const response = await fetch(url, {
        ...fetchConfig,
        headers,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(error.detail || `HTTP ${response.status}`)
      }

      if (response.status === 204) {
        return {} as T
      }

      return await response.json()
    } catch (error) {
      logger.error('API request failed:', { url, error })
      throw error
    }
  }

  protected async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params })
  }

  protected async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  protected async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  protected async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

// ============= SINGLETON API CLIENT =============

class ApiClient extends BaseApiClient {
  public auth: AuthApi
  public people: PeopleApi
  public organisations: OrganisationsApi
  public email: EmailApi
  public tasks: TasksApi
  public integrations: IntegrationsApi
  public products: ProductsApi
  public mandats: MandatsApi
  public ai: AiApi

  constructor(baseUrl: string) {
    super(baseUrl)

    // Instancier les modules
    this.auth = new AuthApi(this)
    this.people = new PeopleApi(this)
    this.organisations = new OrganisationsApi(this)
    this.email = new EmailApi(this)
    this.tasks = new TasksApi(this)
    this.integrations = new IntegrationsApi(this)
    this.products = new ProductsApi(this)
    this.mandats = new MandatsApi(this)
    this.ai = new AiApi(this)
  }

  // Rétrocompatibilité: méthodes directes (délèguent aux modules)
  async login(data: any) { return this.auth.login(data) }
  async logout() { return this.auth.logout() }
  async getCurrentUser() { return this.auth.getCurrentUser() }
  async getPeople(params?: any) { return this.people.list(params) }
  async getPerson(id: number) { return this.people.get(id) }
  async createPerson(data: any) { return this.people.create(data) }
  async updatePerson(id: number, data: any) { return this.people.update(id, data) }
  async deletePerson(id: number) { return this.people.delete(id) }
  // ... (ajouter autres méthodes legacy si besoin)
}

// Export singleton
export const api = new ApiClient(API_BASE_URL)

// Export types
export * from './types'
