import { describe, it, expect, vi, beforeEach } from 'vitest'
import { organisationsAPI } from '@/lib/api/modules/organisations'
import type { Organisation, OrganisationCreate, OrganisationUpdate } from '@/lib/types'

// Mock BaseHttpClient
vi.mock('@/lib/api/core/client', () => ({
  BaseHttpClient: class {
    request = vi.fn()
  },
}))

describe('organisationsAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getOrganisations', () => {
    it('should fetch organisations list successfully', async () => {
      const mockOrganisations = [
        { id: 1, name: 'Test Org 1', category: 'DISTRIBUTEUR', is_active: true },
        { id: 2, name: 'Test Org 2', category: 'CGPI', is_active: true },
      ]
      const mockResponse = {
        items: mockOrganisations,
        total: 2,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResponse)

      const result = await organisationsAPI.getOrganisations()

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations', { params: undefined })
      expect(result.items).toEqual(mockOrganisations)
      expect(result.total).toBe(2)
    })

    it('should filter organisations by category', async () => {
      const mockResponse = {
        items: [{ id: 1, name: 'CGPI Org', category: 'CGPI' }],
        total: 1,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResponse)

      await organisationsAPI.getOrganisations({ category: 'CGPI' })

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations', {
        params: { category: 'CGPI' },
      })
    })

    it('should filter organisations by active status', async () => {
      const mockResponse = {
        items: [{ id: 1, name: 'Active Org', is_active: true }],
        total: 1,
        skip: 0,
        limit: 50,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResponse)

      await organisationsAPI.getOrganisations({ is_active: true })

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations', {
        params: { is_active: true },
      })
    })

    it('should paginate organisations correctly', async () => {
      const mockResponse = {
        items: [],
        total: 100,
        skip: 20,
        limit: 20,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResponse)

      await organisationsAPI.getOrganisations({ skip: 20, limit: 20 })

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations', {
        params: { skip: 20, limit: 20 },
      })
    })
  })

  describe('getOrganisation', () => {
    it('should fetch single organisation by ID', async () => {
      const mockOrganisation = {
        id: 1,
        name: 'Test Org',
        category: 'DISTRIBUTEUR',
        people: [],
        mandats: [],
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockOrganisation)

      const result = await organisationsAPI.getOrganisation(1)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/1')
      expect(result).toEqual(mockOrganisation)
    })
  })

  describe('createOrganisation', () => {
    it('should create organisation successfully', async () => {
      const newOrganisation: OrganisationCreate = {
        name: 'New Org',
        category: 'DISTRIBUTEUR',
        country_code: 'FR',
        language: 'fr',
      }
      const createdOrganisation: Organisation = {
        id: 3,
        ...newOrganisation,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(createdOrganisation)

      const result = await organisationsAPI.createOrganisation(newOrganisation)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations', {
        method: 'POST',
        body: JSON.stringify(newOrganisation),
      })
      expect(result.id).toBe(3)
      expect(result.name).toBe('New Org')
    })
  })

  describe('updateOrganisation', () => {
    it('should update organisation successfully', async () => {
      const updateData: OrganisationUpdate = {
        name: 'Updated Org Name',
        is_active: false,
      }
      const updatedOrganisation: Organisation = {
        id: 1,
        name: 'Updated Org Name',
        category: 'DISTRIBUTEUR',
        is_active: false,
        country_code: 'FR',
        language: 'fr',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(updatedOrganisation)

      const result = await organisationsAPI.updateOrganisation(1, updateData)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/1', {
        method: 'PUT',
        body: JSON.stringify(updateData),
      })
      expect(result.name).toBe('Updated Org Name')
      expect(result.is_active).toBe(false)
    })
  })

  describe('deleteOrganisation', () => {
    it('should delete organisation successfully', async () => {
      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(undefined)

      await organisationsAPI.deleteOrganisation(1)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/1', {
        method: 'DELETE',
      })
    })
  })

  describe('searchOrganisations', () => {
    it('should search organisations by query', async () => {
      const mockResults = [
        { id: 1, name: 'Test Search Org', category: 'DISTRIBUTEUR' },
      ]

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResults)

      const result = await organisationsAPI.searchOrganisations('Test', 0, 100)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/search', {
        params: { q: 'Test', skip: 0, limit: 100 },
      })
      expect(result.items).toEqual(mockResults)
      expect(result.total).toBe(1)
    })

    it('should handle empty search results', async () => {
      vi.spyOn(organisationsAPI, 'request').mockResolvedValue([])

      const result = await organisationsAPI.searchOrganisations('NonExistent')

      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })
  })

  describe('getOrganisationActivity', () => {
    it('should fetch organisation activity feed', async () => {
      const mockActivity = {
        items: [
          {
            id: 1,
            type: 'organisation_created',
            organisation_id: 1,
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockActivity)

      const result = await organisationsAPI.getOrganisationActivity(1)

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/1/activity', {
        params: undefined,
      })
      expect(result.items).toHaveLength(1)
    })

    it('should filter activity by types', async () => {
      const mockActivity = {
        items: [],
        total: 0,
        skip: 0,
        limit: 20,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockActivity)

      await organisationsAPI.getOrganisationActivity(1, {
        types: ['organisation_updated', 'mandat_created'],
      })

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/1/activity', {
        params: { types: ['organisation_updated', 'mandat_created'] },
      })
    })
  })

  describe('getOrganisationsByLanguage', () => {
    it('should fetch organisations by language', async () => {
      const mockResponse = {
        items: [{ id: 1, name: 'French Org', language: 'fr' }],
        total: 1,
        skip: 0,
        limit: 100,
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockResponse)

      const result = await organisationsAPI.getOrganisationsByLanguage('fr')

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/by-language/fr', {
        params: { skip: 0, limit: 100 },
      })
      expect(result.items).toHaveLength(1)
    })
  })

  describe('getOrganisationsStats', () => {
    it('should fetch organisation statistics', async () => {
      const mockStats = {
        total: 150,
        by_category: {
          DISTRIBUTEUR: 80,
          CGPI: 50,
          BANQUE: 20,
        },
        by_language: {
          fr: 100,
          en: 50,
        },
      }

      vi.spyOn(organisationsAPI, 'request').mockResolvedValue(mockStats)

      const result = await organisationsAPI.getOrganisationsStats()

      expect(organisationsAPI.request).toHaveBeenCalledWith('/organisations/stats')
      expect(result.total).toBe(150)
      expect(result.by_category.DISTRIBUTEUR).toBe(80)
    })
  })
})
