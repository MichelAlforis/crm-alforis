// lib/api/integrations.ts
// ============= INTEGRATIONS API MODULE =============
// Outlook, webhooks, autofill, email accounts

import type { BaseApiClient } from './index'
import type {
  Webhook,
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookRotateSecretInput,
  WebhookEventOption,
  AutofillStats,
  AutofillTimelineResponse,
  AutofillLeaderboardResponse,
} from '../types'

export class IntegrationsApi {
  constructor(private client: BaseApiClient) {}

  // ==========================================
  // OUTLOOK OAUTH & SYNC
  // ==========================================

  /**
   * Démarrer OAuth Outlook
   * POST /integrations/outlook/authorize
   */
  async outlookAuthorize(): Promise<{ authorization_url: string; state: string }> {
    return await this.client['post']<{ authorization_url: string; state: string }>(
      '/integrations/outlook/authorize'
    )
  }

  /**
   * Callback OAuth Outlook
   * POST /integrations/outlook/callback
   */
  async outlookCallback(
    code: string,
    state: string
  ): Promise<{ status: string; message: string; expires_in: number }> {
    return await this.client['post']<{ status: string; message: string; expires_in: number }>(
      '/integrations/outlook/callback',
      { code, state }
    )
  }

  /**
   * Synchroniser emails Outlook
   * GET /integrations/outlook/sync
   */
  async outlookSync(limit: number = 50): Promise<{
    messages_count: number
    signatures_count: number
    signatures: any[]
  }> {
    return await this.client['get']('/integrations/outlook/sync', { limit })
  }

  /**
   * Lister signatures Outlook
   * GET /integrations/outlook/signatures
   */
  async outlookGetSignatures(): Promise<{ signatures: any[] }> {
    return await this.client['get']('/integrations/outlook/signatures')
  }

  /**
   * Déconnexion Outlook
   * DELETE /integrations/outlook/disconnect
   */
  async outlookDisconnect(): Promise<void> {
    await this.client['delete']<void>('/integrations/outlook/disconnect')
  }

  // ==========================================
  // WEBHOOKS
  // ==========================================

  /**
   * Lister webhooks
   * GET /webhooks
   */
  async getWebhooks(params?: { is_active?: boolean }): Promise<Webhook[]> {
    return await this.client['get']<Webhook[]>('/webhooks', params)
  }

  /**
   * Détails webhook
   * GET /webhooks/{id}
   */
  async getWebhook(id: number): Promise<Webhook> {
    return await this.client['get']<Webhook>(`/webhooks/${id}`)
  }

  /**
   * Créer webhook
   * POST /webhooks
   */
  async createWebhook(data: WebhookCreateInput): Promise<Webhook> {
    return await this.client['post']<Webhook>('/webhooks', data)
  }

  /**
   * Mettre à jour webhook
   * PUT /webhooks/{id}
   */
  async updateWebhook(id: number, data: WebhookUpdateInput): Promise<Webhook> {
    return await this.client['put']<Webhook>(`/webhooks/${id}`, data)
  }

  /**
   * Supprimer webhook
   * DELETE /webhooks/{id}
   */
  async deleteWebhook(id: number): Promise<void> {
    await this.client['delete']<void>(`/webhooks/${id}`)
  }

  /**
   * Rotation secret webhook
   * POST /webhooks/{id}/rotate-secret
   */
  async rotateWebhookSecret(id: number, data?: WebhookRotateSecretInput): Promise<Webhook> {
    return await this.client['post']<Webhook>(`/webhooks/${id}/rotate-secret`, data)
  }

  /**
   * Liste événements disponibles
   * GET /webhooks/events
   */
  async getWebhookEvents(): Promise<WebhookEventOption[]> {
    return await this.client['get']<WebhookEventOption[]>('/webhooks/events')
  }

  // ==========================================
  // AUTOFILL AI
  // ==========================================

  /**
   * Stats autofill
   * GET /autofill/stats
   */
  async getAutofillStats(params?: { days?: number }): Promise<AutofillStats> {
    return await this.client['get']<AutofillStats>('/autofill/stats', params)
  }

  /**
   * Timeline autofill
   * GET /autofill/timeline
   */
  async getAutofillTimeline(params?: { days?: number }): Promise<AutofillTimelineResponse> {
    return await this.client['get']<AutofillTimelineResponse>('/autofill/timeline', params)
  }

  /**
   * Leaderboard autofill
   * GET /autofill/leaderboard
   */
  async getAutofillLeaderboard(): Promise<AutofillLeaderboardResponse> {
    return await this.client['get']<AutofillLeaderboardResponse>('/autofill/leaderboard')
  }

  // ==========================================
  // EMAIL ACCOUNTS
  // ==========================================

  /**
   * Lister comptes email
   * GET /integrations/email-accounts
   */
  async getEmailAccounts(): Promise<any[]> {
    return await this.client['get']<any[]>('/integrations/email-accounts')
  }

  /**
   * Ajouter compte email
   * POST /integrations/email-accounts
   */
  async addEmailAccount(data: any): Promise<any> {
    return await this.client['post']<any>('/integrations/email-accounts', data)
  }

  /**
   * Supprimer compte email
   * DELETE /integrations/email-accounts/{id}
   */
  async deleteEmailAccount(id: number): Promise<void> {
    await this.client['delete']<void>(`/integrations/email-accounts/${id}`)
  }

  /**
   * Synchroniser tous les emails
   * POST /integrations/sync-all-emails
   */
  async syncAllEmails(): Promise<any> {
    return await this.client['post']<any>('/integrations/sync-all-emails')
  }
}
