/**
 * SearchGlobal - Global search with Cmd+K shortcut and history
 * Use in: Navbar, global search bars
 */
'use client'

import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Clock, X, Loader2, TrendingUp } from 'lucide-react'
import { useSearchCore } from './useSearchCore'
import { useSearchHistory } from './useSearchHistory'
import { TYPE_LABELS } from './types'
import type { SearchSuggestion } from './types'

interface SearchGlobalProps {
  placeholder?: string
  className?: string
  shortcutEnabled?: boolean
}

export function SearchGlobal({
  placeholder = 'Rechercher partout… (⌘K)',
  className = '',
  shortcutEnabled = true,
}: SearchGlobalProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { searchHistory, addToHistory, clearHistory } = useSearchHistory()

  // API call for global search
  const handleSearch = async (query: string): Promise<SearchSuggestion[]> => {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    if (!response.ok) throw new Error('Search failed')
    const data = await response.json()
    return data.results || []
  }

  const {
    value,
    setValue,
    isLoading,
    suggestions,
    error,
    isOpen,
    setIsOpen,
    handleClear,
    handleClose,
  } = useSearchCore({
    debounceMs: 300,
    minQueryLength: 2,
    onSearch: handleSearch,
  })

  // Cmd/Ctrl+K shortcut
  useEffect(() => {
    if (!shortcutEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        handleClose()
        inputRef.current?.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcutEnabled, handleClose])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        handleClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClose])

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    addToHistory(suggestion.title)
    setValue('')
    handleClose()
    router.push(suggestion.href)
  }

  const handleHistoryClick = (query: string) => {
    setValue(query)
    inputRef.current?.focus()
  }

  const showHistory = !value && searchHistory.length > 0

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {value && !isLoading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (showHistory || suggestions.length > 0 || error) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50"
        >
          {/* Error state */}
          {error && (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* History */}
          {showHistory && (
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>Recherches récentes</span>
                </div>
                <button
                  onClick={clearHistory}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Effacer
                </button>
              </div>
              {searchHistory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleHistoryClick(item.query)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-gray-700 flex items-center gap-3"
                >
                  <TrendingUp className="h-4 w-4 text-gray-400" />
                  <span>{item.query}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {TYPE_LABELS[suggestion.type] || suggestion.type}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {suggestion.title}
                      </div>
                      {suggestion.subtitle && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {suggestion.subtitle}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!error && !showHistory && suggestions.length === 0 && value.length >= 2 && !isLoading && (
            <div className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">
              Aucun résultat trouvé
            </div>
          )}
        </div>
      )}
    </div>
  )
}
