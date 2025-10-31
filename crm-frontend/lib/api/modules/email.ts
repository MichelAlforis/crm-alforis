// lib/api/modules/email.ts
// ============= EMAIL MODULE =============
// Email templates, campaigns, sends, newsletters

import { BaseHttpClient } from '../core/client'
import type {
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
  Newsletter,
  NewsletterCreate,
  NewsletterType,
  PaginatedResponse,
} from '@/lib/types'

export class EmailAPI extends BaseHttpClient {
  // ============= TEMPLATES =============

  /**
   * Get email templates
   */
  async getEmailTemplates(params?: { only_active?: boolean }): Promise<EmailTemplate[]> {
    const query = {
      only_active: params?.only_active ?? true,
    }
    return this.request<EmailTemplate[]>('/email/templates', { params: query })
  }

  /**
   * Create email template
   */
  async createEmailTemplate(data: EmailTemplateInput): Promise<EmailTemplate> {
    return this.request<EmailTemplate>('/email/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(id: number, data: EmailTemplateUpdateInput): Promise<EmailTemplate> {
    return this.request<EmailTemplate>(`/email/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // ============= CAMPAIGNS =============

  /**
   * Get email campaigns
   */
  async getEmailCampaigns(filters?: EmailCampaignFilters): Promise<PaginatedResponse<EmailCampaign>> {
    const params = {
      skip: filters?.skip,
      limit: filters?.limit,
      status: filters?.status,
      provider: filters?.provider,
    }
    return this.request<PaginatedResponse<EmailCampaign>>('/email/campaigns', { params })
  }

  /**
   * Get email campaign by ID
   */
  async getEmailCampaign(id: number): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}`)
  }

  /**
   * Create email campaign
   */
  async createEmailCampaign(data: EmailCampaignInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>('/email/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update email campaign
   */
  async updateEmailCampaign(id: number, data: EmailCampaignUpdateInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Schedule email campaign
   */
  async scheduleEmailCampaign(id: number, data: EmailCampaignScheduleInput): Promise<EmailCampaign> {
    return this.request<EmailCampaign>(`/email/campaigns/${id}/schedule`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Get email campaign stats
   */
  async getEmailCampaignStats(id: number): Promise<EmailCampaignStats> {
    return this.request<EmailCampaignStats>(`/email/campaigns/${id}/stats`)
  }

  /**
   * Get email campaign sends
   */
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

  // ============= NEWSLETTERS =============

  /**
   * Get newsletters
   */
  async getNewsletters(type?: NewsletterType): Promise<Newsletter[]> {
    return this.request<Newsletter[]>('/newsletters', {
      params: { type },
    })
  }

  /**
   * Create newsletter
   */
  async createNewsletter(data: NewsletterCreate): Promise<Newsletter> {
    return this.request<Newsletter>('/newsletters', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Send newsletter
   */
  async sendNewsletter(id: number): Promise<void> {
    await this.request<void>(`/newsletters/${id}/send`, {
      method: 'POST',
    })
  }

  /**
   * Delete newsletter
   */
  async deleteNewsletter(id: number): Promise<void> {
    await this.request<void>(`/newsletters/${id}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
export const emailAPI = new EmailAPI()
