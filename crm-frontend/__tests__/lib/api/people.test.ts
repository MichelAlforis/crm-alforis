import { describe, it, expect, vi, beforeEach } from 'vitest'
import { peopleAPI } from '@/lib/api/modules/people'
import type { Person, PersonInput, PersonUpdateInput } from '@/lib/types'

// Mock BaseHttpClient
vi.mock('@/lib/api/core/client', () => ({
  BaseHttpClient: class {
    request = vi.fn()
  },
}))

describe('peopleAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPeople', () => {
    it('should fetch people list successfully', async () => {
      const mockPeople = [
        {
          id: 1,
          first_name: 'John',
          last_name: 'Doe',
          personal_email: 'john@example.com',
        },
        {
          id: 2,
          first_name: 'Jane',
          last_name: 'Smith',
          personal_email: 'jane@example.com',
        },
      ]
      const mockResponse = {
        items: mockPeople,
        total: 2,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(mockResponse)

      const result = await peopleAPI.getPeople()

      expect(peopleAPI.request).toHaveBeenCalledWith('/people', {
        params: { skip: 0, limit: 50 },
      })
      expect(result.items).toEqual(mockPeople)
      expect(result.total).toBe(2)
    })

    it('should search people by query', async () => {
      const mockResponse = {
        items: [{ id: 1, first_name: 'John', last_name: 'Doe' }],
        total: 1,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(mockResponse)

      await peopleAPI.getPeople(0, 50, { q: 'John' })

      expect(peopleAPI.request).toHaveBeenCalledWith('/people', {
        params: { skip: 0, limit: 50, q: 'John' },
      })
    })

    it('should filter people by organization ID', async () => {
      const mockResponse = {
        items: [{ id: 1, first_name: 'John', last_name: 'Doe' }],
        total: 1,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(mockResponse)

      await peopleAPI.getPeople(0, 50, { organizationId: 5 })

      expect(peopleAPI.request).toHaveBeenCalledWith('/people', {
        params: { skip: 0, limit: 50, organization_id: 5 },
      })
    })

    it('should paginate people correctly', async () => {
      const mockResponse = {
        items: [],
        total: 100,
        skip: 20,
        limit: 20,
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(mockResponse)

      await peopleAPI.getPeople(20, 20)

      expect(peopleAPI.request).toHaveBeenCalledWith('/people', {
        params: { skip: 20, limit: 20 },
      })
    })
  })

  describe('getPerson', () => {
    it('should fetch single person by ID', async () => {
      const mockPerson = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe',
        personal_email: 'john@example.com',
        organization_links: [],
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(mockPerson)

      const result = await peopleAPI.getPerson(1)

      expect(peopleAPI.request).toHaveBeenCalledWith('/people/1')
      expect(result).toEqual(mockPerson)
    })
  })

  describe('createPerson', () => {
    it('should create person successfully', async () => {
      const newPerson: PersonInput = {
        first_name: 'Alice',
        last_name: 'Johnson',
        personal_email: 'alice@example.com',
        phone: '+33612345678',
      }
      const createdPerson: Person = {
        id: 3,
        ...newPerson,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(createdPerson)

      const result = await peopleAPI.createPerson(newPerson)

      expect(peopleAPI.request).toHaveBeenCalledWith('/people', {
        method: 'POST',
        body: JSON.stringify(newPerson),
      })
      expect(result.id).toBe(3)
      expect(result.first_name).toBe('Alice')
    })
  })

  describe('updatePerson', () => {
    it('should update person successfully', async () => {
      const updateData: PersonUpdateInput = {
        first_name: 'John',
        last_name: 'Doe Updated',
        personal_email: 'john.updated@example.com',
      }
      const updatedPerson: Person = {
        id: 1,
        first_name: 'John',
        last_name: 'Doe Updated',
        personal_email: 'john.updated@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(updatedPerson)

      const result = await peopleAPI.updatePerson(1, updateData)

      expect(peopleAPI.request).toHaveBeenCalledWith('/people/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      expect(result.last_name).toBe('Doe Updated')
    })
  })

  describe('deletePerson', () => {
    it('should delete person successfully', async () => {
      vi.spyOn(peopleAPI, 'request').mockResolvedValue(undefined)

      await peopleAPI.deletePerson(1)

      expect(peopleAPI.request).toHaveBeenCalledWith('/people/1', {
        method: 'DELETE',
      })
    })
  })

  describe('createPersonOrganizationLink', () => {
    it('should create person-organization link successfully', async () => {
      const linkData = {
        person_id: 1,
        organisation_id: 5,
        role: 'CEO',
        is_primary: true,
      }
      const createdLink = {
        id: 10,
        ...linkData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(createdLink)

      const result = await peopleAPI.createPersonOrganizationLink(linkData)

      expect(peopleAPI.request).toHaveBeenCalledWith('/org-links', {
        method: 'POST',
        body: JSON.stringify(linkData),
      })
      expect(result.id).toBe(10)
      expect(result.role).toBe('CEO')
    })
  })

  describe('updatePersonOrganizationLink', () => {
    it('should update person-organization link successfully', async () => {
      const updateData = {
        role: 'CTO',
        is_primary: false,
      }
      const updatedLink = {
        id: 10,
        person_id: 1,
        organisation_id: 5,
        role: 'CTO',
        is_primary: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(peopleAPI, 'request').mockResolvedValue(updatedLink)

      const result = await peopleAPI.updatePersonOrganizationLink(10, updateData)

      expect(peopleAPI.request).toHaveBeenCalledWith('/org-links/10', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      expect(result.role).toBe('CTO')
      expect(result.is_primary).toBe(false)
    })
  })

  describe('deletePersonOrganizationLink', () => {
    it('should delete person-organization link successfully', async () => {
      vi.spyOn(peopleAPI, 'request').mockResolvedValue(undefined)

      await peopleAPI.deletePersonOrganizationLink(10)

      expect(peopleAPI.request).toHaveBeenCalledWith('/org-links/10', {
        method: 'DELETE',
      })
    })
  })

  describe('error handling', () => {
    it('should handle fetch error gracefully', async () => {
      const errorMessage = 'Network error'
      vi.spyOn(peopleAPI, 'request').mockRejectedValue(new Error(errorMessage))

      await expect(peopleAPI.getPeople()).rejects.toThrow(errorMessage)
    })

    it('should handle create error gracefully', async () => {
      const errorMessage = 'Validation error'
      vi.spyOn(peopleAPI, 'request').mockRejectedValue(new Error(errorMessage))

      const newPerson: PersonInput = {
        first_name: 'Test',
        last_name: 'User',
      }

      await expect(peopleAPI.createPerson(newPerson)).rejects.toThrow(errorMessage)
    })
  })
})
