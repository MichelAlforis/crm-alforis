import { describe, it, expect, vi, beforeEach } from 'vitest'
import { emailAPI } from '@/lib/api/modules/email'
import type {
  EmailTemplate,
  EmailTemplateInput,
  EmailCampaign,
  EmailCampaignInput,
  Newsletter,
  NewsletterCreate,
} from '@/lib/types'

// Mock BaseHttpClient
vi.mock('@/lib/api/core/client', () => ({
  BaseHttpClient: class {
    request = vi.fn()
  },
}))

describe('emailAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Email Templates', () => {
    describe('getEmailTemplates', () => {
      it('should fetch email templates successfully', async () => {
        const mockTemplates: EmailTemplate[] = [
          {
            id: 1,
            name: 'Welcome Email',
            subject: 'Welcome!',
            body_html: '<p>Welcome</p>',
            is_active: true,
          },
          {
            id: 2,
            name: 'Newsletter Template',
            subject: 'Monthly Update',
            body_html: '<p>News</p>',
            is_active: true,
          },
        ]

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockTemplates)

        const result = await emailAPI.getEmailTemplates()

        expect(emailAPI.request).toHaveBeenCalledWith('/email/templates', {
          params: { only_active: true },
        })
        expect(result).toEqual(mockTemplates)
        expect(result).toHaveLength(2)
      })

      it('should fetch all templates including inactive', async () => {
        const mockTemplates: EmailTemplate[] = [
          { id: 1, name: 'Active', is_active: true },
          { id: 2, name: 'Inactive', is_active: false },
        ]

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockTemplates)

        await emailAPI.getEmailTemplates({ only_active: false })

        expect(emailAPI.request).toHaveBeenCalledWith('/email/templates', {
          params: { only_active: false },
        })
      })
    })

    describe('createEmailTemplate', () => {
      it('should create email template successfully', async () => {
        const newTemplate: EmailTemplateInput = {
          name: 'New Template',
          subject: 'Test Subject',
          body_html: '<p>Test content</p>',
          body_text: 'Test content',
        }
        const createdTemplate: EmailTemplate = {
          id: 3,
          ...newTemplate,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(createdTemplate)

        const result = await emailAPI.createEmailTemplate(newTemplate)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/templates', {
          method: 'POST',
          body: JSON.stringify(newTemplate),
        })
        expect(result.id).toBe(3)
        expect(result.name).toBe('New Template')
      })
    })

    describe('updateEmailTemplate', () => {
      it('should update email template successfully', async () => {
        const updateData = {
          subject: 'Updated Subject',
          body_html: '<p>Updated content</p>',
        }
        const updatedTemplate: EmailTemplate = {
          id: 1,
          name: 'Template',
          subject: 'Updated Subject',
          body_html: '<p>Updated content</p>',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(updatedTemplate)

        const result = await emailAPI.updateEmailTemplate(1, updateData)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/templates/1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
        expect(result.subject).toBe('Updated Subject')
      })
    })
  })

  describe('Email Campaigns', () => {
    describe('getEmailCampaigns', () => {
      it('should fetch email campaigns successfully', async () => {
        const mockCampaigns = [
          { id: 1, name: 'Campaign 1', status: 'draft' },
          { id: 2, name: 'Campaign 2', status: 'sent' },
        ]
        const mockResponse = {
          items: mockCampaigns,
          total: 2,
          skip: 0,
          limit: 20,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockResponse)

        const result = await emailAPI.getEmailCampaigns()

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns', {
          params: { skip: undefined, limit: undefined, status: undefined, provider: undefined },
        })
        expect(result.items).toEqual(mockCampaigns)
      })

      it('should filter campaigns by status', async () => {
        const mockResponse = {
          items: [{ id: 1, name: 'Draft Campaign', status: 'draft' }],
          total: 1,
          skip: 0,
          limit: 20,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockResponse)

        await emailAPI.getEmailCampaigns({ status: 'draft' })

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns', {
          params: { skip: undefined, limit: undefined, status: 'draft', provider: undefined },
        })
      })

      it('should filter campaigns by provider', async () => {
        const mockResponse = {
          items: [],
          total: 0,
          skip: 0,
          limit: 20,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockResponse)

        await emailAPI.getEmailCampaigns({ provider: 'brevo' })

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns', {
          params: { skip: undefined, limit: undefined, status: undefined, provider: 'brevo' },
        })
      })
    })

    describe('getEmailCampaign', () => {
      it('should fetch single campaign by ID', async () => {
        const mockCampaign: EmailCampaign = {
          id: 1,
          name: 'Test Campaign',
          subject: 'Test Subject',
          status: 'draft',
          template_id: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockCampaign)

        const result = await emailAPI.getEmailCampaign(1)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1')
        expect(result).toEqual(mockCampaign)
      })
    })

    describe('createEmailCampaign', () => {
      it('should create email campaign successfully', async () => {
        const newCampaign: EmailCampaignInput = {
          name: 'New Campaign',
          subject: 'Campaign Subject',
          template_id: 5,
          mailing_list_ids: [1, 2, 3],
        }
        const createdCampaign: EmailCampaign = {
          id: 10,
          ...newCampaign,
          status: 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(createdCampaign)

        const result = await emailAPI.createEmailCampaign(newCampaign)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns', {
          method: 'POST',
          body: JSON.stringify(newCampaign),
        })
        expect(result.id).toBe(10)
        expect(result.name).toBe('New Campaign')
      })
    })

    describe('updateEmailCampaign', () => {
      it('should update email campaign successfully', async () => {
        const updateData = {
          name: 'Updated Campaign Name',
          subject: 'Updated Subject',
        }
        const updatedCampaign: EmailCampaign = {
          id: 1,
          name: 'Updated Campaign Name',
          subject: 'Updated Subject',
          status: 'draft',
          template_id: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(updatedCampaign)

        const result = await emailAPI.updateEmailCampaign(1, updateData)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1', {
          method: 'PUT',
          body: JSON.stringify(updateData),
        })
        expect(result.name).toBe('Updated Campaign Name')
      })
    })

    describe('scheduleEmailCampaign', () => {
      it('should schedule email campaign successfully', async () => {
        const scheduleData = {
          scheduled_at: new Date('2025-11-15T10:00:00Z').toISOString(),
        }
        const scheduledCampaign: EmailCampaign = {
          id: 1,
          name: 'Campaign',
          subject: 'Subject',
          status: 'scheduled',
          scheduled_at: scheduleData.scheduled_at,
          template_id: 5,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(scheduledCampaign)

        const result = await emailAPI.scheduleEmailCampaign(1, scheduleData)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1/schedule', {
          method: 'POST',
          body: JSON.stringify(scheduleData),
        })
        expect(result.status).toBe('scheduled')
      })
    })

    describe('getEmailCampaignStats', () => {
      it('should fetch campaign statistics', async () => {
        const mockStats = {
          total_sent: 1000,
          total_delivered: 980,
          total_opened: 450,
          total_clicked: 120,
          open_rate: 0.459,
          click_rate: 0.122,
          bounce_rate: 0.020,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockStats)

        const result = await emailAPI.getEmailCampaignStats(1)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1/stats')
        expect(result.total_sent).toBe(1000)
        expect(result.open_rate).toBe(0.459)
      })
    })

    describe('getEmailCampaignSends', () => {
      it('should fetch campaign sends', async () => {
        const mockSends = [
          { id: 1, email: 'user1@example.com', status: 'delivered' },
          { id: 2, email: 'user2@example.com', status: 'opened' },
        ]
        const mockResponse = {
          items: mockSends,
          total: 2,
          skip: 0,
          limit: 50,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockResponse)

        const result = await emailAPI.getEmailCampaignSends(1)

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1/sends', {
          params: { skip: undefined, limit: undefined, status: undefined },
        })
        expect(result.items).toEqual(mockSends)
      })

      it('should filter sends by status', async () => {
        const mockResponse = {
          items: [{ id: 1, email: 'user@example.com', status: 'bounced' }],
          total: 1,
          skip: 0,
          limit: 50,
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockResponse)

        await emailAPI.getEmailCampaignSends(1, { status: 'bounced' })

        expect(emailAPI.request).toHaveBeenCalledWith('/email/campaigns/1/sends', {
          params: { skip: undefined, limit: undefined, status: 'bounced' },
        })
      })
    })
  })

  describe('Newsletters', () => {
    describe('getNewsletters', () => {
      it('should fetch newsletters successfully', async () => {
        const mockNewsletters: Newsletter[] = [
          { id: 1, title: 'Weekly Update', type: 'weekly', is_active: true },
          { id: 2, title: 'Monthly Digest', type: 'monthly', is_active: true },
        ]

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockNewsletters)

        const result = await emailAPI.getNewsletters()

        expect(emailAPI.request).toHaveBeenCalledWith('/newsletters', {
          params: { type: undefined },
        })
        expect(result).toEqual(mockNewsletters)
      })

      it('should filter newsletters by type', async () => {
        const mockNewsletters: Newsletter[] = [
          { id: 1, title: 'Weekly Update', type: 'weekly', is_active: true },
        ]

        vi.spyOn(emailAPI, 'request').mockResolvedValue(mockNewsletters)

        await emailAPI.getNewsletters('weekly')

        expect(emailAPI.request).toHaveBeenCalledWith('/newsletters', {
          params: { type: 'weekly' },
        })
      })
    })

    describe('createNewsletter', () => {
      it('should create newsletter successfully', async () => {
        const newNewsletter: NewsletterCreate = {
          title: 'New Newsletter',
          type: 'monthly',
          template_id: 10,
        }
        const createdNewsletter: Newsletter = {
          id: 5,
          ...newNewsletter,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        vi.spyOn(emailAPI, 'request').mockResolvedValue(createdNewsletter)

        const result = await emailAPI.createNewsletter(newNewsletter)

        expect(emailAPI.request).toHaveBeenCalledWith('/newsletters', {
          method: 'POST',
          body: JSON.stringify(newNewsletter),
        })
        expect(result.id).toBe(5)
        expect(result.title).toBe('New Newsletter')
      })
    })

    describe('sendNewsletter', () => {
      it('should send newsletter successfully', async () => {
        vi.spyOn(emailAPI, 'request').mockResolvedValue(undefined)

        await emailAPI.sendNewsletter(1)

        expect(emailAPI.request).toHaveBeenCalledWith('/newsletters/1/send', {
          method: 'POST',
        })
      })
    })

    describe('deleteNewsletter', () => {
      it('should delete newsletter successfully', async () => {
        vi.spyOn(emailAPI, 'request').mockResolvedValue(undefined)

        await emailAPI.deleteNewsletter(1)

        expect(emailAPI.request).toHaveBeenCalledWith('/newsletters/1', {
          method: 'DELETE',
        })
      })
    })
  })

  describe('error handling', () => {
    it('should handle fetch templates error gracefully', async () => {
      const errorMessage = 'Failed to fetch templates'
      vi.spyOn(emailAPI, 'request').mockRejectedValue(new Error(errorMessage))

      await expect(emailAPI.getEmailTemplates()).rejects.toThrow(errorMessage)
    })

    it('should handle create campaign error gracefully', async () => {
      const errorMessage = 'Validation error: template_id required'
      vi.spyOn(emailAPI, 'request').mockRejectedValue(new Error(errorMessage))

      const newCampaign: EmailCampaignInput = {
        name: 'Test',
        subject: 'Test',
      }

      await expect(emailAPI.createEmailCampaign(newCampaign)).rejects.toThrow(errorMessage)
    })
  })
})
