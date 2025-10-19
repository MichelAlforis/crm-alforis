'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Loader2, Search, Sparkles, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { apiClient } from '@/lib/api'
import type { SearchSuggestion } from '@/lib/search'

type EntityType = 'organisations' | 'people' | 'mandats' | 'tasks'

interface SearchBarProps {
  entityType?: EntityType
  placeholder?: string
  debounceMs?: number
  defaultValue?: string
  value?: string
  autofocus?: boolean
  disabled?: boolean
  className?: string
  emptyMessage?: string
  onQueryChange?: (value: string) => void
  onSubmit?: (value: string) => void
  onSelectSuggestion?: (suggestion: SearchSuggestion) => void
}

interface SuggestionWithMeta extends SearchSuggestion {
  label: string
  description?: string
}

const TYPE_LABELS: Record<string, string> = {
  organisation: 'Organisation',
  organisations: 'Organisation',
  person: 'Personne',
  people: 'Personne',
  mandat: 'Mandat',
  mandats: 'Mandat',
  task: 'Tâche',
  tasks: 'Tâche',
}

const MIN_QUERY_LENGTH = 2

export default function SearchBar({
  entityType = 'organisations',
  placeholder = 'Rechercher…',
  debounceMs = 250,
  defaultValue = '',
  value,
  autofocus = false,
  disabled = false,
  className,
  emptyMessage = 'Aucune suggestion',
  onQueryChange,
  onSubmit,
  onSelectSuggestion,
}: SearchBarProps) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<SuggestionWithMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState<number>(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const isControlled = typeof value === 'string'
  const currentValue = isControlled ? value! : internalValue
  const debouncedValue = useDebounce(currentValue, debounceMs)

  // Garder la valeur synchronisée si contrôlée
  useEffect(() => {
    if (isControlled) {
      setInternalValue(value!)
    }
  }, [value, isControlled])

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setHighlightIndex(-1)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Fetch suggestions quand la valeur change
  useEffect(() => {
    if (debouncedValue.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([])
      setIsLoading(false)
      setError(null)
      return
    }

    let isCancelled = false
    setIsLoading(true)
    setError(null)

    apiClient.searchAutocomplete(debouncedValue.trim(), entityType)
      .then((data) => {
        if (isCancelled) return
        const formatted = (data ?? []).map((item) => ({
          ...item,
          label: String(item.name ?? item.title ?? ''),
          description: buildDescription(item),
        }))
        setSuggestions(formatted)
        setHighlightIndex(formatted.length > 0 ? 0 : -1)
      })
      .catch((fetchError: any) => {
        if (isCancelled) return
        const message = fetchError?.detail || fetchError?.message || 'Erreur lors de la recherche'
        setError(message)
        setSuggestions([])
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [debouncedValue, entityType])

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value
    if (!isControlled) {
      setInternalValue(newValue)
    }
    onQueryChange?.(newValue)
    setIsOpen(true)
    setError(null)
  }, [isControlled, onQueryChange])

  const handleClear = useCallback(() => {
    if (!isControlled) {
      setInternalValue('')
    }
    onQueryChange?.('')
    setSuggestions([])
    setHighlightIndex(-1)
    inputRef.current?.focus()
  }, [isControlled, onQueryChange])

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = currentValue.trim()

    if (highlightIndex >= 0 && suggestions[highlightIndex]) {
      handleSuggestionSelect(suggestions[highlightIndex])
      return
    }

    if (!trimmed) return
    onSubmit?.(trimmed)
    setIsOpen(false)
  }, [currentValue, highlightIndex, suggestions, onSubmit])

  const handleSuggestionSelect = useCallback((suggestion: SuggestionWithMeta) => {
    if (!isControlled) {
      setInternalValue(suggestion.label)
    }
    onQueryChange?.(suggestion.label)
    onSelectSuggestion?.(suggestion)
    setIsOpen(false)
    setSuggestions((prev) => prev)
    setHighlightIndex(-1)
  }, [isControlled, onQueryChange, onSelectSuggestion])

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      setIsOpen(true)
    }

    if (!suggestions.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightIndex((prev) => (prev + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length)
    } else if (event.key === 'Enter') {
      if (highlightIndex >= 0 && suggestions[highlightIndex]) {
        event.preventDefault()
        handleSuggestionSelect(suggestions[highlightIndex])
      }
    } else if (event.key === 'Escape') {
      setIsOpen(false)
      setHighlightIndex(-1)
    }
  }, [suggestions, highlightIndex, isOpen, handleSuggestionSelect])

  const showDropdown = isOpen && (isLoading || suggestions.length > 0 || error)

  return (
    <div ref={containerRef} className={clsx('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div className={clsx(
          'relative flex items-center',
          'rounded-2xl border-2 bg-white transition-all duration-200',
          disabled ? 'opacity-60 cursor-not-allowed' : 'focus-within:border-blue-500 focus-within:shadow-lg focus-within:shadow-blue-100'
        )}>
          <div className="pl-4 text-gray-400">
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
            ) : (
              <Search className="w-5 h-5" aria-hidden />
            )}
          </div>

          <input
            ref={inputRef}
            value={currentValue}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            autoFocus={autofocus}
            className={clsx(
              'flex-1 border-none bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none',
              'md:min-w-[260px]'
            )}
            aria-autocomplete="list"
            aria-expanded={!!showDropdown}
            aria-controls="searchbar-suggestions"
          />

          {currentValue && (
            <button
              type="button"
              onClick={handleClear}
              className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
              aria-label="Effacer la recherche"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </form>

      {showDropdown && (
        <div
          id="searchbar-suggestions"
          className="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          {error && (
            <div className="px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {!error && suggestions.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-sm text-gray-500">
              {emptyMessage}
            </div>
          )}

          <ul className="divide-y divide-gray-100">
            {suggestions.map((suggestion, index) => {
              const isActive = index === highlightIndex
              return (
                <li key={`${suggestion.type}-${suggestion.id}`}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSuggestionSelect(suggestion)}
                    className={clsx(
                      'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                      isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Sparkles className="h-4 w-4" aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {suggestion.label}
                      </p>
                      {suggestion.description && (
                        <p className="truncate text-xs text-gray-500">
                          {suggestion.description}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {TYPE_LABELS[suggestion.type] ?? suggestion.type}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

function buildDescription(item: SearchSuggestion): string | undefined {
  if (item.type === 'organisation' || item.type === 'organisations') {
    return item.category ? `Catégorie · ${item.category}` : undefined
  }
  if (item.type === 'person' || item.type === 'people') {
    if (item.email) return String(item.email)
    if (item.role) return String(item.role)
  }
  if (item.type === 'mandat' || item.type === 'mandats') {
    if (item.status) return `Statut · ${item.status}`
  }
  return undefined
}
