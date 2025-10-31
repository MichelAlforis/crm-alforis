// lib/api/modules/webhooks.ts
// ============= WEBHOOKS MODULE =============
// Webhook management

import { BaseHttpClient } from '../core/client'
import type {
  Webhook,
  WebhookCreateInput,
  WebhookUpdateInput,
  WebhookRotateSecretInput,
  WebhookEventOption,
} from '@/lib/types'

export class WebhooksAPI extends BaseHttpClient {
  /**
   * Get all webhooks
   */
  async getWebhooks(params?: { is_active?: boolean }): Promise<Webhook[]> {
    return this.request<Webhook[]>('/webhooks', { params })
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(id: number): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}`)
  }

  /**
   * Create webhook
   */
  async createWebhook(data: WebhookCreateInput): Promise<Webhook> {
    return this.request<Webhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update webhook
   */
  async updateWebhook(id: number, data: WebhookUpdateInput): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(id: number): Promise<void> {
    await this.request<void>(`/webhooks/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Rotate webhook secret
   */
  async rotateWebhookSecret(id: number, data?: WebhookRotateSecretInput): Promise<Webhook> {
    return this.request<Webhook>(`/webhooks/${id}/rotate-secret`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    })
  }

  /**
   * Get available webhook events
   */
  async getWebhookEvents(): Promise<WebhookEventOption[]> {
    return this.request<WebhookEventOption[]>('/webhooks/events/available')
  }
}

// Singleton instance
export const webhooksAPI = new WebhooksAPI()
