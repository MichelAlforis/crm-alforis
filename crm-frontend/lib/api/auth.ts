// lib/api/auth.ts
// ============= AUTH API MODULE =============
// Gestion authentification, profil utilisateur

import type { BaseApiClient } from './index'
import type { LoginRequest, TokenResponse, UserInfo } from '../types'

export class AuthApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Connexion utilisateur
   * POST /auth/token
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    const response = await this.client['post']<TokenResponse>('/auth/token', data)
    this.client.setToken(response.access_token)
    return response
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    this.client.setToken(null)
  }

  /**
   * Récupérer infos utilisateur connecté
   * GET /users/me
   */
  async getCurrentUser(): Promise<UserInfo | null> {
    try {
      return await this.client['get']<UserInfo>('/users/me')
    } catch (error) {
      return null
    }
  }

  /**
   * Changer mot de passe
   * POST /users/me/change-password
   */
  async changePassword(data: {
    current_password: string
    new_password: string
  }): Promise<{ message: string }> {
    return await this.client['post']<{ message: string }>('/users/me/change-password', data)
  }

  /**
   * Mettre à jour profil
   * PUT /users/me
   */
  async updateProfile(data: {
    full_name?: string
    email?: string
  }): Promise<{ message: string }> {
    return await this.client['put']<{ message: string }>('/users/me', data)
  }

  /**
   * Health check
   * GET /health
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client['get']<{ status: string }>('/health')
      return true
    } catch {
      return false
    }
  }
}
