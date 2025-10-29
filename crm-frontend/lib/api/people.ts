// lib/api/people.ts
// ============= PEOPLE API MODULE =============
// CRUD personnes + liens organisations

import type { BaseApiClient } from './index'
import type {
  Person,
  PersonInput,
  PersonUpdateInput,
  PersonDetail,
  PersonOrganizationLink,
  PersonOrganizationLinkInput,
  PersonOrganizationLinkUpdateInput,
  PaginatedResponse,
} from '../types'

export class PeopleApi {
  constructor(private client: BaseApiClient) {}

  /**
   * Lister personnes avec filtres
   * GET /people
   *
   * TODO: Copier depuis lib/api.ts méthode getPeople() (ligne ~526)
   */
  async list(params?: {
    search?: string
    skip?: number
    limit?: number
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  }): Promise<PaginatedResponse<Person>> {
    return await this.client['get']<PaginatedResponse<Person>>('/people', params)
  }

  /**
   * Détails personne
   * GET /people/{id}
   *
   * TODO: Copier depuis lib/api.ts méthode getPerson() (ligne ~538)
   */
  async get(id: number): Promise<PersonDetail> {
    return await this.client['get']<PersonDetail>(`/people/${id}`)
  }

  /**
   * Créer personne
   * POST /people
   *
   * TODO: Copier depuis lib/api.ts méthode createPerson() (ligne ~543)
   */
  async create(data: PersonInput): Promise<Person> {
    return await this.client['post']<Person>('/people', data)
  }

  /**
   * Mettre à jour personne
   * PUT /people/{id}
   *
   * TODO: Copier depuis lib/api.ts méthode updatePerson() (ligne ~550)
   */
  async update(id: number, data: PersonUpdateInput): Promise<Person> {
    return await this.client['put']<Person>(`/people/${id}`, data)
  }

  /**
   * Supprimer personne
   * DELETE /people/{id}
   *
   * TODO: Copier depuis lib/api.ts méthode deletePerson() (ligne ~557)
   */
  async delete(id: number): Promise<void> {
    await this.client['delete']<void>(`/people/${id}`)
  }

  /**
   * Créer lien personne-organisation
   * POST /people/{person_id}/organizations
   *
   * TODO: Copier depuis lib/api.ts méthode createPersonOrganizationLink() (ligne ~563)
   */
  async createOrganizationLink(
    personId: number,
    data: PersonOrganizationLinkInput
  ): Promise<PersonOrganizationLink> {
    return await this.client['post']<PersonOrganizationLink>(
      `/people/${personId}/organizations`,
      data
    )
  }

  /**
   * Mettre à jour lien personne-organisation
   * PUT /people/organization-links/{link_id}
   *
   * TODO: Copier depuis lib/api.ts méthode updatePersonOrganizationLink() (ligne ~573)
   */
  async updateOrganizationLink(
    linkId: number,
    data: PersonOrganizationLinkUpdateInput
  ): Promise<PersonOrganizationLink> {
    return await this.client['put']<PersonOrganizationLink>(
      `/people/organization-links/${linkId}`,
      data
    )
  }

  /**
   * Supprimer lien personne-organisation
   * DELETE /people/organization-links/{link_id}
   *
   * TODO: Copier depuis lib/api.ts méthode deletePersonOrganizationLink() (ligne ~583)
   */
  async deleteOrganizationLink(linkId: number): Promise<void> {
    await this.client['delete']<void>(`/people/organization-links/${linkId}`)
  }
}
