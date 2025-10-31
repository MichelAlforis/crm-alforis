/**
 * Search history hook - persists search history in storage
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { storage } from '@/lib/constants'
import { logger } from '@/lib/logger'
import type { SearchHistory } from './types'

const STORAGE_KEY = 'crm_search_history'
const MAX_HISTORY = 5

export function useSearchHistory() {
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([])

  // Load history on mount
  useEffect(() => {
    try {
      const stored = storage.get<SearchHistory[]>(STORAGE_KEY)
      if (stored && Array.isArray(stored)) {
        setSearchHistory(stored)
      }
    } catch (error) {
      logger.error('Failed to load search history:', error)
    }
  }, [])

  // Add query to history
  const addToHistory = useCallback((query: string) => {
    if (!query.trim()) return

    try {
      setSearchHistory((prev) => {
        // Remove duplicates
        const filtered = prev.filter((item) => item.query !== query)

        // Add new item at the beginning
        const newHistory: SearchHistory[] = [
          { query, timestamp: Date.now() },
          ...filtered,
        ].slice(0, MAX_HISTORY)

        // Persist to storage
        storage.set(STORAGE_KEY, newHistory)

        return newHistory
      })
    } catch (error) {
      logger.error('Failed to add to search history:', error)
    }
  }, [])

  // Clear history
  const clearHistory = useCallback(() => {
    try {
      setSearchHistory([])
      storage.remove(STORAGE_KEY)
    } catch (error) {
      logger.error('Failed to clear search history:', error)
    }
  }, [])

  return {
    searchHistory,
    addToHistory,
    clearHistory,
  }
}
