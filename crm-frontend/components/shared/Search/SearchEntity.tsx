/**
 * SearchEntity - Contextual search for specific entity types
 * Use in: Entity list pages (mandats, organisations, people, tasks)
 * Features: Controlled mode, callbacks, keyboard navigation
 */
'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { useSearchCore } from './useSearchCore'
import { TYPE_LABELS } from './types'
import type { SearchSuggestion, EntityType } from './types'

interface SearchEntityProps {
  entityType: EntityType
  placeholder?: string
  debounceMs?: number
  value?: string
  className?: string
  emptyMessage?: string
  onQueryChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void
}

export function SearchEntity({
  entityType,
  placeholder = 'Rechercher…',
  debounceMs = 250,
  value: controlledValue,
  className = '',
  emptyMessage = 'Aucune suggestion',
  onQueryChange,
  onSubmit,
  onSelectSuggestion,
}: SearchEntityProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [highlightIndex, setHighlightIndex] = useState(-1)

  const isControlled = typeof controlledValue === 'string'

  // API call for entity-specific search
  const handleSearch = async (query: string): Promise<SearchSuggestion[]> => {
    try {
      const results = await apiClient.searchEntity(entityType, query)
      return results.map((item: any) => ({
        id: item.id,
        type: entityType,
        title: item.name || item.title || `${item.first_name} ${item.last_name}`,
        subtitle: item.description || item.email || item.phone,
        href: `#`, // Navigation handled by callback
        metadata: item,
      }))
    } catch (error) {
      throw new Error(`Failed to search ${entityType}`)
    }
  }

  const {
    value: internalValue,
    setValue: setInternalValue,
    isLoading,
    suggestions,
    error,
    isOpen,
    setIsOpen,
    handleClear,
    handleClose,
  } = useSearchCore({
    debounceMs,
    minQueryLength: 2,
    onSearch: handleSearch,
  })

  const currentValue = isControlled ? controlledValue! : internalValue
  const setValue = (val: string) => {
    setInternalValue(val)
    onQueryChange?.(val)
  }

  // Sync controlled value
  useEffect(() => {
    if (isControlled) {
      setInternalValue(controlledValue!)
    }
  }, [controlledValue, isControlled, setInternalValue])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        handleClose()
        setHighlightIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [handleClose])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Enter') {
        onSubmit?.(currentValue)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[highlightIndex])
        } else {
          onSubmit?.(currentValue)
        }
        break
      case 'Escape':
        e.preventDefault()
        handleClose()
        setHighlightIndex(-1)
        break
    }
  }

  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    setValue('')
    handleClose()
    setHighlightIndex(-1)
    onSelectSuggestion?.(suggestion)
  }

  const handleClearClick = () => {
    handleClear()
    setHighlightIndex(-1)
    onQueryChange?.('')
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
        {currentValue && !isLoading && (
          <button
            onClick={handleClearClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (suggestions.length > 0 || error) && (
        <div
          ref={dropdownRef}
          className="absolute top-full mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-80 overflow-y-auto z-50"
        >
          {error && (
            <div className="p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {suggestions.length > 0 && (
            <div>
              {suggestions.map((suggestion, idx) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className={`w-full px-4 py-3 text-left border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                    idx === highlightIndex
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'hover:bg-gray-50 dark:bg-slate-800 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.title}
                  </div>
                  {suggestion.subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                      {suggestion.subtitle}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {!error && suggestions.length === 0 && currentValue.length >= 2 && !isLoading && (
            <div className="p-4 text-sm text-center text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
