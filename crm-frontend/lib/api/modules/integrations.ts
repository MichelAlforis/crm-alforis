// lib/api/modules/integrations.ts
// ============= INTEGRATIONS MODULE =============
// Third-party integrations (Outlook, etc.)

import { BaseHttpClient } from '../core/client'

type OutlookSignature = Record<string, unknown>

export class IntegrationsAPI extends BaseHttpClient {
  // ============= OUTLOOK =============

  /**
   * Start Outlook authorization flow
   */
  async outlookAuthorize(): Promise<{ authorization_url: string; state: string }> {
    return this.request<{ authorization_url: string; state: string }>(
      '/integrations/outlook/authorize',
      { method: 'POST' }
    )
  }

  /**
   * Handle Outlook OAuth callback
   */
  async outlookCallback(code: string, state: string): Promise<{ status: string; message: string; expires_in: number }> {
    return this.request<{ status: string; message: string; expires_in: number }>(
      '/integrations/outlook/callback',
      {
        method: 'POST',
        body: JSON.stringify({ code, state })
      }
    )
  }

  /**
   * Sync Outlook messages
   */
  async outlookSync(limit: number = 50): Promise<{ messages_count: number; signatures_count: number; signatures: OutlookSignature[] }> {
    return this.request<{ messages_count: number; signatures_count: number; signatures: OutlookSignature[] }>(
      `/integrations/outlook/sync?limit=${limit}`
    )
  }

  /**
   * Get Outlook signatures
   */
  async outlookGetSignatures(): Promise<{ signatures: OutlookSignature[] }> {
    return this.request<{ signatures: OutlookSignature[] }>(
      '/integrations/outlook/signatures'
    )
  }

  /**
   * Disconnect Outlook
   */
  async outlookDisconnect(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(
      '/integrations/outlook/disconnect',
      { method: 'DELETE' }
    )
  }

  /**
   * Delete Outlook data
   */
  async outlookDeleteData(): Promise<{ status: string; message: string; deleted_logs: number; deleted_decisions: number }> {
    return this.request<{ status: string; message: string; deleted_logs: number; deleted_decisions: number }>(
      '/integrations/outlook/data',
      { method: 'DELETE' }
    )
  }

  /**
   * Get Outlook profile
   */
  async outlookGetProfile(): Promise<{
    crm_user_email: string
    microsoft_account: {
      email: string
      display_name: string
      user_principal_name: string
      id: string
      job_title?: string
      office_location?: string
    }
    match: boolean
  }> {
    return this.request(
      '/integrations/outlook/me'
    )
  }
}

// Singleton instance
export const integrationsAPI = new IntegrationsAPI()
