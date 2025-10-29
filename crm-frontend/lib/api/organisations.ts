// lib/api/organisations.ts
// ============= ORGANISATIONS API MODULE =============
// CRUD organisations + stats + activité

import type { BaseApiClient } from './index'
import type {
  Organisation,
  OrganisationCreate,
  OrganisationUpdate,
  OrganisationDetail,
  OrganisationActivity,
  PaginatedResponse,
} from '../types'

export class OrganisationsApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Lister organisations
   * GET /organisations
   *
   * TODO: Copier depuis lib/api.ts méthode getOrganisations() (ligne ~749)
   * Params: search, skip, limit, sort_by, sort_order, language
   */
  async list(params?: Record<string, any>): Promise<PaginatedResponse<Organisation>> {
    return await this.client['get']<PaginatedResponse<Organisation>>('/organisations', params)
  }

  /**
   * Détails organisation
   * GET /organisations/{id}
   */
  async get(id: number): Promise<OrganisationDetail> {
    return await this.client['get']<OrganisationDetail>(`/organisations/${id}`)
  }

  /**
   * Activité organisation (interactions timeline)
   * GET /organisations/{id}/activity
   */
  async getActivity(
    id: number,
    params?: { skip?: number; limit?: number }
  ): Promise<OrganisationActivity> {
    return await this.client['get']<OrganisationActivity>(
      `/organisations/${id}/activity`,
      params
    )
  }

  /**
   * Widget activité dashboard
   * GET /organisations/activity-widget
   */
  async getActivityWidget(params?: {
    days?: number
    limit?: number
  }): Promise<{ interactions: any[] }> {
    return await this.client['get']('/organisations/activity-widget', params)
  }

  /**
   * Rechercher organisations
   * GET /organisations/search
   */
  async search(
    query: string,
    skip = 0,
    limit = 100
  ): Promise<PaginatedResponse<Organisation>> {
    return await this.client['get']<PaginatedResponse<Organisation>>('/organisations/search', {
      q: query,
      skip,
      limit,
    })
  }

  /**
   * Filtrer par langue
   * GET /organisations/by-language/{language}
   */
  async getByLanguage(
    language: string,
    skip = 0,
    limit = 100
  ): Promise<PaginatedResponse<Organisation>> {
    return await this.client['get']<PaginatedResponse<Organisation>>(
      `/organisations/by-language/${language}`,
      { skip, limit }
    )
  }

  /**
   * Stats organisations
   * GET /organisations/stats
   */
  async getStats(): Promise<{
    total: number
    total_with_coordinates: number
    language_distribution: Record<string, number>
  }> {
    return await this.client['get']('/organisations/stats')
  }

  /**
   * Créer organisation
   * POST /organisations
   */
  async create(data: OrganisationCreate): Promise<Organisation> {
    return await this.client['post']<Organisation>('/organisations', data)
  }

  /**
   * Mettre à jour organisation
   * PUT /organisations/{id}
   */
  async update(id: number, data: OrganisationUpdate): Promise<Organisation> {
    return await this.client['put']<Organisation>(`/organisations/${id}`, data)
  }

  /**
   * Supprimer organisation
   * DELETE /organisations/{id}
   */
  async delete(id: number): Promise<void> {
    await this.client['delete']<void>(`/organisations/${id}`)
  }
}
