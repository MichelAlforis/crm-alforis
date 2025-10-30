/**
 * useAiSuggestions - Hook for AI-powered command suggestions
 * Provides real-time intelligent suggestions based on user input
 */

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api'

interface CommandSuggestion {
  label: string
  value: string
  type?: string
}

interface UseAiSuggestionsOptions {
  query: string
  enabled?: boolean
  debounceMs?: number
  minQueryLength?: number
}

interface UseAiSuggestionsResult {
  suggestions: CommandSuggestion[]
  isLoading: boolean
  error: Error | null
  intent?: string
  entities?: Record<string, any>
}

export function useAiSuggestions({
  query,
  enabled = true,
  debounceMs = 300,
  minQueryLength = 2,
}: UseAiSuggestionsOptions): UseAiSuggestionsResult {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [intent, setIntent] = useState<string | undefined>()
  const [entities, setEntities] = useState<Record<string, any> | undefined>()

  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < minQueryLength) {
      setSuggestions([])
      setIntent(undefined)
      setEntities(undefined)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.getAiCommandSuggestions(searchQuery, 10)

      setSuggestions(response.suggestions || [])
      setIntent(response.intent)
      setEntities(response.entities)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch AI suggestions'))
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [minQueryLength])

  useEffect(() => {
    if (!enabled) {
      setSuggestions([])
      return
    }

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, enabled, debounceMs, fetchSuggestions])

  return {
    suggestions,
    isLoading,
    error,
    intent,
    entities,
  }
}

/**
 * Hook for recent AI suggestions based on user activity
 */
export function useRecentAiSuggestions(limit: number = 10) {
  const [suggestions, setSuggestions] = useState<CommandSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRecent = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.ai.getRecentSuggestions(limit)
      setSuggestions(response)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch recent suggestions'))
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  return {
    suggestions,
    isLoading,
    error,
    refresh: fetchRecent,
  }
}
