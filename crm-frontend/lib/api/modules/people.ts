// lib/api/modules/people.ts
// ============= PEOPLE MODULE =============
// CRUD operations for people and organization links

import { BaseHttpClient } from '../core/client'
import type {
  Person,
  PersonInput,
  PersonUpdateInput,
  PersonDetail,
  PersonOrganizationLink,
  PersonOrganizationLinkInput,
  PersonOrganizationLinkUpdateInput,
  PaginatedResponse,
} from '@/lib/types'

export class PeopleAPI extends BaseHttpClient {
  /**
   * Get paginated list of people
   */
  async getPeople(
    skip = 0,
    limit = 50,
    options?: { q?: string; organizationId?: number },
  ): Promise<PaginatedResponse<Person>> {
    const params: Record<string, any> = { skip, limit }
    if (options?.q) params.q = options.q
    if (options?.organizationId) params.organization_id = options.organizationId

    return this.request<PaginatedResponse<Person>>('/people', { params })
  }

  /**
   * Get person details by ID
   */
  async getPerson(id: number): Promise<PersonDetail> {
    const data = await this.request<PersonDetail>(`/people/${id}`)
    return data
  }

  /**
   * Create new person
   */
  async createPerson(data: PersonInput): Promise<Person> {
    return this.request<Person>('/people', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Update person
   */
  async updatePerson(id: number, data: PersonUpdateInput): Promise<Person> {
    return this.request<Person>(`/people/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete person
   */
  async deletePerson(id: number): Promise<void> {
    await this.request<void>(`/people/${id}`, {
      method: 'DELETE',
    })
  }

  /**
   * Create person-organization link
   */
  async createPersonOrganizationLink(
    data: PersonOrganizationLinkInput,
  ): Promise<PersonOrganizationLink> {
    const response = await this.request<PersonOrganizationLink>('/org-links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return response
  }

  /**
   * Update person-organization link
   */
  async updatePersonOrganizationLink(
    linkId: number,
    data: PersonOrganizationLinkUpdateInput,
  ): Promise<PersonOrganizationLink> {
    return this.request<PersonOrganizationLink>(`/org-links/${linkId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  /**
   * Delete person-organization link
   */
  async deletePersonOrganizationLink(linkId: number): Promise<void> {
    await this.request<void>(`/org-links/${linkId}`, {
      method: 'DELETE',
    })
  }
}

// Singleton instance
export const peopleAPI = new PeopleAPI()
