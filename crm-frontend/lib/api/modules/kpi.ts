// lib/api/modules/kpi.ts
// ============= KPI MODULE =============
// Key Performance Indicators management

import { BaseHttpClient } from '../core/client'
import type {
  KPI,
  KPICreate,
  KPIUpdate,
  PaginatedResponse,
} from '@/lib/types'

export class KPIAPI extends BaseHttpClient {
  /**
   * Get paginated list of KPIs
   */
  async getKPIs(
    skip = 0,
    limit = 50,
    options?: {
      q?: string
      organisation_id?: number
      owner_id?: number
      type?: string
    },
  ): Promise<PaginatedResponse<KPI>> {
    const params: Record<string, any> = { skip, limit }
    if (options?.q) params.q = options.q
    if (options?.organisation_id) params.organisation_id = options.organisation_id
    if (options?.owner_id) params.owner_id = options.owner_id
    if (options?.type) params.type = options.type

    return this.request<PaginatedResponse<KPI>>('/kpis', { params })
  }

  /**
   * Get KPI by ID
   */
  async getKPI(id: number): Promise<KPI> {
    return this.request<KPI>(`/kpis/${id}`)
  }

  /**
   * Create KPI
   */
  async createKPI(data: KPICreate): Promise<KPI> {
    return this.request<KPI>('/kpis', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update KPI
   */
  async updateKPI(id: number, data: KPIUpdate): Promise<KPI> {
    return this.request<KPI>(`/kpis/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete KPI
   */
  async deleteKPI(id: number): Promise<void> {
    await this.request<void>(`/kpis/${id}`, { method: 'DELETE' })
  }
}

// Singleton instance
export const kpiAPI = new KPIAPI()
