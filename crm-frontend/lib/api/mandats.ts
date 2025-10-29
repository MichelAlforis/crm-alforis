// lib/api/mandats.ts
// ============= MANDATS API MODULE =============
// CRUD mandats de distribution

import type { BaseApiClient } from './index'
import type {
  MandatDistribution,
  MandatDistributionCreate,
  MandatDistributionUpdate,
  MandatDistributionDetail,
  PaginatedResponse,
} from '../types'

export class MandatsApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Lister mandats
   * GET /mandats-distribution
   */
  async list(params?: {
    skip?: number
    limit?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<MandatDistribution>> {
    return await this.client['get']<PaginatedResponse<MandatDistribution>>(
      '/mandats-distribution',
      params
    )
  }

  /**
   * Détails mandat
   * GET /mandats-distribution/{id}
   */
  async get(id: number): Promise<MandatDistributionDetail> {
    return await this.client['get']<MandatDistributionDetail>(`/mandats-distribution/${id}`)
  }

  /**
   * Mandats actifs
   * GET /mandats-distribution/active
   */
  async getActive(organisationId?: number): Promise<MandatDistribution[]> {
    return await this.client['get']<MandatDistribution[]>('/mandats-distribution/active', {
      organisation_id: organisationId,
    })
  }

  /**
   * Mandats d'une organisation
   * GET /mandats-distribution/by-organisation/{organisation_id}
   */
  async getByOrganisation(organisationId: number): Promise<MandatDistribution[]> {
    return await this.client['get']<MandatDistribution[]>(
      `/mandats-distribution/by-organisation/${organisationId}`
    )
  }

  /**
   * Vérifier si mandat actif
   * GET /mandats-distribution/{id}/check-actif
   */
  async checkActif(id: number): Promise<{ mandat_id: number; is_actif: boolean }> {
    return await this.client['get']<{ mandat_id: number; is_actif: boolean }>(
      `/mandats-distribution/${id}/check-actif`
    )
  }

  /**
   * Créer mandat
   * POST /mandats-distribution
   */
  async create(data: MandatDistributionCreate): Promise<MandatDistribution> {
    return await this.client['post']<MandatDistribution>('/mandats-distribution', data)
  }

  /**
   * Mettre à jour mandat
   * PUT /mandats-distribution/{id}
   */
  async update(id: number, data: MandatDistributionUpdate): Promise<MandatDistribution> {
    return await this.client['put']<MandatDistribution>(`/mandats-distribution/${id}`, data)
  }

  /**
   * Supprimer mandat
   * DELETE /mandats-distribution/{id}
   */
  async delete(id: number): Promise<void> {
    await this.client['delete']<void>(`/mandats-distribution/${id}`)
  }
}
