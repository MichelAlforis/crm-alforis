// lib/api/core/client.ts
// ============= CORE HTTP CLIENT =============
// Base HTTP client avec gestion tokens, CSRF, cookies, et retry logic

import { storage, AUTH_STORAGE_KEYS } from '@/lib/constants'
import { logger } from '@/lib/logger'
import type { ApiError } from '@/lib/types'

// En production, on récupère l'URL depuis NEXT_PUBLIC_API_URL
const API_BASE_URL = (() => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/$/, '')
  }
  return 'http://localhost:8000/api/v1'
})()

// ============= TYPES =============

interface RequestConfig extends RequestInit {
  params?: Record<string, unknown>
}

type ValidationError = {
  loc?: unknown
  msg?: unknown
  detail?: unknown
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isValidationError = (value: unknown): value is ValidationError =>
  isRecord(value) && ('loc' in value || 'msg' in value || 'detail' in value)

const formatValidationErrors = (errors: unknown[]): string =>
  errors
    .map((rawError) => {
      if (!isValidationError(rawError)) {
        return null
      }

      const { loc, msg, detail } = rawError
      const fieldPath = Array.isArray(loc)
        ? loc
            .filter((part): part is string => typeof part === 'string')
            .join(' > ')
        : undefined

      const baseMessage =
        typeof msg === 'string'
          ? msg
          : typeof detail === 'string'
          ? detail
          : undefined

      if (!baseMessage) return null

      return fieldPath ? `${fieldPath}: ${baseMessage}` : baseMessage
    })
    .filter((value): value is string => Boolean(value))
    .join(', ')

const formatErrorDetail = (payload: unknown): string => {
  if (!payload) return 'Une erreur est survenue'

  if (isRecord(payload)) {
    const { detail } = payload

    if (typeof detail === 'string') {
      return detail
    }

    if (Array.isArray(detail)) {
      const formatted = formatValidationErrors(detail)
      if (formatted) {
        return formatted
      }
    }

    if (isRecord(detail)) {
      return JSON.stringify(detail)
    }
  }

  return 'Une erreur est survenue'
}

// ============= BASE HTTP CLIENT CLASS =============

export class BaseHttpClient {
  protected baseUrl: string
  private token: string | null = null
  private csrfToken: string | null = null

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.initToken()
    this.initCsrfToken()
  }

  // ============= TOKEN MANAGEMENT =============

  /**
   * Initialise le token depuis localStorage et cookies (côté client)
   */
  private initToken(): void {
    if (typeof window !== 'undefined') {
      this.token = storage.get(AUTH_STORAGE_KEYS.TOKEN) || this.getCookie('auth_token')
    }
  }

  /**
   * Initialise le CSRF token (généré côté client)
   */
  private initCsrfToken(): void {
    if (typeof window !== 'undefined') {
      let csrf = storage.get(AUTH_STORAGE_KEYS.CSRF_TOKEN)
      if (!csrf) {
        csrf = this.generateCsrfToken()
        storage.set(AUTH_STORAGE_KEYS.CSRF_TOKEN, csrf)
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
      storage.set(AUTH_STORAGE_KEYS.TOKEN, token)
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
        storage.get(AUTH_STORAGE_KEYS.TOKEN) || this.getCookie('auth_token')
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
      storage.remove(AUTH_STORAGE_KEYS.TOKEN)
      this.deleteCookie('auth_token')
      // Générer un nouveau CSRF token après logout
      const newCsrf = this.generateCsrfToken()
      storage.set(AUTH_STORAGE_KEYS.CSRF_TOKEN, newCsrf)
      this.csrfToken = newCsrf
    }
  }

  // ============= COOKIE UTILITIES =============

  /**
   * Définit un cookie
   */
  private setCookie(name: string, value: string, days: number): void {
    const expires = new Date()
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

    const isProduction = typeof window !== 'undefined' && window.location.protocol === 'https:'
    const secureFlag = isProduction ? ';Secure' : ''

    document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict${secureFlag}`
  }

  /**
   * Récupère un cookie
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
   * Supprime un cookie
   */
  private deleteCookie(name: string): void {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`
  }

  // ============= HEADERS & URL BUILDING =============

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
   * Construit une URL absolue vers l'API avec paramètres de requête
   */
  private buildUrl(endpoint: string, params?: Record<string, unknown>): string {
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

  // ============= TOKEN REFRESH LOGIC =============

  /**
   * Tente de rafraîchir le token JWT
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

  // ============= CORE HTTP REQUEST METHOD =============

  /**
   * Effectue une requête HTTP générique avec gestion automatique du refresh token
   */
  public async request<T>(
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
          response = await makeRequest()
        } else {
          logger.warn('[API] Token refresh failed, clearing token and redirecting to login')
          this.clearToken()
          if (typeof window !== 'undefined') {
            window.location.href = '/login'
          }
        }
      }

      // Gérer les erreurs HTTP
      if (!response.ok) {
        const payload = await response.json().catch(() => undefined)

        throw {
          status_code: response.status,
          detail: formatErrorDetail(payload),
        } as ApiError
      }

      // Pour les réponses 204 No Content ou autres sans body
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T
      }

      // Parser le JSON
      const text = await response.text()
      if (!text) {
        return undefined as T
      }

      return JSON.parse(text) as T
    } catch (error: unknown) {
      // Réformater les erreurs
      if (
        isRecord(error) &&
        typeof error.status_code === 'number' &&
        typeof error.detail === 'string'
      ) {
        throw error as ApiError
      }
      throw {
        status_code: 500,
        detail: error instanceof Error ? error.message : 'Erreur inconnue',
      }
    }
  }

  // ============= UTILITY METHODS =============

  /**
   * Retourne l'URL absolue vers un endpoint API
   */
  public resolveUrl(endpoint: string, params?: Record<string, unknown>): string {
    return this.buildUrl(endpoint, params)
  }

  /**
   * Retourne l'URL de base actuelle
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
  public async post<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<{ data: T }> {
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
  public async put<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<{ data: T }> {
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
  public async patch<T>(endpoint: string, body?: unknown, config?: RequestConfig): Promise<{ data: T }> {
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
}
