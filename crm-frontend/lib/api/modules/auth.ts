// lib/api/modules/auth.ts
// ============= AUTH MODULE =============
// Authentication, user profile, password management

import { BaseHttpClient } from '../core/client'
import type { LoginRequest, TokenResponse, UserInfo } from '@/lib/types'

export class AuthAPI extends BaseHttpClient {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<TokenResponse> {
    return this.request<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Get current authenticated user
   */
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

  /**
   * Logout (clears token)
   */
  async logout(): Promise<void> {
    this.clearToken()
  }

  /**
   * Change password
   */
  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update user profile
   */
  async updateProfile(data: { full_name?: string; email?: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl.replace('/api/v1', '')}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}

// Singleton instance
export const authAPI = new AuthAPI()
