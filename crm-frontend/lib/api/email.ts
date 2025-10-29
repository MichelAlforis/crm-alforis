// lib/api/email.ts
// ============= EMAIL API MODULE =============
// Campaigns, templates, newsletters, sends

import type { BaseApiClient } from './index'
import type {
  Newsletter,
  NewsletterCreate,
  NewsletterType,
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
  PaginatedResponse,
} from '../types'

export class EmailApi {
  constructor(private client: BaseApiClient) {}

  // ==========================================
  // NEWSLETTERS (legacy)
  // ==========================================

  /**
   * Lister newsletters
   * GET /newsletters
   */
  async getNewsletters(type?: NewsletterType): Promise<Newsletter[]> {
    return await this.client['get']<Newsletter[]>('/newsletters', type ? { type } : undefined)
  }

  /**
   * Créer newsletter
   * POST /newsletters
   */
  async createNewsletter(data: NewsletterCreate): Promise<Newsletter> {
    return await this.client['post']<Newsletter>('/newsletters', data)
  }

  /**
   * Envoyer newsletter
   * POST /newsletters/{id}/send
   */
  async sendNewsletter(id: number): Promise<void> {
    await this.client['post']<void>(`/newsletters/${id}/send`)
  }

  /**
   * Supprimer newsletter
   * DELETE /newsletters/{id}
   */
  async deleteNewsletter(id: number): Promise<void> {
    await this.client['delete']<void>(`/newsletters/${id}`)
  }

  // ==========================================
  // EMAIL TEMPLATES
  // ==========================================

  /**
   * Lister templates email
   * GET /email-templates
   */
  async getTemplates(params?: { only_active?: boolean }): Promise<EmailTemplate[]> {
    return await this.client['get']<EmailTemplate[]>('/email-templates', params)
  }

  /**
   * Créer template email
   * POST /email-templates
   */
  async createTemplate(data: EmailTemplateInput): Promise<EmailTemplate> {
    return await this.client['post']<EmailTemplate>('/email-templates', data)
  }

  /**
   * Mettre à jour template
   * PUT /email-templates/{id}
   */
  async updateTemplate(id: number, data: EmailTemplateUpdateInput): Promise<EmailTemplate> {
    return await this.client['put']<EmailTemplate>(`/email-templates/${id}`, data)
  }

  // ==========================================
  // EMAIL CAMPAIGNS
  // ==========================================

  /**
   * Lister campagnes email
   * GET /email-campaigns
   *
   * TODO: Copier depuis lib/api.ts méthode getEmailCampaigns() (ligne ~639)
   */
  async getCampaigns(filters?: EmailCampaignFilters): Promise<PaginatedResponse<EmailCampaign>> {
    return await this.client['get']<PaginatedResponse<EmailCampaign>>(
      '/email-campaigns',
      filters as any
    )
  }

  /**
   * Détails campagne
   * GET /email-campaigns/{id}
   */
  async getCampaign(id: number): Promise<EmailCampaign> {
    return await this.client['get']<EmailCampaign>(`/email-campaigns/${id}`)
  }

  /**
   * Créer campagne
   * POST /email-campaigns
   */
  async createCampaign(data: EmailCampaignInput): Promise<EmailCampaign> {
    return await this.client['post']<EmailCampaign>('/email-campaigns', data)
  }

  /**
   * Mettre à jour campagne
   * PUT /email-campaigns/{id}
   */
  async updateCampaign(id: number, data: EmailCampaignUpdateInput): Promise<EmailCampaign> {
    return await this.client['put']<EmailCampaign>(`/email-campaigns/${id}`, data)
  }

  /**
   * Planifier campagne
   * POST /email-campaigns/{id}/schedule
   */
  async scheduleCampaign(
    id: number,
    data: EmailCampaignScheduleInput
  ): Promise<EmailCampaign> {
    return await this.client['post']<EmailCampaign>(`/email-campaigns/${id}/schedule`, data)
  }

  /**
   * Stats campagne
   * GET /email-campaigns/{id}/stats
   */
  async getCampaignStats(id: number): Promise<EmailCampaignStats> {
    return await this.client['get']<EmailCampaignStats>(`/email-campaigns/${id}/stats`)
  }

  /**
   * Envois campagne (logs)
   * GET /email-campaigns/{id}/sends
   */
  async getCampaignSends(
    id: number,
    filters?: EmailSendFilters & { skip?: number; limit?: number }
  ): Promise<PaginatedResponse<EmailSend>> {
    return await this.client['get']<PaginatedResponse<EmailSend>>(
      `/email-campaigns/${id}/sends`,
      filters as any
    )
  }
}
