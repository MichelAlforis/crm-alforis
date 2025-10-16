// hooks/usePeople.ts
// ============= PEOPLE CRUD HOOK =============

'use client'

import { useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import {
  Person,
  PersonDetail,
  PersonInput,
  PersonUpdateInput,
  PaginatedResponse,
  LoadingState,
  OrganizationType,
  PersonOrganizationLink,
  PersonOrganizationLinkInput,
  PersonOrganizationLinkUpdateInput,
} from '@/lib/types'

interface PeopleListState extends LoadingState {
  data?: PaginatedResponse<Person>
}

interface PersonState extends LoadingState {
  data?: PersonDetail
}

interface OperationState {
  isLoading: boolean
  error?: string
  success?: boolean
}

export function usePeople() {
  const [people, setPeople] = useState<PeopleListState>({ isLoading: false })
  const [single, setSingle] = useState<PersonState>({ isLoading: false })
  const [create, setCreate] = useState<OperationState>({ isLoading: false })
  const [update, setUpdate] = useState<OperationState>({ isLoading: false })
  const [remove, setRemove] = useState<OperationState>({ isLoading: false })

  const fetchPeople = useCallback(
    async (
      skip = 0,
      limit = 50,
      options?: { q?: string; organizationType?: OrganizationType; organizationId?: number },
    ) => {
      setPeople({ isLoading: true })
      try {
        const data = await apiClient.getPeople(skip, limit, options)
        setPeople({ isLoading: false, data })
      } catch (error: any) {
        setPeople({
          isLoading: false,
          error: error.detail || 'Erreur lors du chargement des personnes',
        })
      }
    },
    [],
  )

  const fetchPerson = useCallback(async (id: number) => {
    setSingle({ isLoading: true })
    try {
      const data = await apiClient.getPerson(id)
      setSingle({ isLoading: false, data })
    } catch (error: any) {
      setSingle({
        isLoading: false,
        error: error.detail || 'Erreur lors du chargement de la personne',
      })
    }
  }, [])

  const createPerson = useCallback(
    async (payload: PersonInput) => {
      setCreate({ isLoading: true })
      try {
        const person = await apiClient.createPerson(payload)
        setCreate({ isLoading: false, success: true })
        await fetchPeople()
        return person
      } catch (error: any) {
        setCreate({
          isLoading: false,
          error: error.detail || 'Erreur lors de la création de la personne',
        })
        throw error
      }
    },
    [fetchPeople],
  )

  const updatePerson = useCallback(
    async (id: number, payload: PersonUpdateInput) => {
      setUpdate({ isLoading: true })
      try {
        const person = await apiClient.updatePerson(id, payload)
        setUpdate({ isLoading: false, success: true })
        await fetchPerson(id)
        return person
      } catch (error: any) {
        setUpdate({
          isLoading: false,
          error: error.detail || 'Erreur lors de la mise à jour de la personne',
        })
        throw error
      }
    },
    [fetchPerson],
  )

  const deletePerson = useCallback(
    async (id: number) => {
      setRemove({ isLoading: true })
      try {
        await apiClient.deletePerson(id)
        setRemove({ isLoading: false, success: true })
        await fetchPeople()
      } catch (error: any) {
        setRemove({
          isLoading: false,
          error: error.detail || 'Erreur lors de la suppression de la personne',
        })
        throw error
      }
    },
    [fetchPeople],
  )

  const linkPersonToOrganization = useCallback(
    async (input: PersonOrganizationLinkInput): Promise<PersonOrganizationLink> => {
      return apiClient.createPersonOrganizationLink(input)
    },
    [],
  )

  const updatePersonOrganizationLink = useCallback(
    async (
      linkId: number,
      input: PersonOrganizationLinkUpdateInput,
    ): Promise<PersonOrganizationLink> => {
      return apiClient.updatePersonOrganizationLink(linkId, input)
    },
    [],
  )

  const deletePersonOrganizationLink = useCallback(async (linkId: number) => {
    await apiClient.deletePersonOrganizationLink(linkId)
  }, [])

  return {
    people,
    single,
    create,
    update,
    remove,
    fetchPeople,
    fetchPerson,
    createPerson,
    updatePerson,
    deletePerson,
    linkPersonToOrganization,
    updatePersonOrganizationLink,
    deletePersonOrganizationLink,
  }
}
