// lib/api/modules/organisations.ts
// ============= ORGANISATIONS MODULE =============
// CRUD operations, activity tracking, search, stats

import { BaseHttpClient } from '../core/client'
import type {
  Organisation,
  OrganisationCreate,
  OrganisationUpdate,
  OrganisationDetail,
  OrganisationActivity,
  PaginatedResponse,
} from '@/lib/types'

export class OrganisationsAPI extends BaseHttpClient {
  /**
   * Get paginated list of organisations
   */
  async getOrganisations(params?: {
    skip?: number
    limit?: number
    category?: string
    is_active?: boolean
    country_code?: string
    language?: string
  }): Promise<PaginatedResponse<Organisation>> {
    return this.request<PaginatedResponse<Organisation>>('/organisations', { params })
  }

  /**
   * Get organisation details by ID
   */
  async getOrganisation(id: number): Promise<OrganisationDetail> {
    return this.request<OrganisationDetail>(`/organisations/${id}`)
  }

  /**
   * Create new organisation
   */
  async createOrganisation(data: OrganisationCreate): Promise<Organisation> {
    return this.request<Organisation>('/organisations', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update organisation
   */
  async updateOrganisation(id: number, data: OrganisationUpdate): Promise<Organisation> {
    return this.request<Organisation>(`/organisations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete organisation
   */
  async deleteOrganisation(id: number): Promise<void> {
    await this.request<void>(`/organisations/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Get organisation activity feed
   */
  async getOrganisationActivity(
    organisationId: number,
    params?: { limit?: number; before_id?: number; types?: string[] }
  ): Promise<PaginatedResponse<OrganisationActivity>> {
    return this.request<PaginatedResponse<OrganisationActivity>>(
      `/organisations/${organisationId}/activity`,
      { params },
    )
  }

  /**
   * Get activity widget for dashboard
   */
  async getActivityWidget(params?: {
    organisation_ids?: number[]
    types?: string[]
    limit?: number
  }): Promise<PaginatedResponse<OrganisationActivity>> {
    return this.request<PaginatedResponse<OrganisationActivity>>(
      '/dashboards/widgets/activity',
      { params },
    )
  }

  /**
   * Search organisations
   */
  async searchOrganisations(query: string, skip = 0, limit = 100): Promise<PaginatedResponse<Organisation>> {
    const items = await this.request<Organisation[]>('/organisations/search', {
      params: { q: query, skip, limit },
    })

    return {
      items: items || [],
      total: (items || []).length + skip,
      skip,
      limit,
    }
  }

  /**
   * Get organisations by language
   */
  async getOrganisationsByLanguage(language: string, skip = 0, limit = 100): Promise<PaginatedResponse<Organisation>> {
    return this.request<PaginatedResponse<Organisation>>(`/organisations/by-language/${language}`, {
      params: { skip, limit },
    })
  }

  /**
   * Get organisation stats (deprecated - use getGlobalDashboardStats)
   * @deprecated Use dashboardAPI.getGlobalDashboardStats() instead
   */
  async getOrganisationsStats(): Promise<{
    total: number
    by_category: Record<string, number>
    by_language: Record<string, number>
  }> {
    return this.request(`/organisations/stats`)
  }
}

// Singleton instance
export const organisationsAPI = new OrganisationsAPI()
