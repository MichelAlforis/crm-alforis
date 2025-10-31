// lib/api/modules/mandats.ts
// ============= MANDATS MODULE =============
// Mandat distribution CRUD and specialized queries

import { BaseHttpClient } from '../core/client'
import type {
  MandatDistribution,
  MandatDistributionCreate,
  MandatDistributionUpdate,
  MandatDistributionDetail,
  PaginatedResponse,
} from '@/lib/types'

export class MandatsAPI extends BaseHttpClient {
  /**
   * Get paginated list of mandats
   */
  async getMandats(params?: {
    skip?: number
    limit?: number
    organisation_id?: number
    status?: string
  }): Promise<PaginatedResponse<MandatDistribution>> {
    return this.request<PaginatedResponse<MandatDistribution>>('/mandats', { params })
  }

  /**
   * Get mandat details by ID
   */
  async getMandat(id: number): Promise<MandatDistributionDetail> {
    return this.request<MandatDistributionDetail>(`/mandats/${id}`)
  }

  /**
   * Get active mandats (optionally filtered by organisation)
   */
  async getActiveMandats(organisation_id?: number): Promise<MandatDistribution[]> {
    return this.request<MandatDistribution[]>('/mandats/active', {
      params: organisation_id ? { organisation_id } : undefined,
    })
  }

  /**
   * Get mandats by organisation ID
   */
  async getMandatsByOrganisation(organisation_id: number): Promise<MandatDistribution[]> {
    return this.request<MandatDistribution[]>(`/mandats/organisation/${organisation_id}`)
  }

  /**
   * Check if mandat is active
   */
  async checkMandatActif(id: number): Promise<{ mandat_id: number; is_actif: boolean }> {
    return this.request(`/mandats/${id}/is-actif`)
  }

  /**
   * Create new mandat
   */
  async createMandat(data: MandatDistributionCreate): Promise<MandatDistribution> {
    return this.request<MandatDistribution>('/mandats', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update mandat
   */
  async updateMandat(id: number, data: MandatDistributionUpdate): Promise<MandatDistribution> {
    return this.request<MandatDistribution>(`/mandats/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete mandat
   */
  async deleteMandat(id: number): Promise<void> {
    await this.request<void>(`/mandats/${id}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
export const mandatsAPI = new MandatsAPI()
