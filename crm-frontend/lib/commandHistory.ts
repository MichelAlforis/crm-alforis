/**
 * CommandHistory - Track recent searches and actions
 * Stores in localStorage for persistence
 */

import { storage } from '@/lib/constants'

export interface HistoryItem {
  id: string
  query: string
  type: 'search' | 'action' | 'navigation'
  timestamp: number
  metadata?: {
    entityId?: number
    entityType?: string
    url?: string
  }
}

const STORAGE_KEY = 'command-palette-history'
const MAX_HISTORY = 20

/**
 * Get command history from localStorage
 */
export function getHistory(): HistoryItem[] {
  try {
    const history = storage.get<HistoryItem[]>(STORAGE_KEY)
    if (!history) return []

    return history.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_HISTORY)
  } catch (error) {
    console.error('Failed to load history:', error)
    return []
  }
}

/**
 * Add item to history
 */
export function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): void {
  try {
    const history = getHistory()

    // Check if query already exists (don't add duplicates)
    const existing = history.findIndex(
      (h) => h.query.toLowerCase() === item.query.toLowerCase()
    )

    if (existing !== -1) {
      // Remove old entry
      history.splice(existing, 1)
    }

    // Add new entry at the top
    const newItem: HistoryItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
    }

    history.unshift(newItem)

    // Keep only MAX_HISTORY items
    const trimmed = history.slice(0, MAX_HISTORY)

    storage.set(STORAGE_KEY, trimmed)
  } catch (error) {
    console.error('Failed to save history:', error)
  }
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  storage.remove(STORAGE_KEY)
}

/**
 * Remove specific item from history
 */
export function removeFromHistory(id: string): void {
  try {
    const history = getHistory()
    const filtered = history.filter((item) => item.id !== id)
    storage.set(STORAGE_KEY, filtered)
  } catch (error) {
    console.error('Failed to remove from history:', error)
  }
}
