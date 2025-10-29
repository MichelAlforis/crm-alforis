/**
 * useGlobalSearch - Hook for global search across entities
 * Searches: people, organisations, tasks
 */

import { useState, useEffect } from 'react'
import { usePeople } from './usePeople'
import { useOrganisations } from './useOrganisations'
import { Person, Organisation, Task } from '@/lib/types'

export type SearchResultType = 'person' | 'organisation' | 'task'

export interface SearchResult {
  id: number
  type: SearchResultType
  title: string
  subtitle?: string
  url: string
  data: Person | Organisation | Task
}

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const { people } = usePeople()
  const { data: organisations } = useOrganisations({ skip: 0, limit: 200 })

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchLower = query.toLowerCase()

    const searchResults: SearchResult[] = []

    // Search people
    people.data?.items?.forEach((person) => {
      const fullName = `${person.first_name} ${person.last_name}`.toLowerCase()
      const email = person.personal_email?.toLowerCase() || ''
      const role = person.role?.toLowerCase() || ''

      if (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        role.includes(searchLower)
      ) {
        searchResults.push({
          id: person.id,
          type: 'person',
          title: `${person.first_name} ${person.last_name}`,
          subtitle: person.personal_email || person.role || undefined,
          url: `/dashboard/people/${person.id}`,
          data: person,
        })
      }
    })

    // Search organisations
    organisations?.items?.forEach((org) => {
      const name = org.name.toLowerCase()
      const email = org.email?.toLowerCase() || ''
      const category = org.category?.toLowerCase() || ''

      if (
        name.includes(searchLower) ||
        email.includes(searchLower) ||
        category.includes(searchLower)
      ) {
        searchResults.push({
          id: org.id,
          type: 'organisation',
          title: org.name,
          subtitle: org.category || org.email || undefined,
          url: `/dashboard/organisations/${org.id}`,
          data: org,
        })
      }
    })

    // Sort by relevance (starts with query = higher)
    searchResults.sort((a, b) => {
      const aStartsWith = a.title.toLowerCase().startsWith(searchLower)
      const bStartsWith = b.title.toLowerCase().startsWith(searchLower)
      if (aStartsWith && !bStartsWith) return -1
      if (!aStartsWith && bStartsWith) return 1
      return 0
    })

    // Limit to 10 results
    setResults(searchResults.slice(0, 10))
    setIsSearching(false)
  }, [query, people.data, organisations])

  return {
    results,
    isSearching,
  }
}
