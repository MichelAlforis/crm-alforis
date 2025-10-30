/**
 * useGlobalSearch - Hook for global search across entities
 * Searches: people, organisations, tasks
 * Uses Fuse.js for fuzzy matching
 */

import { useState, useEffect, useMemo } from 'react'
import Fuse from 'fuse.js'
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
  score?: number // Fuse.js relevance score (lower = better match)
}

export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const { people } = usePeople()
  const { data: organisations } = useOrganisations({ skip: 0, limit: 200 })

  // Fuse.js instances for fuzzy search
  const fusePeople = useMemo(() => {
    const peopleList = people.data?.items || []
    return new Fuse(peopleList, {
      keys: [
        { name: 'first_name', weight: 2 },
        { name: 'last_name', weight: 2 },
        { name: 'personal_email', weight: 1 },
        { name: 'role', weight: 1 },
      ],
      threshold: 0.4, // 0 = exact match, 1 = match anything
      includeScore: true,
      minMatchCharLength: 2,
    })
  }, [people.data])

  const fuseOrgs = useMemo(() => {
    const orgsList = organisations?.items || []
    return new Fuse(orgsList, {
      keys: [
        { name: 'name', weight: 2 },
        { name: 'email', weight: 1 },
        { name: 'category', weight: 1 },
        { name: 'sector', weight: 1 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    })
  }, [organisations])

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults: SearchResult[] = []

    // Fuzzy search people
    const peopleResults = fusePeople.search(query)
    peopleResults.forEach(({ item: person, score }) => {
      searchResults.push({
        id: person.id,
        type: 'person',
        title: `${person.first_name} ${person.last_name}`,
        subtitle: person.personal_email || person.role || undefined,
        url: `/dashboard/people/${person.id}`,
        data: person,
        score, // Add score for sorting
      })
    })

    // Fuzzy search organisations
    const orgResults = fuseOrgs.search(query)
    orgResults.forEach(({ item: org, score }) => {
      searchResults.push({
        id: org.id,
        type: 'organisation',
        title: org.name,
        subtitle: org.category || org.email || undefined,
        url: `/dashboard/organisations/${org.id}`,
        data: org,
        score, // Add score for sorting
      })
    })

    // Sort by score (lower score = better match)
    searchResults.sort((a, b) => (a.score || 1) - (b.score || 1))

    // Limit to 10 results
    setResults(searchResults.slice(0, 10))
    setIsSearching(false)
  }, [query, fusePeople, fuseOrgs])

  return {
    results,
    isSearching,
  }
}
