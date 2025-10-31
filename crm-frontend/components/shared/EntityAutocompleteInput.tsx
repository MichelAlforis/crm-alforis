// components/shared/EntityAutocompleteInput.tsx
// ============= ENTITY AUTOCOMPLETE INPUT =============
// Composant de recherche autocomplete pour sélectionner une entité (organisation, personne, etc.)
// Conçu pour gérer des milliers d'enregistrements avec recherche obligatoire

'use client'

import React, { useState, useEffect } from 'react'
import { Search, X, Loader2, Building2, User } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'
import { useSearchableDropdown } from '@/hooks/useSearchableDropdown'

export interface EntityOption {
  id: number
  label: string
  sublabel?: string
}

interface EntityAutocompleteInputProps {
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  value?: number | null
  selectedLabel?: string
  onChange: (id: number | null, label?: string) => void
  onSearch: (query: string) => void
  options: EntityOption[]
  isLoading?: boolean
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
  emptyMessage?: string
  noResultsMessage?: string
  icon?: 'organisation' | 'person' | 'search'
  minSearchLength?: number
}

export function EntityAutocompleteInput({
  label,
  placeholder = 'Tapez pour rechercher...',
  required = false,
  disabled = false,
  error,
  value,
  selectedLabel,
  onChange,
  onSearch,
  options,
  isLoading = false,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
  emptyMessage = 'Tapez au moins 2 caractères pour rechercher',
  noResultsMessage = 'Aucun résultat trouvé',
  icon = 'search',
  minSearchLength = 2,
}: EntityAutocompleteInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  const {
    searchQuery,
    setSearchQuery,
    highlightedIndex,
    setHighlightedIndex,
    inputRef,
    listRef,
    handleScroll,
  } = useSearchableDropdown({
    options,
    onLoadMore,
    hasMore,
    isLoadingMore,
    enableLocalFilter: false, // Pas de filtrage local, on utilise la recherche distante
    triggerSearchOnMount: false,
  })

  const debouncedQuery = useDebounce(searchQuery, 300)

  // Déclencher la recherche
  useEffect(() => {
    if (debouncedQuery.trim().length >= minSearchLength) {
      onSearch(debouncedQuery.trim())
    }
  }, [debouncedQuery, onSearch, minSearchLength])

  // Sync search query avec selectedLabel
  useEffect(() => {
    if (selectedLabel && searchQuery !== selectedLabel) {
      setSearchQuery(selectedLabel)
    }
  }, [selectedLabel])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setSearchQuery(newValue)

    // Si on efface la recherche, on désélectionne
    if (!newValue.trim()) {
      onChange(null)
    }
  }

  const handleSelect = (option: EntityOption) => {
    setSearchQuery(option.label)
    onChange(option.id, option.label)
    setHighlightedIndex(0)
    inputRef.current?.blur()
  }

  const handleClear = () => {
    setSearchQuery('')
    onChange(null)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!options.length) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev - 1 + options.length) % options.length)
        break
      case 'Enter':
        e.preventDefault()
        if (options[highlightedIndex]) {
          handleSelect(options[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        inputRef.current?.blur()
        break
    }
  }

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    }
    switch (icon) {
      case 'organisation':
        return <Building2 className={`w-5 h-5 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
      case 'person':
        return <User className={`w-5 h-5 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
      default:
        return <Search className={`w-5 h-5 ${isFocused ? 'text-blue-500' : 'text-gray-400'}`} />
    }
  }

  const shouldShowDropdown = isFocused && searchQuery.trim().length >= minSearchLength

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      <div className={`relative transition-all duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {getIcon()}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
              setTimeout(() => setIsFocused(false), 200)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full h-12 pl-11 pr-11 rounded-lg border-2 text-sm font-medium
              transition-all duration-200 outline-none
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
              ${error ? 'border-red-500' : isFocused ? 'border-blue-500 shadow-lg shadow-blue-100' : 'border-gray-300 hover:border-gray-400'}
              placeholder:text-gray-400
            `}
            aria-label={label || 'Rechercher'}
            aria-autocomplete="list"
            aria-expanded={!!shouldShowDropdown}
          />

          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Effacer"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {shouldShowDropdown && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div ref={listRef} className="max-h-80 overflow-y-auto" onScroll={handleScroll}>
            {isLoading && options.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                <p>Recherche en cours...</p>
              </div>
            ) : options.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-200">
                  {options.length} résultat{options.length > 1 ? 's' : ''} trouvé{options.length > 1 ? 's' : ''}
                </div>
                {options.map((option, index) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleSelect(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full px-4 py-3 text-left transition-colors border-b border-gray-100 last:border-0
                      ${index === highlightedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}
                      ${option.id === value ? 'bg-blue-100 font-medium' : ''}
                    `}
                  >
                    <div className="text-sm font-medium text-gray-900">{option.label}</div>
                    {option.sublabel && (
                      <div className="text-xs text-gray-500 mt-0.5">{option.sublabel}</div>
                    )}
                  </button>
                ))}
                {(hasMore || isLoadingMore) && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-200">
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                        Chargement...
                      </>
                    ) : (
                      'Faites défiler pour charger plus'
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                {searchQuery.trim().length < minSearchLength ? emptyMessage : noResultsMessage}
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {!error && !isFocused && searchQuery.trim().length < minSearchLength && (
        <p className="mt-2 text-xs text-gray-500">
          💡 Tapez au moins {minSearchLength} caractères pour lancer la recherche
        </p>
      )}
    </div>
  )
}
